import { describe, expect, test } from "bun:test"
import { ROUTES } from "../src/constants/routes"
import {
  BILL_PAYMENT_CHANNEL,
  PAYMENT_CALLBACK_STATUS,
  buildPublicPaymentPath,
  buildTxnRef,
  buildWebCheckoutHash,
  formatAmountInKobo,
  isSuccessfulPaymentResponseCode,
  normalizePhoneForSms,
  validateBankVerificationInput,
  validatePaymentLinkToken,
} from "../src/lib/payments"
import { validateClinicOnboardingInput } from "../src/lib/clinicOnboarding"

describe("Phase 4 - Payment helpers", () => {
  test("builds a transaction reference that stays within the interswitch limit", () => {
    const txnRef = buildTxnRef(1774197510100)

    expect(txnRef).toBe("AM1774197510100")
    expect(txnRef.length).toBeLessThanOrEqual(15)
  })

  test("formats naira amounts into kobo for gateway requests", () => {
    expect(formatAmountInKobo(12500)).toBe(1250000)
    expect(formatAmountInKobo(12500.75)).toBe(1250075)
  })

  test("generates the web checkout sha-512 hash with the confirmed parameter order", () => {
    expect(
      buildWebCheckoutHash({
        txnRef: "AM1774197510100",
        merchantCode: "MX180207",
        payItemId: "Default_Payable_MX180207",
        amountInKobo: 100000,
        redirectUrl: "https://amelia.example/pay/callback/card",
        macKey: "secret-mac",
      }),
    ).toBe(
      "a8739e3a9c19c116d86693631696f7ba0e0b8570b79fce7c6c160afddfa746601cadd84f4e72ca482b18faa218871b36fd2de87d8dbd6d3e01260ec2f76774d3",
    )
  })

  test("normalizes clinic phone numbers for africa's talking", () => {
    expect(normalizePhoneForSms("08012345678")).toBe("+2348012345678")
    expect(normalizePhoneForSms("+2348012345678")).toBe("+2348012345678")
  })

  test("validates tokenized patient payment links", () => {
    expect(validatePaymentLinkToken("pay_tok_1234567890")).toBe(true)
    expect(validatePaymentLinkToken("bad token")).toBe(false)
  })

  test("recognizes successful callback response codes", () => {
    expect(isSuccessfulPaymentResponseCode("00")).toBe(true)
    expect(isSuccessfulPaymentResponseCode("09")).toBe(false)
  })

  test("validates bank verification inputs before onboarding resolve calls", () => {
    expect(validateBankVerificationInput({ accountNumber: "", bankCode: "" })).toEqual({
      accountNumber: "Account number is required.",
      bankCode: "Select a bank.",
    })
  })
})

describe("Phase 4 - Onboarding validation", () => {
  test("requires verified bank details in clinic onboarding", () => {
    expect(
      validateClinicOnboardingInput({
        name: "Apex Specialist Clinic",
        address: "12 Marina Road, Lagos",
        nhiaFacilityCode: "NHIA-1029",
        phone: "+2348012345678",
        email: "ops@apexclinic.ng",
        medicalDirectorName: "Dr. Amina Bello",
        bankCode: "",
        bankName: "",
        accountNumber: "",
        accountName: "",
        bankAccountVerified: false,
      }),
    ).toEqual({
      bankCode: "Select a bank.",
      accountNumber: "Account number is required.",
      accountName: "Resolve and confirm the clinic payout account.",
    })
  })
})

describe("Phase 4 - Routing and source integration", () => {
  test("defines public payment and callback routes", () => {
    expect(ROUTES.PAYMENT_LINK).toBe("/pay/:token")
    expect(ROUTES.PAYMENT_CALLBACK_CARD).toBe("/pay/callback/card")
    expect(ROUTES.PAYMENT_CALLBACK_OPAY).toBe("/pay/callback/opay")
    expect(buildPublicPaymentPath("pay_tok_1234567890")).toBe("/pay/pay_tok_1234567890")
  })

  test("exports the channel and callback status constants used by payment flows", () => {
    expect(BILL_PAYMENT_CHANNEL.CARD).toBe("card")
    expect(BILL_PAYMENT_CHANNEL.OPAY).toBe("opay")
    expect(PAYMENT_CALLBACK_STATUS.SUCCESS).toBe("success")
  })

  test("wires payment pages, convex payment actions, onboarding bank verification, and webhook handling", async () => {
    const appSource = await Bun.file("./src/App.tsx").text()
    const routesSource = await Bun.file("./src/constants/routes.ts").text()
    const billDetailSource = await Bun.file("./src/pages/BillDetail.tsx").text()
    const paymentCardSource = await Bun.file("./src/components/billing/PaymentReadinessCard.tsx").text()
    const paymentCallbackCardSource = await Bun.file("./src/pages/PaymentCallbackCard.tsx").text()
    const paymentCallbackOpaySource = await Bun.file("./src/pages/PaymentCallbackOpay.tsx").text()
    const onboardingSource = await Bun.file("./src/pages/Onboarding.tsx").text()
    const clinicsSource = await Bun.file("./convex/clinics.ts").text()
    const paymentsSource = await Bun.file("./convex/payments.ts").text()
    const httpSource = await Bun.file("./convex/http.ts").text()
    const inngestEventsSource = await Bun.file("./src/inngest/events.ts").text()
    const inngestFunctionsSource = await Bun.file("./src/inngest/functions/index.ts").text()

    expect(routesSource).toContain("PAYMENT_LINK")
    expect(routesSource).toContain("PAYMENT_CALLBACK_CARD")
    expect(routesSource).toContain("PAYMENT_CALLBACK_OPAY")
    expect(appSource).toContain("PaymentLinkPage")
    expect(appSource).toContain("PaymentCallbackCardPage")
    expect(appSource).toContain("PaymentCallbackOpayPage")
    expect(billDetailSource).toContain("api.payments.initiateCardPayment")
    expect(billDetailSource).toContain("api.payments.initiateOPayPayment")
    expect(billDetailSource).toContain('window.addEventListener("focus"')
    expect(paymentCardSource).toContain("Pay with Card")
    expect(paymentCardSource).toContain("Pay with OPay")
    expect(paymentCardSource).toContain("Confirm OPay payment")
    expect(paymentCardSource).toContain("Copy payment link")
    expect(paymentCallbackCardSource).toContain("Finalize payment again")
    expect(paymentCallbackCardSource).toContain("View bill")
    expect(paymentCallbackOpaySource).toContain("Confirm payment again")
    expect(paymentCallbackOpaySource).toContain("View bill")
    expect(onboardingSource).toContain("api.payments.listBanks")
    expect(onboardingSource).toContain("api.payments.verifyBankAccount")
    expect(clinicsSource).toContain("bankCode")
    expect(clinicsSource).toContain("accountNumber")
    expect(clinicsSource).toContain("accountName")
    expect(paymentsSource).toContain("verifyNIN")
    expect(paymentsSource).toContain("getPublicPaymentByToken")
    expect(paymentsSource).toContain("finalizeCardPaymentCallbackInternal")
    expect(paymentsSource).toContain("const hasProviderReference = Boolean(args.payRef?.trim())")
    expect(paymentsSource).toContain("responseCodeMissingButPaid")
    expect(paymentsSource).toContain("const transactionReference = buildTxnRef()")
    expect(paymentsSource).toContain('merchant_code')
    expect(paymentsSource).toContain('pay_item_id')
    expect(paymentsSource).toContain('txn_ref')
    expect(paymentsSource).not.toContain('merchantcode:')
    expect(paymentsSource).not.toContain('[Interswitch webhook] Signature mismatch')
    expect(httpSource).toContain("/api/webhooks/interswitch")
    expect(httpSource).toContain("/api/payments/interswitch/card-callback")
    expect(inngestEventsSource).toContain("bill/payment_link.sent")
    expect(inngestEventsSource).toContain("payment/confirmed")
    expect(inngestFunctionsSource).toContain("billPaymentLinkSent")
  })

  test("schema, env doc, and plan capture the phase 4 payment rollout", async () => {
    const schemaSource = await Bun.file("./convex/schema.ts").text()
    const envSource = await Bun.file("./docs/env.md").text()
    const planSource = await Bun.file("./docs/plan.md").text()

    expect(schemaSource).toContain("paymentLinkToken")
    expect(schemaSource).toContain("paymentChannel")
    expect(schemaSource).toContain('index("by_payment_link_token"')
    expect(envSource).toContain("INTERSWITCH_WEBHOOK_SECRET")
    expect(planSource).toContain("Phase 4")
    expect(planSource).toContain("patient-facing payment route")
  })
})
