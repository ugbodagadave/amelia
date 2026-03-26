import {
  HMO_DIRECTORY_CONFIDENCE,
  HMO_DIRECTORY_SOURCE,
  buildCanonicalAliases,
  mergeDirectoryRecords,
  parseNhiaHmoDirectoryMarkdown,
  type HmoDirectoryRecord,
} from "../src/lib/hmoDirectory"

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v2/scrape"
const NHIA_DIRECTORY_URL = "https://www.nhia.gov.ng/hmo/"
const OUTPUT_JSON_PATH = "./data/hmo-directory.json"
const OUTPUT_TS_PATH = "./src/lib/hmoDirectorySeed.ts"

const CURATED_HMO_SOURCES = [
  {
    canonicalHmoName: "Hygeia HMO",
    url: "https://hygeiahmo.com/contact-us/",
    aliases: ["Hygeia", "Hygeia HMO Limited"],
  },
  {
    canonicalHmoName: "Police HMO",
    url: "https://www.policehmo.com/",
    aliases: ["PHML", "Police Health Maintenance Limited"],
  },
  {
    canonicalHmoName: "AXA Mansard",
    url: "https://www.axamansardhealth.com/",
    aliases: ["AXA Mansard Health", "AXA Mansard HMO"],
  },
  {
    canonicalHmoName: "Leadway Health",
    url: "https://leadwayhealth.com/",
    aliases: ["Leadway HMO"],
  },
  {
    canonicalHmoName: "Reliance HMO",
    url: "https://www.reliancehmo.com/",
    aliases: ["Reliance Health"],
  },
  {
    canonicalHmoName: "AIICO Multishield",
    url: "https://aiicoplc.com/aiico-multishield/",
    aliases: ["AIICO HMO"],
  },
  {
    canonicalHmoName: "Clearline HMO",
    url: "https://clearlinehmo.net/contact/",
    aliases: ["Clearline"],
  },
] as const

function loadEnvFile(path: string) {
  const file = Bun.file(path)
  return file.exists().then(async (exists) => {
    if (!exists) {
      return
    }

    const content = await file.text()
    for (const rawLine of content.split(/\r?\n/g)) {
      const line = rawLine.trim()
      if (!line || line.startsWith("#")) {
        continue
      }

      const separatorIndex = line.indexOf("=")
      if (separatorIndex === -1) {
        continue
      }

      const key = line.slice(0, separatorIndex).trim()
      const value = line.slice(separatorIndex + 1).split("#")[0]?.trim() ?? ""
      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  })
}

async function scrapeMarkdown(url: string) {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is required.")
  }

  const response = await fetch(FIRECRAWL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Firecrawl scrape failed for ${url}: ${response.status} ${response.statusText}`)
  }

  const payload = (await response.json()) as {
    success: boolean
    data?: {
      markdown?: string
      metadata?: { statusCode?: number; title?: string; sourceURL?: string }
    }
  }

  if (!payload.success || !payload.data?.markdown) {
    throw new Error(`Firecrawl scrape returned no markdown for ${url}.`)
  }

  return payload.data.markdown
}

function extractEmail(markdown: string) {
  return markdown.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
}

function extractPhone(markdown: string) {
  return markdown.match(/(?:\+?234|0|0700)[0-9A-Z -]{7,}/i)?.[0]?.trim()
}

function extractAddress(markdown: string) {
  const addressLine = markdown
    .split(/\r?\n/g)
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .find(
      (line) =>
        line.length >= 18 &&
        /lagos|abuja|road|estate|nigeria|expressway|street|close|avenue/i.test(line),
    )

  return addressLine
}

function buildWebsiteRecord(source: (typeof CURATED_HMO_SOURCES)[number], markdown: string) {
  return {
    canonicalHmoName: source.canonicalHmoName,
    aliases: Array.from(new Set([...source.aliases, ...buildCanonicalAliases(source.canonicalHmoName)])),
    website: source.url,
    contactEmail: extractEmail(markdown),
    contactPhone: extractPhone(markdown),
    address: extractAddress(markdown),
    sourceUrls: [source.url],
    sourceType: HMO_DIRECTORY_SOURCE.HMO_WEBSITE,
    directoryConfidence: HMO_DIRECTORY_CONFIDENCE.MEDIUM,
  } satisfies HmoDirectoryRecord
}

function buildSeedModule(records: HmoDirectoryRecord[]) {
  return [
    'import type { HmoDirectoryRecord } from "./hmoDirectory"',
    "",
    "export const HMO_DIRECTORY_SEED_RECORDS: HmoDirectoryRecord[] = ",
    `${JSON.stringify(records, null, 2)}`,
    "",
  ].join("\n")
}

async function main() {
  await loadEnvFile(".env.local")
  await loadEnvFile(".env")

  const nhiaMarkdown = await scrapeMarkdown(NHIA_DIRECTORY_URL)
  const nhiaRecords = parseNhiaHmoDirectoryMarkdown(nhiaMarkdown)

  const websiteRecords: HmoDirectoryRecord[] = []

  for (const source of CURATED_HMO_SOURCES) {
    try {
      const markdown = await scrapeMarkdown(source.url)
      websiteRecords.push(buildWebsiteRecord(source, markdown))
    } catch (error) {
      console.warn(`Skipping ${source.url}:`, error instanceof Error ? error.message : error)
    }
  }

  const records = mergeDirectoryRecords([...nhiaRecords, ...websiteRecords])

  await Bun.write(OUTPUT_JSON_PATH, `${JSON.stringify(records, null, 2)}\n`)
  await Bun.write(OUTPUT_TS_PATH, buildSeedModule(records))

  console.log(
    JSON.stringify(
      {
        outputJson: OUTPUT_JSON_PATH,
        outputModule: OUTPUT_TS_PATH,
        totalRecords: records.length,
        nhiaRecords: nhiaRecords.length,
        websiteEnrichments: websiteRecords.length,
      },
      null,
      2,
    ),
  )
}

await main()
