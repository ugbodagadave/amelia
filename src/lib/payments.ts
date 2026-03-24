import { sha512 } from "@noble/hashes/sha2.js"
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js"

export const BILL_PAYMENT_CHANNEL = {
  CARD: "card",
  OPAY: "opay",
} as const

export type BillPaymentChannel =
  (typeof BILL_PAYMENT_CHANNEL)[keyof typeof BILL_PAYMENT_CHANNEL]

export const PAYMENT_CALLBACK_STATUS = {
  SUCCESS: "success",
  FAILED: "failed",
  PENDING: "pending",
} as const

export const INTERSWITCH_RESPONSE_CODE = {
  SUCCESS: "00",
  INITIALIZED: "09",
} as const

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

export function buildTxnRef(timestamp = Date.now()) {
  return `AM${String(timestamp).slice(-13)}`
}

export function formatAmountInKobo(amountInNaira: number) {
  return Math.round(amountInNaira * 100)
}

export function buildWebCheckoutHash(input: BuildWebCheckoutHashInput) {
  const payload =
    input.txnRef +
    input.merchantCode +
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

export function validatePaymentLinkToken(token: string) {
  return /^pay_tok_[a-zA-Z0-9_-]{10,}$/.test(token.trim())
}

export function isSuccessfulPaymentResponseCode(responseCode: string) {
  return responseCode === INTERSWITCH_RESPONSE_CODE.SUCCESS
}

export function buildPublicPaymentPath(token: string) {
  return `/pay/${token}`
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
