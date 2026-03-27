import { describe, expect, test } from "bun:test"
import { ROUTES } from "../src/constants/routes"
import { NIGERIAN_BANK_OPTIONS } from "../data/nigerian-banks"
import {
  BILL_PAYMENT_CHANNEL,
  PAYMENT_CALLBACK_STATUS,
  PAYMENT_REQUEST_CHANNEL,
  PAYMENT_REQUEST_STATUS,
  extractMarketplaceAccountName,
  extractMarketplaceBankOptions,
  getMarketplaceNinVerificationResult,
  buildPublicPaymentPath,
  buildTxnRef,
  buildWebCheckoutHash,
  formatAmountInKobo,
  isSuccessfulPaymentResponseCode,
  normalizePhoneForWhatsApp,
  normalizePhoneForSms,
  parseMetaMessageStatus,
  shouldAutoResendPaymentRequest,
  buildWhatsAppTemplatePayload,
  getBankVerificationFailureMessage,
  hasVerifiedBankAccountName,
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

  test("normalizes patient phone numbers for whatsapp cloud api", () => {
    expect(normalizePhoneForWhatsApp("08012345678")).toBe("2348012345678")
    expect(normalizePhoneForWhatsApp("+2348012345678")).toBe("2348012345678")
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

  test("normalizes raw bank verification runtime errors into a user-facing message", () => {
    expect(getBankVerificationFailureMessage(new Error("AbortError Called by client"))).toBe(
      "Account could not be verified right now. Check the details and try again.",
    )
    expect(getBankVerificationFailureMessage(new Error("Marketplace request timed out."))).toBe(
      "Account could not be verified right now. Check the details and try again.",
    )
  })

  test("treats bank verification as successful only when a resolved account name is present", () => {
    expect(hasVerifiedBankAccountName("FRUITEX CLINIC TEST ACCOUNT")).toBe(true)
    expect(hasVerifiedBankAccountName("")).toBe(false)
    expect(hasVerifiedBankAccountName("   ")).toBe(false)
  })

  test("extracts and sorts bank options from the marketplace bank-list envelope", () => {
    expect(
      extractMarketplaceBankOptions({
        success: true,
        code: "200",
        message: "request processed successfully",
        data: [
          { name: "Zenith Bank", code: "057" },
          { name: "Access Bank", code: "044" },
        ],
      }),
    ).toEqual([
      { name: "Access Bank", code: "044" },
      { name: "Zenith Bank", code: "057" },
    ])
  })

  test("extracts bank options from the marketplace bank-list bare array response", () => {
    expect(
      extractMarketplaceBankOptions([
        { name: "Zenith Bank", code: "057" },
        { name: "Access Bank", code: "044" },
      ]),
    ).toEqual([
      { name: "Access Bank", code: "044" },
      { name: "Zenith Bank", code: "057" },
    ])
  })

  test("extracts verified account name from the nested marketplace resolve response", () => {
    expect(
      extractMarketplaceAccountName({
        success: true,
        code: "200",
        message: "request processed successfully",
        data: {
          bankDetails: {
            accountName: "MICHAEL JOHN DOE",
          },
        },
      }),
    ).toBe("MICHAEL JOHN DOE")
  })

  test("maps marketplace NIN responses into success and business-failure outcomes", () => {
    expect(
      getMarketplaceNinVerificationResult({
        nin_check: {
          status: "EXACT_MATCH",
        },
      }),
    ).toEqual({
      isVerified: true,
      status: "EXACT_MATCH",
    })

    expect(
      getMarketplaceNinVerificationResult({
        nin_check: {
          status: "NOT_MATCH",
        },
      }),
    ).toEqual({
      isVerified: false,
      status: "NOT_MATCH",
    })
  })

  test("ships a static alphabetized Nigerian bank catalog for the settlement-bank UI", () => {
    expect(NIGERIAN_BANK_OPTIONS.length).toBeGreaterThan(200)
    expect(NIGERIAN_BANK_OPTIONS).toContainEqual({ name: "Access Bank", code: "044" })
    expect(NIGERIAN_BANK_OPTIONS).toContainEqual({ name: "Guaranty Trust Bank", code: "058" })
    expect(NIGERIAN_BANK_OPTIONS).toContainEqual({ name: "Zenith Bank", code: "057" })
    expect(NIGERIAN_BANK_OPTIONS).toContainEqual({ name: "Moniepoint MFB", code: "50515" })
    expect(NIGERIAN_BANK_OPTIONS).toContainEqual({
      name: "OPay Digital Services Limited (OPay)",
      code: "999992",
    })
    expect(
      NIGERIAN_BANK_OPTIONS.every((bank, index, banks) =>
        index === 0 ? true : banks[index - 1].name.localeCompare(bank.name) <= 0,
      ),
    ).toBe(true)
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
    expect(PAYMENT_REQUEST_CHANNEL.WHATSAPP).toBe("whatsapp")
    expect(PAYMENT_REQUEST_STATUS.UNSENT).toBe("unsent")
    expect(PAYMENT_REQUEST_STATUS.DELIVERED).toBe("delivered")
  })

  test("builds the approved whatsapp utility template payload", () => {
    expect(
      buildWhatsAppTemplatePayload({
        to: "2349067748876",
        templateName: "bill_payment_request_v2",
        languageCode: "en",
        patientFirstName: "Emeka",
        clinicName: "Fruitex Clinic",
        formattedAmount: "NGN 12,000",
        reference: "AM1774381681527",
        paymentUrl: "https://app.getamelia.online/pay/pay_tok_example123456",
      }),
    ).toEqual({
      messaging_product: "whatsapp",
      to: "2349067748876",
      type: "template",
      template: {
        name: "bill_payment_request_v2",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "Emeka" },
              { type: "text", text: "Fruitex Clinic" },
              { type: "text", text: "NGN 12,000" },
              { type: "text", text: "AM1774381681527" },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: "pay/pay_tok_example123456" }],
          },
        ],
      },
    })
  })

  test("maps meta message statuses into amelia payment request state", () => {
    expect(parseMetaMessageStatus("sent")).toBe(PAYMENT_REQUEST_STATUS.SENT)
    expect(parseMetaMessageStatus("delivered")).toBe(PAYMENT_REQUEST_STATUS.DELIVERED)
    expect(parseMetaMessageStatus("read")).toBe(PAYMENT_REQUEST_STATUS.READ)
    expect(parseMetaMessageStatus("failed")).toBe(PAYMENT_REQUEST_STATUS.FAILED)
    expect(parseMetaMessageStatus("unknown_status")).toBe(null)
  })

  test("allows only one automatic resend for eligible unpaid payment requests", () => {
    expect(
      shouldAutoResendPaymentRequest({
        billStatus: "pending_payment",
        paymentRequestStatus: "sent",
        paymentRequestAttemptCount: 1,
        autoResendAt: Date.now() - 1_000,
      }),
    ).toBe(true)

    expect(
      shouldAutoResendPaymentRequest({
        billStatus: "paid",
        paymentRequestStatus: "sent",
        paymentRequestAttemptCount: 1,
        autoResendAt: Date.now() - 1_000,
      }),
    ).toBe(false)

    expect(
      shouldAutoResendPaymentRequest({
        billStatus: "pending_payment",
        paymentRequestStatus: "failed",
        paymentRequestAttemptCount: 1,
        autoResendAt: Date.now() - 1_000,
      }),
    ).toBe(false)

    expect(
      shouldAutoResendPaymentRequest({
        billStatus: "pending_payment",
        paymentRequestStatus: "sent",
        paymentRequestAttemptCount: 2,
        autoResendAt: Date.now() - 1_000,
      }),
    ).toBe(false)
  })

  test("wires payment pages, convex payment actions, onboarding bank verification, and webhook handling", async () => {
    const appSource = await Bun.file("./src/App.tsx").text()
    const routesSource = await Bun.file("./src/constants/routes.ts").text()
    const billDetailSource = await Bun.file("./src/pages/BillDetail.tsx").text()
    const paymentLinkSource = await Bun.file("./src/pages/PaymentLink.tsx").text()
    const paymentCardSource = await Bun.file("./src/components/billing/PaymentReadinessCard.tsx").text()
    const paymentCallbackCardSource = await Bun.file("./src/pages/PaymentCallbackCard.tsx").text()
    const paymentCallbackOpaySource = await Bun.file("./src/pages/PaymentCallbackOpay.tsx").text()
    const onboardingSource = await Bun.file("./src/pages/Onboarding.tsx").text()
    const clinicsSource = await Bun.file("./convex/clinics.ts").text()
    const paymentsSource = await Bun.file("./convex/payments.ts").text()
    const patientsSource = await Bun.file("./convex/patients.ts").text()
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
    expect(billDetailSource).toContain("api.payments.sendPaymentRequestViaWhatsApp")
    expect(billDetailSource).toContain('window.addEventListener("focus"')
    expect(paymentCardSource).toContain("Send payment request")
    expect(paymentCardSource).toContain("Resend payment request")
    expect(paymentCardSource).toContain("Assisted payment")
    expect(paymentCardSource).toContain("Pay with Card")
    expect(paymentCardSource).toContain("Pay with OPay")
    expect(paymentCardSource).toContain("Confirm OPay payment")
    expect(paymentCardSource).toContain("Copy payment link")
    expect(paymentLinkSource).toContain("__AMELIA_CARD_CHECKOUT_DEBUG__")
    expect(paymentLinkSource).toContain("[Amelia] Interswitch hosted checkout payload")
    expect(paymentCallbackCardSource).toContain("Amelia only accepts the server callback result on this screen.")
    expect(paymentCallbackCardSource).not.toContain("finalizeCardPaymentCallback")
    expect(paymentCallbackCardSource).toContain("View bill")
    expect(paymentCallbackOpaySource).toContain("Confirm payment again")
    expect(paymentCallbackOpaySource).toContain("View bill")
    expect(onboardingSource).toContain("api.payments.verifyBankAccount")
    expect(onboardingSource).toContain("../../data/nigerian-banks")
    expect(clinicsSource).toContain("export const createClinicProfile")
    expect(clinicsSource).toContain("export const updateCurrentClinicProfile")
    expect(clinicsSource).toContain("bankCode")
    expect(clinicsSource).toContain("accountNumber")
    expect(clinicsSource).toContain("accountName")
    expect(patientsSource).toContain("export const registerPatient")
    expect(patientsSource).toContain("ninVerificationStatus")
    expect(paymentsSource).toContain("verifyNIN")
    expect(paymentsSource).toContain("getPublicPaymentByToken")
    expect(paymentsSource).toContain("marketplace_banks")
    expect(paymentsSource).toContain("BANK_CACHE_STALE_AFTER_MS")
    expect(paymentsSource).toContain("sendPaymentRequestViaWhatsApp")
    expect(paymentsSource).toContain("META_WEBHOOK_VERIFY_TOKEN")
    expect(paymentsSource).toContain("buildWhatsAppTemplatePayload")
    expect(paymentsSource).toContain("shouldAutoResendPaymentRequest")
    expect(paymentsSource).toContain("finalizeCardPaymentCallbackInternal")
    expect(paymentsSource).toContain("getPaymentAttemptByTransactionReference")
    expect(paymentsSource).toContain("PAYMENT_ATTEMPT_STATUS.CALLBACK_PENDING")
    expect(paymentsSource).toContain('return `${resolveAppUrl()}${ROUTES.PAYMENT_CALLBACK_CARD}`')
    expect(paymentsSource).toContain("const transactionReference = buildTxnRef()")
    expect(paymentsSource).toContain("encodeBasicAuthCredentials")
    expect(paymentsSource).not.toContain("Buffer.from")
    expect(paymentsSource).toContain('merchant_code')
    expect(paymentsSource).toContain('pay_item_id')
    expect(paymentsSource).toContain('txn_ref')
    expect(paymentsSource).not.toContain('merchantcode:')
    expect(paymentsSource).not.toContain('[Interswitch webhook] Signature mismatch')
    expect(httpSource).toContain("/api/webhooks/interswitch")
    expect(httpSource).toContain("/api/payments/interswitch/card-callback")
    expect(httpSource).toContain("/api/webhooks/meta")
    expect(httpSource).toContain("hub.verify_token")
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
    expect(schemaSource).toContain("paymentRequestChannel")
    expect(schemaSource).toContain("paymentRequestStatus")
    expect(schemaSource).toContain("paymentRequestAttemptCount")
    expect(schemaSource).toContain('index("by_payment_link_token"')
    expect(schemaSource).toContain("marketplace_banks")
    expect(schemaSource).toContain("ninVerificationStatus")
    expect(schemaSource).toContain("bankAccountVerifiedAt")
    expect(envSource).toContain("INTERSWITCH_WEBHOOK_SECRET")
    expect(envSource).toContain("META_ACCESS_TOKEN")
    expect(envSource).toContain("META_PHONE_NUMBER_ID")
    expect(envSource).toContain("META_WABA_ID")
    expect(envSource).toContain("META_WEBHOOK_VERIFY_TOKEN")
    expect(planSource).toContain("Phase 4")
    expect(planSource).toContain("patient-facing payment route")
    expect(planSource).toContain("WhatsApp-first")
  })
})
