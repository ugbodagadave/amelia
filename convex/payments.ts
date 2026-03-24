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
import type { Doc, Id } from "./_generated/dataModel"
import { requireClerkUserId } from "./lib/auth"
import {
  BILL_PAYMENT_CHANNEL,
  INTERSWITCH_RESPONSE_CODE,
  buildPublicPaymentPath,
  buildTxnRef,
  buildWebCheckoutHash,
  formatAmountInKobo,
  isSuccessfulPaymentResponseCode,
  normalizePhoneForSms,
  validateBankVerificationInput,
  validatePaymentLinkToken,
} from "../src/lib/payments"
import { BILL_STATUS } from "../src/lib/billing"
import { inngest } from "./inngestClient"

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
  paidAt?: number | null
}

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

function buildClinicPaymentLink(token: string) {
  return `${resolveAppUrl()}${buildPublicPaymentPath(token)}`
}

function buildCardCallbackUrl() {
  return `${resolveAppUrl()}/pay/callback/card`
}

function buildOlayCallbackUrl() {
  return `${resolveAppUrl()}/pay/callback/opay`
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
  transactionReference?: string | null
  paymentLinkToken?: string | null
}) {
  const transactionReference = bill.transactionReference ?? buildTxnRef()
  const paymentLinkToken = bill.paymentLinkToken ?? buildPaymentLinkToken()

  return {
    transactionReference,
    paymentLinkToken,
    paymentLink: buildClinicPaymentLink(paymentLinkToken),
    amountInKobo: formatAmountInKobo(bill.totalAmount),
    initiatedAt: Date.now(),
  }
}

async function fetchMarketplaceToken() {
  const clientId = requireEnv("ISW_MARKETPLACE_CLIENT_ID")
  const clientSecret = requireEnv("ISW_MARKETPLACE_CLIENT_SECRET")
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const response = await fetch(`${requireEnv("ISW_MARKETPLACE_BASE_URL")}/passport/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    throw new ConvexError({
      code: "MARKETPLACE_AUTH_FAILED",
      message: "Unable to obtain Marketplace access token.",
    })
  }

  return (await response.json()) as { access_token: string }
}

async function buildWebhookSignature(body: string, secret: string) {
  const encodedSecret = new TextEncoder().encode(secret)
  const key = await crypto.subtle.importKey(
    "raw",
    encodedSecret,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("")
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
  handler: async (ctx) => {
    await getCurrentClinicForAction(ctx)
    const { access_token } = await fetchMarketplaceToken()

    const response = await fetch(
      "https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/account-number/bank-list",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    )

    if (!response.ok) {
      throw new ConvexError({
        code: "BANK_LIST_FAILED",
        message: "Unable to load the bank list from Interswitch Marketplace.",
      })
    }

    const data = (await response.json()) as Array<{ name: string; code: string }>
    return data.sort((left, right) => left.name.localeCompare(right.name))
  },
})

export const verifyBankAccount = action({
  args: {
    accountNumber: v.string(),
    bankCode: v.string(),
  },
  handler: async (ctx, args) => {
    await getCurrentClinicForAction(ctx)
    const fieldErrors = validateBankVerificationInput(args)

    if (Object.keys(fieldErrors).length > 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Bank verification details are invalid.",
        fieldErrors,
      })
    }

    const { access_token } = await fetchMarketplaceToken()
    const response = await fetch(
      "https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/account-number/resolve",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountNumber: args.accountNumber.trim(),
          bankCode: args.bankCode.trim(),
        }),
      },
    )

    if (!response.ok) {
      throw new ConvexError({
        code: "BANK_RESOLVE_FAILED",
        message: "Unable to verify the clinic payout account.",
      })
    }

    const data = (await response.json()) as {
      bankDetails?: {
        accountName?: string
      }
    }

    return {
      accountName: data.bankDetails?.accountName ?? "",
    }
  },
})

export const verifyNIN = action({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    nin: v.string(),
  },
  handler: async (_, args) => {
    const { access_token } = await fetchMarketplaceToken()
    const response = await fetch(
      "https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/nin",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      },
    )

    if (!response.ok) {
      throw new ConvexError({
        code: "NIN_VERIFICATION_FAILED",
        message: "Unable to verify the NIN with Interswitch Marketplace.",
      })
    }

    return await response.json()
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
    return {
      endpoint: "https://newwebpay.qa.interswitchng.com/collections/w/pay",
      method: "POST" as const,
      paymentLink: paymentSession.paymentLink,
      transactionReference: paymentSession.transactionReference,
      fields: {
        txnref: paymentSession.transactionReference,
        merchantcode: requireEnv("INTERSWITCH_MERCHANT_CODE"),
        payitemid: requireEnv("INTERSWITCH_PAY_ITEM_ID"),
        amount: String(paymentSession.amountInKobo),
        site_redirect_url: buildCardCallbackUrl(),
        currency: "566",
        isswitch: "1",
        hash: buildWebCheckoutHash({
          txnRef: paymentSession.transactionReference,
          merchantCode: requireEnv("INTERSWITCH_MERCHANT_CODE"),
          payItemId: requireEnv("INTERSWITCH_PAY_ITEM_ID"),
          amountInKobo: paymentSession.amountInKobo,
          redirectUrl: buildCardCallbackUrl(),
          macKey: requireEnv("INTERSWITCH_MAC_KEY"),
        }),
      },
    }
  }

  const response = await fetch("https://qa.interswitchng.com/collections/api/v1/opay/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantCode: requireEnv("INTERSWITCH_MERCHANT_CODE"),
      payableCode: requireEnv("INTERSWITCH_PAY_ITEM_ID"),
      amount: paymentSession.amountInKobo,
      transactionReference: paymentSession.transactionReference,
      redirectUrl: buildOlayCallbackUrl(),
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
      paidAt: bill.paidAt ?? null,
    }
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
  returns: v.object({ alreadyPaid: v.boolean(), patientPhone: v.string(), clinicName: v.string(), totalAmount: v.number() }),
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
        patientPhone: patient.phone,
        clinicName: clinic.name,
        totalAmount: bill.totalAmount,
      }
    }

    await ctx.db.patch(args.billId, {
      status: BILL_STATUS.PAID,
      paidAt: Date.now(),
      paymentChannel: args.paymentChannel ?? bill.paymentChannel,
      transactionReference: args.transactionReference ?? bill.transactionReference,
      providerPaymentReference: args.providerPaymentReference ?? bill.providerPaymentReference,
      interswitchRef: args.interswitchRef ?? bill.interswitchRef,
      paidAmount: args.paidAmount ?? bill.totalAmount,
    })

    return {
      alreadyPaid: false,
      patientPhone: patient.phone,
      clinicName: clinic.name,
      totalAmount: bill.totalAmount,
    }
  },
})

export const finalizeCardPaymentCallback = action({
  args: {
    txnRef: v.string(),
    payRef: v.optional(v.string()),
    responseCode: v.string(),
  },
  handler: async (ctx, args) => {
    const bill = await ctx.runQuery(internal.payments.findBillByTransactionReference, {
      transactionReference: args.txnRef,
    })

    if (!bill) {
      return { status: "failed", message: "Payment reference could not be matched to a bill." }
    }

    if (!isSuccessfulPaymentResponseCode(args.responseCode)) {
      return { status: "failed", message: "Payment was not approved by Interswitch." }
    }

    const result = await ctx.runMutation(internal.payments.markBillPaid, {
      billId: bill._id,
      paymentChannel: BILL_PAYMENT_CHANNEL.CARD,
      transactionReference: args.txnRef,
      providerPaymentReference: args.payRef,
      interswitchRef: args.payRef,
      paidAmount: bill.totalAmount,
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
      message: "Payment confirmed.",
    }
  },
})

export const confirmOPayPayment = action({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const response = await fetch("https://qa.interswitchng.com/collections/api/v1/opay/status", {
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
      }
    }

    const bill = await ctx.runQuery(internal.payments.findBillByTransactionReference, {
      transactionReference: args.reference,
    })

    if (!bill) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Payment reference could not be matched to a bill.",
      })
    }

    const result = await ctx.runMutation(internal.payments.markBillPaid, {
      billId: bill._id,
      paymentChannel: BILL_PAYMENT_CHANNEL.OPAY,
      transactionReference: args.reference,
      providerPaymentReference: args.reference,
      interswitchRef: args.reference,
      paidAmount: bill.totalAmount,
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
    }
  },
})

export const findBillByTransactionReference = internalQuery({
  args: { transactionReference: v.string() },
  handler: async (ctx, args) => {
    const bills = await ctx.db.query("bills").collect()
    return bills.find((bill) => bill.transactionReference === args.transactionReference) ?? null
  },
})

export const processInterswitchWebhook = internalAction({
  args: {
    signature: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const secret = requireEnv("INTERSWITCH_WEBHOOK_SECRET")
    const expectedSignature = await buildWebhookSignature(args.body, secret)

    if (!args.signature || args.signature !== expectedSignature) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Interswitch webhook signature.",
      })
    }

    const payload = JSON.parse(args.body) as {
      event?: string
      data?: {
        transactionReference?: string
        paymentReference?: string
        channel?: "card" | "opay"
        amount?: number
      }
    }

    if (!payload.data?.transactionReference) {
      return { ok: true }
    }

    const bill = await ctx.runQuery(internal.payments.findBillByTransactionReference, {
      transactionReference: payload.data.transactionReference,
    })

    if (!bill) {
      return { ok: true }
    }

    const result = await ctx.runMutation(internal.payments.markBillPaid, {
      billId: bill._id,
      paymentChannel: payload.data.channel,
      transactionReference: payload.data.transactionReference,
      providerPaymentReference: payload.data.paymentReference,
      interswitchRef: payload.data.paymentReference,
      paidAmount: payload.data.amount ? Math.round(payload.data.amount / 100) : bill.totalAmount,
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

  await inngest.send({
    name: "payment/confirmed",
    data: {
      patientPhone: normalizePhoneForSms(input.patientPhone),
      clinicName: input.clinicName,
      totalAmount: input.totalAmount,
    },
  })
}

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
