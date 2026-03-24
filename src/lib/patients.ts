export type PatientSex = "male" | "female"
export type PatientPaymentType = "self_pay" | "hmo"

export interface PatientAdditionalFieldInput {
  fieldKey: string
  label: string
  value: string
}

export interface PatientFormInput {
  surname: string
  otherNames: string
  dateOfBirth: string
  sex: PatientSex
  phone: string
  nin?: string
  paymentType: PatientPaymentType
  hmoName?: string
  enrolleeNhisNo?: string
  hmoAdditionalFields: PatientAdditionalFieldInput[]
}

export interface PatientFormErrors {
  surname?: string
  otherNames?: string
  dateOfBirth?: string
  sex?: string
  phone?: string
  nin?: string
  paymentType?: string
  hmoName?: string
  enrolleeNhisNo?: string
  hmoAdditionalFields?: string
}

export function normalizePhoneNumber(value: string) {
  const digitsOnly = value.replace(/\D/g, "")

  if (digitsOnly.startsWith("234") && digitsOnly.length === 13) {
    return `0${digitsOnly.slice(3)}`
  }

  return digitsOnly
}

export function isValidNigerianMobilePhone(value: string) {
  return /^0[789]\d{9}$/.test(normalizePhoneNumber(value))
}

export function isValidNin(value: string) {
  return /^\d{11}$/.test(value.trim())
}

export function calculateAgeFromDateOfBirth(dateOfBirth: string, today = new Date()) {
  const birthDate = new Date(dateOfBirth)

  if (Number.isNaN(birthDate.getTime())) {
    return null
  }

  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDelta = today.getMonth() - birthDate.getMonth()

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }

  return age
}

export function maskNin(nin?: string) {
  if (!nin) {
    return "Not provided"
  }

  const normalizedNin = nin.trim()

  if (normalizedNin.length !== 11) {
    return normalizedNin
  }

  return `${normalizedNin.slice(0, 4)}*****${normalizedNin.slice(-2)}`
}

export function buildPatientFullName(surname: string, otherNames: string) {
  return `${surname.trim()} ${otherNames.trim()}`.trim()
}

export function validatePatientInput(input: PatientFormInput): PatientFormErrors {
  const errors: PatientFormErrors = {}
  const normalizedPhone = normalizePhoneNumber(input.phone)
  const normalizedNin = input.nin?.trim() ?? ""

  if (!input.surname.trim()) {
    errors.surname = "Surname is required."
  }

  if (!input.otherNames.trim()) {
    errors.otherNames = "Other names are required."
  }

  if (!input.dateOfBirth.trim()) {
    errors.dateOfBirth = "Date of birth is required."
  } else {
    const age = calculateAgeFromDateOfBirth(input.dateOfBirth)
    if (age === null || age < 0) {
      errors.dateOfBirth = "Enter a valid date of birth."
    }
  }

  if (!input.sex) {
    errors.sex = "Sex is required."
  }

  if (!normalizedPhone) {
    errors.phone = "Phone number is required."
  } else if (!isValidNigerianMobilePhone(normalizedPhone)) {
    errors.phone = "Enter a valid Nigerian mobile number."
  }

  if (!input.paymentType) {
    errors.paymentType = "Payment type is required."
  }

  if (input.paymentType === "hmo") {
    if (!normalizedNin) {
      errors.nin = "NIN is required for HMO patients."
    } else if (!isValidNin(normalizedNin)) {
      errors.nin = "NIN must be exactly 11 digits."
    }

    if (!input.hmoName?.trim()) {
      errors.hmoName = "Select an HMO."
    }

    if (!input.enrolleeNhisNo?.trim()) {
      errors.enrolleeNhisNo = "Enrollee NHIS number is required."
    }

    if (input.hmoAdditionalFields.some((field) => !field.value.trim())) {
      errors.hmoAdditionalFields = "Complete all required HMO fields."
    }
  } else if (normalizedNin && !isValidNin(normalizedNin)) {
    errors.nin = "NIN must be exactly 11 digits."
  }

  return errors
}
