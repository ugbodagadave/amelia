import { describe, expect, test } from "bun:test"
import { ROUTES } from "../src/constants/routes"
import {
  calculateAgeFromDateOfBirth,
  maskNin,
  normalizePhoneNumber,
  validatePatientInput,
} from "../src/lib/patients"

describe("Phase 2 — Patient validation", () => {
  test("rejects invalid NIN values for HMO patients", () => {
    expect(
      validatePatientInput({
        surname: "Okafor",
        otherNames: "Emeka",
        dateOfBirth: "1990-03-10",
        sex: "male",
        phone: "08012345678",
        nin: "1234567890",
        paymentType: "hmo",
        hmoName: "Hygeia HMO",
        enrolleeNhisNo: "HG-12345",
        hmoAdditionalFields: [],
      }).nin,
    ).toBeDefined()

    expect(
      validatePatientInput({
        surname: "Okafor",
        otherNames: "Emeka",
        dateOfBirth: "1990-03-10",
        sex: "male",
        phone: "08012345678",
        nin: "12345678ABC",
        paymentType: "hmo",
        hmoName: "Hygeia HMO",
        enrolleeNhisNo: "HG-12345",
        hmoAdditionalFields: [],
      }).nin,
    ).toBeDefined()
  })

  test("accepts exactly 11 digits for HMO NIN", () => {
    expect(
      validatePatientInput({
        surname: "Okafor",
        otherNames: "Emeka",
        dateOfBirth: "1990-03-10",
        sex: "male",
        phone: "08012345678",
        nin: "12345678901",
        paymentType: "hmo",
        hmoName: "Hygeia HMO",
        enrolleeNhisNo: "HG-12345",
        hmoAdditionalFields: [],
      }),
    ).toEqual({})
  })

  test("rejects non-mobile phone formats and accepts 07, 08, and 09 prefixes", () => {
    expect(
      validatePatientInput({
        surname: "Bello",
        otherNames: "Amina",
        dateOfBirth: "1992-07-11",
        sex: "female",
        phone: "0112345678",
        nin: "",
        paymentType: "self_pay",
        hmoAdditionalFields: [],
      }).phone,
    ).toBeDefined()

    expect(normalizePhoneNumber("07012345678")).toBe("07012345678")
    expect(normalizePhoneNumber("08012345678")).toBe("08012345678")
    expect(normalizePhoneNumber("09012345678")).toBe("09012345678")
  })

  test("self-pay patients can save without NIN and without HMO fields", () => {
    expect(
      validatePatientInput({
        surname: "Bello",
        otherNames: "Amina",
        dateOfBirth: "1992-07-11",
        sex: "female",
        phone: "08012345678",
        nin: "",
        paymentType: "self_pay",
        hmoAdditionalFields: [],
      }),
    ).toEqual({})
  })

  test("HMO patients require NHIS number and template-specific fields", () => {
    const result = validatePatientInput({
      surname: "Okafor",
      otherNames: "Emeka",
      dateOfBirth: "1990-03-10",
      sex: "male",
      phone: "08012345678",
      nin: "12345678901",
      paymentType: "hmo",
      hmoName: "Police HMO",
      enrolleeNhisNo: "",
      hmoAdditionalFields: [
        {
          fieldKey: "force_number",
          label: "Force No.",
          value: "",
        },
      ],
    })

    expect(result.enrolleeNhisNo).toBeDefined()
    expect(result.hmoAdditionalFields).toBeDefined()
  })
})

describe("Phase 2 — Patient helpers", () => {
  test("calculates age from date of birth", () => {
    expect(calculateAgeFromDateOfBirth("2000-03-24", new Date("2026-03-24"))).toBe(26)
    expect(calculateAgeFromDateOfBirth("2000-03-25", new Date("2026-03-24"))).toBe(25)
  })

  test("masks NIN for patient list display", () => {
    expect(maskNin("12345678901")).toBe("1234*****01")
    expect(maskNin(undefined)).toBe("Not provided")
  })
})

describe("Phase 2 — Routing and source integration", () => {
  test("patient detail route constant is defined", () => {
    expect(ROUTES.PATIENT_DETAIL).toBe("/patients/:patientId")
  })

  test("patients page uses dialog registration and tabs-backed profile support", async () => {
    const patientsSource = await Bun.file("./src/pages/Patients.tsx").text()
    const appSource = await Bun.file("./src/App.tsx").text()

    expect(patientsSource).toContain("Dialog")
    expect(patientsSource).toContain("Table")
    expect(patientsSource).toContain("useDeferredValue")
    expect(patientsSource).toContain("api.patients.list")
    expect(appSource).toContain("ROUTES.PATIENT_DETAIL")
  })

  test("plan documents phase 2 once implementation is complete", async () => {
    const plan = await Bun.file("./docs/plan.md").text()
    expect(plan).toContain("Phase 2")
  })
})
