export const CLINIC_ONBOARDING_REQUIRED_FIELDS = [
  "name",
  "address",
  "nhiaFacilityCode",
  "phone",
  "email",
  "medicalDirectorName",
] as const

export type ClinicOnboardingField =
  typeof CLINIC_ONBOARDING_REQUIRED_FIELDS[number]

export type ServiceCatalogCategory =
  | "consultation"
  | "investigation"
  | "medication"
  | "procedure"

export interface ClinicOnboardingInput {
  name: string
  address: string
  nhiaFacilityCode: string
  phone: string
  email: string
  medicalDirectorName: string
}

export interface SeededServiceCatalogItem {
  name: string
  category: ServiceCatalogCategory
  defaultPrice: number
}

export interface SeededAdditionalField {
  label: string
  fieldKey: string
}

export interface SeededHmoTemplate {
  hmoName: string
  additionalFields: SeededAdditionalField[]
  formLayoutConfig: string
}

export const SERVICE_CATEGORY_OPTIONS: Array<{
  label: string
  value: ServiceCatalogCategory
}> = [
  { label: "Consultation", value: "consultation" },
  { label: "Investigation", value: "investigation" },
  { label: "Medication", value: "medication" },
  { label: "Procedure", value: "procedure" },
]

export const DEFAULT_SERVICE_CATALOG: SeededServiceCatalogItem[] = [
  { name: "Consultation", category: "consultation", defaultPrice: 5000 },
  { name: "Follow-up Consultation", category: "consultation", defaultPrice: 3500 },
  { name: "Emergency Consultation", category: "consultation", defaultPrice: 8000 },
  { name: "Full Blood Count", category: "investigation", defaultPrice: 7500 },
  { name: "Malaria RDT", category: "investigation", defaultPrice: 2500 },
  { name: "Urinalysis", category: "investigation", defaultPrice: 3500 },
  { name: "Blood Sugar", category: "investigation", defaultPrice: 2500 },
  { name: "Liver Function Test", category: "investigation", defaultPrice: 12000 },
  { name: "Renal Function Test", category: "investigation", defaultPrice: 12000 },
  { name: "Pregnancy Test", category: "investigation", defaultPrice: 3000 },
  { name: "Typhoid Test", category: "investigation", defaultPrice: 4000 },
  { name: "Widal Test", category: "investigation", defaultPrice: 3500 },
  { name: "Chest X-Ray", category: "investigation", defaultPrice: 15000 },
  { name: "Pelvic Ultrasound", category: "investigation", defaultPrice: 18000 },
  { name: "Ultrasound Scan", category: "investigation", defaultPrice: 18000 },
  { name: "ECG", category: "investigation", defaultPrice: 10000 },
  { name: "Nebulization", category: "procedure", defaultPrice: 6000 },
  { name: "Wound Dressing", category: "procedure", defaultPrice: 7000 },
  { name: "Injection Administration", category: "procedure", defaultPrice: 2000 },
  { name: "IV Infusion", category: "procedure", defaultPrice: 6500 },
  { name: "Minor Procedure Pack", category: "procedure", defaultPrice: 12000 },
  { name: "Admission Deposit", category: "procedure", defaultPrice: 25000 },
  { name: "Paracetamol 500mg", category: "medication", defaultPrice: 1500 },
  { name: "Artemether Lumefantrine", category: "medication", defaultPrice: 4500 },
  { name: "Amoxicillin 500mg", category: "medication", defaultPrice: 3000 },
  { name: "Metronidazole 400mg", category: "medication", defaultPrice: 2500 },
  { name: "Omeprazole 20mg", category: "medication", defaultPrice: 2800 },
  { name: "Normal Saline 500ml", category: "medication", defaultPrice: 3500 },
  { name: "Ceftriaxone 1g", category: "medication", defaultPrice: 6500 },
  { name: "Diclofenac Injection", category: "medication", defaultPrice: 2200 },
]

export const DEFAULT_HMO_TEMPLATES: SeededHmoTemplate[] = [
  {
    hmoName: "Police HMO",
    additionalFields: [
      { label: "Force No.", fieldKey: "forceNumber" },
      { label: "AP No.", fieldKey: "authorizationPaperNumber" },
    ],
    formLayoutConfig: JSON.stringify({
      variant: "police_hmo",
      sections: ["patient", "episode", "investigations", "medications", "totals"],
    }),
  },
  {
    hmoName: "AXA Mansard",
    additionalFields: [{ label: "Authorization No.", fieldKey: "authorizationNumber" }],
    formLayoutConfig: JSON.stringify({
      variant: "axa_mansard",
      sections: ["patient", "episode", "investigations", "medications", "totals"],
    }),
  },
  {
    hmoName: "Hygeia HMO",
    additionalFields: [{ label: "Enrollee ID", fieldKey: "enrolleeId" }],
    formLayoutConfig: JSON.stringify({
      variant: "hygeia_hmo",
      sections: ["patient", "episode", "investigations", "medications", "totals"],
    }),
  },
  {
    hmoName: "NHIA Standard",
    additionalFields: [{ label: "NHIS No.", fieldKey: "nhisNumber" }],
    formLayoutConfig: JSON.stringify({
      variant: "nhia_standard",
      sections: ["patient", "episode", "investigations", "medications", "totals"],
    }),
  },
  {
    hmoName: "Generic/Universal",
    additionalFields: [{ label: "Member ID", fieldKey: "memberId" }],
    formLayoutConfig: JSON.stringify({
      variant: "generic_universal",
      sections: ["patient", "episode", "investigations", "medications", "totals"],
    }),
  },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?234\d{10}$|^0\d{10}$/

function normalizeSeedKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function sanitizePriceInput(value: string) {
  return value.replace(/[^\d]/g, "")
}

export function formatPriceInput(value: string) {
  const digits = sanitizePriceInput(value)

  if (!digits) {
    return ""
  }

  return Number(digits).toLocaleString("en-NG")
}

export function parsePriceInput(value: string) {
  const digits = sanitizePriceInput(value)

  if (!digits) {
    return Number.NaN
  }

  return Number(digits)
}

export function validateClinicOnboardingInput(
  input: ClinicOnboardingInput,
): Partial<Record<ClinicOnboardingField, string>> {
  const errors: Partial<Record<ClinicOnboardingField, string>> = {}

  for (const field of CLINIC_ONBOARDING_REQUIRED_FIELDS) {
    if (!input[field].trim()) {
      errors[field] = "This field is required."
    }
  }

  if (!errors.email && !EMAIL_PATTERN.test(input.email.trim().toLowerCase())) {
    errors.email = "Enter a valid email address."
  }

  if (!errors.phone && !PHONE_PATTERN.test(input.phone.trim())) {
    errors.phone = "Enter a valid Nigerian phone number."
  }

  return errors
}

export function mergeSeededServiceCatalog(
  existingServices: SeededServiceCatalogItem[],
) {
  const merged = new Map<string, SeededServiceCatalogItem>()

  for (const service of existingServices) {
    merged.set(normalizeSeedKey(service.name), service)
  }

  for (const service of DEFAULT_SERVICE_CATALOG) {
    const key = normalizeSeedKey(service.name)
    if (!merged.has(key)) {
      merged.set(key, service)
    }
  }

  return Array.from(merged.values())
}

export function mergeSeededHmoTemplates(existingTemplates: SeededHmoTemplate[]) {
  const merged = new Map<string, SeededHmoTemplate>()

  for (const template of existingTemplates) {
    merged.set(normalizeSeedKey(template.hmoName), template)
  }

  for (const template of DEFAULT_HMO_TEMPLATES) {
    const key = normalizeSeedKey(template.hmoName)
    if (!merged.has(key)) {
      merged.set(key, template)
    }
  }

  return Array.from(merged.values())
}
