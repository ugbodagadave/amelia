import { ConvexError, v } from "convex/values"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"
import {
  BILL_STATUS,
  buildBillCreateStatus,
  calculateBillSummary,
  formatBillStatusLabel,
  validateBillInput,
} from "../src/lib/billing"
import { buildPatientFullName, maskNin } from "../src/lib/patients"
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
      message: "Complete onboarding before managing bills.",
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

async function getPatientForClinic(
  ctx: MutationCtx | QueryCtx,
  clinicId: Id<"clinics">,
  patientId: Id<"patients">,
): Promise<Doc<"patients">> {
  const patient = await ctx.db.get(patientId)

  if (!patient || patient.clinicId !== clinicId) {
    throw new ConvexError({
      code: "PATIENT_NOT_FOUND",
      message: "The selected patient was not found for this clinic.",
    })
  }

  return patient
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)
    const [bills, patients] = await Promise.all([
      ctx.db.query("bills").withIndex("by_clinic", (q) => q.eq("clinicId", clinicId)).collect(),
      ctx.db.query("patients").withIndex("by_clinic", (q) => q.eq("clinicId", clinicId)).collect(),
    ])

    const patientMap = new Map(
      patients.map((patient) => [
        patient._id,
        {
          fullName: buildPatientFullName(patient.surname, patient.otherNames),
          paymentType: patient.paymentType,
          hmoName: patient.hmoName ?? null,
          maskedNin: maskNin(patient.nin),
        },
      ]),
    )

    return bills
      .map((bill) => {
        const patient = patientMap.get(bill.patientId)
        return {
          _id: bill._id,
          patientId: bill.patientId,
          patientName: patient?.fullName ?? "Unknown patient",
          paymentType: patient?.paymentType ?? "self_pay",
          hmoName: patient?.hmoName ?? null,
          maskedNin: patient?.maskedNin ?? "Not provided",
          diagnosis: bill.diagnosis,
          totalAmount: bill.totalAmount,
          status: bill.status,
          statusLabel: formatBillStatusLabel(bill.status),
          authorizationCode: bill.authorizationCode ?? null,
          hasAuthCode: !!bill.authorizationCode,
          createdAt: bill.createdAt,
        }
      })
      .sort((left, right) => right.createdAt - left.createdAt)
  },
})

export const listPatients = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_clinic", (q) => q.eq("clinicId", clinicId))
      .collect()

    return patients
      .map((patient) => ({
        _id: patient._id,
        fullName: buildPatientFullName(patient.surname, patient.otherNames),
        phone: patient.phone,
        paymentType: patient.paymentType,
        hmoName: patient.hmoName ?? null,
      }))
      .sort((left, right) => left.fullName.localeCompare(right.fullName))
  },
})

export const listServices = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)
    const services = await ctx.db
      .query("service_catalog")
      .withIndex("by_clinic", (q) => q.eq("clinicId", clinicId))
      .collect()

    return services
      .filter((service) => service.category !== "medication")
      .sort((left, right) => left.name.localeCompare(right.name))
  },
})

export const getById = query({
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

  const [patient, items, medications] = await Promise.all([
      getPatientForClinic(ctx, clinicId, bill.patientId),
      ctx.db
        .query("bill_items")
        .withIndex("by_clinic_and_bill", (q) => q.eq("clinicId", clinicId).eq("billId", bill._id))
        .collect(),
      ctx.db
        .query("bill_medications")
        .withIndex("by_clinic_and_bill", (q) => q.eq("clinicId", clinicId).eq("billId", bill._id))
        .collect(),
    ])

    return {
      ...bill,
      patient: {
        _id: patient._id,
        fullName: buildPatientFullName(patient.surname, patient.otherNames),
        phone: patient.phone,
        paymentType: patient.paymentType,
        hmoName: patient.hmoName ?? null,
        enrolleeNhisNo: patient.enrolleeNhisNo ?? null,
        maskedNin: maskNin(patient.nin),
      },
      items: items.sort(
        (left: Doc<"bill_items">, right: Doc<"bill_items">) => left.createdAt - right.createdAt,
      ),
      medications: medications.sort(
        (left: Doc<"bill_medications">, right: Doc<"bill_medications">) =>
          left.createdAt - right.createdAt,
      ),
      statusLabel: formatBillStatusLabel(bill.status),
    }
  },
})

export const create = mutation({
  args: {
    patientId: v.id("patients"),
    admissionType: v.union(v.literal("outpatient"), v.literal("inpatient")),
    dateNotification: v.string(),
    dateAdmission: v.string(),
    dateDischarge: v.string(),
    diagnosis: v.string(),
    presentingComplaints: v.string(),
    investigations: v.array(
      v.object({
        serviceName: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
      }),
    ),
    medications: v.array(
      v.object({
        drugName: v.string(),
        dosage: v.string(),
        duration: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
      }),
    ),
    authorizationCode: v.optional(v.string()),
  },
  returns: v.id("bills"),
  handler: async (ctx, args) => {
    const clinicId = await getCurrentClinicId(ctx)
    const patient = await getPatientForClinic(ctx, clinicId, args.patientId)
    const fieldErrors = validateBillInput({
      patientId: args.patientId,
      patientPaymentType: patient.paymentType,
      admissionType: args.admissionType,
      dateNotification: args.dateNotification,
      dateAdmission: args.dateAdmission,
      dateDischarge: args.dateDischarge,
      diagnosis: args.diagnosis,
      presentingComplaints: args.presentingComplaints,
      investigations: args.investigations,
      medications: args.medications,
      authorizationCode: args.authorizationCode,
    })

    if (Object.keys(fieldErrors).length > 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Bill details are invalid.",
        fieldErrors: toConvexFieldErrors(fieldErrors),
      })
    }

    const createdAt = Date.now()
    const authorizationCode = patient.paymentType === "hmo" ? args.authorizationCode?.trim() : undefined
    const summary = calculateBillSummary({
      paymentType: patient.paymentType,
      investigations: args.investigations,
      medications: args.medications.map((medication) => ({
        drugName: medication.drugName,
        dosage: medication.dosage,
        duration: medication.duration,
        quantity: medication.quantity,
        unitPrice: medication.unitPrice,
      })),
    })
    const status = buildBillCreateStatus(patient.paymentType, authorizationCode)

    for (const item of args.investigations) {
      const existingService = await ctx.db
        .query("service_catalog")
        .withIndex("by_clinic_and_name", (q) =>
          q.eq("clinicId", clinicId).eq("name", item.serviceName.trim()),
        )
        .unique()

      if (!existingService) {
        await ctx.db.insert("service_catalog", {
          clinicId,
          name: item.serviceName.trim(),
          category: "investigation",
          defaultPrice: item.unitPrice,
          createdAt,
          updatedAt: createdAt,
        })
      }
    }

    const billId = await ctx.db.insert("bills", {
      clinicId,
      patientId: args.patientId,
      admissionType: args.admissionType,
      dateNotification: args.dateNotification,
      dateAdmission: args.dateAdmission,
      dateDischarge: args.dateDischarge,
      diagnosis: args.diagnosis.trim(),
      presentingComplaints: args.presentingComplaints.trim(),
      investigations: args.investigations.map((item) => ({
        name: item.serviceName.trim(),
        amount: item.quantity * item.unitPrice,
      })),
      medications: args.medications.map((medication) => ({
        name: medication.drugName.trim(),
        dosage: medication.dosage.trim(),
        duration: medication.duration.trim(),
        quantity: medication.quantity,
        unitPrice: medication.unitPrice,
      })),
      investigationsTotal: summary.investigationsTotal,
      medicationsTotal: summary.medicationsTotal,
      totalAmount: summary.totalAmount,
      hmoDeduction: summary.hmoDeduction,
      expectedReceivable: summary.expectedReceivable,
      authorizationCode,
      authCodeReceivedAt: authorizationCode ? createdAt : undefined,
      status,
      createdAt,
    })

    for (const item of args.investigations) {
      await ctx.db.insert("bill_items", {
        clinicId,
        billId,
        name: item.serviceName.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
        createdAt,
      })
    }

    for (const medication of args.medications) {
      await ctx.db.insert("bill_medications", {
        clinicId,
        billId,
        name: medication.drugName.trim(),
        dosage: medication.dosage.trim(),
        duration: medication.duration.trim(),
        quantity: medication.quantity,
        unitPrice: medication.unitPrice,
        lineTotal: medication.quantity * medication.unitPrice,
        createdAt,
      })
    }

    return billId
  },
})

export const confirmAuthCode = mutation({
  args: {
    billId: v.id("bills"),
    authorizationCode: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const clinicId = await getCurrentClinicId(ctx)
    const bill = await ctx.db.get(args.billId)

    if (!bill || bill.clinicId !== clinicId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Bill not found for this clinic." })
    }

    const patient = await getPatientForClinic(ctx, clinicId, bill.patientId)
    if (patient.paymentType !== "hmo") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Self-pay bills do not use auth codes." })
    }

    const authorizationCode = args.authorizationCode.trim()
    if (!authorizationCode) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Authorization code is required.",
      })
    }

    await ctx.db.patch(args.billId, {
      authorizationCode,
      authCodeReceivedAt: Date.now(),
      status: BILL_STATUS.AUTH_CONFIRMED,
    })

    return null
  },
})

export const changeAuthCode = mutation({
  args: {
    billId: v.id("bills"),
    authorizationCode: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const clinicId = await getCurrentClinicId(ctx)
    const bill = await ctx.db.get(args.billId)

    if (!bill || bill.clinicId !== clinicId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Bill not found for this clinic." })
    }

    const patient = await getPatientForClinic(ctx, clinicId, bill.patientId)
    if (patient.paymentType !== "hmo") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Self-pay bills do not use auth codes." })
    }

    const authorizationCode = args.authorizationCode.trim()
    if (!authorizationCode) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Authorization code is required.",
      })
    }

    await ctx.db.patch(args.billId, {
      authorizationCode,
      authCodeReceivedAt: Date.now(),
      status: BILL_STATUS.AUTH_CONFIRMED,
    })

    return null
  },
})
