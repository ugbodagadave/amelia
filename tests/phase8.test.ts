import { describe, expect, test } from "bun:test"

import {
  buildHmoDirectorySummary,
  filterHmoDirectoryRows,
  mapDirectoryRecordsToRows,
  mergeDirectoryIntoTemplates,
  parseNhiaHmoDirectoryMarkdown,
} from "../src/lib/hmoDirectory"
import { DEFAULT_HMO_TEMPLATES } from "../src/lib/clinicOnboarding"
import { matchHmoTemplateName } from "../src/lib/ocr"

const NHIA_MARKDOWN_FIXTURE = `## NHIA Accredited Health Maintenance Organizations

| S/NO. | HMO | HMO ID | WEBSITES | Address | Email | Call Center Numbers |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | A&M HEALTHCARE TRUST LIMITED | 102 | [Click here](https://amhmo.com/) | Plot U Bekaji Road, Yola, Adamawa State | info@amhmo.com | 08033646497, 09162780000 |
| 2 | Police Health Maintenance Limited | 142 | [Click here](https://www.policehmo.com/) | Abuja, Nigeria | contact@policehmo.com | 07000000000 |`

describe("Phase 8 — HMO directory parsing", () => {
  test("parses NHIA markdown rows into typed directory records", () => {
    const records = parseNhiaHmoDirectoryMarkdown(NHIA_MARKDOWN_FIXTURE)

    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({
      canonicalHmoName: "A&M HEALTHCARE TRUST LIMITED",
      website: "https://amhmo.com/",
      contactEmail: "info@amhmo.com",
      contactPhone: "08033646497, 09162780000",
      sourceType: "nhia",
      directoryConfidence: "high",
    })
    expect(records[1]?.aliases).toContain("PHML")
  })
})

describe("Phase 8 — Template merge semantics", () => {
  test("preserves clinic edits while filling blank directory fields and merging aliases", () => {
    const merged = mergeDirectoryIntoTemplates(
      [
        {
          ...DEFAULT_HMO_TEMPLATES[2],
          aliases: ["Clinic Preferred Alias"],
          website: "https://clinic-custom.example",
        },
      ],
      [
        {
          canonicalHmoName: "Hygeia HMO",
          aliases: ["Hygeia", "Hygeia HMO Limited"],
          website: "https://hygeiahmo.com/",
          contactEmail: "hycare@hygeiahmo.com",
          contactPhone: "0700-HYGEIA-HMO",
          address: "Ilupeju, Lagos",
          sourceUrls: ["https://hygeiahmo.com/contact-us/"],
          sourceType: "hmo_website",
          directoryConfidence: "medium",
        },
      ],
    )

    expect(merged).toHaveLength(1)
    expect(merged[0]?.website).toBe("https://clinic-custom.example")
    expect(merged[0]?.contactEmail).toBe("hycare@hygeiahmo.com")
    expect(merged[0]?.contactPhone).toBe("0700-HYGEIA-HMO")
    expect(merged[0]?.aliases).toEqual([
      "Clinic Preferred Alias",
      "Hygeia",
      "Hygeia HMO Limited",
    ])
  })

  test("adds new directory-backed templates when no clinic template exists", () => {
    const merged = mergeDirectoryIntoTemplates([], [
      {
        canonicalHmoName: "Reliance HMO",
        aliases: ["Reliance Health"],
        website: "https://www.reliancehmo.com/",
        contactEmail: "hello@reliancehmo.com",
        contactPhone: "0700-RELIANCE",
        address: "Lagos, Nigeria",
        sourceUrls: ["https://www.reliancehmo.com/"],
        sourceType: "hmo_website",
        directoryConfidence: "medium",
      },
    ])

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      hmoName: "Reliance HMO",
      website: "https://www.reliancehmo.com/",
      contactEmail: "hello@reliancehmo.com",
      contactPhone: "0700-RELIANCE",
    })
    expect(merged[0]?.formLayoutConfig).toContain('"variant":"generic_universal"')
  })
})

describe("Phase 8 — Alias-aware matching", () => {
  test("matches HMO names by seeded aliases", () => {
    const match = matchHmoTemplateName("PHML", DEFAULT_HMO_TEMPLATES)
    expect(match?.hmoName).toBe("Police HMO")
  })

  test("returns null for unknown HMO names", () => {
    expect(matchHmoTemplateName("Unknown Mutual Cover", DEFAULT_HMO_TEMPLATES)).toBeNull()
  })
})

describe("Phase 8 — Read-only directory helpers", () => {
  test("maps directory records into stable table rows and summary counts", () => {
    const rows = mapDirectoryRecordsToRows([
      {
        canonicalHmoName: "Hygeia HMO",
        aliases: ["Hygeia", "Hygeia HMO Limited"],
        website: "https://hygeiahmo.com/",
        contactEmail: "hycare@hygeiahmo.com",
        contactPhone: "0700-HYGEIA-HMO",
        address: "Lagos, Nigeria",
        sourceUrls: ["https://hygeiahmo.com/contact-us/"],
        sourceType: "hmo_website",
        directoryConfidence: "medium",
      },
      {
        canonicalHmoName: "Police HMO",
        aliases: ["PHML"],
        sourceUrls: ["https://www.nhia.gov.ng/hmo/"],
        sourceType: "nhia",
        directoryConfidence: "high",
      },
    ])

    expect(rows[0]).toMatchObject({
      name: "Hygeia HMO",
      aliasCount: 2,
      hasContactEmail: true,
      hasContactPhone: true,
    })

    expect(buildHmoDirectorySummary(rows)).toEqual({
      total: 2,
      withEmail: 1,
      withPhone: 1,
    })
  })

  test("filters rows by HMO name and aliases", () => {
    const rows = mapDirectoryRecordsToRows([
      {
        canonicalHmoName: "Police HMO",
        aliases: ["PHML", "Police Health Maintenance Limited"],
        sourceUrls: ["https://www.nhia.gov.ng/hmo/"],
        sourceType: "nhia",
        directoryConfidence: "high",
      },
    ])

    expect(filterHmoDirectoryRows(rows, "phml")).toHaveLength(1)
    expect(filterHmoDirectoryRows(rows, "maintenance")).toHaveLength(1)
    expect(filterHmoDirectoryRows(rows, "unknown")).toHaveLength(0)
  })
})

describe("Phase 8 — Integration touchpoints", () => {
  test("offline generation and bootstrap scripts exist", async () => {
    expect(await Bun.file("./scripts/scrape-hmo-directory.ts").exists()).toBe(true)
    expect(await Bun.file("./scripts/bootstrap-hmo-directory.ts").exists()).toBe(true)
    expect(await Bun.file("./scripts/firecrawl-smoke.ts").exists()).toBe(true)
  })

  test("docs describe committed seed loading and one-time bootstrap", async () => {
    const [plan, env, apiContracts] = await Promise.all([
      Bun.file("./docs/plan.md").text(),
      Bun.file("./docs/env.md").text(),
      Bun.file("./docs/api-contracts.md").text(),
    ])

    expect(plan).toContain("Phase 8")
    expect(plan).toContain("commit")
    expect(plan).toContain("scripts/bootstrap-hmo-directory.ts")
    expect(plan).toContain("automatically")
    expect(env).toContain("FIRECRAWL_API_KEY")
    expect(env).toContain("Not needed at runtime in the deployed app")
    expect(apiContracts).toContain("committed runtime seed")
    expect(apiContracts).toContain("one-time backfill")
  })

  test("settings page renders the read-only HMO directory with shadcn layout primitives", async () => {
    const [pageSource, tabsShellSource, hmoSectionSource, generalSectionSource] =
      await Promise.all([
        Bun.file("./src/pages/Settings.tsx").text(),
        Bun.file("./src/components/settings/SettingsTabsShell.tsx").text(),
        Bun.file("./src/components/settings/HmoDirectorySettingsSection.tsx").text(),
        Bun.file("./src/components/settings/GeneralClinicSettingsSection.tsx").text(),
      ])

    expect(pageSource).toContain("SettingsTabsShell")
    expect(tabsShellSource).toContain("Services")
    expect(tabsShellSource).toContain("HMOs")
    expect(tabsShellSource).toContain("General Settings")
    expect(tabsShellSource).toContain("Tabs")
    expect(hmoSectionSource).toContain("api.patients.listHmoTemplates")
    expect(hmoSectionSource).toContain("HMO_DIRECTORY_SEED_RECORDS")
    expect(hmoSectionSource).toContain("ScrollArea")
    expect(hmoSectionSource).toContain("Table")
    expect(hmoSectionSource).toContain("Badge")
    expect(hmoSectionSource).toContain("Input")
    expect(hmoSectionSource).toContain('defaultValue="clinic"')
    expect(generalSectionSource).toContain("api.clinics.getCurrentClinic")
    expect(generalSectionSource).toContain("api.clinics.updateCurrentClinic")
    expect(generalSectionSource).toContain("api.payments.verifyBankAccount")
  })
})
