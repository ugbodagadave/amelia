import type { PatientAdditionalFieldInput, PatientFormInput } from "./patients"

export const MISTRAL_OCR_MODEL = "mistral-ocr-latest"

export const OCR_SOURCE = {
  PATIENT_REGISTRATION: "patient_registration",
  BILL_BUILDER: "bill_builder",
} as const

export type OcrSource = (typeof OCR_SOURCE)[keyof typeof OCR_SOURCE]

export const SUPPORTED_OCR_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const

export type SupportedOcrMediaType = (typeof SUPPORTED_OCR_MEDIA_TYPES)[number]

export interface HmoTemplateLike {
  hmoName: string
  additionalFields: Array<{
    fieldKey: string
    label: string
  }>
}

export interface ExtractedHmoDetails {
  hmoName: string
  memberId: string
  enrolleeName: string
  nhisNumber: string
  authorizationCode: string
  coverageType: string
  coverageLimit: string
  additionalIds: Record<string, string>
}

export interface HmoOcrAuditPayload {
  source: OcrSource
  fileName: string
  mediaType: SupportedOcrMediaType
  extractedAt: number
  responseId: string
  pagesProcessed: number
  markdown: string
  extracted: ExtractedHmoDetails
  rawResponse: string
}

export interface ExtractHmoDetailsResult {
  extracted: ExtractedHmoDetails
  audit: HmoOcrAuditPayload
}

export interface PatientOcrMergeResult {
  nextForm: PatientFormInput
  matchedTemplateName: string | null
  unmatchedHmoNameHint: string
  appliedFields: string[]
  skippedFields: string[]
}

export interface BillOcrMergeResult {
  authorizationCode: string
  suggestedAuthorizationCode: string
  applied: boolean
}

function normalizeScalar(value: unknown) {
  if (typeof value === "string") {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return ""
}

function normalizeAdditionalIdKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function normalizeDisplayToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function tokenizeHmoName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean)
    .filter(
      (token) =>
        !["hmo", "health", "maintenance", "limited", "ltd", "standard", "generic", "universal"].includes(
          token,
        ),
    )
}

function toCoverageLimitNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "")
  return digits ? Number(digits) : undefined
}

function normalizeAdditionalIds(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(input).flatMap(([key, value]) => {
      const normalizedValue = normalizeScalar(value)
      if (!normalizedValue) {
        return []
      }

      return [[key, normalizedValue] as const]
    }),
  )
}

function findAdditionalFieldValue(
  fields: PatientAdditionalFieldInput[],
  fieldKey: string,
) {
  return fields.find((field) => field.fieldKey === fieldKey)?.value ?? ""
}

function findMatchingAdditionalIdValue(
  templateField: { fieldKey: string; label: string },
  additionalIds: Record<string, string>,
  memberId: string,
) {
  const fieldCandidates = [
    normalizeAdditionalIdKey(templateField.fieldKey),
    normalizeAdditionalIdKey(templateField.label),
  ]

  for (const [key, value] of Object.entries(additionalIds)) {
    const normalizedKey = normalizeAdditionalIdKey(key)
    if (fieldCandidates.some((candidate) => candidate === normalizedKey)) {
      return value
    }
  }

  if (
    memberId &&
    fieldCandidates.some((candidate) =>
      ["memberid", "enrolleeid", "enrolleenumber"].includes(candidate),
    )
  ) {
    return memberId
  }

  return ""
}

export function isSupportedOcrMediaType(value: string): value is SupportedOcrMediaType {
  return (SUPPORTED_OCR_MEDIA_TYPES as readonly string[]).includes(value)
}

export function normalizeExtractedHmoDetails(
  input: Partial<ExtractedHmoDetails> | null | undefined,
): ExtractedHmoDetails {
  return {
    hmoName: normalizeScalar(input?.hmoName),
    memberId: normalizeScalar(input?.memberId),
    enrolleeName: normalizeScalar(input?.enrolleeName),
    nhisNumber: normalizeScalar(input?.nhisNumber),
    authorizationCode: normalizeScalar(input?.authorizationCode),
    coverageType: normalizeScalar(input?.coverageType),
    coverageLimit: normalizeScalar(input?.coverageLimit),
    additionalIds: normalizeAdditionalIds(input?.additionalIds),
  }
}

export function normalizeHmoTemplateName(value: string) {
  return normalizeDisplayToken(value)
}

export function matchHmoTemplateName(
  extractedHmoName: string,
  templates: HmoTemplateLike[],
) {
  const normalizedExtractedName = normalizeHmoTemplateName(extractedHmoName)
  const extractedTokens = tokenizeHmoName(extractedHmoName)
  if (!normalizedExtractedName) {
    return null
  }

  return (
    templates.find((template) => {
      const normalizedTemplateName = normalizeHmoTemplateName(template.hmoName)
      const templateTokens = tokenizeHmoName(template.hmoName)
      const sharedTokenCount = templateTokens.filter((token) =>
        extractedTokens.includes(token),
      ).length

      return (
        normalizedTemplateName === normalizedExtractedName ||
        normalizedTemplateName.includes(normalizedExtractedName) ||
        normalizedExtractedName.includes(normalizedTemplateName) ||
        (sharedTokenCount > 0 &&
          Math.max(templateTokens.length, extractedTokens.length) - sharedTokenCount <= 1)
      )
    }) ?? null
  )
}

export function mergePatientFormWithOcr(
  form: PatientFormInput,
  extracted: ExtractedHmoDetails,
  templates: HmoTemplateLike[],
): PatientOcrMergeResult {
  const normalizedExtracted = normalizeExtractedHmoDetails(extracted)
  const appliedFields: string[] = []
  const skippedFields: string[] = []
  const matchedTemplate = matchHmoTemplateName(normalizedExtracted.hmoName, templates)
  const nextForm: PatientFormInput = {
    ...form,
    hmoAdditionalFields: [...form.hmoAdditionalFields],
  }

  const hasInsuranceSignal =
    !!normalizedExtracted.hmoName ||
    !!normalizedExtracted.nhisNumber ||
    !!normalizedExtracted.memberId ||
    Object.keys(normalizedExtracted.additionalIds).length > 0

  if (hasInsuranceSignal && form.paymentType !== "hmo") {
    nextForm.paymentType = "hmo"
    appliedFields.push("paymentType")
  }

  if (!form.hmoName?.trim()) {
    if (matchedTemplate) {
      nextForm.hmoName = matchedTemplate.hmoName
      appliedFields.push("hmoName")
    }
  } else if (matchedTemplate && form.hmoName !== matchedTemplate.hmoName) {
    skippedFields.push("hmoName")
  }

  const nhisOrMemberId = normalizedExtracted.nhisNumber || normalizedExtracted.memberId
  if (nhisOrMemberId) {
    if (!form.enrolleeNhisNo?.trim()) {
      nextForm.enrolleeNhisNo = nhisOrMemberId
      appliedFields.push("enrolleeNhisNo")
    } else {
      skippedFields.push("enrolleeNhisNo")
    }
  }

  const templateForAdditionalFields =
    matchedTemplate ??
    templates.find((template) => template.hmoName === (nextForm.hmoName ?? form.hmoName)) ??
    null

  if (templateForAdditionalFields) {
    nextForm.hmoAdditionalFields = templateForAdditionalFields.additionalFields.map((field) => {
      const currentValue = findAdditionalFieldValue(form.hmoAdditionalFields, field.fieldKey)
      const extractedValue = findMatchingAdditionalIdValue(
        field,
        normalizedExtracted.additionalIds,
        normalizedExtracted.memberId,
      )
      if (currentValue.trim()) {
        if (extractedValue) {
          skippedFields.push(`hmoAdditionalFields.${field.fieldKey}`)
        }
        return {
          fieldKey: field.fieldKey,
          label: field.label,
          value: currentValue,
        }
      }

      if (extractedValue) {
        appliedFields.push(`hmoAdditionalFields.${field.fieldKey}`)
      }

      return {
        fieldKey: field.fieldKey,
        label: field.label,
        value: extractedValue,
      }
    })
  }
  return {
    nextForm,
    matchedTemplateName: matchedTemplate?.hmoName ?? null,
    unmatchedHmoNameHint: matchedTemplate ? "" : normalizedExtracted.hmoName,
    appliedFields: Array.from(new Set(appliedFields)),
    skippedFields: Array.from(new Set(skippedFields)),
  }
}

export function mergeBillAuthorizationCodeWithOcr(
  currentAuthorizationCode: string,
  extractedAuthorizationCode: string,
): BillOcrMergeResult {
  const normalizedCurrent = currentAuthorizationCode.trim()
  const normalizedExtracted = normalizeScalar(extractedAuthorizationCode)

  if (!normalizedExtracted) {
    return {
      authorizationCode: normalizedCurrent,
      suggestedAuthorizationCode: "",
      applied: false,
    }
  }

  if (!normalizedCurrent) {
    return {
      authorizationCode: normalizedExtracted,
      suggestedAuthorizationCode: "",
      applied: true,
    }
  }

  return {
    authorizationCode: normalizedCurrent,
    suggestedAuthorizationCode: normalizedExtracted,
    applied: false,
  }
}

export function buildHmoCoverageSnapshotFromOcr(
  patientId: string,
  hmoName: string,
  audit: HmoOcrAuditPayload,
) {
  return {
    patientId,
    hmoName: hmoName.trim(),
    memberId: audit.extracted.memberId || undefined,
    coverageType: audit.extracted.coverageType || undefined,
    coverageLimit: toCoverageLimitNumber(audit.extracted.coverageLimit),
    authorizationCode: audit.extracted.authorizationCode || undefined,
    additionalIds: Object.entries(audit.extracted.additionalIds).map(([key, value]) => ({
      key,
      value,
    })),
    rawOcrData: JSON.stringify(audit),
  }
}
