import { describe, expect, test } from "bun:test"
import { BILL_STATUS } from "../src/lib/billing"
import { CLAIM_BATCH_STATUS } from "../src/lib/claims"
import {
  DEMO_SHARED_ACCOUNT_EMAIL,
  DEMO_TEST_IDENTIFIERS,
  buildDemoWorkspaceSeed,
} from "../src/lib/demoWorkspace"

describe("Submission demo workspace", () => {
  test("uses the shared demo account and official sandbox verification details", () => {
    expect(DEMO_SHARED_ACCOUNT_EMAIL).toBe("esther@getamelia.online")
    expect(DEMO_TEST_IDENTIFIERS.nin.fullName).toBe("Bunch Dillon")
    expect(DEMO_TEST_IDENTIFIERS.nin.value).toBe("63184876213")
    expect(DEMO_TEST_IDENTIFIERS.bank.bankCode).toBe("058")
    expect(DEMO_TEST_IDENTIFIERS.bank.accountNumber).toBe("1000000000")
    expect(DEMO_TEST_IDENTIFIERS.bank.accountName).toBe("MICHAEL JOHN DOE")
  })

  test("builds a female-first workspace with pending payment, auth, and claims coverage", () => {
    const seed = buildDemoWorkspaceSeed(Date.parse("2026-03-27T12:00:00.000Z"))

    const femaleCount = seed.patients.filter((patient) => patient.sex === "female").length
    const maleCount = seed.patients.filter((patient) => patient.sex === "male").length

    expect(seed.patients.length).toBeGreaterThanOrEqual(5)
    expect(femaleCount).toBeGreaterThan(maleCount)
    expect(seed.bills.some((bill) => bill.status === BILL_STATUS.PENDING_PAYMENT)).toBe(true)
    expect(seed.bills.some((bill) => bill.status === BILL_STATUS.AWAITING_AUTH)).toBe(true)
    expect(seed.bills.some((bill) => bill.status === BILL_STATUS.AUTH_CONFIRMED)).toBe(true)
    expect(seed.bills.some((bill) => bill.status === BILL_STATUS.PAID)).toBe(true)
    expect(seed.bills.some((bill) => bill.status === BILL_STATUS.CLAIMED)).toBe(true)
    expect(
      seed.claimBatches.some((claimBatch) => claimBatch.status === CLAIM_BATCH_STATUS.OVERDUE),
    ).toBe(true)
  })

  test("tracks a dedicated self-pay bill for the WhatsApp smoke flow", () => {
    const seed = buildDemoWorkspaceSeed(Date.parse("2026-03-27T12:00:00.000Z"))
    const smokeBill = seed.bills.find((bill) => bill.key === seed.metaSmoke.billKey)
    const smokePatient = seed.patients.find((patient) => patient.key === seed.metaSmoke.patientKey)

    expect(smokePatient?.paymentType).toBe("self_pay")
    expect(smokeBill?.patientKey).toBe(seed.metaSmoke.patientKey)
    expect(smokeBill?.status).toBe(BILL_STATUS.PENDING_PAYMENT)
  })
})

describe("Submission assets", () => {
  test("gitignore excludes local smoke scripts", async () => {
    const source = await Bun.file("./.gitignore").text()
    expect(source).toContain("scripts/local/")
  })

  test("package.json exposes a production demo seed script", async () => {
    const packageJson = JSON.parse(await Bun.file("./package.json").text()) as {
      scripts?: Record<string, string>
    }

    expect(packageJson.scripts?.["demo:seed:prod"]).toBeDefined()
  })

  test("testing guide exists at the project root", async () => {
    const file = Bun.file("./testing_guide.md")
    expect(await file.exists()).toBe(true)
  })
})
