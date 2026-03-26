import type { SeededHmoTemplate } from "./clinicOnboarding"

export const HMO_DIRECTORY_SOURCE = {
  HMO_WEBSITE: "hmo_website",
  MANUAL: "manual",
  NHIA: "nhia",
} as const

export const HMO_DIRECTORY_CONFIDENCE = {
  HIGH: "high",
  MANUAL: "manual",
  MEDIUM: "medium",
} as const

export type HmoDirectorySourceType =
  (typeof HMO_DIRECTORY_SOURCE)[keyof typeof HMO_DIRECTORY_SOURCE]
export type HmoDirectoryConfidence =
  (typeof HMO_DIRECTORY_CONFIDENCE)[keyof typeof HMO_DIRECTORY_CONFIDENCE]

export interface HmoDirectoryRecord {
  canonicalHmoName: string
  aliases: string[]
  website?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  sourceUrls: string[]
  sourceType: HmoDirectorySourceType
  directoryConfidence: HmoDirectoryConfidence
  tpaName?: string
  tpaEmail?: string
  tpaPhone?: string
  notes?: string
}

export interface HmoDirectoryRow {
  name: string
  aliases: string[]
  aliasCount: number
  contactEmail: string
  contactPhone: string
  sourceType: HmoDirectorySourceType
  directoryConfidence: HmoDirectoryConfidence
  hasContactEmail: boolean
  hasContactPhone: boolean
}

export interface HmoDirectoryTemplateLike {
  hmoName: string
  aliases?: string[]
  contactEmail?: string
  contactPhone?: string
  directorySourceType?: string
  directoryConfidence?: string
}

const LEGAL_SUFFIX_TOKENS = new Set([
  "company",
  "corporation",
  "organization",
  "organisation",
  "plc",
  "trust",
])

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function normalizeDirectoryKey(value: string) {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function splitMarkdownRow(row: string) {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => normalizeWhitespace(cell))
}

function extractMarkdownLinkUrl(cell: string) {
  const match = cell.match(/\((https?:\/\/[^)]+)\)/i)
  return match?.[1]?.trim()
}

function cleanMarkdownCell(cell: string) {
  return normalizeWhitespace(cell.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, "$1"))
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const value of values) {
    const normalizedValue = normalizeWhitespace(value)
    if (!normalizedValue) {
      continue
    }

    const key = normalizeDirectoryKey(normalizedValue)
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(normalizedValue)
  }

  return deduped
}

function buildAcronymAlias(name: string) {
  const acronym = name
    .split(/[^a-zA-Z0-9]+/g)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.toUpperCase())
    .filter((token) => !LEGAL_SUFFIX_TOKENS.has(token.toLowerCase()))
    .map((token) => token[0])
    .join("")

  return acronym.length >= 3 ? acronym : ""
}

export function buildCanonicalAliases(name: string) {
  const aliases = new Set<string>()
  const trimmedName = normalizeWhitespace(name)
  if (!trimmedName) {
    return []
  }

  const hmoVariant = trimmedName.replace(/health maintenance(?: organisations?| organizations?)?/gi, "HMO")
  const limitedVariant = trimmedName.replace(/\b(limited|ltd|plc)\b/gi, "")
  const healthStrippedVariant = trimmedName.replace(/\bhealth\b/gi, "")
  const acronymAlias = buildAcronymAlias(trimmedName)

  for (const candidate of [
    trimmedName,
    normalizeWhitespace(hmoVariant),
    normalizeWhitespace(limitedVariant),
    normalizeWhitespace(healthStrippedVariant),
    acronymAlias,
  ]) {
    if (candidate) {
      aliases.add(candidate)
    }
  }

  if (trimmedName.endsWith(" HMO")) {
    aliases.add(trimmedName.replace(/\s+HMO$/i, ""))
  }

  return dedupeStrings(Array.from(aliases)).filter(
    (alias) => normalizeDirectoryKey(alias) !== normalizeDirectoryKey(trimmedName),
  )
}

export function parseNhiaHmoDirectoryMarkdown(markdown: string): HmoDirectoryRecord[] {
  const rows = markdown
    .split(/\r?\n/g)
    .filter((line) => line.trim().startsWith("|"))
    .map(splitMarkdownRow)
    .filter((cells) => cells.length >= 7)
    .filter((cells) => cells[0] !== "S/NO.")
    .filter((cells) => !cells.every((cell) => /^-+$/.test(cell.replace(/\s+/g, ""))))

  return rows.flatMap((cells) => {
      const hmoName = cleanMarkdownCell(cells[1] ?? "")
      if (!hmoName) {
        return []
      }

      const website = extractMarkdownLinkUrl(cells[3] ?? "")
      const address = cleanMarkdownCell(cells[4] ?? "")
      const contactEmail = cleanMarkdownCell(cells[5] ?? "")
      const contactPhone = cleanMarkdownCell(cells[6] ?? "")

      const record: HmoDirectoryRecord = {
        canonicalHmoName: hmoName,
        aliases: buildCanonicalAliases(hmoName),
        website: website || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        address: address || undefined,
        sourceUrls: ["https://www.nhia.gov.ng/hmo/"],
        sourceType: HMO_DIRECTORY_SOURCE.NHIA,
        directoryConfidence: HMO_DIRECTORY_CONFIDENCE.HIGH,
      }

      return [record]
    })
}

function buildGenericTemplate(record: HmoDirectoryRecord): SeededHmoTemplate {
  return {
    hmoName: record.canonicalHmoName,
    additionalFields: [{ label: "Member ID", fieldKey: "memberId" }],
    aliases: record.aliases,
    website: record.website,
    contactEmail: record.contactEmail,
    contactPhone: record.contactPhone,
    address: record.address,
    sourceUrls: record.sourceUrls,
    directorySourceType: record.sourceType,
    directoryConfidence: record.directoryConfidence,
    tpaName: record.tpaName,
    tpaEmail: record.tpaEmail,
    tpaPhone: record.tpaPhone,
    formLayoutConfig: JSON.stringify({
      variant: "generic_universal",
      sections: ["patient", "episode", "investigations", "medications", "totals"],
    }),
  }
}

function mergeTemplateWithDirectoryRecord(
  template: SeededHmoTemplate,
  record: HmoDirectoryRecord,
): SeededHmoTemplate {
  return {
    ...template,
    aliases: dedupeStrings([...(template.aliases ?? []), ...record.aliases]),
    website: template.website || record.website,
    contactEmail: template.contactEmail || record.contactEmail,
    contactPhone: template.contactPhone || record.contactPhone,
    address: template.address || record.address,
    sourceUrls: dedupeStrings([...(template.sourceUrls ?? []), ...record.sourceUrls]),
    directorySourceType: template.directorySourceType || record.sourceType,
    directoryConfidence: template.directoryConfidence || record.directoryConfidence,
    directoryUpdatedAt: template.directoryUpdatedAt ?? Date.now(),
    tpaName: template.tpaName || record.tpaName,
    tpaEmail: template.tpaEmail || record.tpaEmail,
    tpaPhone: template.tpaPhone || record.tpaPhone,
  }
}

export function mergeDirectoryIntoTemplates(
  templates: SeededHmoTemplate[],
  records: HmoDirectoryRecord[],
) {
  const merged = new Map<string, SeededHmoTemplate>()

  for (const template of templates) {
    merged.set(normalizeDirectoryKey(template.hmoName), template)
  }

  for (const record of records) {
    const key = normalizeDirectoryKey(record.canonicalHmoName)
    const existing = merged.get(key)

    if (existing) {
      merged.set(key, mergeTemplateWithDirectoryRecord(existing, record))
      continue
    }

    merged.set(key, buildGenericTemplate(record))
  }

  return Array.from(merged.values()).sort((left, right) => left.hmoName.localeCompare(right.hmoName))
}

export function mergeDirectoryRecords(records: HmoDirectoryRecord[]) {
  const merged = new Map<string, HmoDirectoryRecord>()

  for (const record of records) {
    const key = normalizeDirectoryKey(record.canonicalHmoName)
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, {
        ...record,
        aliases: dedupeStrings(record.aliases),
        sourceUrls: dedupeStrings(record.sourceUrls),
      })
      continue
    }

    merged.set(key, {
      ...record,
      aliases: dedupeStrings([...existing.aliases, ...record.aliases]),
      website: existing.website || record.website,
      contactEmail: existing.contactEmail || record.contactEmail,
      contactPhone: existing.contactPhone || record.contactPhone,
      address: existing.address || record.address,
      sourceUrls: dedupeStrings([...existing.sourceUrls, ...record.sourceUrls]),
      tpaName: existing.tpaName || record.tpaName,
      tpaEmail: existing.tpaEmail || record.tpaEmail,
      tpaPhone: existing.tpaPhone || record.tpaPhone,
      notes: existing.notes || record.notes,
      sourceType: existing.sourceType === HMO_DIRECTORY_SOURCE.NHIA ? existing.sourceType : record.sourceType,
      directoryConfidence:
        existing.directoryConfidence === HMO_DIRECTORY_CONFIDENCE.HIGH
          ? existing.directoryConfidence
          : record.directoryConfidence,
    })
  }

  return Array.from(merged.values()).sort((left, right) =>
    left.canonicalHmoName.localeCompare(right.canonicalHmoName),
  )
}

export function mapDirectoryRecordsToRows(records: HmoDirectoryRecord[]): HmoDirectoryRow[] {
  return records
    .map((record) => ({
      name: record.canonicalHmoName,
      aliases: dedupeStrings(record.aliases),
      aliasCount: dedupeStrings(record.aliases).length,
      contactEmail: record.contactEmail ?? "",
      contactPhone: record.contactPhone ?? "",
      sourceType: record.sourceType,
      directoryConfidence: record.directoryConfidence,
      hasContactEmail: Boolean(record.contactEmail?.trim()),
      hasContactPhone: Boolean(record.contactPhone?.trim()),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function filterHmoDirectoryRows(rows: HmoDirectoryRow[], searchTerm: string) {
  const normalizedSearchTerm = normalizeDirectoryKey(searchTerm)
  if (!normalizedSearchTerm) {
    return rows
  }

  return rows.filter((row) =>
    [row.name, row.contactEmail, row.contactPhone, ...row.aliases].some((value) =>
      normalizeDirectoryKey(value).includes(normalizedSearchTerm),
    ),
  )
}

export function buildHmoDirectorySummary(rows: HmoDirectoryRow[]) {
  return {
    total: rows.length,
    withEmail: rows.filter((row) => row.hasContactEmail).length,
    withPhone: rows.filter((row) => row.hasContactPhone).length,
  }
}

export function mapTemplatesToDirectoryRows(
  templates: HmoDirectoryTemplateLike[],
): HmoDirectoryRow[] {
  return templates
    .map((template) => ({
      name: template.hmoName,
      aliases: dedupeStrings(template.aliases ?? []),
      aliasCount: dedupeStrings(template.aliases ?? []).length,
      contactEmail: template.contactEmail ?? "",
      contactPhone: template.contactPhone ?? "",
      sourceType:
        template.directorySourceType === HMO_DIRECTORY_SOURCE.HMO_WEBSITE ||
        template.directorySourceType === HMO_DIRECTORY_SOURCE.MANUAL ||
        template.directorySourceType === HMO_DIRECTORY_SOURCE.NHIA
          ? template.directorySourceType
          : HMO_DIRECTORY_SOURCE.MANUAL,
      directoryConfidence:
        template.directoryConfidence === HMO_DIRECTORY_CONFIDENCE.HIGH ||
        template.directoryConfidence === HMO_DIRECTORY_CONFIDENCE.MEDIUM ||
        template.directoryConfidence === HMO_DIRECTORY_CONFIDENCE.MANUAL
          ? template.directoryConfidence
          : HMO_DIRECTORY_CONFIDENCE.MANUAL,
      hasContactEmail: Boolean(template.contactEmail?.trim()),
      hasContactPhone: Boolean(template.contactPhone?.trim()),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}
