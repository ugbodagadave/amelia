import { ADMISSION_TYPE, BILL_STATUS, calculateBillSummary } from "./billing"
import { CLAIM_BATCH_STATUS, CLAIM_SCORE_BAND } from "./claims"
import { NOTIFICATION_TYPE } from "./notifications"

export const DEMO_SHARED_ACCOUNT_EMAIL = "esther@getamelia.online"

export const DEMO_WORKSPACE_ADMIN_SECRET_ENV = "DEMO_WORKSPACE_ADMIN_SECRET"

export const DEMO_TEST_IDENTIFIERS = {
  nin: {
    fullName: "Bunch Dillon",
    firstName: "Bunch",
    lastName: "Dillon",
    value: "63184876213",
    expectedPhone: "08000000000",
  },
  bank: {
    bankCode: "058",
    bankName: "Guaranty Trust Bank",
    accountNumber: "1000000000",
    accountName: "MICHAEL JOHN DOE",
  },
} as const

export const DEMO_META_SMOKE = {
  patientKey: "judge_self_pay",
  billKey: "bill_judge_self_pay",
  defaultPhone: "08090000001",
} as const

export interface DemoClinicSeed {
  name: string
  address: string
  nhiaFacilityCode: string
  medicalDirectorName: string
  phone: string
  email: string
  bankCode: string
  bankName: string
  accountNumber: string
  accountName: string
}

export interface DemoPatientSeed {
  key: string
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
}

export interface DemoBillSeed {
  key: string
  patientKey: string
  admissionType: "outpatient" | "inpatient"
  dateNotification: string
  dateAdmission: string
  dateDischarge: string
  diagnosis: string
  presentingComplaints: string
  investigations: Array<{
    serviceName: string
    quantity: number
    unitPrice: number
  }>
  medications: Array<{
    drugName: string
    dosage: string
    duration: string
    quantity: number
    unitPrice: number
  }>
  investigationsTotal: number
  medicationsTotal: number
  totalAmount: number
  hmoDeduction: number
  expectedReceivable: number
  authorizationCode?: string
  authCodeReceivedAt?: number
  status: typeof BILL_STATUS[keyof typeof BILL_STATUS]
  paymentChannel?: "card" | "opay"
  transactionReference?: string
  paymentLinkToken?: string
  paymentRequestStatus?: "unsent" | "sent" | "delivered" | "read" | "failed"
  paymentRequestAttemptCount?: number
  providerPaymentReference?: string
  paidAmount?: number
  paidAt?: number
  createdAt: number
}

export interface DemoClaimBatchSeed {
  key: string
  hmoName: string
  tpaName: string
  tpaEmail: string
  periodStart: string
  periodEnd: string
  billKeys: string[]
  status: typeof CLAIM_BATCH_STATUS[keyof typeof CLAIM_BATCH_STATUS]
  submittedAt?: number
  expectedPaymentBy?: number
  paidAt?: number
  scoreBand?: typeof CLAIM_SCORE_BAND[keyof typeof CLAIM_SCORE_BAND]
  completenessScore?: number
  blockingIssues?: string[]
  warningIssues?: string[]
}

export interface DemoNotificationSeed {
  type: typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE]
  title: string
  description: string
  route: string
  entityKey?: string
  entityLabel?: string
  createdAt: number
  isRead: boolean
}

export interface DemoWorkspaceSeed {
  clinic: DemoClinicSeed
  patients: DemoPatientSeed[]
  bills: DemoBillSeed[]
  claimBatches: DemoClaimBatchSeed[]
  notifications: DemoNotificationSeed[]
  metaSmoke: typeof DEMO_META_SMOKE
}

function formatDateOffset(now: number, daysOffset: number) {
  return new Date(now + daysOffset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function timestampOffset(now: number, daysOffset: number, hour = 9, minute = 0) {
  const date = new Date(now + daysOffset * 24 * 60 * 60 * 1000)
  date.setUTCHours(hour, minute, 0, 0)
  return date.getTime()
}

function buildDeterministicPaymentToken(suffix: string) {
  return `pay_tok_${suffix}`
}

export function buildDemoWorkspaceSeed(now = Date.now()): DemoWorkspaceSeed {
  const clinic: DemoClinicSeed = {
    name: "Apex Specialist Clinic",
    address: "12 Marina Road, Lagos",
    nhiaFacilityCode: "NHIA-1029",
    medicalDirectorName: "Dr. Amina Bello",
    phone: "+2348012345678",
    email: "ops@apexclinic.ng",
    bankCode: DEMO_TEST_IDENTIFIERS.bank.bankCode,
    bankName: DEMO_TEST_IDENTIFIERS.bank.bankName,
    accountNumber: DEMO_TEST_IDENTIFIERS.bank.accountNumber,
    accountName: DEMO_TEST_IDENTIFIERS.bank.accountName,
  }

  const patients: DemoPatientSeed[] = [
    {
      key: DEMO_META_SMOKE.patientKey,
      surname: "Adeyemi",
      otherNames: "Esther Morenike",
      dateOfBirth: "1994-08-12",
      sex: "female",
      phone: DEMO_META_SMOKE.defaultPhone,
      paymentType: "self_pay",
      hmoAdditionalFields: [],
    },
    {
      key: "female_paid_card",
      surname: "Bello",
      otherNames: "Amina Zainab",
      dateOfBirth: "1989-11-03",
      sex: "female",
      phone: "08031234567",
      paymentType: "self_pay",
      hmoAdditionalFields: [],
    },
    {
      key: "female_paid_opay",
      surname: "Okafor",
      otherNames: "Chiamaka Adaeze",
      dateOfBirth: "1991-04-28",
      sex: "female",
      phone: "08052345678",
      paymentType: "self_pay",
      hmoAdditionalFields: [],
    },
    {
      key: "female_hmo_auth",
      surname: "Nwachukwu",
      otherNames: "Ifeoma Grace",
      dateOfBirth: "1987-06-17",
      sex: "female",
      phone: "08063456789",
      nin: "82014578123",
      ninVerificationStatus: "verified",
      ninVerificationProvider: "interswitch_marketplace",
      ninVerifiedAt: timestampOffset(now, -6, 10, 15),
      ninVerificationMatchStatus: "EXACT_MATCH",
      ninVerificationReference: "demo-nin-ref-ifeg",
      paymentType: "hmo",
      hmoName: "Hygeia HMO",
      enrolleeNhisNo: "HYG-ENR-447102",
      hmoSpecificId: "HYG-447102",
      hmoAdditionalFields: [{ fieldKey: "enrolleeId", label: "Enrollee ID", value: "EID-447102" }],
    },
    {
      key: "female_hmo_awaiting_auth",
      surname: "Lawal",
      otherNames: "Zainab Mariam",
      dateOfBirth: "1996-01-08",
      sex: "female",
      phone: "08074567890",
      nin: "73114598214",
      ninVerificationStatus: "verified",
      ninVerificationProvider: "interswitch_marketplace",
      ninVerifiedAt: timestampOffset(now, -3, 11, 10),
      ninVerificationMatchStatus: "EXACT_MATCH",
      ninVerificationReference: "demo-nin-ref-zainab",
      paymentType: "hmo",
      hmoName: "AXA Mansard",
      enrolleeNhisNo: "AXA-229104",
      hmoSpecificId: "AXA-229104",
      hmoAdditionalFields: [
        {
          fieldKey: "authorizationNumber",
          label: "Authorization No.",
          value: "AXA-AUTH-7781",
        },
      ],
    },
    {
      key: "nin_demo_patient",
      surname: DEMO_TEST_IDENTIFIERS.nin.lastName,
      otherNames: DEMO_TEST_IDENTIFIERS.nin.firstName,
      dateOfBirth: "1988-02-14",
      sex: "male",
      phone: DEMO_TEST_IDENTIFIERS.nin.expectedPhone,
      nin: DEMO_TEST_IDENTIFIERS.nin.value,
      ninVerificationStatus: "verified",
      ninVerificationProvider: "interswitch_marketplace",
      ninVerifiedAt: timestampOffset(now, -18, 9, 45),
      ninVerificationMatchStatus: "EXACT_MATCH",
      ninVerificationReference: "demo-nin-ref-bunch",
      paymentType: "hmo",
      hmoName: "NHIA Standard",
      enrolleeNhisNo: "NHIA-778203",
      hmoSpecificId: "NHIA-778203",
      hmoAdditionalFields: [{ fieldKey: "nhisNumber", label: "NHIS No.", value: "NHIS-778203" }],
    },
  ]

  const judgeSelfPayInvestigations = [
    { serviceName: "Full Blood Count", quantity: 1, unitPrice: 7500 },
    { serviceName: "Malaria RDT", quantity: 1, unitPrice: 2500 },
    { serviceName: "Urinalysis", quantity: 1, unitPrice: 3500 },
  ]
  const judgeSelfPayMedications = [
    { drugName: "Artemether Lumefantrine", dosage: "80/480mg", duration: "3 days", quantity: 1, unitPrice: 4500 },
    { drugName: "Paracetamol 500mg", dosage: "1 tablet tds", duration: "5 days", quantity: 2, unitPrice: 1500 },
    { drugName: "Normal Saline 500ml", dosage: "IV infusion", duration: "1 day", quantity: 1, unitPrice: 3500 },
  ]
  const femaleCardInvestigations = [
    { serviceName: "Pelvic Ultrasound", quantity: 1, unitPrice: 18000 },
    { serviceName: "Urinalysis", quantity: 1, unitPrice: 3500 },
  ]
  const femaleCardMedications = [
    { drugName: "Amoxicillin 500mg", dosage: "1 capsule bd", duration: "5 days", quantity: 2, unitPrice: 3000 },
    { drugName: "Omeprazole 20mg", dosage: "1 capsule od", duration: "5 days", quantity: 1, unitPrice: 2800 },
  ]
  const femaleOpayInvestigations = [
    { serviceName: "Chest X-Ray", quantity: 1, unitPrice: 15000 },
    { serviceName: "ECG", quantity: 1, unitPrice: 10000 },
  ]
  const femaleOpayMedications = [
    { drugName: "Diclofenac Injection", dosage: "75mg IM", duration: "Stat", quantity: 1, unitPrice: 2200 },
    { drugName: "Ceftriaxone 1g", dosage: "1 vial daily", duration: "3 days", quantity: 3, unitPrice: 6500 },
  ]
  const femaleHmoInvestigations = [
    { serviceName: "Full Blood Count", quantity: 1, unitPrice: 7500 },
    { serviceName: "Liver Function Test", quantity: 1, unitPrice: 12000 },
  ]
  const femaleHmoMedications = [
    { drugName: "Omeprazole 20mg", dosage: "1 capsule od", duration: "10 days", quantity: 2, unitPrice: 2800 },
    { drugName: "Metronidazole 400mg", dosage: "1 tablet tds", duration: "5 days", quantity: 2, unitPrice: 2500 },
  ]
  const awaitingAuthInvestigations = [
    { serviceName: "Renal Function Test", quantity: 1, unitPrice: 12000 },
    { serviceName: "Urinalysis", quantity: 1, unitPrice: 3500 },
  ]
  const awaitingAuthMedications = [
    { drugName: "Normal Saline 500ml", dosage: "IV infusion", duration: "2 days", quantity: 2, unitPrice: 3500 },
    { drugName: "Ceftriaxone 1g", dosage: "1 vial daily", duration: "5 days", quantity: 5, unitPrice: 6500 },
  ]
  const ninDemoInvestigations = [
    { serviceName: "Chest X-Ray", quantity: 1, unitPrice: 15000 },
    { serviceName: "Full Blood Count", quantity: 1, unitPrice: 7500 },
  ]
  const ninDemoMedications = [
    { drugName: "Ceftriaxone 1g", dosage: "1 vial daily", duration: "5 days", quantity: 5, unitPrice: 6500 },
    { drugName: "Paracetamol 500mg", dosage: "1 tablet tds", duration: "5 days", quantity: 2, unitPrice: 1500 },
  ]

  const judgeSelfPaySummary = calculateBillSummary({
    paymentType: "self_pay",
    investigations: judgeSelfPayInvestigations,
    medications: judgeSelfPayMedications,
  })
  const femaleCardSummary = calculateBillSummary({
    paymentType: "self_pay",
    investigations: femaleCardInvestigations,
    medications: femaleCardMedications,
  })
  const femaleOpaySummary = calculateBillSummary({
    paymentType: "self_pay",
    investigations: femaleOpayInvestigations,
    medications: femaleOpayMedications,
  })
  const femaleHmoSummary = calculateBillSummary({
    paymentType: "hmo",
    investigations: femaleHmoInvestigations,
    medications: femaleHmoMedications,
  })
  const awaitingAuthSummary = calculateBillSummary({
    paymentType: "hmo",
    investigations: awaitingAuthInvestigations,
    medications: awaitingAuthMedications,
  })
  const ninDemoSummary = calculateBillSummary({
    paymentType: "hmo",
    investigations: ninDemoInvestigations,
    medications: ninDemoMedications,
  })

  const bills: DemoBillSeed[] = [
    {
      key: DEMO_META_SMOKE.billKey,
      patientKey: DEMO_META_SMOKE.patientKey,
      admissionType: ADMISSION_TYPE.OUTPATIENT,
      dateNotification: formatDateOffset(now, -1),
      dateAdmission: formatDateOffset(now, -1),
      dateDischarge: formatDateOffset(now, 0),
      diagnosis: "Acute malaria with mild dehydration",
      presentingComplaints: "Fever, chills, body weakness, and reduced oral intake for 3 days.",
      investigations: judgeSelfPayInvestigations,
      medications: judgeSelfPayMedications,
      status: BILL_STATUS.PENDING_PAYMENT,
      paymentLinkToken: buildDeterministicPaymentToken("demojudgepaymentflow2026"),
      paymentRequestStatus: "unsent",
      paymentRequestAttemptCount: 0,
      createdAt: timestampOffset(now, -1, 8, 30),
      ...judgeSelfPaySummary,
    },
    {
      key: "bill_card_paid",
      patientKey: "female_paid_card",
      admissionType: ADMISSION_TYPE.OUTPATIENT,
      dateNotification: formatDateOffset(now, -8),
      dateAdmission: formatDateOffset(now, -8),
      dateDischarge: formatDateOffset(now, -8),
      diagnosis: "Pelvic inflammatory disease with lower abdominal pain",
      presentingComplaints: "Lower abdominal pain and dysuria for 1 week.",
      investigations: femaleCardInvestigations,
      medications: femaleCardMedications,
      status: BILL_STATUS.PAID,
      paymentChannel: "card",
      transactionReference: "AM2503198246710",
      providerPaymentReference: "ISW-DEMO-CARD-8246710",
      paidAmount: femaleCardSummary.totalAmount,
      paidAt: timestampOffset(now, -8, 15, 10),
      createdAt: timestampOffset(now, -8, 10, 0),
      ...femaleCardSummary,
    },
    {
      key: "bill_opay_paid",
      patientKey: "female_paid_opay",
      admissionType: ADMISSION_TYPE.INPATIENT,
      dateNotification: formatDateOffset(now, -5),
      dateAdmission: formatDateOffset(now, -5),
      dateDischarge: formatDateOffset(now, -3),
      diagnosis: "Community acquired pneumonia with chest pain",
      presentingComplaints: "Cough, pleuritic chest pain, and dyspnoea for 5 days.",
      investigations: femaleOpayInvestigations,
      medications: femaleOpayMedications,
      status: BILL_STATUS.PAID,
      paymentChannel: "opay",
      transactionReference: "AM2503198246711",
      providerPaymentReference: "OPAY-DEMO-8246711",
      paidAmount: femaleOpaySummary.totalAmount,
      paidAt: timestampOffset(now, -3, 13, 5),
      createdAt: timestampOffset(now, -5, 9, 20),
      ...femaleOpaySummary,
    },
    {
      key: "bill_hmo_auth_confirmed",
      patientKey: "female_hmo_auth",
      admissionType: ADMISSION_TYPE.OUTPATIENT,
      dateNotification: formatDateOffset(now, -6),
      dateAdmission: formatDateOffset(now, -6),
      dateDischarge: formatDateOffset(now, -5),
      diagnosis: "Peptic ulcer disease flare with epigastric pain",
      presentingComplaints: "Epigastric pain, nausea, and poor appetite for 2 weeks.",
      investigations: femaleHmoInvestigations,
      medications: femaleHmoMedications,
      authorizationCode: "HYG-AUTH-55218",
      authCodeReceivedAt: timestampOffset(now, -6, 12, 10),
      status: BILL_STATUS.AUTH_CONFIRMED,
      createdAt: timestampOffset(now, -6, 8, 50),
      ...femaleHmoSummary,
    },
    {
      key: "bill_hmo_awaiting_auth",
      patientKey: "female_hmo_awaiting_auth",
      admissionType: ADMISSION_TYPE.INPATIENT,
      dateNotification: formatDateOffset(now, -2),
      dateAdmission: formatDateOffset(now, -2),
      dateDischarge: formatDateOffset(now, 1),
      diagnosis: "Acute pyelonephritis under inpatient management",
      presentingComplaints: "Fever, flank pain, vomiting, and dysuria for 4 days.",
      investigations: awaitingAuthInvestigations,
      medications: awaitingAuthMedications,
      status: BILL_STATUS.AWAITING_AUTH,
      createdAt: timestampOffset(now, -2, 11, 25),
      ...awaitingAuthSummary,
    },
    {
      key: "bill_claimed_overdue",
      patientKey: "nin_demo_patient",
      admissionType: ADMISSION_TYPE.INPATIENT,
      dateNotification: formatDateOffset(now, -21),
      dateAdmission: formatDateOffset(now, -21),
      dateDischarge: formatDateOffset(now, -18),
      diagnosis: "Severe chest infection requiring inpatient antibiotics",
      presentingComplaints: "Persistent cough, fever, and shortness of breath for 1 week.",
      investigations: ninDemoInvestigations,
      medications: ninDemoMedications,
      authorizationCode: "NHIA-AUTH-12944",
      authCodeReceivedAt: timestampOffset(now, -21, 10, 20),
      status: BILL_STATUS.CLAIMED,
      paymentChannel: "card",
      transactionReference: "AM2503198246712",
      providerPaymentReference: "ISW-DEMO-CLAIM-8246712",
      paidAmount: ninDemoSummary.totalAmount,
      paidAt: timestampOffset(now, -18, 16, 10),
      createdAt: timestampOffset(now, -21, 8, 45),
      ...ninDemoSummary,
    },
  ]

  const claimBatches: DemoClaimBatchSeed[] = [
    {
      key: "claim_batch_overdue_nhia",
      hmoName: "NHIA Standard",
      tpaName: "Mediplan Healthcare",
      tpaEmail: "claims@mediplanhealth.ng",
      periodStart: formatDateOffset(now, -21),
      periodEnd: formatDateOffset(now, -18),
      billKeys: ["bill_claimed_overdue"],
      status: CLAIM_BATCH_STATUS.OVERDUE,
      submittedAt: timestampOffset(now, -17, 12, 0),
      expectedPaymentBy: timestampOffset(now, -3, 12, 0),
      completenessScore: 92,
      scoreBand: CLAIM_SCORE_BAND.GREEN,
      blockingIssues: [],
      warningIssues: [],
    },
  ]

  const notifications: DemoNotificationSeed[] = [
    {
      type: NOTIFICATION_TYPE.PAYMENT_CONFIRMED,
      title: "Card payment confirmed",
      description: "Amina Bello's outpatient bill was reconciled successfully.",
      route: "/bills/:bill_card_paid",
      entityKey: "bill_card_paid",
      entityLabel: "Amina Bello",
      createdAt: timestampOffset(now, -8, 15, 15),
      isRead: true,
    },
    {
      type: NOTIFICATION_TYPE.CLAIM_BATCH_OVERDUE,
      title: "NHIA batch overdue",
      description: "The NHIA Standard batch has crossed the 14-day payment window.",
      route: "/claims",
      entityKey: "claim_batch_overdue_nhia",
      entityLabel: "NHIA Standard",
      createdAt: timestampOffset(now, -2, 9, 5),
      isRead: false,
    },
    {
      type: NOTIFICATION_TYPE.BILL_CREATED,
      title: "WhatsApp test bill ready",
      description: "A self-pay bill is ready for the shared-account WhatsApp payment smoke flow.",
      route: "/bills/:bill_judge_self_pay",
      entityKey: DEMO_META_SMOKE.billKey,
      entityLabel: "Esther Adeyemi",
      createdAt: timestampOffset(now, -1, 8, 45),
      isRead: false,
    },
  ]

  return {
    clinic,
    patients,
    bills,
    claimBatches,
    notifications,
    metaSmoke: DEMO_META_SMOKE,
  }
}
