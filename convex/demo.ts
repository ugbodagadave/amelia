import { createClerkClient } from "@clerk/backend"
import { ConvexError, v } from "convex/values"
import { action, internalMutation, type MutationCtx } from "./_generated/server"
import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { DEFAULT_SERVICE_CATALOG } from "../src/lib/clinicOnboarding"
import {
  DEMO_SHARED_ACCOUNT_EMAIL,
  DEMO_WORKSPACE_ADMIN_SECRET_ENV,
  buildDemoWorkspaceSeed,
} from "../src/lib/demoWorkspace"
import { mergeDirectoryIntoTemplates } from "../src/lib/hmoDirectory"
import { HMO_DIRECTORY_SEED_RECORDS } from "../src/lib/hmoDirectorySeed"
import { buildPublicPaymentPath, formatAmountInKobo } from "../src/lib/payments"

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

function requireAdminSecret(secret: string) {
  const expectedSecret = requireEnv(DEMO_WORKSPACE_ADMIN_SECRET_ENV)
  if (secret !== expectedSecret) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid demo workspace admin secret.",
    })
  }
}

function createBackendClerkClient() {
  return createClerkClient({
    secretKey: requireEnv("CLERK_SECRET_KEY"),
  })
}

async function resolveClerkUserByEmail(email: string) {
  const clerkClient = createBackendClerkClient()
  const response = await clerkClient.users.getUserList({
    emailAddress: [email.trim().toLowerCase()],
    limit: 1,
  })
  const user = response.data[0]

  if (!user) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: `No Clerk user found for ${email}.`,
    })
  }

  return user
}

function resolveAppUrl() {
  return (process.env.VITE_APP_URL ?? "https://app.getamelia.online").replace(/\/$/, "")
}

function buildPaymentLink(token: string) {
  return `${resolveAppUrl()}${buildPublicPaymentPath(token)}`
}

function normalizeSeedPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")

  if (digits.startsWith("234") && digits.length === 13) {
    return `0${digits.slice(3)}`
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return digits
  }

  if (digits.length === 10) {
    return `0${digits}`
  }

  return phone.trim()
}

function resolveNotificationRoute(route: string, idMap: Map<string, string>) {
  return route.replace(/:([a-zA-Z0-9_]+)/g, (_, token: string) => idMap.get(token) ?? token)
}

export const seedSharedClinicWorkspace = action({
  args: {
    adminSecret: v.string(),
    email: v.optional(v.string()),
  },
  returns: v.object({
    clerkUserId: v.string(),
    clinicId: v.id("clinics"),
    patientCount: v.number(),
    billCount: v.number(),
    claimBatchCount: v.number(),
    sharedAccountEmail: v.string(),
  }),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret)

    const email = args.email?.trim().toLowerCase() || DEMO_SHARED_ACCOUNT_EMAIL
    const user = await resolveClerkUserByEmail(email)

    const result = (await ctx.runMutation(internal.demo.seedSharedClinicWorkspaceInternal, {
      clerkUserId: user.id,
      email,
    })) as {
      clinicId: Id<"clinics">
      patientCount: number
      billCount: number
      claimBatchCount: number
    }

    await createBackendClerkClient().users.updateUserMetadata(user.id, {
      unsafeMetadata: {
        clinicId: result.clinicId,
        demoWorkspace: "submission_shared_account",
      },
    })

    return {
      clerkUserId: user.id,
      clinicId: result.clinicId,
      patientCount: result.patientCount,
      billCount: result.billCount,
      claimBatchCount: result.claimBatchCount,
      sharedAccountEmail: email,
    }
  },
})

export const sendMetaPaymentSmokeTest = action({
  args: {
    adminSecret: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
  },
  returns: v.object({
    billId: v.id("bills"),
    patientId: v.id("patients"),
    paymentUrl: v.string(),
    messageId: v.string(),
  }),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret)

    const email = args.email?.trim().toLowerCase() || DEMO_SHARED_ACCOUNT_EMAIL
    const user = await resolveClerkUserByEmail(email)

    const billContext = (await ctx.runMutation(internal.demo.prepareMetaPaymentSmokeInternal, {
      clerkUserId: user.id,
      phone: normalizeSeedPhone(args.phone),
    })) as {
      billId: Id<"bills">
      patientId: Id<"patients">
    }

    const sendResult = (await ctx.runAction(internal.payments.sendPaymentRequestViaWhatsAppInternal, {
      billId: billContext.billId,
      isAutoResend: false,
    })) as {
      messageId: string
      paymentUrl: string
    }

    return {
      billId: billContext.billId,
      patientId: billContext.patientId,
      paymentUrl: sendResult.paymentUrl,
      messageId: sendResult.messageId,
    }
  },
})

export const seedSharedClinicWorkspaceInternal = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
  },
  returns: v.object({
    clinicId: v.id("clinics"),
    patientCount: v.number(),
    billCount: v.number(),
    claimBatchCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const existingClinic = await ctx.db
      .query("clinics")
      .withIndex("by_clerk_user_id", (q) => q.eq("createdByClerkUserId", args.clerkUserId))
      .unique()

    if (existingClinic) {
      await deleteClinicWorkspace(ctx, existingClinic, args.clerkUserId)
    }

    const seed = buildDemoWorkspaceSeed()
    const timestamp = Date.now()
    const clinicId = await ctx.db.insert("clinics", {
      ...seed.clinic,
      email: args.email,
      createdByClerkUserId: args.clerkUserId,
      createdAt: timestamp,
      bankAccountVerifiedAt: timestamp,
      bankVerificationProvider: "interswitch_marketplace",
      bankVerificationReference: "demo-bank-resolve-reference",
    })

    for (const service of DEFAULT_SERVICE_CATALOG) {
      await ctx.db.insert("service_catalog", {
        clinicId,
        ...service,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }

    const seededTemplates = mergeDirectoryIntoTemplates([], HMO_DIRECTORY_SEED_RECORDS)
    for (const template of seededTemplates) {
      await ctx.db.insert("hmo_templates", {
        clinicId,
        ...template,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }

    const patientIds = new Map<string, Id<"patients">>()
    for (const patient of seed.patients) {
      const patientId = await ctx.db.insert("patients", {
        clinicId,
        surname: patient.surname,
        otherNames: patient.otherNames,
        dateOfBirth: patient.dateOfBirth,
        sex: patient.sex,
        phone: patient.phone,
        nin: patient.nin,
        ninVerificationStatus: patient.ninVerificationStatus,
        ninVerificationProvider: patient.ninVerificationProvider,
        ninVerifiedAt: patient.ninVerifiedAt,
        ninVerificationMatchStatus: patient.ninVerificationMatchStatus,
        ninVerificationReference: patient.ninVerificationReference,
        paymentType: patient.paymentType,
        hmoName: patient.hmoName,
        enrolleeNhisNo: patient.enrolleeNhisNo,
        hmoSpecificId: patient.hmoSpecificId,
        hmoAdditionalFields: patient.hmoAdditionalFields,
        createdAt: timestamp,
      })
      patientIds.set(patient.key, patientId)

      if (patient.paymentType === "hmo" && patient.hmoName) {
        await ctx.db.insert("hmo_coverages", {
          clinicId,
          patientId,
          hmoName: patient.hmoName,
          memberId: patient.enrolleeNhisNo,
          coverageType: "General outpatient cover",
          coverageLimit: 500000,
          authorizationCode:
            patient.key === "female_hmo_auth"
              ? "HYG-AUTH-55218"
              : patient.key === "nin_demo_patient"
                ? "NHIA-AUTH-12944"
                : undefined,
          additionalIds: patient.hmoAdditionalFields.map((field) => ({
            key: field.label,
            value: field.value,
          })),
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      }
    }

    const billIds = new Map<string, Id<"bills">>()
    const idMap = new Map<string, string>()
    for (const bill of seed.bills) {
      const patientId = patientIds.get(bill.patientKey)
      if (!patientId) {
        throw new ConvexError({
          code: "INVALID_STATE",
          message: `Missing patient ${bill.patientKey} while seeding bills.`,
        })
      }

      const paymentLinkToken = bill.paymentLinkToken
      const paymentLink = paymentLinkToken ? buildPaymentLink(paymentLinkToken) : undefined
      const billId = await ctx.db.insert("bills", {
        clinicId,
        patientId,
        admissionType: bill.admissionType,
        dateNotification: bill.dateNotification,
        dateAdmission: bill.dateAdmission,
        dateDischarge: bill.dateDischarge,
        diagnosis: bill.diagnosis,
        presentingComplaints: bill.presentingComplaints,
        investigations: bill.investigations.map((item) => ({
          name: item.serviceName,
          amount: item.quantity * item.unitPrice,
        })),
        medications: bill.medications.map((item) => ({
          name: item.drugName,
          dosage: item.dosage,
          duration: item.duration,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        investigationsTotal: bill.investigationsTotal,
        medicationsTotal: bill.medicationsTotal,
        totalAmount: bill.totalAmount,
        hmoDeduction: bill.hmoDeduction,
        expectedReceivable: bill.expectedReceivable,
        authorizationCode: bill.authorizationCode,
        authCodeReceivedAt: bill.authCodeReceivedAt,
        status: bill.status,
        paymentChannel: bill.paymentChannel,
        transactionReference: bill.transactionReference,
        paymentLinkToken,
        paymentLink,
        paymentLinkTokenIssuedAt: paymentLinkToken ? bill.createdAt : undefined,
        paymentRequestStatus: bill.paymentRequestStatus,
        paymentRequestAttemptCount: bill.paymentRequestAttemptCount,
        paymentInitiatedAt: paymentLinkToken ? bill.createdAt : undefined,
        providerPaymentReference: bill.providerPaymentReference,
        paidAmount: bill.paidAmount,
        paidAt: bill.paidAt,
        createdAt: bill.createdAt,
      })
      billIds.set(bill.key, billId)
      idMap.set(bill.key, String(billId))

      for (const item of bill.investigations) {
        await ctx.db.insert("bill_items", {
          clinicId,
          billId,
          name: item.serviceName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          createdAt: bill.createdAt,
        })
      }

      for (const medication of bill.medications) {
        await ctx.db.insert("bill_medications", {
          clinicId,
          billId,
          name: medication.drugName,
          dosage: medication.dosage,
          duration: medication.duration,
          quantity: medication.quantity,
          unitPrice: medication.unitPrice,
          lineTotal: medication.quantity * medication.unitPrice,
          createdAt: bill.createdAt,
        })
      }

      if (bill.paymentChannel && bill.transactionReference) {
        await ctx.db.insert("payment_attempts", {
          clinicId,
          billId,
          paymentChannel: bill.paymentChannel,
          transactionReference: bill.transactionReference,
          paymentLinkToken: paymentLinkToken ?? `historic_${bill.transactionReference}`,
          paymentLink: paymentLink ?? buildPaymentLink(`historic_${bill.transactionReference}`),
          amountInKobo: formatAmountInKobo(bill.totalAmount),
          amountInNaira: bill.totalAmount,
          currency: "NGN",
          status: bill.paidAt ? "paid" : "initiated",
          providerPaymentReference: bill.providerPaymentReference,
          paidAt: bill.paidAt,
          createdAt: bill.createdAt,
        })
      }
    }

    for (const claimBatch of seed.claimBatches) {
      const batchBillIds = claimBatch.billKeys
        .map((billKey) => billIds.get(billKey))
        .filter((billId): billId is Id<"bills"> => billId !== undefined)

      const totalClaimed = claimBatch.billKeys.reduce((sum, billKey) => {
        const sourceBill = seed.bills.find((bill) => bill.key === billKey)
        return sum + (sourceBill?.expectedReceivable ?? 0)
      }, 0)

      const claimBatchId = await ctx.db.insert("claim_batches", {
        clinicId,
        hmoName: claimBatch.hmoName,
        tpaName: claimBatch.tpaName,
        tpaEmail: claimBatch.tpaEmail,
        periodStart: claimBatch.periodStart,
        periodEnd: claimBatch.periodEnd,
        billIds: batchBillIds,
        totalClaimed,
        status: claimBatch.status,
        submittedAt: claimBatch.submittedAt,
        expectedPaymentBy: claimBatch.expectedPaymentBy,
        paidAt: claimBatch.paidAt,
      })
      idMap.set(claimBatch.key, String(claimBatchId))

      for (const billKey of claimBatch.billKeys) {
        const billId = billIds.get(billKey)
        if (!billId) {
          continue
        }

        await ctx.db.insert("claim_batch_bills", {
          clinicId,
          claimBatchId,
          billId,
          completenessScore: claimBatch.completenessScore,
          scoreBand: claimBatch.scoreBand,
          blockingIssues: claimBatch.blockingIssues,
          warningIssues: claimBatch.warningIssues,
          createdAt: claimBatch.submittedAt ?? timestamp,
        })
      }

      await ctx.db.insert("tpa_submissions", {
        clinicId,
        claimBatchId,
        tpaName: claimBatch.tpaName,
        tpaEmail: claimBatch.tpaEmail,
        submittedAt: claimBatch.submittedAt ?? timestamp,
        expectedPaymentBy: claimBatch.expectedPaymentBy ?? timestamp,
        status: claimBatch.status,
        paidAt: claimBatch.paidAt,
      })
    }

    for (const notification of seed.notifications) {
      await ctx.db.insert("notifications", {
        clinicId,
        recipientClerkUserId: args.clerkUserId,
        type: notification.type,
        title: notification.title,
        description: notification.description,
        route: resolveNotificationRoute(notification.route, idMap),
        entityId: notification.entityKey ? idMap.get(notification.entityKey) : undefined,
        entityLabel: notification.entityLabel,
        isRead: notification.isRead,
        readAt: notification.isRead ? notification.createdAt : undefined,
        createdAt: notification.createdAt,
      })
    }

    return {
      clinicId,
      patientCount: seed.patients.length,
      billCount: seed.bills.length,
      claimBatchCount: seed.claimBatches.length,
    }
  },
})

export const prepareMetaPaymentSmokeInternal = internalMutation({
  args: {
    clerkUserId: v.string(),
    phone: v.string(),
  },
  returns: v.object({
    billId: v.id("bills"),
    patientId: v.id("patients"),
  }),
  handler: async (ctx, args) => {
    const clinic = await ctx.db
      .query("clinics")
      .withIndex("by_clerk_user_id", (q) => q.eq("createdByClerkUserId", args.clerkUserId))
      .unique()

    if (!clinic) {
      throw new ConvexError({
        code: "CLINIC_NOT_FOUND",
        message: "Seed the shared demo clinic before running the Meta smoke test.",
      })
    }

    const patient = (
      await ctx.db
        .query("patients")
        .withIndex("by_clinic", (q) => q.eq("clinicId", clinic._id))
        .collect()
    ).find(
      (candidate) =>
        candidate.surname === "Adeyemi" &&
        candidate.otherNames === "Esther Morenike" &&
        candidate.paymentType === "self_pay",
    )

    if (!patient) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "The WhatsApp smoke patient was not found. Rerun the shared demo seed first.",
      })
    }

    const bill = (
      await ctx.db
        .query("bills")
        .withIndex("by_clinic_and_patient", (q) => q.eq("clinicId", clinic._id).eq("patientId", patient._id))
        .collect()
    ).find(
      (candidate) =>
        candidate.status === "pending_payment" &&
        candidate.paymentChannel === undefined &&
        candidate.diagnosis === "Acute malaria with mild dehydration",
    )

    if (!bill) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "The WhatsApp smoke bill was not found. Rerun the shared demo seed first.",
      })
    }

    const paymentLinkToken = bill.paymentLinkToken ?? `pay_tok_smoke_${crypto.randomUUID().replace(/-/g, "")}`
    await ctx.db.patch(patient._id, {
      phone: normalizeSeedPhone(args.phone),
    })
    await ctx.db.patch(bill._id, {
      paymentLinkToken,
      paymentLink: buildPaymentLink(paymentLinkToken),
      paymentLinkTokenIssuedAt: bill.paymentLinkTokenIssuedAt ?? Date.now(),
      paymentInitiatedAt: bill.paymentInitiatedAt ?? Date.now(),
      paymentRequestStatus: "unsent",
      paymentRequestAttemptCount: 0,
      paymentRequestMessageId: undefined,
      paymentRequestFailedReason: undefined,
      paymentRequestSentAt: undefined,
      paymentRequestDeliveredAt: undefined,
      paymentRequestReadAt: undefined,
      paymentRequestLastAttemptAt: undefined,
      paymentRequestAutoResendAt: undefined,
      paymentRequestLastResentAt: undefined,
    })

    return {
      billId: bill._id,
      patientId: patient._id,
    }
  },
})

async function deleteClinicWorkspace(
  ctx: MutationCtx,
  clinic: Doc<"clinics">,
  clerkUserId: string,
) {
  const bills = await ctx.db
    .query("bills")
    .withIndex("by_clinic", (q) => q.eq("clinicId", clinic._id))
    .collect()
  const patients = await ctx.db
    .query("patients")
    .withIndex("by_clinic", (q) => q.eq("clinicId", clinic._id))
    .collect()
  const claimBatches = await ctx.db
    .query("claim_batches")
    .withIndex("by_clinic", (q) => q.eq("clinicId", clinic._id))
    .collect()
  const serviceCatalog = await ctx.db
    .query("service_catalog")
    .withIndex("by_clinic", (q) => q.eq("clinicId", clinic._id))
    .collect()
  const hmoTemplates = await ctx.db
    .query("hmo_templates")
    .withIndex("by_clinic", (q) => q.eq("clinicId", clinic._id))
    .collect()
  const claimBatchBills = await ctx.db
    .query("claim_batch_bills")
    .withIndex("by_clinic", (q) => q.eq("clinicId", clinic._id))
    .collect()
  const notifications = await ctx.db
    .query("notifications")
    .withIndex("by_recipient_clinic_and_created_at", (q) =>
      q.eq("recipientClerkUserId", clerkUserId).eq("clinicId", clinic._id),
    )
    .collect()

  for (const claimBatch of claimBatches) {
    const submissions = await ctx.db
      .query("tpa_submissions")
      .withIndex("by_claim_batch", (q) => q.eq("claimBatchId", claimBatch._id))
      .collect()
    await Promise.all(submissions.map((submission) => ctx.db.delete(submission._id)))
  }

  for (const patient of patients) {
    const coverages = await ctx.db
      .query("hmo_coverages")
      .withIndex("by_patient", (q) => q.eq("patientId", patient._id))
      .collect()
    await Promise.all(coverages.map((coverage) => ctx.db.delete(coverage._id)))
  }

  for (const bill of bills) {
    const [billItems, billMedications, paymentAttempts] = await Promise.all([
      ctx.db.query("bill_items").withIndex("by_bill", (q) => q.eq("billId", bill._id)).collect(),
      ctx.db
        .query("bill_medications")
        .withIndex("by_bill", (q) => q.eq("billId", bill._id))
        .collect(),
      ctx.db.query("payment_attempts").withIndex("by_bill", (q) => q.eq("billId", bill._id)).collect(),
    ])

    await Promise.all([
      ...billItems.map((item) => ctx.db.delete(item._id)),
      ...billMedications.map((item) => ctx.db.delete(item._id)),
      ...paymentAttempts.map((attempt) => ctx.db.delete(attempt._id)),
    ])
  }

  await Promise.all([
    ...claimBatchBills.map((record) => ctx.db.delete(record._id)),
    ...notifications.map((notification) => ctx.db.delete(notification._id)),
    ...claimBatches.map((claimBatch) => ctx.db.delete(claimBatch._id)),
    ...bills.map((bill) => ctx.db.delete(bill._id)),
    ...patients.map((patient) => ctx.db.delete(patient._id)),
    ...serviceCatalog.map((service) => ctx.db.delete(service._id)),
    ...hmoTemplates.map((template) => ctx.db.delete(template._id)),
  ])

  await ctx.db.delete(clinic._id)
}
