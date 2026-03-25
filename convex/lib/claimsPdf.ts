import JSZip from "jszip"
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from "pdf-lib"

import type { Doc } from "../_generated/dataModel"
import { buildPatientFullName } from "../../src/lib/patients"
import type { ClaimCandidateRecord, ClaimTemplateVariant } from "./claimsTypes"

export function formatClaimCurrencyForPdf(value: number) {
  return `NGN ${value.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`
}

export function toBlobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
}

export function resolveTemplateVariant(template: Doc<"hmo_templates">): ClaimTemplateVariant {
  try {
    const parsed = JSON.parse(template.formLayoutConfig) as { variant?: string }
    switch (parsed.variant) {
      case "police_hmo":
      case "axa_mansard":
      case "hygeia_hmo":
      case "nhia_standard":
      case "generic_universal":
        return parsed.variant
      default:
        return "generic_universal"
    }
  } catch {
    return "generic_universal"
  }
}

function getVariantPalette(variant: ClaimTemplateVariant) {
  switch (variant) {
    case "police_hmo":
      return {
        heading: rgb(0.0, 0.6, 0.22),
        accent: rgb(0.78, 0.05, 0.1),
        line: rgb(0.08, 0.08, 0.08),
      }
    case "axa_mansard":
      return {
        heading: rgb(0.6, 0.08, 0.1),
        accent: rgb(0.15, 0.15, 0.15),
        line: rgb(0.14, 0.14, 0.14),
      }
    case "hygeia_hmo":
      return {
        heading: rgb(0.04, 0.38, 0.69),
        accent: rgb(0.03, 0.58, 0.37),
        line: rgb(0.12, 0.12, 0.12),
      }
    case "nhia_standard":
      return {
        heading: rgb(0.0, 0.45, 0.26),
        accent: rgb(0.75, 0.56, 0.08),
        line: rgb(0.12, 0.12, 0.12),
      }
    default:
      return {
        heading: rgb(0.18, 0.22, 0.5),
        accent: rgb(0.22, 0.22, 0.22),
        line: rgb(0.12, 0.12, 0.12),
      }
  }
}

function getVariantTitle(variant: ClaimTemplateVariant, hmoName: string) {
  switch (variant) {
    case "police_hmo":
      return { title: "POLICE HEALTH MAINTENANCE LIMITED", subtitle: "(POLICE HMO)" }
    case "axa_mansard":
      return { title: "AXA MANSARD HEALTH CLAIMS", subtitle: "(AXA MANSARD)" }
    case "hygeia_hmo":
      return { title: "HYGEIA HMO CLAIMS FORM", subtitle: "(HYGEIA HMO)" }
    case "nhia_standard":
      return { title: "NHIA STANDARD CLAIMS FORM", subtitle: "(NHIA STANDARD)" }
    default:
      return { title: `${hmoName.toUpperCase()} CLAIMS FORM`, subtitle: "(GENERIC/UNIVERSAL)" }
  }
}

function getAdditionalFieldValue(record: ClaimCandidateRecord, fieldKey: string) {
  return (
    record.patient.hmoAdditionalFields?.find((field) => field.fieldKey === fieldKey)?.value ?? ""
  )
}

function drawRule(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness = 0.7,
) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness,
    color: rgb(0.08, 0.08, 0.08),
  })
}

function drawLabeledLine({
  page,
  font,
  boldFont,
  label,
  value,
  x,
  y,
  width,
}: {
  page: PDFPage
  font: PDFFont
  boldFont: PDFFont
  label: string
  value: string
  x: number
  y: number
  width: number
}) {
  page.drawText(label, { x, y, size: 7.5, font: boldFont })
  drawRule(page, x + 64, y - 1, x + width, y - 1, 0.6)
  if (value) {
    page.drawText(value, {
      x: x + 67,
      y: y + 1,
      size: 7.2,
      font,
      maxWidth: width - 70,
    })
  }
}

function drawTableGrid({
  page,
  x,
  y,
  widths,
  rowHeights,
}: {
  page: PDFPage
  x: number
  y: number
  widths: number[]
  rowHeights: number[]
}) {
  const totalWidth = widths.reduce((sum, width) => sum + width, 0)
  const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0)
  drawRule(page, x, y, x + totalWidth, y)
  drawRule(page, x, y - totalHeight, x + totalWidth, y - totalHeight)
  drawRule(page, x, y, x, y - totalHeight)
  drawRule(page, x + totalWidth, y, x + totalWidth, y - totalHeight)

  let currentX = x
  widths.slice(0, -1).forEach((width) => {
    currentX += width
    drawRule(page, currentX, y, currentX, y - totalHeight)
  })

  let currentY = y
  rowHeights.slice(0, -1).forEach((height) => {
    currentY -= height
    drawRule(page, x, currentY, x + totalWidth, currentY)
  })
}

function drawTemplateHeader({
  page,
  font,
  boldFont,
  variant,
  hmoName,
}: {
  page: PDFPage
  font: PDFFont
  boldFont: PDFFont
  variant: ClaimTemplateVariant
  hmoName: string
}) {
  const palette = getVariantPalette(variant)
  const heading = getVariantTitle(variant, hmoName)

  page.drawText(heading.title, {
    x: 68,
    y: 780,
    size: 12,
    font: boldFont,
    color: palette.heading,
  })
  page.drawText(heading.subtitle, {
    x: 400,
    y: 780,
    size: 11,
    font: boldFont,
    color: palette.accent,
  })
  page.drawText("CLAIMS FORM", {
    x: 234,
    y: 748,
    size: 11,
    font: boldFont,
    color: rgb(0.06, 0.06, 0.06),
  })
  page.drawText("Provider revenue workflow", {
    x: 235,
    y: 796,
    size: 7,
    font,
    color: palette.accent,
  })
}

export function drawPoliceHmoClaimForm({
  page,
  font,
  boldFont,
  clinic,
  record,
  variant,
}: {
  page: PDFPage
  font: PDFFont
  boldFont: PDFFont
  clinic: Doc<"clinics">
  record: ClaimCandidateRecord
  variant: ClaimTemplateVariant
}) {
  const patientName = buildPatientFullName(record.patient.surname, record.patient.otherNames)
  const age = Math.max(0, new Date().getFullYear() - new Date(record.patient.dateOfBirth).getFullYear())
  const additionalFieldLabel =
    variant === "police_hmo"
      ? "Command Name"
      : variant === "axa_mansard"
        ? "Authorization No."
        : variant === "hygeia_hmo"
          ? "Enrollee ID"
          : variant === "nhia_standard"
            ? "NHIS No."
            : "Member ID"
  const additionalFieldValue =
    variant === "police_hmo"
      ? getAdditionalFieldValue(record, "authorizationPaperNumber")
      : variant === "axa_mansard"
        ? getAdditionalFieldValue(record, "authorizationNumber")
        : variant === "hygeia_hmo"
          ? getAdditionalFieldValue(record, "enrolleeId")
          : variant === "nhia_standard"
            ? getAdditionalFieldValue(record, "nhisNumber")
            : record.patient.enrolleeNhisNo ?? ""

  drawTemplateHeader({
    page,
    font,
    boldFont,
    variant,
    hmoName: record.patient.hmoName ?? "HMO",
  })

  drawLabeledLine({ page, font, boldFont, label: "Name of Provider", value: clinic.name, x: 40, y: 724, width: 258 })
  drawLabeledLine({
    page,
    font,
    boldFont,
    label: "HCP NHIS Code No.",
    value: clinic.nhiaFacilityCode,
    x: 335,
    y: 724,
    width: 220,
  })
  drawLabeledLine({ page, font, boldFont, label: "Name of Enrollee", value: patientName, x: 40, y: 705, width: 258 })
  drawLabeledLine({ page, font, boldFont, label: "Age", value: String(age), x: 285, y: 705, width: 70 })
  drawLabeledLine({
    page,
    font,
    boldFont,
    label: "Enrollee NHIS No.",
    value: record.patient.enrolleeNhisNo ?? "",
    x: 365,
    y: 705,
    width: 190,
  })

  drawLabeledLine({
    page,
    font,
    boldFont,
    label: variant === "police_hmo" ? "AP NO." : additionalFieldLabel,
    value: additionalFieldValue,
    x: 40,
    y: 686,
    width: 205,
  })
  drawLabeledLine({
    page,
    font,
    boldFont,
    label: additionalFieldLabel,
    value: variant === "police_hmo" ? getAdditionalFieldValue(record, "commandName") : additionalFieldValue,
    x: 255,
    y: 686,
    width: 180,
  })
  drawLabeledLine({
    page,
    font,
    boldFont,
    label: variant === "police_hmo" ? "Force No." : "Authorization Code",
    value:
      variant === "police_hmo"
        ? getAdditionalFieldValue(record, "forceNumber")
        : record.bill.authorizationCode ?? "",
    x: 40,
    y: 667,
    width: 205,
  })
  drawLabeledLine({
    page,
    font,
    boldFont,
    label: variant === "police_hmo" ? "Authorization Code" : "Sex",
    value:
      variant === "police_hmo"
        ? record.bill.authorizationCode ?? ""
        : record.patient.sex.toUpperCase(),
    x: 255,
    y: 667,
    width: 180,
  })

  drawLabeledLine({
    page,
    font,
    boldFont,
    label: "Date of Notification",
    value: record.bill.dateNotification,
    x: 40,
    y: 648,
    width: 160,
  })
  drawLabeledLine({
    page,
    font,
    boldFont,
    label: "Date of Admission",
    value: record.bill.dateAdmission,
    x: 210,
    y: 648,
    width: 160,
  })
  drawLabeledLine({
    page,
    font,
    boldFont,
    label: "Date of Discharge",
    value: record.bill.dateDischarge,
    x: 380,
    y: 648,
    width: 175,
  })
  drawLabeledLine({
    page,
    font,
    boldFont,
    label: "Diagnosis",
    value: record.bill.diagnosis,
    x: 40,
    y: 629,
    width: 515,
  })

  page.drawText("INVESTIGATIONS/PROCEDURES/OTHERS", {
    x: 40,
    y: 610,
    size: 8,
    font: boldFont,
  })

  drawTableGrid({
    page,
    x: 36,
    y: 595,
    widths: [28, 368, 123],
    rowHeights: [22, 72, 22, 84, 22],
  })
  page.drawText("S/N", { x: 42, y: 580, size: 7, font: boldFont })
  page.drawText("PRESENTING COMPLAINTS WITH DURATION OF SYMPTOMS", {
    x: 68,
    y: 580,
    size: 7,
    font: boldFont,
  })
  page.drawText(record.bill.presentingComplaints || "Not recorded", {
    x: 68,
    y: 548,
    size: 7,
    font,
    maxWidth: 356,
    lineHeight: 9,
  })
  page.drawText("INVESTIGATION", { x: 68, y: 482, size: 7, font: boldFont })
  page.drawText("AMOUNT", { x: 446, y: 482, size: 7, font: boldFont })

  record.items.slice(0, 4).forEach((item, index) => {
    const rowY = 465 - index * 18
    page.drawText(String(index + 1), { x: 44, y: rowY, size: 7, font })
    page.drawText(item.name, { x: 68, y: rowY, size: 7, font, maxWidth: 350 })
    page.drawText(formatClaimCurrencyForPdf(item.lineTotal), {
      x: 424,
      y: rowY,
      size: 7,
      font,
      maxWidth: 72,
    })
  })
  page.drawText("TOTAL", { x: 68, y: 394, size: 7, font: boldFont })
  page.drawText(formatClaimCurrencyForPdf(record.bill.investigationsTotal), {
    x: 424,
    y: 394,
    size: 7,
    font: boldFont,
  })

  page.drawText("MEDICATIONS", {
    x: 40,
    y: 376,
    size: 8,
    font: boldFont,
  })
  drawTableGrid({
    page,
    x: 36,
    y: 371,
    widths: [30, 182, 100, 86, 64],
    rowHeights: [16, 86, 12, 12, 12],
  })
  page.drawText("DRUGS/INFUSION", { x: 68, y: 360, size: 7, font: boldFont })
  page.drawText("DOSAGE", { x: 253, y: 360, size: 7, font: boldFont })
  page.drawText("DURATION", { x: 354, y: 360, size: 7, font: boldFont })
  page.drawText("AMOUNT", { x: 442, y: 360, size: 7, font: boldFont })

  record.medications.slice(0, 4).forEach((item, index) => {
    const rowY = 341 - index * 18
    page.drawText(item.name, { x: 68, y: rowY, size: 7, font, maxWidth: 170 })
    page.drawText(item.dosage, { x: 253, y: rowY, size: 7, font, maxWidth: 88 })
    page.drawText(item.duration, { x: 354, y: rowY, size: 7, font, maxWidth: 74 })
    page.drawText(formatClaimCurrencyForPdf(item.lineTotal), {
      x: 431,
      y: rowY,
      size: 7,
      font,
      maxWidth: 58,
    })
  })

  page.drawText("TOTAL", { x: 390, y: 268, size: 7, font: boldFont })
  page.drawText(formatClaimCurrencyForPdf(record.bill.medicationsTotal), {
    x: 431,
    y: 268,
    size: 7,
    font: boldFont,
  })
  page.drawText("TOTAL LESS 10%", { x: 350, y: 256, size: 7, font: boldFont })
  page.drawText(formatClaimCurrencyForPdf(record.bill.hmoDeduction), {
    x: 431,
    y: 256,
    size: 7,
    font: boldFont,
  })
  page.drawText("GRAND TOTAL", { x: 361, y: 244, size: 7, font: boldFont })
  page.drawText(formatClaimCurrencyForPdf(record.bill.expectedReceivable), {
    x: 431,
    y: 244,
    size: 7,
    font: boldFont,
  })

  drawRule(page, 40, 205, 145, 205)
  drawRule(page, 245, 205, 350, 205)
  drawRule(page, 430, 205, 545, 205)
  page.drawText("Sign. of Provider", { x: 64, y: 193, size: 7, font: boldFont })
  page.drawText("Sign. of Patient", { x: 270, y: 193, size: 7, font: boldFont })
  page.drawText("Sign. of PHML Officer", { x: 447, y: 193, size: 7, font: boldFont })
}

export function renderClaimPdfByVariant({
  page,
  font,
  boldFont,
  clinic,
  record,
  template,
}: {
  page: PDFPage
  font: PDFFont
  boldFont: PDFFont
  clinic: Doc<"clinics">
  record: ClaimCandidateRecord
  template: Doc<"hmo_templates">
}) {
  const variant = resolveTemplateVariant(template)
  drawPoliceHmoClaimForm({
    page,
    font,
    boldFont,
    clinic,
    record,
    variant,
  })
}

export async function createClaimPdf({
  clinic,
  record,
  template,
}: {
  clinic: Doc<"clinics">
  record: ClaimCandidateRecord
  template: Doc<"hmo_templates">
}) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)

  renderClaimPdfByVariant({
    page,
    font,
    boldFont,
    clinic,
    record,
    template,
  })

  return await pdf.save()
}

export async function createCoverLetterPdf({
  clinic,
  hmoName,
  tpaName,
  periodStart,
  periodEnd,
  totalClaimed,
  claimCount,
  medicalDirectorName,
}: {
  clinic: Doc<"clinics">
  hmoName: string
  tpaName: string
  periodStart: string
  periodEnd: string
  totalClaimed: number
  claimCount: number
  medicalDirectorName: string
}) {
  const e2bKey = process.env.E2B_API_KEY
  void e2bKey

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)

  page.drawText("Medical Director Cover Letter", {
    x: 50,
    y: 800,
    size: 18,
    font: boldFont,
  })

  const lines = [
    `Facility: ${clinic.name}`,
    `Address: ${clinic.address}`,
    `NHIA Code: ${clinic.nhiaFacilityCode}`,
    `TPA: ${tpaName}`,
    `HMO: ${hmoName}`,
    `Period Covered: ${periodStart} to ${periodEnd}`,
    `Total Claims: ${claimCount}`,
    `Total Amount Claimed: ${formatClaimCurrencyForPdf(totalClaimed)}`,
    `Medical Director: ${medicalDirectorName}`,
  ]

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: 50,
      y: 760 - index * 24,
      size: 12,
      font,
    })
  })

  return await pdf.save()
}

export async function mergeClaimArtifacts(
  coverLetterBytes: Uint8Array,
  claimPdfBytes: Uint8Array[],
) {
  const merged = await PDFDocument.create()
  const docs = [coverLetterBytes, ...claimPdfBytes]

  for (const docBytes of docs) {
    const source = await PDFDocument.load(docBytes)
    const pages = await merged.copyPages(source, source.getPageIndices())
    for (const page of pages) {
      merged.addPage(page)
    }
  }

  return await merged.save()
}

export async function buildZipBundle({
  mergedPdfBytes,
  coverLetterBytes,
  claimFiles,
}: {
  mergedPdfBytes: Uint8Array
  coverLetterBytes: Uint8Array
  claimFiles: Array<{ fileName: string; bytes: Uint8Array }>
}) {
  const zip = new JSZip()

  zip.file("claim-batch-merged.pdf", mergedPdfBytes)
  zip.file("cover-letter.pdf", coverLetterBytes)

  for (const claimFile of claimFiles) {
    zip.file(`claims/${claimFile.fileName}`, claimFile.bytes)
  }

  return await zip.generateAsync({ type: "uint8array" })
}
