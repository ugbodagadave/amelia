import { hmac } from "@noble/hashes/hmac.js"
import { sha256, sha512 } from "@noble/hashes/sha2.js"
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js"

export const BILL_PAYMENT_CHANNEL = {
  CARD: "card",
  OPAY: "opay",
} as const

export type BillPaymentChannel =
  (typeof BILL_PAYMENT_CHANNEL)[keyof typeof BILL_PAYMENT_CHANNEL]

export const PAYMENT_REQUEST_CHANNEL = {
  WHATSAPP: "whatsapp",
  SMS: "sms",
} as const

export type PaymentRequestChannel =
  (typeof PAYMENT_REQUEST_CHANNEL)[keyof typeof PAYMENT_REQUEST_CHANNEL]

export const PAYMENT_REQUEST_STATUS = {
  UNSENT: "unsent",
  QUEUED: "queued",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
} as const

export type PaymentRequestStatus =
  (typeof PAYMENT_REQUEST_STATUS)[keyof typeof PAYMENT_REQUEST_STATUS]

export const PAYMENT_CALLBACK_STATUS = {
  SUCCESS: "success",
  FAILED: "failed",
  PENDING: "pending",
} as const

export const PAYMENT_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const INTERSWITCH_RESPONSE_CODE = {
  SUCCESS: "00",
  INITIALIZED: "09",
} as const

export interface BuildWhatsAppTemplatePayloadInput {
  to: string
  templateName: string
  languageCode: string
  patientFirstName: string
  clinicName: string
  formattedAmount: string
  reference: string
  paymentUrl: string
}

export interface PaymentRequestAutoResendInput {
  billStatus: string
  paymentRequestStatus: PaymentRequestStatus | string
  paymentRequestAttemptCount: number
  autoResendAt: number | null
  now?: number
}

export interface BuildWebCheckoutHashInput {
  txnRef: string
  merchantCode: string
  payItemId: string
  amountInKobo: number
  redirectUrl: string
  macKey: string
}

export interface BankVerificationInput {
  accountNumber: string
  bankCode: string
}

export interface MarketplaceBankOption {
  name: string
  code: string
}

export interface MarketplaceBankListResponse {
  success?: boolean
  code?: string
  message?: string
  data?: Array<{
    name?: string
    code?: string
  }>
}

export interface MarketplaceAccountResolveResponse {
  success?: boolean
  code?: string
  message?: string
  data?: {
    bankDetails?: {
      accountName?: string
    }
  }
  bankDetails?: {
    accountName?: string
  }
}

export interface MarketplaceNinVerificationResponse {
  nin_check?: {
    status?: string
  }
}

export interface PublicPaymentLinkAvailabilityInput {
  billStatus: string
  createdAt: number
  tokenIssuedAt?: number | null
  paymentInitiatedAt?: number | null
  now?: number
}

export interface InterswitchWebhookValidationInput {
  event?: string | null
  responseCode?: string | null
  currency?: string | null
  amountInKobo?: number | null
  expectedAmountInKobo: number
  channel?: string | null
}

export function buildTxnRef(timestamp = Date.now()) {
  return `AM${String(timestamp).slice(-13)}`
}

export function formatAmountInKobo(amountInNaira: number) {
  return Math.round(amountInNaira * 100)
}

export function buildWebCheckoutHash(input: BuildWebCheckoutHashInput) {
  const payload =
    input.txnRef +
    input.payItemId +
    input.payItemId +
    input.amountInKobo +
    input.redirectUrl +
    input.macKey

  return bytesToHex(sha512(utf8ToBytes(payload)))
}

export function normalizePhoneForSms(phone: string) {
  const digits = phone.replace(/\D/g, "")

  if (!digits) {
    return ""
  }

  if (digits.startsWith("234") && digits.length === 13) {
    return `+${digits}`
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `+234${digits.slice(1)}`
  }

  return `+234${digits.replace(/^234/, "")}`
}

export function normalizePhoneForWhatsApp(phone: string) {
  return normalizePhoneForSms(phone).replace(/^\+/, "")
}

export function validatePaymentLinkToken(token: string) {
  return /^pay_tok_[a-zA-Z0-9_-]{10,}$/.test(token.trim())
}

export function isSuccessfulPaymentResponseCode(responseCode: string) {
  return responseCode === INTERSWITCH_RESPONSE_CODE.SUCCESS
}

export function isCardCallbackResponseApproved(responseCode: string) {
  return isSuccessfulPaymentResponseCode(responseCode.trim())
}

export function buildPublicPaymentPath(token: string) {
  return `/pay/${token}`
}

function getPaymentLinkIssuedAt(input: PublicPaymentLinkAvailabilityInput) {
  return input.tokenIssuedAt ?? input.paymentInitiatedAt ?? input.createdAt
}

export function isPublicPaymentLinkAvailable(input: PublicPaymentLinkAvailabilityInput) {
  if (input.billStatus === "paid" || input.billStatus === "claimed") {
    return false
  }

  const issuedAt = getPaymentLinkIssuedAt(input)
  return issuedAt + PAYMENT_LINK_TTL_MS > (input.now ?? Date.now())
}

function buildTemplateUrlSuffix(paymentUrl: string) {
  const url = new URL(paymentUrl)
  return `${url.pathname.replace(/^\//, "")}${url.search}${url.hash}`
}

export function buildWhatsAppTemplatePayload(input: BuildWhatsAppTemplatePayloadInput) {
  return {
    messaging_product: "whatsapp",
    to: input.to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: input.patientFirstName },
            { type: "text", text: input.clinicName },
            { type: "text", text: input.formattedAmount },
            { type: "text", text: input.reference },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: buildTemplateUrlSuffix(input.paymentUrl) }],
        },
      ],
    },
  }
}

export function parseMetaMessageStatus(status: string): PaymentRequestStatus | null {
  switch (status) {
    case "sent":
      return PAYMENT_REQUEST_STATUS.SENT
    case "delivered":
      return PAYMENT_REQUEST_STATUS.DELIVERED
    case "read":
      return PAYMENT_REQUEST_STATUS.READ
    case "failed":
      return PAYMENT_REQUEST_STATUS.FAILED
    default:
      return null
  }
}

export function canMutateBillAuthorizationCode(status: string) {
  return status === "awaiting_auth" || status === "auth_confirmed"
}

function normalizeWebhookChannel(channel?: string | null) {
  switch ((channel ?? "").trim().toUpperCase()) {
    case "CARD":
      return BILL_PAYMENT_CHANNEL.CARD
    default:
      return null
  }
}

export function validateInterswitchWebhookPayload(input: InterswitchWebhookValidationInput) {
  if (input.event !== "TRANSACTION.COMPLETED") {
    return {
      isValid: false,
      normalizedChannel: null,
      reason: "Unsupported Interswitch webhook event.",
    } as const
  }

  if (!isSuccessfulPaymentResponseCode((input.responseCode ?? "").trim())) {
    return {
      isValid: false,
      normalizedChannel: null,
      reason: "Interswitch payment was not approved.",
    } as const
  }

  if ((input.currency ?? "").trim().toUpperCase() !== "NGN") {
    return {
      isValid: false,
      normalizedChannel: null,
      reason: "Unexpected payment currency.",
    } as const
  }

  if (input.amountInKobo !== input.expectedAmountInKobo) {
    return {
      isValid: false,
      normalizedChannel: null,
      reason: "Unexpected payment amount.",
    } as const
  }

  const normalizedChannel = normalizeWebhookChannel(input.channel)
  if (!normalizedChannel) {
    return {
      isValid: false,
      normalizedChannel: null,
      reason: "Unsupported payment channel.",
    } as const
  }

  return {
    isValid: true,
    normalizedChannel,
    reason: null,
  } as const
}

function buildHmacHex(secret: string, body: string, algorithm: "sha256" | "sha512") {
  const hash = algorithm === "sha256" ? sha256 : sha512
  return bytesToHex(hmac(hash, utf8ToBytes(secret), utf8ToBytes(body)))
}

export function buildMetaWebhookSignature(secret: string, body: string) {
  return `sha256=${buildHmacHex(secret, body, "sha256")}`
}

export function isMetaWebhookSignatureValid(secret: string, body: string, signature?: string | null) {
  if (!signature?.trim()) {
    return false
  }

  return buildMetaWebhookSignature(secret, body) === signature.trim()
}

export function buildInterswitchWebhookSignature(secret: string, body: string) {
  return buildHmacHex(secret, body, "sha512")
}

export function buildMarketplaceTokenExpiresAt(issuedAt: number, expiresInSeconds: number) {
  return issuedAt + expiresInSeconds * 1000 - 60_000
}

export function shouldAutoResendPaymentRequest(input: PaymentRequestAutoResendInput) {
  if (input.billStatus === "paid" || input.billStatus === "claimed") {
    return false
  }

  if (input.paymentRequestStatus === PAYMENT_REQUEST_STATUS.FAILED) {
    return false
  }

  if (input.paymentRequestAttemptCount !== 1) {
    return false
  }

  if (!input.autoResendAt) {
    return false
  }

  return input.autoResendAt <= (input.now ?? Date.now())
}

export function validateBankVerificationInput(input: BankVerificationInput) {
  const errors: Partial<Record<keyof BankVerificationInput, string>> = {}

  if (!input.accountNumber.trim()) {
    errors.accountNumber = "Account number is required."
  } else if (!/^\d{10}$/.test(input.accountNumber.trim())) {
    errors.accountNumber = "Account number must be 10 digits."
  }

  if (!input.bankCode.trim()) {
    errors.bankCode = "Select a bank."
  }

  return errors
}

export function getBankVerificationFailureMessage(error: unknown) {
  const fallback = "Account could not be verified right now. Check the details and try again."

  if (!(error instanceof Error)) {
    return fallback
  }

  const normalizedMessage = error.message.trim()
  if (!normalizedMessage) {
    return fallback
  }

  const lowerCaseMessage = normalizedMessage.toLowerCase()
  if (
    lowerCaseMessage.includes("aborterror") ||
    lowerCaseMessage.includes("called by client") ||
    lowerCaseMessage.includes("timed out")
  ) {
    return fallback
  }

  return normalizedMessage
}

export function hasVerifiedBankAccountName(accountName: string) {
  return accountName.trim().length > 0
}

export function extractMarketplaceBankOptions(
  response: MarketplaceBankListResponse | Array<{ name?: string; code?: string }>,
): MarketplaceBankOption[] {
  const rawBanks = Array.isArray(response) ? response : (response.data ?? [])

  return rawBanks
    .filter(
      (bank): bank is MarketplaceBankOption =>
        typeof bank?.name === "string" &&
        bank.name.trim().length > 0 &&
        typeof bank.code === "string" &&
        bank.code.trim().length > 0,
    )
    .map((bank) => ({
      name: bank.name.trim(),
      code: bank.code.trim(),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function extractMarketplaceAccountName(response: MarketplaceAccountResolveResponse) {
  return response.data?.bankDetails?.accountName?.trim() || response.bankDetails?.accountName?.trim() || ""
}

export function getMarketplaceNinVerificationResult(
  response: MarketplaceNinVerificationResponse,
) {
  const status = response.nin_check?.status?.trim() || "UNKNOWN"

  return {
    isVerified: status === "EXACT_MATCH",
    status,
  }
}
