import { ConvexError, v } from "convex/values"
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import {
  buildPatientFullName,
  calculateAgeFromDateOfBirth,
  maskNin,
  normalizePhoneNumber,
  validatePatientInput,
} from "../src/lib/patients"
import { buildHmoCoverageSnapshotFromOcr } from "../src/lib/ocr"
import { ROUTES } from "../src/constants/routes"
import { NOTIFICATION_TYPE } from "../src/lib/notifications"
import { requireClerkUserId } from "./lib/auth"
import { fetchMarketplaceToken, verifyMarketplaceNin } from "./lib/marketplace"

const patientArgs = {
  surname: v.string(),
  otherNames: v.string(),
  dateOfBirth: v.string(),
  sex: v.union(v.literal("male"), v.literal("female")),
  phone: v.string(),
  nin: v.optional(v.string()),
  paymentType: v.union(v.literal("self_pay"), v.literal("hmo")),
  hmoName: v.optional(v.string()),
  enrolleeNhisNo: v.optional(v.string()),
  hmoSpecificId: v.optional(v.string()),
  hmoAdditionalFields: v.array(
    v.object({
      fieldKey: v.string(),
      label: v.string(),
      value: v.string(),
    }),
  ),
  ocrAudit: v.optional(
    v.object({
      source: v.union(v.literal("patient_registration"), v.literal("bill_builder")),
      fileName: v.string(),
      mediaType: v.union(
        v.literal("image/jpeg"),
        v.literal("image/png"),
        v.literal("image/webp"),
        v.literal("application/pdf"),
      ),
      extractedAt: v.number(),
      responseId: v.string(),
      pagesProcessed: v.number(),
      markdown: v.string(),
      rawResponse: v.string(),
      extracted: v.object({
        hmoName: v.string(),
        memberId: v.string(),
        enrolleeName: v.string(),
        nhisNumber: v.string(),
        authorizationCode: v.string(),
        coverageType: v.string(),
        coverageLimit: v.string(),
        additionalIds: v.record(v.string(), v.string()),
      }),
    }),
  ),
} as const

const persistedPatientArgs = {
  ...patientArgs,
  ninVerificationStatus: v.optional(
    v.union(v.literal("unverified"), v.literal("verified"), v.literal("failed")),
  ),
  ninVerificationProvider: v.optional(v.string()),
  ninVerifiedAt: v.optional(v.number()),
  ninVerificationMatchStatus: v.optional(v.string()),
  ninVerificationReference: v.optional(v.string()),
} as const

async function getCurrentClinic(ctx: MutationCtx | QueryCtx) {
  const clerkUserId = await requireClerkUserId(ctx)
  const clinic = await ctx.db
    .query("clinics")
    .withIndex("by_clerk_user_id", (q) => q.eq("createdByClerkUserId", clerkUserId))
    .unique()

  if (!clinic) {
    throw new ConvexError({
      code: "CLINIC_NOT_FOUND",
      message: "Complete onboarding before managing patients.",
    })
  }

  return { clinic, clerkUserId }
}

async function getCurrentClinicId(ctx: MutationCtx | QueryCtx) {
  const { clinic } = await getCurrentClinic(ctx)
  return clinic._id
}

async function getCurrentClinicForAction(ctx: ActionCtx) {
  const clerkUserId = await requireClerkUserId(ctx)
  const clinic = (await ctx.runQuery(internal.patients.getClinicByClerkUserId, {
    clerkUserId,
  })) as Doc<"clinics"> | null

  if (!clinic) {
    throw new ConvexError({
      code: "CLINIC_NOT_FOUND",
      message: "Complete onboarding before managing patients.",
    })
  }

  return { clinic, clerkUserId }
}

function toConvexFieldErrors(fieldErrors: object) {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  )
}

type PersistPatientArgs = {
  surname: string
  otherNames: string
  dateOfBirth: string
  sex: "male" | "female"
  phone: string
  nin?: string
  ninVerificationStatus?: "unverified" | "verified" | "failed"
  ninVerificationProvider?: string
  ninVerifiedAt?: number
  ninVerificationMatchStatus?: string
  ninVerificationReference?: string
  paymentType: "self_pay" | "hmo"
  hmoName?: string
  enrolleeNhisNo?: string
  hmoSpecificId?: string
  hmoAdditionalFields: Array<{
    fieldKey: string
    label: string
    value: string
  }>
  ocrAudit?: {
    source: "patient_registration" | "bill_builder"
    fileName: string
    mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"
    extractedAt: number
    responseId: string
    pagesProcessed: number
    markdown: string
    rawResponse: string
    extracted: {
      hmoName: string
      memberId: string
      enrolleeName: string
      nhisNumber: string
      authorizationCode: string
      coverageType: string
      coverageLimit: string
      additionalIds: Record<string, string>
    }
  }
}

async function persistPatientRecord(
  ctx: MutationCtx,
  clinic: Awaited<ReturnType<typeof getCurrentClinic>>["clinic"],
  clerkUserId: string,
  args: PersistPatientArgs,
) {
  const clinicId = clinic._id
  const createdAt = Date.now()
  const patientId = await ctx.db.insert("patients", {
    clinicId,
    surname: args.surname.trim(),
    otherNames: args.otherNames.trim(),
    dateOfBirth: args.dateOfBirth,
    sex: args.sex,
    phone: normalizePhoneNumber(args.phone),
    nin: args.nin?.trim() || undefined,
    ninVerificationStatus: args.ninVerificationStatus,
    ninVerificationProvider: args.ninVerificationProvider,
    ninVerifiedAt: args.ninVerifiedAt,
    ninVerificationMatchStatus: args.ninVerificationMatchStatus,
    ninVerificationReference: args.ninVerificationReference,
    paymentType: args.paymentType,
    hmoName: args.paymentType === "hmo" ? args.hmoName?.trim() || undefined : undefined,
    enrolleeNhisNo:
      args.paymentType === "hmo" ? args.enrolleeNhisNo?.trim() || undefined : undefined,
    hmoSpecificId:
      args.paymentType === "hmo" ? args.hmoSpecificId?.trim() || undefined : undefined,
    hmoAdditionalFields:
      args.paymentType === "hmo"
        ? args.hmoAdditionalFields.map((field) => ({
            fieldKey: field.fieldKey,
            label: field.label,
            value: field.value.trim(),
          }))
        : undefined,
    createdAt,
  })

  if (args.paymentType === "hmo" && args.ocrAudit) {
    const snapshot = buildHmoCoverageSnapshotFromOcr(
      patientId,
      args.hmoName?.trim() || args.ocrAudit.extracted.hmoName,
      args.ocrAudit,
    )
    const existingCoverage = await ctx.db
      .query("hmo_coverages")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .unique()

    if (existingCoverage) {
      await ctx.db.patch(existingCoverage._id, {
        hmoName: snapshot.hmoName,
        memberId: snapshot.memberId,
        coverageType: snapshot.coverageType,
        coverageLimit: snapshot.coverageLimit,
        authorizationCode: snapshot.authorizationCode,
        additionalIds: snapshot.additionalIds,
        rawOcrData: snapshot.rawOcrData,
        updatedAt: createdAt,
      })
    } else {
      await ctx.db.insert("hmo_coverages", {
        clinicId,
        patientId,
        hmoName: snapshot.hmoName,
        memberId: snapshot.memberId,
        coverageType: snapshot.coverageType,
        coverageLimit: snapshot.coverageLimit,
        authorizationCode: snapshot.authorizationCode,
        additionalIds: snapshot.additionalIds,
        rawOcrData: snapshot.rawOcrData,
        createdAt,
        updatedAt: createdAt,
      })
    }
  }

  const patientName = buildPatientFullName(args.surname, args.otherNames)
  await ctx.runMutation(internal.notifications.createNotification, {
    clinicId,
    recipientClerkUserId: clerkUserId,
    type: NOTIFICATION_TYPE.PATIENT_CREATED,
    title: "Patient added",
    description: `${patientName} was added to ${clinic.name}.`,
    route: `${ROUTES.PATIENTS}/${patientId}`,
    entityId: patientId,
    entityLabel: patientName,
    createdAt,
  })

  return patientId
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

export const list = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_clinic", (q) => q.eq("clinicId", clinicId))
      .collect()

    const listItems = await Promise.all(
      patients.map(async (patient) => {
        const latestBill = await ctx.db
          .query("bills")
          .withIndex("by_clinic_and_patient", (q) =>
            q.eq("clinicId", clinicId).eq("patientId", patient._id),
          )
          .order("desc")
          .first()

        return {
          _id: patient._id,
          fullName: buildPatientFullName(patient.surname, patient.otherNames),
          age: calculateAgeFromDateOfBirth(patient.dateOfBirth),
          maskedNin: maskNin(patient.nin),
          phone: patient.phone,
          paymentType: patient.paymentType,
          hmoName: patient.hmoName ?? null,
          lastVisitDate: latestBill?.dateAdmission ?? latestBill?.dateNotification ?? null,
          statusLabel: patient.paymentType === "hmo" ? "HMO" : "Self-pay",
          createdAt: patient.createdAt,
        }
      }),
    )

    return [...listItems].sort((left, right) => left.fullName.localeCompare(right.fullName))
  },
})

export const listHmoTemplates = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)

    return await ctx.db
      .query("hmo_templates")
      .withIndex("by_clinic", (q) => q.eq("clinicId", clinicId))
      .collect()
  },
})

export const getById = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const clinicId = await getCurrentClinicId(ctx)
    const patient = await ctx.db.get(args.patientId)

    if (!patient || patient.clinicId !== clinicId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Patient not found for this clinic.",
      })
    }

    const billHistory = await ctx.db
      .query("bills")
      .withIndex("by_clinic_and_patient", (q) =>
        q.eq("clinicId", clinicId).eq("patientId", patient._id),
      )
      .order("desc")
      .collect()

    return {
      ...patient,
      fullName: buildPatientFullName(patient.surname, patient.otherNames),
      age: calculateAgeFromDateOfBirth(patient.dateOfBirth),
      maskedNin: maskNin(patient.nin),
      billHistory: billHistory.map((bill) => ({
        _id: bill._id,
        diagnosis: bill.diagnosis,
        totalAmount: bill.totalAmount,
        status: bill.status,
        createdAt: bill.createdAt,
        dateAdmission: bill.dateAdmission,
        dateNotification: bill.dateNotification,
      })),
    }
  },
})

export const create = mutation({
  args: patientArgs,
  returns: v.id("patients"),
  handler: async (ctx, args) => {
    const { clinic, clerkUserId } = await getCurrentClinic(ctx)
    const fieldErrors = validatePatientInput({
      surname: args.surname,
      otherNames: args.otherNames,
      dateOfBirth: args.dateOfBirth,
      sex: args.sex,
      phone: args.phone,
      nin: args.nin,
      paymentType: args.paymentType,
      hmoName: args.hmoName,
      enrolleeNhisNo: args.enrolleeNhisNo,
      hmoAdditionalFields: args.hmoAdditionalFields,
    })

    if (Object.keys(fieldErrors).length > 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Patient details are invalid.",
        fieldErrors: toConvexFieldErrors(fieldErrors),
      })
    }

    return await persistPatientRecord(ctx, clinic, clerkUserId, {
      ...args,
      ninVerificationStatus: args.nin?.trim() ? "unverified" : undefined,
    })
  },
})

export const createPatientRecord = internalMutation({
  args: persistedPatientArgs,
  returns: v.id("patients"),
  handler: async (ctx, args) => {
    const { clinic, clerkUserId } = await getCurrentClinic(ctx)
    return await persistPatientRecord(ctx, clinic, clerkUserId, args)
  },
})

export const registerPatient = action({
  args: patientArgs,
  returns: v.id("patients"),
  handler: async (ctx, args): Promise<Id<"patients">> => {
    await getCurrentClinicForAction(ctx)

    const fieldErrors = validatePatientInput({
      surname: args.surname,
      otherNames: args.otherNames,
      dateOfBirth: args.dateOfBirth,
      sex: args.sex,
      phone: args.phone,
      nin: args.nin,
      paymentType: args.paymentType,
      hmoName: args.hmoName,
      enrolleeNhisNo: args.enrolleeNhisNo,
      hmoAdditionalFields: args.hmoAdditionalFields,
    })

    if (Object.keys(fieldErrors).length > 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Patient details are invalid.",
        fieldErrors: toConvexFieldErrors(fieldErrors),
      })
    }

    let ninVerificationStatus: "unverified" | "verified" | "failed" | undefined =
      args.nin?.trim() ? "unverified" : undefined
    let ninVerificationProvider: string | undefined
    let ninVerifiedAt: number | undefined
    let ninVerificationMatchStatus: string | undefined
    let ninVerificationReference: string | undefined

    if (args.paymentType === "hmo" && args.nin?.trim()) {
      const { access_token } = await fetchMarketplaceToken()
      const verification = await verifyMarketplaceNin({
        accessToken: access_token,
        firstName: args.otherNames,
        lastName: args.surname,
        nin: args.nin,
      })

      ninVerificationStatus = verification.isVerified ? "verified" : "failed"
      ninVerificationProvider = "interswitch_marketplace"
      ninVerificationMatchStatus = verification.status
      ninVerificationReference = verification.reference || undefined
      ninVerifiedAt = verification.isVerified ? Date.now() : undefined

      if (!verification.isVerified) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Patient details are invalid.",
          fieldErrors: {
            nin:
              verification.status === "NOT_MATCH"
                ? "NIN details do not match the patient's name."
                : "Unable to verify the NIN.",
          },
        })
      }
    }

    return await ctx.runMutation(internal.patients.createPatientRecord, {
      ...args,
      ninVerificationStatus,
      ninVerificationProvider,
      ninVerifiedAt,
      ninVerificationMatchStatus,
      ninVerificationReference,
    })
  },
})
