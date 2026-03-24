import { ConvexError, v } from "convex/values"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import {
  buildPatientFullName,
  calculateAgeFromDateOfBirth,
  maskNin,
  normalizePhoneNumber,
  validatePatientInput,
} from "../src/lib/patients"
import { requireClerkUserId } from "./lib/auth"

async function getCurrentClinicId(ctx: MutationCtx | QueryCtx) {
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

  return clinic._id
}

function toConvexFieldErrors(fieldErrors: object) {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  )
}

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

    return listItems.sort((left, right) => right.createdAt - left.createdAt)
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
  args: {
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
  },
  returns: v.id("patients"),
  handler: async (ctx, args) => {
    const clinicId = await getCurrentClinicId(ctx)
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

    return await ctx.db.insert("patients", {
      clinicId,
      surname: args.surname.trim(),
      otherNames: args.otherNames.trim(),
      dateOfBirth: args.dateOfBirth,
      sex: args.sex,
      phone: normalizePhoneNumber(args.phone),
      nin: args.nin?.trim() || undefined,
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
      createdAt: Date.now(),
    })
  },
})
