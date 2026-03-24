import type { PatientPaymentType } from "./patients"

export const BILL_STATUS = {
  AWAITING_AUTH: "awaiting_auth",
  AUTH_CONFIRMED: "auth_confirmed",
  PENDING_PAYMENT: "pending_payment",
  PAID: "paid",
  CLAIMED: "claimed",
  OVERDUE: "overdue",
} as const

export type BillStatus = (typeof BILL_STATUS)[keyof typeof BILL_STATUS]

export const ADMISSION_TYPE = {
  OUTPATIENT: "outpatient",
  INPATIENT: "inpatient",
} as const

export type AdmissionType = (typeof ADMISSION_TYPE)[keyof typeof ADMISSION_TYPE]

export interface InvestigationFormItem {
  serviceName: string
  quantity: number
  unitPrice: string | number
}

export interface MedicationFormItem {
  drugName: string
  dosage: string
  duration: string
  quantity: number
  unitPrice: string | number
}

interface InvestigationValidationItem {
  serviceName?: string
  name?: string
  quantity: number
  unitPrice: string | number
}

interface MedicationValidationItem {
  drugName?: string
  name?: string
  dosage: string
  duration: string
  quantity: number
  unitPrice: string | number
}

export interface BillFormInput {
  patientId: string
  patientPaymentType: PatientPaymentType
  admissionType: AdmissionType
  dateNotification: string
  dateAdmission: string
  dateDischarge: string
  diagnosis: string
  presentingComplaints: string
  investigations: InvestigationValidationItem[]
  medications: MedicationValidationItem[]
  authorizationCode?: string
}

export interface BillFormErrors {
  patientId?: string
  admissionType?: string
  dateNotification?: string
  dateAdmission?: string
  dateDischarge?: string
  diagnosis?: string
  presentingComplaints?: string
  investigations?: string
  medications?: string
  lineItems?: string
  authorizationCode?: string
}

export const BILL_FILTER_TABS: Array<{
  label: string
  value: "all" | BillStatus
}> = [
  { label: "All", value: "all" },
  { label: "Awaiting Auth", value: BILL_STATUS.AWAITING_AUTH },
  { label: "Auth Confirmed", value: BILL_STATUS.AUTH_CONFIRMED },
  { label: "Pending Payment", value: BILL_STATUS.PENDING_PAYMENT },
  { label: "Paid", value: BILL_STATUS.PAID },
  { label: "Overdue", value: BILL_STATUS.OVERDUE },
]

function toNumericPrice(value: string | number) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN
  }

  const digits = value.replace(/[^\d]/g, "")
  return digits ? Number(digits) : Number.NaN
}

export function createEmptyInvestigationItem(): InvestigationFormItem {
  return {
    serviceName: "",
    quantity: 1,
    unitPrice: "",
  }
}

export function createEmptyMedicationItem(): MedicationFormItem {
  return {
    drugName: "",
    dosage: "",
    duration: "",
    quantity: 1,
    unitPrice: "",
  }
}

export function calculateInvestigationLineTotal(item: InvestigationFormItem) {
  const unitPrice = toNumericPrice(item.unitPrice)
  if (!Number.isFinite(unitPrice) || item.quantity <= 0) {
    return 0
  }

  return item.quantity * unitPrice
}

export function calculateMedicationLineTotal(item: MedicationFormItem) {
  const unitPrice = toNumericPrice(item.unitPrice)
  if (!Number.isFinite(unitPrice) || item.quantity <= 0) {
    return 0
  }

  return item.quantity * unitPrice
}

export function calculateBillSummary({
  paymentType,
  investigations,
  medications,
}: {
  paymentType: PatientPaymentType
  investigations: InvestigationFormItem[]
  medications: MedicationFormItem[]
}) {
  const investigationsTotal = investigations.reduce(
    (sum, item) => sum + calculateInvestigationLineTotal(item),
    0,
  )
  const medicationsTotal = medications.reduce(
    (sum, item) => sum + calculateMedicationLineTotal(item),
    0,
  )
  const totalAmount = investigationsTotal + medicationsTotal
  const hmoDeduction =
    paymentType === "hmo" ? Math.round(totalAmount * 0.1) : 0
  const expectedReceivable = totalAmount - hmoDeduction

  return {
    investigationsTotal,
    medicationsTotal,
    totalAmount,
    hmoDeduction,
    expectedReceivable,
  }
}

export function buildBillCreateStatus(
  paymentType: PatientPaymentType,
  authorizationCode?: string,
): BillStatus {
  if (paymentType === "self_pay") {
    return BILL_STATUS.PENDING_PAYMENT
  }

  return authorizationCode?.trim()
    ? BILL_STATUS.AUTH_CONFIRMED
    : BILL_STATUS.AWAITING_AUTH
}

function getInvestigationName(item: InvestigationValidationItem) {
  return item.serviceName ?? item.name ?? ""
}

function getMedicationName(item: MedicationValidationItem) {
  return item.drugName ?? item.name ?? ""
}

export function validateBillInput(input: BillFormInput): BillFormErrors {
  const errors: BillFormErrors = {}

  if (!input.patientId.trim()) {
    errors.patientId = "Select a patient."
  }

  if (!input.admissionType) {
    errors.admissionType = "Select an admission type."
  }

  if (!input.dateNotification.trim()) {
    errors.dateNotification = "Notification date is required."
  }

  if (!input.dateAdmission.trim()) {
    errors.dateAdmission = "Admission date is required."
  }

  if (!input.dateDischarge.trim()) {
    errors.dateDischarge = "Discharge date is required."
  }

  if (!input.diagnosis.trim()) {
    errors.diagnosis = "Diagnosis is required."
  }

  if (
    input.investigations.length === 0 &&
    input.medications.length === 0
  ) {
    errors.lineItems = "Add at least one investigation or medication."
  }

  const hasInvalidInvestigation = input.investigations.some((item) => {
    const unitPrice = toNumericPrice(item.unitPrice)
    const serviceName = getInvestigationName(item)
    return !serviceName.trim() || item.quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0
  })

  if (hasInvalidInvestigation) {
    errors.investigations = "Complete each investigation row with a service, quantity, and price."
  }

  const hasInvalidMedication = input.medications.some((item) => {
    const unitPrice = toNumericPrice(item.unitPrice)
    const drugName = getMedicationName(item)
    return (
      !drugName.trim() ||
      !item.dosage.trim() ||
      !item.duration.trim() ||
      item.quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    )
  })

  if (hasInvalidMedication) {
    errors.medications = "Complete each medication row with a drug, dosage, duration, quantity, and price."
  }

  if (input.patientPaymentType === "hmo" && input.authorizationCode && !input.authorizationCode.trim()) {
    errors.authorizationCode = "Authorization code cannot be blank."
  }

  return errors
}

export function formatBillStatusLabel(status: BillStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
