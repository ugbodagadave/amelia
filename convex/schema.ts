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

const claimScoreBandValidator = v.union(
  v.literal("green"),
  v.literal("amber"),
  v.literal("red"),
)

const notificationTypeValidator = v.union(
  v.literal("patient_created"),
  v.literal("bill_created"),
  v.literal("auth_confirmed"),
  v.literal("payment_request_sent"),
  v.literal("payment_request_failed"),
  v.literal("payment_confirmed"),
  v.literal("claim_batch_generated"),
  v.literal("claim_batch_submitted"),
  v.literal("claim_batch_paid"),
  v.literal("claim_batch_overdue"),
)

const paymentChannelValidator = v.union(v.literal("card"), v.literal("opay"))
const paymentRequestChannelValidator = v.union(v.literal("whatsapp"), v.literal("sms"))
const paymentRequestStatusValidator = v.union(
  v.literal("unsent"),
  v.literal("queued"),
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("read"),
  v.literal("failed"),
)

export default defineSchema({
  clinics: defineTable({
    name: v.string(),
    address: v.string(),
    nhiaFacilityCode: v.string(),
    medicalDirectorName: v.string(),
    phone: v.string(),
    email: v.string(),
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
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
    paymentChannel: v.optional(paymentChannelValidator),
    transactionReference: v.optional(v.string()),
    webCheckoutHash: v.optional(v.string()),
    opayReference: v.optional(v.string()),
    interswitchRef: v.optional(v.string()),
    paymentLink: v.optional(v.string()),
    paymentLinkToken: v.optional(v.string()),
    paymentLinkTokenIssuedAt: v.optional(v.number()),
    paymentRequestChannel: v.optional(paymentRequestChannelValidator),
    paymentRequestStatus: v.optional(paymentRequestStatusValidator),
    paymentRequestSentAt: v.optional(v.number()),
    paymentRequestDeliveredAt: v.optional(v.number()),
    paymentRequestReadAt: v.optional(v.number()),
    paymentRequestMessageId: v.optional(v.string()),
    paymentRequestFailedReason: v.optional(v.string()),
    paymentRequestLastAttemptAt: v.optional(v.number()),
    paymentRequestAttemptCount: v.optional(v.number()),
    paymentRequestAutoResendAt: v.optional(v.number()),
    paymentRequestLastResentAt: v.optional(v.number()),
    qrCode: v.optional(v.string()),
    paymentInitiatedAt: v.optional(v.number()),
    providerPaymentReference: v.optional(v.string()),
    paidAmount: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_clinic", ["clinicId"])
    .index("by_clinic_and_status", ["clinicId", "status"])
    .index("by_clinic_and_patient", ["clinicId", "patientId"])
    .index("by_payment_link_token", ["paymentLinkToken"]),

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
    claimsPdfUrl: v.optional(v.string()),
    coverLetterPdfUrl: v.optional(v.string()),
    mergedPdfStorageId: v.optional(v.id("_storage")),
    zipBundleStorageId: v.optional(v.id("_storage")),
    coverLetterStorageId: v.optional(v.id("_storage")),
    submittedAt: v.optional(v.number()),
    expectedPaymentBy: v.optional(v.number()),
    status: claimBatchStatusValidator,
    paidAt: v.optional(v.number()),
  })
    .index("by_clinic", ["clinicId"])
    .index("by_clinic_and_status", ["clinicId", "status"]),

  claim_batch_bills: defineTable({
    clinicId: v.id("clinics"),
    claimBatchId: v.id("claim_batches"),
    billId: v.id("bills"),
    claimPdfStorageId: v.optional(v.id("_storage")),
    completenessScore: v.optional(v.number()),
    scoreBand: v.optional(claimScoreBandValidator),
    blockingIssues: v.optional(v.array(v.string())),
    warningIssues: v.optional(v.array(v.string())),
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
    tpaName: v.optional(v.string()),
    tpaEmail: v.optional(v.string()),
    additionalFields: v.array(
      v.object({
        label: v.string(),
        fieldKey: v.string(),
      }),
    ),
    templateAssetPath: v.optional(v.string()),
    templateFieldMapJson: v.optional(v.string()),
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

  notifications: defineTable({
    clinicId: v.id("clinics"),
    recipientClerkUserId: v.string(),
    type: notificationTypeValidator,
    title: v.string(),
    description: v.string(),
    route: v.string(),
    entityId: v.optional(v.string()),
    entityLabel: v.optional(v.string()),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_recipient_and_created_at", ["recipientClerkUserId", "createdAt"])
    .index("by_recipient_and_read_state", ["recipientClerkUserId", "isRead"]),
})
