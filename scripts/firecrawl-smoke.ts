const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v2/batch/scrape"

const TARGETS = [
  "https://www.nhia.gov.ng/hmo/",
  "https://hygeiahmo.com/contact-us/",
]

async function loadEnvFile(path: string) {
  const file = Bun.file(path)
  if (!(await file.exists())) {
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
}

async function main() {
  await loadEnvFile(".env.local")
  await loadEnvFile(".env")

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
      urls: TARGETS,
      formats: ["markdown"],
    }),
  })

  if (!response.ok) {
    throw new Error(`Firecrawl smoke request failed: ${response.status} ${response.statusText}`)
  }

  const payload = (await response.json()) as { id?: string; success?: boolean; url?: string }

  console.log(
    JSON.stringify(
      {
        success: payload.success ?? false,
        jobId: payload.id ?? null,
        statusUrl: payload.url ?? null,
        targets: TARGETS,
      },
      null,
      2,
    ),
  )
}

await main()
