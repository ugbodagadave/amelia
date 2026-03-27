import { ConvexError, v } from "convex/values"
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { api, internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { requireClerkUserId } from "./lib/auth"
import {
  BILL_PAYMENT_CHANNEL,
  PAYMENT_REQUEST_CHANNEL,
  PAYMENT_REQUEST_STATUS,
  buildInterswitchWebhookSignature,
  buildPublicPaymentPath,
  buildTxnRef,
  buildWhatsAppTemplatePayload,
  buildWebCheckoutHash,
  formatAmountInKobo,
  isCardCallbackResponseApproved,
  isPublicPaymentLinkAvailable,
  isSuccessfulPaymentResponseCode,
  normalizePhoneForWhatsApp,
  normalizePhoneForSms,
  parseMetaMessageStatus,
  shouldAutoResendPaymentRequest,
  validateBankVerificationInput,
  getBankVerificationFailureMessage,
  hasVerifiedBankAccountName,
  validateInterswitchWebhookPayload,
  validatePaymentLinkToken,
} from "../src/lib/payments"
import { NIGERIAN_BANK_OPTIONS } from "../data/nigerian-banks"
import { BILL_STATUS } from "../src/lib/billing"
import { ROUTES } from "../src/constants/routes"
import { NOTIFICATION_TYPE } from "../src/lib/notifications"
import { inngest } from "./inngestClient"
import {
  fetchMarketplaceBankList,
  fetchMarketplaceToken,
  resolveMarketplaceBankAccount,
  verifyMarketplaceNin,
} from "./lib/marketplace"
// Marketplace auth token generation still uses encodeBasicAuthCredentials in convex/lib/marketplace.ts.

interface BillPaymentContext {
  _id: Id<"bills">
  clinicId: Id<"clinics">
  patientId: Id<"patients">
  totalAmount: number
  status: string
  authorizationCode?: string | null
  patientPaymentType: "self_pay" | "hmo"
  patientName: string
  patientPhone: string
  clinicName: string
  transactionReference?: string | null
  paymentLinkToken?: string | null
  paymentLink?: string | null
  paymentChannel?: "card" | "opay" | null
  paymentRequestChannel?: "whatsapp" | "sms" | null
  paymentRequestStatus?: string | null
  paymentRequestSentAt?: number | null
  paymentRequestDeliveredAt?: number | null
  paymentRequestReadAt?: number | null
  paymentRequestMessageId?: string | null
  paymentRequestFailedReason?: string | null
  paymentRequestLastAttemptAt?: number | null
  paymentRequestAttemptCount?: number | null
  paymentRequestAutoResendAt?: number | null
  paymentRequestLastResentAt?: number | null
  paidAt?: number | null
}

interface PaymentFinalizeResult {
  status: "success" | "failed"
  message: string
  billId: Id<"bills"> | null
}

interface OPayConfirmResult {
  status: "success" | "pending"
  responseCode: string
  billId: Id<"bills"> | null
}

interface PaymentRequestSendResult {
  ok: true
  messageId: string
  paymentUrl: string
}

type MetaLifecycleStatus = "sent" | "delivered" | "read" | "failed"
const BANK_CACHE_STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000
const EXTERNAL_REQUEST_TIMEOUT_MS = 8_000
const PAYMENT_ATTEMPT_STATUS = {
  INITIATED: "initiated",
  CALLBACK_PENDING: "callback_pending",
  PAID: "paid",
  FAILED: "failed",
} as const

async function getCurrentClinicId(ctx: MutationCtx | QueryCtx) {
  const clerkUserId = await requireClerkUserId(ctx)
  const clinic = await ctx.db
    .query("clinics")
    .withIndex("by_clerk_user_id", (q) => q.eq("createdByClerkUserId", clerkUserId))
    .unique()

  if (!clinic) {
    throw new ConvexError({
      code: "CLINIC_NOT_FOUND",
      message: "Complete onboarding before using payment features.",
    })
  }

  return clinic._id
}

async function getCurrentClinicForAction(ctx: ActionCtx) {
  const clerkUserId = await requireClerkUserId(ctx)
  const clinic = await ctx.runQuery(internal.payments.getClinicByClerkUserId, { clerkUserId })

  if (!clinic) {
    throw new ConvexError({
      code: "CLINIC_NOT_FOUND",
      message: "Complete onboarding before using payment features.",
    })
  }

  return clinic
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new ConvexError({
      code: "ENV_MISSING",
      message: `${name} is not configured for this deployment.`,
    })
  }

  return value
}

function buildPaymentLinkToken() {
  return `pay_tok_${crypto.randomUUID().replace(/-/g, "")}`
}

function resolveAppUrl() {
  return requireEnv("VITE_APP_URL").replace(/\/$/, "")
}

function resolveMetaGraphApiVersion() {
  return (process.env.META_GRAPH_API_VERSION ?? "v23.0").replace(/^\/+|\/+$/g, "")
}

function resolveMetaApiBaseUrl() {
  return `https://graph.facebook.com/${resolveMetaGraphApiVersion()}`
}

function buildClinicPaymentLink(token: string) {
  return `${resolveAppUrl()}${buildPublicPaymentPath(token)}`
}

function formatAmountForTemplate(amountInNaira: number) {
  return `NGN ${amountInNaira.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`
}

function extractPatientFirstName(patientName: string) {
  const parts = patientName.trim().split(/\s+/)
  const firstSegment = parts.length > 0 ? parts[parts.length - 1] : undefined
  return firstSegment && firstSegment.length > 0 ? firstSegment : "Patient"
}

function buildCardCallbackUrl() {
  return `${resolveAppUrl()}${ROUTES.PAYMENT_CALLBACK_CARD}`
}

function ensureBillIsReadyForCollection(bill: {
  status: string
  patientPaymentType: "self_pay" | "hmo"
  authorizationCode?: string | null
}) {
  if (bill.status === BILL_STATUS.PAID || bill.status === BILL_STATUS.CLAIMED) {
    throw new ConvexError({
      code: "INVALID_STATE",
      message: "This bill has already been settled.",
    })
  }

  if (
    bill.patientPaymentType === "hmo" &&
    (!bill.authorizationCode || bill.status === BILL_STATUS.AWAITING_AUTH)
  ) {
    throw new ConvexError({
      code: "AUTH_REQUIRED",
      message: "Confirm the authorization code before generating payment.",
    })
  }
}

function buildPaymentSessionDetails(bill: {
  totalAmount: number
  paymentLinkToken?: string | null
}) {
  const transactionReference = buildTxnRef()
  const paymentLinkToken = bill.paymentLinkToken ?? buildPaymentLinkToken()

  return {
    transactionReference,
    paymentLinkToken,
    paymentLink: buildClinicPaymentLink(paymentLinkToken),
    amountInKobo: formatAmountInKobo(bill.totalAmount),
    initiatedAt: Date.now(),
  }
}

async function fetchWithTimeout(input: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), EXTERNAL_REQUEST_TIMEOUT_MS)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ConvexError({
        code: "REQUEST_TIMEOUT",
        message: "The provider request timed out.",
      })
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeWebhookAmountInKobo(amount?: number | null) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return null
  }

  return Math.round(amount)
}

export const getClinicByClerkUserId = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clinics")
      .withIndex("by_clerk_user_id", (q) => q.eq("createdByClerkUserId", args.clerkUserId))
      .unique()
  },
})

export const getBillPaymentContext = query({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    const clinicId = await getCurrentClinicId(ctx)
    const bill = await ctx.db.get(args.billId)

    if (!bill || bill.clinicId !== clinicId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Bill not found for this clinic.",
      })
    }

    const patient = await ctx.db.get(bill.patientId)
    const clinic = await ctx.db.get(clinicId)

    if (!patient || !clinic) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Unable to load bill payment context.",
      })
    }

    return {
      _id: bill._id,
      clinicId,
      patientId: patient._id,
      totalAmount: bill.totalAmount,
      status: bill.status,
      authorizationCode: bill.authorizationCode ?? null,
      patientPaymentType: patient.paymentType,
      patientName: `${patient.surname} ${patient.otherNames}`.trim(),
      patientPhone: patient.phone,
      clinicName: clinic.name,
      transactionReference: bill.transactionReference ?? null,
      paymentLinkToken: bill.paymentLinkToken ?? null,
      paymentLink: bill.paymentLink ?? null,
      paymentChannel: bill.paymentChannel ?? null,
      paymentRequestChannel: bill.paymentRequestChannel ?? null,
      paymentRequestStatus: bill.paymentRequestStatus ?? PAYMENT_REQUEST_STATUS.UNSENT,
      paymentRequestSentAt: bill.paymentRequestSentAt ?? null,
      paymentRequestDeliveredAt: bill.paymentRequestDeliveredAt ?? null,
      paymentRequestReadAt: bill.paymentRequestReadAt ?? null,
      paymentRequestMessageId: bill.paymentRequestMessageId ?? null,
      paymentRequestFailedReason: bill.paymentRequestFailedReason ?? null,
      paymentRequestLastAttemptAt: bill.paymentRequestLastAttemptAt ?? null,
      paymentRequestAttemptCount: bill.paymentRequestAttemptCount ?? 0,
      paymentRequestAutoResendAt: bill.paymentRequestAutoResendAt ?? null,
      paymentRequestLastResentAt: bill.paymentRequestLastResentAt ?? null,
      paidAt: bill.paidAt ?? null,
    }
  },
})

export const getPublicPaymentByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!validatePaymentLinkToken(args.token)) {
      return null
    }

    const bill = await ctx.db
      .query("bills")
      .withIndex("by_payment_link_token", (q) => q.eq("paymentLinkToken", args.token))
      .unique()

    if (!bill) {
      return null
    }

    if (
      !isPublicPaymentLinkAvailable({
        billStatus: bill.status,
        createdAt: bill.createdAt,
        tokenIssuedAt: bill.paymentLinkTokenIssuedAt,
        paymentInitiatedAt: bill.paymentInitiatedAt,
      })
    ) {
      return null
    }

    const [patient, clinic] = await Promise.all([ctx.db.get(bill.patientId), ctx.db.get(bill.clinicId)])

    if (!patient || !clinic) {
      return null
    }

    return {
      token: args.token,
      billId: bill._id,
      clinicName: clinic.name,
      patientName: `${patient.surname} ${patient.otherNames}`.trim(),
      totalAmount: bill.totalAmount,
      paymentStatus: bill.status,
      paymentChannel: bill.paymentChannel ?? null,
      transactionReference: bill.transactionReference ?? null,
      isPaid: bill.status === BILL_STATUS.PAID || bill.status === BILL_STATUS.CLAIMED,
    }
  },
})

export const listBanks = action({
  args: {},
  handler: async (ctx): Promise<Array<{ name: string; code: string }>> => {
    await requireClerkUserId(ctx)
    const cachedCatalog = (await ctx.runQuery(internal.payments.getMarketplaceBankCatalogState, {})) as {
      banks: Array<{ name: string; code: string }>
      lastUpdatedAt: number | null
    }
    const isCacheFresh =
      cachedCatalog.banks.length > 0 &&
      cachedCatalog.lastUpdatedAt !== null &&
      Date.now() - cachedCatalog.lastUpdatedAt < BANK_CACHE_STALE_AFTER_MS

    if (isCacheFresh) {
      return cachedCatalog.banks
    }

    try {
      const { access_token } = await fetchMarketplaceToken()
      const banks = await fetchMarketplaceBankList(access_token)

      if (banks.length > 0) {
        await ctx.runMutation(internal.payments.replaceMarketplaceBankCatalog, { banks })
      }

      return banks
    } catch (error) {
      if (cachedCatalog.banks.length > 0) {
        return cachedCatalog.banks
      }

      await ctx.runMutation(internal.payments.replaceMarketplaceBankCatalog, {
        banks: NIGERIAN_BANK_OPTIONS,
      })

      return NIGERIAN_BANK_OPTIONS
    }
  },
})

export const verifyBankAccount = action({
  args: {
    accountNumber: v.string(),
    bankCode: v.string(),
  },
  handler: async (ctx, args) => {
    await requireClerkUserId(ctx)
    const fieldErrors = validateBankVerificationInput(args)

    if (Object.keys(fieldErrors).length > 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Bank verification details are invalid.",
        fieldErrors,
      })
    }

    try {
      const { access_token } = await fetchMarketplaceToken()
      const data = await resolveMarketplaceBankAccount({
        accessToken: access_token,
        accountNumber: args.accountNumber,
        bankCode: args.bankCode,
      })

      if (!hasVerifiedBankAccountName(data.accountName)) {
        throw new ConvexError({
          code: "BANK_RESOLVE_FAILED",
          message: "Account could not be verified right now. Check the details and try again.",
        })
      }

      return {
        accountName: data.accountName,
        bankName: data.bankName,
        reference: data.reference,
      }
    } catch (error) {
      if (error instanceof ConvexError) {
        const code =
          typeof error.data === "object" &&
          error.data !== null &&
          "code" in error.data &&
          typeof error.data.code === "string"
            ? error.data.code
            : null

        if (code === "VALIDATION_ERROR") {
          throw error
        }
      }

      throw new ConvexError({
        code: "BANK_RESOLVE_FAILED",
        message: getBankVerificationFailureMessage(error),
      })
    }
  },
})

export const verifyNIN = action({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    nin: v.string(),
  },
  handler: async (ctx, args) => {
    await requireClerkUserId(ctx)
    const { access_token } = await fetchMarketplaceToken()
    return await verifyMarketplaceNin({
      accessToken: access_token,
      firstName: args.firstName,
      lastName: args.lastName,
      nin: args.nin,
    })
  },
})

export const getMarketplaceBankCatalogState = internalQuery({
  args: {},
  returns: v.object({
    banks: v.array(
      v.object({
        code: v.string(),
        name: v.string(),
      }),
    ),
    lastUpdatedAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx) => {
    const banks = await ctx.db.query("marketplace_banks").collect()
    const normalizedBanks = [...banks]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((bank) => ({
        code: bank.code,
        name: bank.name,
      }))

    const lastUpdatedAt =
      banks.length > 0
        ? banks.reduce((latest, bank) => Math.max(latest, bank.updatedAt), banks[0].updatedAt)
        : null

    return {
      banks: normalizedBanks,
      lastUpdatedAt,
    }
  },
})

export const replaceMarketplaceBankCatalog = internalMutation({
  args: {
    banks: v.array(
      v.object({
        code: v.string(),
        name: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingBanks = await ctx.db.query("marketplace_banks").collect()

    await Promise.all(existingBanks.map((bank) => ctx.db.delete(bank._id)))

    const updatedAt = Date.now()
    for (const bank of args.banks) {
      await ctx.db.insert("marketplace_banks", {
        code: bank.code.trim(),
        name: bank.name.trim(),
        updatedAt,
      })
    }

    return null
  },
})

async function initiatePaymentForBill(
  ctx: ActionCtx,
  billContext: BillPaymentContext | null,
  channel: "card" | "opay",
) {
  if (!billContext) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Bill payment context could not be loaded.",
    })
  }

  ensureBillIsReadyForCollection(billContext)
  const paymentSession = buildPaymentSessionDetails(billContext)

  await ctx.runMutation(internal.payments.persistPaymentSession, {
    billId: billContext._id,
    paymentChannel: channel,
    transactionReference: paymentSession.transactionReference,
    paymentLinkToken: paymentSession.paymentLinkToken,
    paymentLink: paymentSession.paymentLink,
    paymentInitiatedAt: paymentSession.initiatedAt,
    webCheckoutHash:
      channel === BILL_PAYMENT_CHANNEL.CARD
        ? buildWebCheckoutHash({
            txnRef: paymentSession.transactionReference,
            merchantCode: requireEnv("INTERSWITCH_MERCHANT_CODE"),
            payItemId: requireEnv("INTERSWITCH_PAY_ITEM_ID"),
            amountInKobo: paymentSession.amountInKobo,
            redirectUrl: buildCardCallbackUrl(),
            macKey: requireEnv("INTERSWITCH_MAC_KEY"),
          })
        : undefined,
    opayReference:
      channel === BILL_PAYMENT_CHANNEL.OPAY ? paymentSession.transactionReference : undefined,
  })

  if (channel === BILL_PAYMENT_CHANNEL.CARD) {
    const merchantCode = requireEnv("INTERSWITCH_MERCHANT_CODE")
    const payItemId = requireEnv("INTERSWITCH_PAY_ITEM_ID")
    const cardCallbackUrl = buildCardCallbackUrl()

    return {
      endpoint: "https://newwebpay.qa.interswitchng.com/collections/w/pay",
      method: "POST" as const,
      paymentLink: paymentSession.paymentLink,
      transactionReference: paymentSession.transactionReference,
      fields: {
        txn_ref: paymentSession.transactionReference,
        merchant_code: merchantCode,
        pay_item_id: payItemId,
        amount: String(paymentSession.amountInKobo),
        site_redirect_url: cardCallbackUrl,
        currency: "566",
        hash: buildWebCheckoutHash({
          txnRef: paymentSession.transactionReference,
          merchantCode,
          payItemId,
          amountInKobo: paymentSession.amountInKobo,
          redirectUrl: cardCallbackUrl,
          macKey: requireEnv("INTERSWITCH_MAC_KEY"),
        }),
      },
    }
  }

  const response = await fetchWithTimeout("https://qa.interswitchng.com/collections/api/v1/opay/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantCode: requireEnv("INTERSWITCH_MERCHANT_CODE"),
      payableCode: requireEnv("INTERSWITCH_PAY_ITEM_ID"),
      amount: paymentSession.amountInKobo,
      transactionReference: paymentSession.transactionReference,
    }),
  })

  if (!response.ok) {
    throw new ConvexError({
      code: "OPAY_INIT_FAILED",
      message: "Unable to initialize OPay payment.",
    })
  }

  const data = (await response.json()) as {
    responseCode: string
    redirectUrl: string
  }

  return {
    ...data,
    paymentLink: paymentSession.paymentLink,
    transactionReference: paymentSession.transactionReference,
  }
}

export const initiateCardPayment = action({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    await getCurrentClinicForAction(ctx)
    const billContext = (await ctx.runQuery(internal.payments.getBillPaymentContextById, {
      billId: args.billId,
    })) as BillPaymentContext | null
    return await initiatePaymentForBill(ctx, billContext, BILL_PAYMENT_CHANNEL.CARD)
  },
})

export const initiateOPayPayment = action({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    await getCurrentClinicForAction(ctx)
    const billContext = (await ctx.runQuery(internal.payments.getBillPaymentContextById, {
      billId: args.billId,
    })) as BillPaymentContext | null
    return await initiatePaymentForBill(ctx, billContext, BILL_PAYMENT_CHANNEL.OPAY)
  },
})

export const initiatePublicCardPayment = action({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const billContext = await ctx.runQuery(api.payments.getPublicPaymentByToken, { token: args.token })

    if (!billContext) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Payment link is invalid or expired.",
      })
    }

    const fullContext = (await ctx.runQuery(internal.payments.getBillPaymentContextById, {
      billId: billContext.billId,
    })) as BillPaymentContext | null
    return await initiatePaymentForBill(ctx, fullContext, BILL_PAYMENT_CHANNEL.CARD)
  },
})

export const initiatePublicOPayPayment = action({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const billContext = await ctx.runQuery(api.payments.getPublicPaymentByToken, { token: args.token })

    if (!billContext) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Payment link is invalid or expired.",
      })
    }

    const fullContext = (await ctx.runQuery(internal.payments.getBillPaymentContextById, {
      billId: billContext.billId,
    })) as BillPaymentContext | null
    return await initiatePaymentForBill(ctx, fullContext, BILL_PAYMENT_CHANNEL.OPAY)
  },
})

export const getBillPaymentContextById = internalQuery({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId)

    if (!bill) {
      return null
    }

    const [patient, clinic] = await Promise.all([ctx.db.get(bill.patientId), ctx.db.get(bill.clinicId)])

    if (!patient || !clinic) {
      return null
    }

    return {
      _id: bill._id,
      clinicId: bill.clinicId,
      patientId: patient._id,
      totalAmount: bill.totalAmount,
      status: bill.status,
      authorizationCode: bill.authorizationCode ?? null,
      patientPaymentType: patient.paymentType,
      patientName: `${patient.surname} ${patient.otherNames}`.trim(),
      patientPhone: patient.phone,
      clinicName: clinic.name,
      transactionReference: bill.transactionReference ?? null,
      paymentLinkToken: bill.paymentLinkToken ?? null,
      paymentLink: bill.paymentLink ?? null,
      paymentChannel: bill.paymentChannel ?? null,
      paymentRequestChannel: bill.paymentRequestChannel ?? null,
      paymentRequestStatus: bill.paymentRequestStatus ?? PAYMENT_REQUEST_STATUS.UNSENT,
      paymentRequestSentAt: bill.paymentRequestSentAt ?? null,
      paymentRequestDeliveredAt: bill.paymentRequestDeliveredAt ?? null,
      paymentRequestReadAt: bill.paymentRequestReadAt ?? null,
      paymentRequestMessageId: bill.paymentRequestMessageId ?? null,
      paymentRequestFailedReason: bill.paymentRequestFailedReason ?? null,
      paymentRequestLastAttemptAt: bill.paymentRequestLastAttemptAt ?? null,
      paymentRequestAttemptCount: bill.paymentRequestAttemptCount ?? 0,
      paymentRequestAutoResendAt: bill.paymentRequestAutoResendAt ?? null,
      paymentRequestLastResentAt: bill.paymentRequestLastResentAt ?? null,
      paidAt: bill.paidAt ?? null,
    }
  },
})

export const getPaymentAttemptByTransactionReference = internalQuery({
  args: { transactionReference: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payment_attempts")
      .withIndex("by_txn_ref", (q) => q.eq("transactionReference", args.transactionReference))
      .unique()
  },
})

export const persistPaymentSession = internalMutation({
  args: {
    billId: v.id("bills"),
    paymentChannel: v.union(v.literal("card"), v.literal("opay")),
    transactionReference: v.string(),
    paymentLinkToken: v.string(),
    paymentLink: v.string(),
    paymentInitiatedAt: v.number(),
    webCheckoutHash: v.optional(v.string()),
    opayReference: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId)
    if (!bill) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Bill not found while starting payment.",
      })
    }

    const existingAttempt = await ctx.db
      .query("payment_attempts")
      .withIndex("by_txn_ref", (q) => q.eq("transactionReference", args.transactionReference))
      .unique()

    if (existingAttempt) {
      throw new ConvexError({
        code: "DUPLICATE_TXN_REF",
        message: "A payment session already exists for this transaction reference.",
      })
    }

    await ctx.db.patch(args.billId, {
      paymentChannel: args.paymentChannel,
      transactionReference: args.transactionReference,
      paymentLinkToken: args.paymentLinkToken,
      paymentLink: args.paymentLink,
      paymentInitiatedAt: args.paymentInitiatedAt,
      paymentLinkTokenIssuedAt: args.paymentInitiatedAt,
      webCheckoutHash: args.webCheckoutHash,
      opayReference: args.opayReference,
      status: BILL_STATUS.PENDING_PAYMENT,
    })

    await ctx.db.insert("payment_attempts", {
      clinicId: bill.clinicId,
      billId: args.billId,
      paymentChannel: args.paymentChannel,
      transactionReference: args.transactionReference,
      paymentLinkToken: args.paymentLinkToken,
      paymentLink: args.paymentLink,
      amountInKobo: formatAmountInKobo(bill.totalAmount),
      amountInNaira: bill.totalAmount,
      currency: "NGN",
      status: PAYMENT_ATTEMPT_STATUS.INITIATED,
      providerPaymentReference: args.opayReference,
      interswitchRef: args.opayReference,
      createdAt: args.paymentInitiatedAt,
    })

    return null
  },
})

export const updatePaymentAttemptFromCardCallback = internalMutation({
  args: {
    paymentAttemptId: v.id("payment_attempts"),
    responseCode: v.string(),
    payRef: v.optional(v.string()),
    callbackReceivedAt: v.number(),
    status: v.union(
      v.literal("initiated"),
      v.literal("callback_pending"),
      v.literal("paid"),
      v.literal("failed"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentAttemptId, {
      callbackResponseCode: args.responseCode,
      providerPaymentReference: args.payRef,
      interswitchRef: args.payRef,
      callbackReceivedAt: args.callbackReceivedAt,
      status: args.status,
    })

    return null
  },
})

export const finalizePaymentAttempt = internalMutation({
  args: {
    paymentAttemptId: v.id("payment_attempts"),
    providerPaymentReference: v.optional(v.string()),
    interswitchRef: v.optional(v.string()),
    webhookEvent: v.optional(v.string()),
    webhookReceivedAt: v.optional(v.number()),
    paidAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.paymentAttemptId)
    if (!attempt) {
      return null
    }

    await ctx.db.patch(args.paymentAttemptId, {
      status: PAYMENT_ATTEMPT_STATUS.PAID,
      providerPaymentReference: args.providerPaymentReference ?? attempt.providerPaymentReference,
      interswitchRef: args.interswitchRef ?? attempt.interswitchRef,
      webhookEvent: args.webhookEvent ?? attempt.webhookEvent,
      webhookReceivedAt: args.webhookReceivedAt ?? attempt.webhookReceivedAt,
      paidAt: args.paidAt,
    })

    return null
  },
})

export const markBillPaid = internalMutation({
  args: {
    billId: v.id("bills"),
    paymentChannel: v.optional(v.union(v.literal("card"), v.literal("opay"))),
    transactionReference: v.optional(v.string()),
  providerPaymentReference: v.optional(v.string()),
  interswitchRef: v.optional(v.string()),
  paidAmount: v.optional(v.number()),
    },
    returns: v.object({
      alreadyPaid: v.boolean(),
      patientName: v.string(),
      patientPhone: v.string(),
      clinicName: v.string(),
      totalAmount: v.number(),
    }),
    handler: async (ctx, args) => {
      const bill = await ctx.db.get(args.billId)

    if (!bill) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Bill not found while finalizing payment.",
      })
    }

    const [patient, clinic] = await Promise.all([ctx.db.get(bill.patientId), ctx.db.get(bill.clinicId)])
    if (!patient || !clinic) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Bill payment context could not be finalized.",
      })
    }

      if (bill.status === BILL_STATUS.PAID || bill.status === BILL_STATUS.CLAIMED) {
        return {
          alreadyPaid: true,
          patientName: `${patient.surname} ${patient.otherNames}`.trim(),
          patientPhone: patient.phone,
          clinicName: clinic.name,
          totalAmount: bill.totalAmount,
        }
      }

      const paidAt = Date.now()
      await ctx.db.patch(args.billId, {
        status: BILL_STATUS.PAID,
        paidAt,
        paymentChannel: args.paymentChannel ?? bill.paymentChannel,
        transactionReference: args.transactionReference ?? bill.transactionReference,
        providerPaymentReference: args.providerPaymentReference ?? bill.providerPaymentReference,
        interswitchRef: args.interswitchRef ?? bill.interswitchRef,
        paidAmount: args.paidAmount ?? bill.totalAmount,
        paymentRequestAutoResendAt: undefined,
      })

      await ctx.runMutation(internal.notifications.createNotification, {
        clinicId: clinic._id,
        recipientClerkUserId: clinic.createdByClerkUserId,
        type: NOTIFICATION_TYPE.PAYMENT_CONFIRMED,
        title: "Payment confirmed",
        description: `${`${patient.surname} ${patient.otherNames}`.trim()} completed bill payment.`,
        route: `${ROUTES.BILLS}/${bill._id}`,
        entityId: bill._id,
        entityLabel: `${patient.surname} ${patient.otherNames}`.trim(),
        createdAt: paidAt,
      })

      return {
        alreadyPaid: false,
        patientName: `${patient.surname} ${patient.otherNames}`.trim(),
        patientPhone: patient.phone,
        clinicName: clinic.name,
        totalAmount: bill.totalAmount,
    }
  },
})

export const finalizeCardPaymentCallbackInternal = internalAction({
  args: {
    txnRef: v.string(),
    payRef: v.optional(v.string()),
    responseCode: v.string(),
  },
  handler: async (ctx, args): Promise<PaymentFinalizeResult> => {
    const paymentAttempt = await ctx.runQuery(internal.payments.getPaymentAttemptByTransactionReference, {
      transactionReference: args.txnRef,
    })

    if (!paymentAttempt) {
      return {
        status: "failed",
        message: "Payment reference could not be matched to a bill.",
        billId: null,
      }
    }

    const bill = await ctx.runQuery(internal.payments.getBillPaymentContextById, {
      billId: paymentAttempt.billId,
    })

    if (!bill) {
      return {
        status: "failed",
        message: "Bill payment context could not be loaded.",
        billId: null,
      }
    }

    const isApproved = isCardCallbackResponseApproved(args.responseCode)
    await ctx.runMutation(internal.payments.updatePaymentAttemptFromCardCallback, {
      paymentAttemptId: paymentAttempt._id,
      responseCode: args.responseCode,
      payRef: args.payRef,
      callbackReceivedAt: Date.now(),
      status: isApproved ? PAYMENT_ATTEMPT_STATUS.CALLBACK_PENDING : PAYMENT_ATTEMPT_STATUS.FAILED,
    })

    if (!isApproved) {
      return {
        status: "failed",
        message: "Payment was not approved by Interswitch.",
        billId: bill._id,
      }
    }

    if (bill.paidAt) {
      return {
        status: "success",
        message: "Payment confirmed.",
        billId: bill._id,
      }
    }

    return {
      status: "success",
      message: "Payment callback received. Amelia is waiting for Interswitch webhook confirmation.",
      billId: bill._id,
    }
  },
})

export const confirmOPayPayment = action({
  args: { reference: v.string() },
  handler: async (ctx, args): Promise<OPayConfirmResult> => {
    const response = await fetchWithTimeout("https://qa.interswitchng.com/collections/api/v1/opay/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: args.reference }),
    })

    if (!response.ok) {
      throw new ConvexError({
        code: "OPAY_STATUS_FAILED",
        message: "Unable to confirm OPay payment status.",
      })
    }

    const data = (await response.json()) as { responseCode: string }
    if (!isSuccessfulPaymentResponseCode(data.responseCode)) {
      return {
        status: "pending",
        responseCode: data.responseCode,
        billId: null,
      }
    }

    const paymentAttempt = await ctx.runQuery(internal.payments.getPaymentAttemptByTransactionReference, {
      transactionReference: args.reference,
    })

    if (!paymentAttempt) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Payment reference could not be matched to a bill.",
      })
    }

    const result = await ctx.runMutation(internal.payments.markBillPaid, {
      billId: paymentAttempt.billId,
      paymentChannel: BILL_PAYMENT_CHANNEL.OPAY,
      transactionReference: args.reference,
      providerPaymentReference: args.reference,
      interswitchRef: args.reference,
      paidAmount: paymentAttempt.amountInNaira,
    })

    await ctx.runMutation(internal.payments.finalizePaymentAttempt, {
      paymentAttemptId: paymentAttempt._id,
      providerPaymentReference: args.reference,
      interswitchRef: args.reference,
      webhookEvent: "OPAY_STATUS_CONFIRMED",
      webhookReceivedAt: Date.now(),
      paidAt: Date.now(),
    })

    if (!result.alreadyPaid) {
      await sendPaymentConfirmedEvent({
        patientPhone: result.patientPhone,
        clinicName: result.clinicName,
        totalAmount: result.totalAmount,
      })
    }

    return {
      status: "success",
      responseCode: data.responseCode,
      billId: paymentAttempt.billId,
    }
  },
})

export const processInterswitchWebhook = internalAction({
  args: {
    signature: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const secret = requireEnv("INTERSWITCH_WEBHOOK_SECRET")
    const expectedSignature = buildInterswitchWebhookSignature(secret, args.body)

    if (!args.signature || args.signature !== expectedSignature) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Interswitch webhook signature.",
      })
    }

    const payload = JSON.parse(args.body) as {
      event?: string
      responseCode?: string
      currency?: string
      data?: {
        transactionReference?: string
        paymentReference?: string
        channel?: string
        amount?: number
        responseCode?: string
        currency?: string
      }
    }

    if (!payload.data?.transactionReference) {
      return { ok: true }
    }

    const paymentAttempt = await ctx.runQuery(internal.payments.getPaymentAttemptByTransactionReference, {
      transactionReference: payload.data.transactionReference,
    })

    if (!paymentAttempt) {
      return { ok: true }
    }

    const validation = validateInterswitchWebhookPayload({
      event: payload.event,
      responseCode: payload.data.responseCode ?? payload.responseCode,
      currency: payload.data.currency ?? payload.currency,
      amountInKobo: normalizeWebhookAmountInKobo(payload.data.amount),
      expectedAmountInKobo: paymentAttempt.amountInKobo,
      channel: payload.data.channel,
    })

    if (!validation.isValid) {
      return { ok: true, ignored: validation.reason }
    }

    const result = await ctx.runMutation(internal.payments.markBillPaid, {
      billId: paymentAttempt.billId,
      paymentChannel: validation.normalizedChannel,
      transactionReference: payload.data.transactionReference,
      providerPaymentReference: payload.data.paymentReference,
      interswitchRef: payload.data.paymentReference,
      paidAmount: paymentAttempt.amountInNaira,
    })

    await ctx.runMutation(internal.payments.finalizePaymentAttempt, {
      paymentAttemptId: paymentAttempt._id,
      providerPaymentReference: payload.data.paymentReference,
      interswitchRef: payload.data.paymentReference,
      webhookEvent: payload.event,
      webhookReceivedAt: Date.now(),
      paidAt: Date.now(),
    })

    if (!result.alreadyPaid) {
      await sendPaymentConfirmedEvent({
        patientPhone: result.patientPhone,
        clinicName: result.clinicName,
        totalAmount: result.totalAmount,
      })
    }

    return { ok: true }
  },
})

async function sendPaymentConfirmedEvent(input: {
  patientPhone: string
  clinicName: string
  totalAmount: number
}) {
  if (!process.env.INNGEST_EVENT_KEY && process.env.INNGEST_DEV !== "1") {
    return
  }

  try {
    await inngest.send({
      name: "payment/confirmed",
      data: {
        patientPhone: normalizePhoneForSms(input.patientPhone),
        clinicName: input.clinicName,
        totalAmount: input.totalAmount,
      },
    })
  } catch (error) {
    console.error("Failed to send payment/confirmed event.", error)
  }
}

async function sendPaymentLinkSentEvent(input: {
  patientPhone: string
  paymentLink: string
}) {
  if (!process.env.INNGEST_EVENT_KEY && process.env.INNGEST_DEV !== "1") {
    return
  }

  try {
    await inngest.send({
      name: "bill/payment_link.sent",
      data: {
        patientPhone: normalizePhoneForSms(input.patientPhone),
        paymentLink: input.paymentLink,
      },
    })
  } catch (error) {
    console.error("Failed to send bill/payment_link.sent event.", error)
  }
}

interface MetaMessageSendResponse {
  messages?: Array<{
    id?: string
    message_status?: string
  }>
  error?: {
    message?: string
  }
}

async function sendWhatsAppTemplateMessage(input: {
  to: string
  patientFirstName: string
  clinicName: string
  formattedAmount: string
  reference: string
  paymentUrl: string
}) {
  const response = await fetchWithTimeout(
    `${resolveMetaApiBaseUrl()}/${requireEnv("META_PHONE_NUMBER_ID")}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("META_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildWhatsAppTemplatePayload({
          to: input.to,
          templateName: "bill_payment_request_v2",
          languageCode: "en",
          patientFirstName: input.patientFirstName,
          clinicName: input.clinicName,
          formattedAmount: input.formattedAmount,
          reference: input.reference,
          paymentUrl: input.paymentUrl,
        }),
      ),
    },
  )

  const data = (await response.json()) as MetaMessageSendResponse
  if (!response.ok) {
    throw new ConvexError({
      code: "WHATSAPP_SEND_FAILED",
      message: data.error?.message ?? "Unable to send the payment request on WhatsApp.",
    })
  }

  const messageId = data.messages?.[0]?.id
  if (!messageId) {
    throw new ConvexError({
      code: "WHATSAPP_SEND_FAILED",
      message: "Meta did not return a message id for the payment request.",
    })
  }

  return {
    messageId,
    providerStatus: parseMetaMessageStatus(data.messages?.[0]?.message_status ?? "sent"),
  }
}

export const sendPaymentRequestViaWhatsApp = action({
  args: { billId: v.id("bills") },
  handler: async (ctx, args): Promise<PaymentRequestSendResult> => {
    await getCurrentClinicForAction(ctx)
    return (await ctx.runAction(internal.payments.sendPaymentRequestViaWhatsAppInternal, {
      billId: args.billId,
      isAutoResend: false,
    })) as PaymentRequestSendResult
  },
})

export const sendPaymentRequestViaWhatsAppInternal = internalAction({
  args: {
    billId: v.id("bills"),
    isAutoResend: v.boolean(),
  },
  handler: async (ctx, args): Promise<PaymentRequestSendResult> => {
    const billContext = (await ctx.runQuery(internal.payments.getBillPaymentContextById, {
      billId: args.billId,
    })) as BillPaymentContext | null

    if (!billContext) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Bill payment context could not be loaded.",
      })
    }

    ensureBillIsReadyForCollection(billContext)
    const paymentLinkToken: string =
      billContext.paymentLinkToken ??
      ((await ctx.runMutation(api.payments.createPaymentLinkToken, {
        billId: args.billId,
      })) as string)
    const paymentUrl: string = billContext.paymentLink ?? buildClinicPaymentLink(paymentLinkToken)
    const reference = billContext.transactionReference ?? `BILL-${String(args.billId)}`
    const attemptedAt = Date.now()

    try {
      const result = await sendWhatsAppTemplateMessage({
        to: normalizePhoneForWhatsApp(billContext.patientPhone),
        patientFirstName: extractPatientFirstName(billContext.patientName),
        clinicName: billContext.clinicName,
        formattedAmount: formatAmountForTemplate(billContext.totalAmount),
        reference,
        paymentUrl,
      })

      await ctx.runMutation(internal.payments.persistPaymentRequestSendSuccess, {
        billId: args.billId,
        messageId: result.messageId,
        attemptedAt,
        providerStatus: (result.providerStatus ?? PAYMENT_REQUEST_STATUS.SENT) as MetaLifecycleStatus,
        isAutoResend: args.isAutoResend,
      })

      await sendPaymentLinkSentEvent({
        patientPhone: billContext.patientPhone,
        paymentLink: paymentUrl,
      })

      return {
        ok: true,
        messageId: result.messageId,
        paymentUrl,
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unable to send payment request."

      await ctx.runMutation(internal.payments.persistPaymentRequestSendFailure, {
        billId: args.billId,
        attemptedAt,
        reason,
      })

      throw error
    }
  },
})

export const persistPaymentRequestSendSuccess = internalMutation({
  args: {
    billId: v.id("bills"),
    messageId: v.string(),
    attemptedAt: v.number(),
    providerStatus: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    isAutoResend: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId)

    if (!bill) {
      return null
    }

    const attemptCount = (bill.paymentRequestAttemptCount ?? 0) + 1
    const autoResendAt = attemptCount === 1 ? args.attemptedAt + 12 * 60 * 60 * 1000 : undefined

    await ctx.db.patch(args.billId, {
      paymentRequestChannel: PAYMENT_REQUEST_CHANNEL.WHATSAPP,
      paymentRequestStatus: args.providerStatus,
      paymentRequestSentAt: bill.paymentRequestSentAt ?? args.attemptedAt,
      paymentRequestDeliveredAt:
        args.providerStatus === PAYMENT_REQUEST_STATUS.DELIVERED ? args.attemptedAt : bill.paymentRequestDeliveredAt,
      paymentRequestReadAt:
        args.providerStatus === PAYMENT_REQUEST_STATUS.READ ? args.attemptedAt : bill.paymentRequestReadAt,
      paymentRequestMessageId: args.messageId,
      paymentRequestFailedReason: undefined,
      paymentRequestLastAttemptAt: args.attemptedAt,
      paymentRequestAttemptCount: attemptCount,
      paymentRequestAutoResendAt: autoResendAt,
      paymentRequestLastResentAt: args.isAutoResend ? args.attemptedAt : bill.paymentRequestLastResentAt,
    })

    if (autoResendAt) {
      await ctx.scheduler.runAfter(
        12 * 60 * 60 * 1000,
        internal.payments.runScheduledPaymentRequestResend,
        { billId: args.billId },
      )
    }

    const [patient, clinic] = await Promise.all([ctx.db.get(bill.patientId), ctx.db.get(bill.clinicId)])
    if (patient && clinic) {
      await ctx.runMutation(internal.notifications.createNotification, {
        clinicId: clinic._id,
        recipientClerkUserId: clinic.createdByClerkUserId,
        type: NOTIFICATION_TYPE.PAYMENT_REQUEST_SENT,
        title: args.isAutoResend ? "Payment reminder sent" : "Payment request sent",
        description: `Payment request was sent to ${`${patient.surname} ${patient.otherNames}`.trim()}.`,
        route: `${ROUTES.BILLS}/${bill._id}`,
        entityId: bill._id,
        entityLabel: `${patient.surname} ${patient.otherNames}`.trim(),
        createdAt: args.attemptedAt,
      })
    }

    return null
  },
})

export const persistPaymentRequestSendFailure = internalMutation({
  args: {
    billId: v.id("bills"),
    attemptedAt: v.number(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId)
    if (!bill) {
      return null
    }

    await ctx.db.patch(args.billId, {
      paymentRequestChannel: PAYMENT_REQUEST_CHANNEL.WHATSAPP,
      paymentRequestStatus: PAYMENT_REQUEST_STATUS.FAILED,
      paymentRequestFailedReason: args.reason,
      paymentRequestLastAttemptAt: args.attemptedAt,
      paymentRequestAttemptCount: (bill.paymentRequestAttemptCount ?? 0) + 1,
      paymentRequestAutoResendAt: undefined,
    })

    const [patient, clinic] = await Promise.all([ctx.db.get(bill.patientId), ctx.db.get(bill.clinicId)])
    if (patient && clinic) {
      await ctx.runMutation(internal.notifications.createNotification, {
        clinicId: clinic._id,
        recipientClerkUserId: clinic.createdByClerkUserId,
        type: NOTIFICATION_TYPE.PAYMENT_REQUEST_FAILED,
        title: "Payment request failed",
        description: `Payment request to ${`${patient.surname} ${patient.otherNames}`.trim()} failed.`,
        route: `${ROUTES.BILLS}/${bill._id}`,
        entityId: bill._id,
        entityLabel: `${patient.surname} ${patient.otherNames}`.trim(),
        createdAt: args.attemptedAt,
      })
    }

    return null
  },
})

export const runScheduledPaymentRequestResend = internalAction({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    const billContext = (await ctx.runQuery(internal.payments.getBillPaymentContextById, {
      billId: args.billId,
    })) as BillPaymentContext | null

    if (!billContext) {
      return { ok: false }
    }

    if (
      !shouldAutoResendPaymentRequest({
        billStatus: billContext.status,
        paymentRequestStatus: billContext.paymentRequestStatus ?? PAYMENT_REQUEST_STATUS.UNSENT,
        paymentRequestAttemptCount: billContext.paymentRequestAttemptCount ?? 0,
        autoResendAt: billContext.paymentRequestAutoResendAt ?? null,
      })
    ) {
      return { ok: false }
    }

    await ctx.runAction(internal.payments.sendPaymentRequestViaWhatsAppInternal, {
      billId: args.billId,
      isAutoResend: true,
    })

    return { ok: true }
  },
})

export const findBillByPaymentRequestMessageId = internalQuery({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bills")
      .withIndex("by_payment_request_message_id", (q) =>
        q.eq("paymentRequestMessageId", args.messageId),
      )
      .unique()
  },
})

export const applyMetaPaymentRequestStatus = internalMutation({
  args: {
    messageId: v.string(),
    status: v.union(v.literal("sent"), v.literal("delivered"), v.literal("read"), v.literal("failed")),
    failedReason: v.optional(v.string()),
    occurredAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bill = await ctx.db
      .query("bills")
      .withIndex("by_payment_request_message_id", (q) =>
        q.eq("paymentRequestMessageId", args.messageId),
      )
      .unique()

    if (!bill) {
      return null
    }

    await ctx.db.patch(bill._id, {
      paymentRequestStatus: args.status,
      paymentRequestDeliveredAt:
        args.status === PAYMENT_REQUEST_STATUS.DELIVERED ? args.occurredAt : bill.paymentRequestDeliveredAt,
      paymentRequestReadAt:
        args.status === PAYMENT_REQUEST_STATUS.READ ? args.occurredAt : bill.paymentRequestReadAt,
      paymentRequestFailedReason:
        args.status === PAYMENT_REQUEST_STATUS.FAILED ? args.failedReason ?? "Meta marked the message as failed." : bill.paymentRequestFailedReason,
    })

    return null
  },
})

export const processMetaWebhookPayload = internalAction({
  args: { body: v.string() },
  handler: async (ctx, args) => {
    // META_WEBHOOK_VERIFY_TOKEN is validated in convex/http.ts before this payload handler runs.
    const payload = JSON.parse(args.body) as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            statuses?: Array<{
              id?: string
              status?: string
              errors?: Array<{ title?: string; message?: string }>
              timestamp?: string
            }>
          }
        }>
      }>
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const status of change.value?.statuses ?? []) {
          if (!status.id || !status.status) {
            continue
          }

          const parsedStatus = parseMetaMessageStatus(status.status)
          if (!parsedStatus) {
            continue
          }

          await ctx.runMutation(internal.payments.applyMetaPaymentRequestStatus, {
            messageId: status.id,
            status: parsedStatus as MetaLifecycleStatus,
            failedReason: status.errors?.map((error) => error.message ?? error.title).filter(Boolean).join("; ") || undefined,
            occurredAt: status.timestamp ? Number(status.timestamp) * 1000 : Date.now(),
          })
        }
      }
    }

    return { ok: true }
  },
})

export const createPaymentLinkToken = mutation({
  args: { billId: v.id("bills") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const clinicId = await getCurrentClinicId(ctx)
    const bill = await ctx.db.get(args.billId)

    if (!bill || bill.clinicId !== clinicId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Bill not found for this clinic.",
      })
    }

    const paymentLinkToken = bill.paymentLinkToken ?? buildPaymentLinkToken()
    await ctx.db.patch(args.billId, {
      paymentLinkToken,
      paymentLinkTokenIssuedAt: Date.now(),
      paymentLink: buildClinicPaymentLink(paymentLinkToken),
    })

    return paymentLinkToken
  },
})
