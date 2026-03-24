import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const statusValidator = v.union(
  v.literal("awaiting_auth"),
  v.literal("auth_confirmed"),
  v.literal("pending_payment"),
  v.literal("paid"),
  v.literal("claimed"),
  v.literal("overdue"),
)

const claimBatchStatusValidator = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("paid"),
  v.literal("overdue"),
)

export default defineSchema({
  clinics: defineTable({
    name: v.string(),
    address: v.string(),
    nhiaFacilityCode: v.string(),
    medicalDirectorName: v.string(),
    phone: v.string(),
    email: v.string(),
    createdByClerkUserId: v.string(),
    createdAt: v.number(),
  })
    .index("by_clerk_user_id", ["createdByClerkUserId"])
    .index("by_nhia_facility_code", ["nhiaFacilityCode"]),

  patients: defineTable({
    clinicId: v.id("clinics"),
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
    hmoAdditionalFields: v.optional(
      v.array(
        v.object({
          fieldKey: v.string(),
          label: v.string(),
          value: v.string(),
        }),
      ),
    ),
    createdAt: v.number(),
  })
    .index("by_clinic", ["clinicId"])
    .index("by_clinic_and_phone", ["clinicId", "phone"]),

  bills: defineTable({
    clinicId: v.id("clinics"),
    patientId: v.id("patients"),
    admissionType: v.union(v.literal("inpatient"), v.literal("outpatient")),
    dateNotification: v.string(),
    dateAdmission: v.string(),
    dateDischarge: v.string(),
    diagnosis: v.string(),
    presentingComplaints: v.string(),
    investigations: v.array(
      v.object({
        name: v.string(),
        amount: v.number(),
      }),
    ),
    medications: v.array(
      v.object({
        name: v.string(),
        dosage: v.string(),
        duration: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
      }),
    ),
    investigationsTotal: v.number(),
    medicationsTotal: v.number(),
    totalAmount: v.number(),
    hmoDeduction: v.number(),
    expectedReceivable: v.number(),
    authorizationCode: v.optional(v.string()),
    authCodeReceivedAt: v.optional(v.number()),
    status: statusValidator,
    webCheckoutHash: v.optional(v.string()),
    opayReference: v.optional(v.string()),
    interswitchRef: v.optional(v.string()),
    paymentLink: v.optional(v.string()),
    qrCode: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_clinic", ["clinicId"])
    .index("by_clinic_and_status", ["clinicId", "status"])
    .index("by_clinic_and_patient", ["clinicId", "patientId"]),

  bill_items: defineTable({
    clinicId: v.id("clinics"),
    billId: v.id("bills"),
    name: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    lineTotal: v.number(),
    createdAt: v.number(),
  })
    .index("by_bill", ["billId"])
    .index("by_clinic_and_bill", ["clinicId", "billId"]),

  bill_medications: defineTable({
    clinicId: v.id("clinics"),
    billId: v.id("bills"),
    name: v.string(),
    dosage: v.string(),
    duration: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    lineTotal: v.number(),
    createdAt: v.number(),
  })
    .index("by_bill", ["billId"])
    .index("by_clinic_and_bill", ["clinicId", "billId"]),

  hmo_coverages: defineTable({
    clinicId: v.id("clinics"),
    patientId: v.id("patients"),
    hmoName: v.string(),
    memberId: v.optional(v.string()),
    coverageType: v.optional(v.string()),
    coverageLimit: v.optional(v.number()),
    authorizationCode: v.optional(v.string()),
    additionalIds: v.optional(v.array(v.object({ key: v.string(), value: v.string() }))),
    rawOcrData: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_clinic_and_patient", ["clinicId", "patientId"]),

  claim_batches: defineTable({
    clinicId: v.id("clinics"),
    hmoName: v.string(),
    tpaName: v.string(),
    tpaEmail: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
    billIds: v.array(v.id("bills")),
    totalClaimed: v.number(),
    claimsPdfUrl: v.string(),
    coverLetterPdfUrl: v.string(),
    submittedAt: v.number(),
    expectedPaymentBy: v.number(),
    status: claimBatchStatusValidator,
    paidAt: v.optional(v.number()),
  })
    .index("by_clinic", ["clinicId"])
    .index("by_clinic_and_status", ["clinicId", "status"]),

  claim_batch_bills: defineTable({
    clinicId: v.id("clinics"),
    claimBatchId: v.id("claim_batches"),
    billId: v.id("bills"),
    createdAt: v.number(),
  })
    .index("by_claim_batch", ["claimBatchId"])
    .index("by_bill", ["billId"]),

  service_catalog: defineTable({
    clinicId: v.id("clinics"),
    name: v.string(),
    category: v.union(
      v.literal("consultation"),
      v.literal("investigation"),
      v.literal("medication"),
      v.literal("procedure"),
    ),
    defaultPrice: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clinic", ["clinicId"])
    .index("by_clinic_and_name", ["clinicId", "name"]),

  hmo_templates: defineTable({
    clinicId: v.id("clinics"),
    hmoName: v.string(),
    additionalFields: v.array(
      v.object({
        label: v.string(),
        fieldKey: v.string(),
      }),
    ),
    formLayoutConfig: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clinic", ["clinicId"])
    .index("by_clinic_and_hmo_name", ["clinicId", "hmoName"]),

  tpa_submissions: defineTable({
    clinicId: v.id("clinics"),
    claimBatchId: v.id("claim_batches"),
    tpaName: v.string(),
    tpaEmail: v.string(),
    submittedAt: v.number(),
    expectedPaymentBy: v.number(),
    status: claimBatchStatusValidator,
    paidAt: v.optional(v.number()),
  })
    .index("by_claim_batch", ["claimBatchId"])
    .index("by_clinic_and_status", ["clinicId", "status"]),
})
