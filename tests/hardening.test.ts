import { describe, expect, test } from "bun:test"

import { BILL_STATUS } from "../src/lib/billing"
import {
  PAYMENT_LINK_TTL_MS,
  buildMetaWebhookSignature,
  buildMarketplaceTokenExpiresAt,
  canMutateBillAuthorizationCode,
  isCardCallbackResponseApproved,
  isMetaWebhookSignatureValid,
  isPublicPaymentLinkAvailable,
  validateInterswitchWebhookPayload,
} from "../src/lib/payments"

describe("Payment hardening helpers", () => {
  test("card callbacks only accept explicit success response codes", () => {
    expect(isCardCallbackResponseApproved("00")).toBe(true)
    expect(isCardCallbackResponseApproved("")).toBe(false)
    expect(isCardCallbackResponseApproved("09")).toBe(false)
  })

  test("public payment links expire and close once the bill is terminal", () => {
    const now = Date.UTC(2026, 2, 27, 12, 0, 0)

    expect(
      isPublicPaymentLinkAvailable({
        billStatus: BILL_STATUS.PENDING_PAYMENT,
        createdAt: now - PAYMENT_LINK_TTL_MS + 60_000,
        tokenIssuedAt: undefined,
        paymentInitiatedAt: undefined,
        now,
      }),
    ).toBe(true)

    expect(
      isPublicPaymentLinkAvailable({
        billStatus: BILL_STATUS.PENDING_PAYMENT,
        createdAt: now - PAYMENT_LINK_TTL_MS - 1,
        tokenIssuedAt: undefined,
        paymentInitiatedAt: undefined,
        now,
      }),
    ).toBe(false)

    expect(
      isPublicPaymentLinkAvailable({
        billStatus: BILL_STATUS.PAID,
        createdAt: now,
        tokenIssuedAt: now,
        paymentInitiatedAt: now,
        now,
      }),
    ).toBe(false)
  })

  test("webhook validation requires a completed successful NGN payment with the exact amount", () => {
    expect(
      validateInterswitchWebhookPayload({
        event: "TRANSACTION.COMPLETED",
        responseCode: "00",
        currency: "NGN",
        amountInKobo: 4100000,
        expectedAmountInKobo: 4100000,
        channel: "CARD",
      }),
    ).toEqual({
      isValid: true,
      normalizedChannel: "card",
      reason: null,
    })

    expect(
      validateInterswitchWebhookPayload({
        event: "TRANSACTION.FAILED",
        responseCode: "00",
        currency: "NGN",
        amountInKobo: 4100000,
        expectedAmountInKobo: 4100000,
        channel: "CARD",
      }),
    ).toEqual({
      isValid: false,
      normalizedChannel: null,
      reason: "Unsupported Interswitch webhook event.",
    })

    expect(
      validateInterswitchWebhookPayload({
        event: "TRANSACTION.COMPLETED",
        responseCode: "09",
        currency: "NGN",
        amountInKobo: 4100000,
        expectedAmountInKobo: 4100000,
        channel: "CARD",
      }),
    ).toEqual({
      isValid: false,
      normalizedChannel: null,
      reason: "Interswitch payment was not approved.",
    })

    expect(
      validateInterswitchWebhookPayload({
        event: "TRANSACTION.COMPLETED",
        responseCode: "00",
        currency: "USD",
        amountInKobo: 4100000,
        expectedAmountInKobo: 4100000,
        channel: "CARD",
      }),
    ).toEqual({
      isValid: false,
      normalizedChannel: null,
      reason: "Unexpected payment currency.",
    })

    expect(
      validateInterswitchWebhookPayload({
        event: "TRANSACTION.COMPLETED",
        responseCode: "00",
        currency: "NGN",
        amountInKobo: 4000000,
        expectedAmountInKobo: 4100000,
        channel: "CARD",
      }),
    ).toEqual({
      isValid: false,
      normalizedChannel: null,
      reason: "Unexpected payment amount.",
    })
  })

  test("authorization codes can only be changed before payment or claims", () => {
    expect(canMutateBillAuthorizationCode(BILL_STATUS.AWAITING_AUTH)).toBe(true)
    expect(canMutateBillAuthorizationCode(BILL_STATUS.AUTH_CONFIRMED)).toBe(true)
    expect(canMutateBillAuthorizationCode(BILL_STATUS.PAID)).toBe(false)
    expect(canMutateBillAuthorizationCode(BILL_STATUS.CLAIMED)).toBe(false)
  })
})

describe("Webhook and token helpers", () => {
  test("meta webhook signatures are validated with the app secret", () => {
    const body = JSON.stringify({
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.123", status: "read" }] } }] }],
    })
    const signature = buildMetaWebhookSignature("meta-secret", body)

    expect(signature.startsWith("sha256=")).toBe(true)
    expect(isMetaWebhookSignatureValid("meta-secret", body, signature)).toBe(true)
    expect(isMetaWebhookSignatureValid("meta-secret", body, "sha256=deadbeef")).toBe(false)
  })

  test("marketplace token expiry keeps a one-minute buffer before the provider expiry", () => {
    const issuedAt = Date.UTC(2026, 2, 27, 10, 0, 0)
    expect(buildMarketplaceTokenExpiresAt(issuedAt, 3600)).toBe(issuedAt + 3_540_000)
  })
})

describe("Hardening source integration", () => {
  test("payment schema and routes use the payment attempt ledger and remove the public finalize action", async () => {
    const schemaSource = await Bun.file("./convex/schema.ts").text()
    const paymentsSource = await Bun.file("./convex/payments.ts").text()
    const callbackPageSource = await Bun.file("./src/pages/PaymentCallbackCard.tsx").text()

    expect(schemaSource).toContain("payment_attempts: defineTable({")
    expect(schemaSource).toContain('.index("by_txn_ref", ["transactionReference"])')
    expect(paymentsSource).toContain("getPaymentAttemptByTransactionReference")
    expect(paymentsSource).not.toContain("export const finalizeCardPaymentCallback = action")
    expect(callbackPageSource).not.toContain("api.payments.finalizeCardPaymentCallback")
  })

  test("meta webhook verification happens before payload processing", async () => {
    const httpSource = await Bun.file("./convex/http.ts").text()

    expect(httpSource).toContain("x-hub-signature-256")
    expect(httpSource).toContain("isMetaWebhookSignatureValid")
    expect(httpSource).toContain('return new Response("Unauthorized", { status: 401 })')
  })

  test("legacy verification-bypass endpoints are blocked and verification actions require auth", async () => {
    const clinicsSource = await Bun.file("./convex/clinics.ts").text()
    const patientsSource = await Bun.file("./convex/patients.ts").text()
    const paymentsSource = await Bun.file("./convex/payments.ts").text()

    expect(clinicsSource).toContain("Use createClinicProfile for verified clinic onboarding.")
    expect(clinicsSource).toContain("Use updateCurrentClinicProfile for verified clinic updates.")
    expect(patientsSource).toContain("Use registerPatient so HMO registrations run verified NIN checks.")
    expect(paymentsSource).toContain("await requireClerkUserId(ctx)")
  })

  test("bill auth edits, claim creation, and auth config are hardened in source", async () => {
    const billsSource = await Bun.file("./convex/bills.ts").text()
    const claimsSource = await Bun.file("./convex/claims.ts").text()
    const claimsDataSource = await Bun.file("./convex/lib/claimsData.ts").text()
    const authConfigSource = await Bun.file("./convex/auth.config.ts").text()

    expect(billsSource).toContain("canMutateBillAuthorizationCode")
    expect(billsSource).toContain("Auth codes cannot be changed after payment or claim submission.")
    expect(claimsSource).toContain("A claim batch already exists for one or more selected bills.")
    expect(claimsDataSource).toContain('withIndex("by_clinic", (q) => q.eq("clinicId", clinicId))')
    expect(authConfigSource).toContain("CLERK_JWT_ISSUER_DOMAIN")
    expect(authConfigSource).not.toContain("logical-duckling-83.clerk.accounts.dev")
  })
})
