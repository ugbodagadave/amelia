import { describe, expect, test } from "bun:test"

import {
  CLAIM_BATCH_STATUS,
  CLAIM_SCORE_BAND,
  CLAIM_WORKFLOW_STEP,
  addDays,
  buildClaimGenerationSteps,
  calculateClaimScoreSummary,
  classifyClaimScoreBand,
  hasBlockingClaimIssues,
  normalizeClaimIssueCode,
} from "../src/lib/claims"
import { ROUTES } from "../src/constants/routes"
import { formatClaimCurrencyForPdf } from "../convex/lib/claimsPdf"

describe("Phase 5 - Claim helpers", () => {
  test("formats PDF currency values without the naira symbol", () => {
    expect(formatClaimCurrencyForPdf(4500)).toBe("NGN 4,500")
  })

  test("classifies claim score bands by threshold", () => {
    expect(classifyClaimScoreBand(82)).toBe(CLAIM_SCORE_BAND.GREEN)
    expect(classifyClaimScoreBand(65)).toBe(CLAIM_SCORE_BAND.AMBER)
    expect(classifyClaimScoreBand(40)).toBe(CLAIM_SCORE_BAND.RED)
  })

  test("detects blocking claim issues", () => {
    expect(
      hasBlockingClaimIssues([
        {
          code: "missing_nin",
          severity: "blocking",
          message: "NIN is required for HMO claims.",
        },
      ]),
    ).toBe(true)

    expect(
      hasBlockingClaimIssues([
        {
          code: "icd10_inferred",
          severity: "warning",
          message: "Diagnosis code was inferred from diagnosis text.",
        },
      ]),
    ).toBe(false)
  })

  test("normalizes issue codes into constant-safe values", () => {
    expect(normalizeClaimIssueCode("Missing NIN")).toBe("missing_nin")
    expect(normalizeClaimIssueCode("Dates logically inconsistent")).toBe(
      "dates_logically_inconsistent",
    )
  })

  test("builds the 5-step claim generation workflow", () => {
    expect(buildClaimGenerationSteps()).toEqual([
      CLAIM_WORKFLOW_STEP.VALIDATE_AUTH_CODES,
      CLAIM_WORKFLOW_STEP.APPLY_TEMPLATE,
      CLAIM_WORKFLOW_STEP.POPULATE_FIELDS,
      CLAIM_WORKFLOW_STEP.CALCULATE_TOTALS,
      CLAIM_WORKFLOW_STEP.GENERATE_COVER_LETTER,
    ])
  })

  test("summarizes a claim score with warnings only", () => {
    expect(
      calculateClaimScoreSummary({
        baseScore: 88,
        issues: [
          {
            code: "icd10_inferred",
            severity: "warning",
            message: "Diagnosis code inferred from diagnosis text.",
          },
        ],
      }),
    ).toEqual({
      score: 88,
      band: CLAIM_SCORE_BAND.GREEN,
      blockingIssues: [],
      warningIssues: ["Diagnosis code inferred from diagnosis text."],
      canGenerate: true,
    })
  })

  test("summarizes a claim score with blockers", () => {
    expect(
      calculateClaimScoreSummary({
        baseScore: 42,
        issues: [
          {
            code: "missing_nin",
            severity: "blocking",
            message: "NIN is required for HMO claims.",
          },
          {
            code: "missing_diagnosis",
            severity: "blocking",
            message: "Diagnosis is required before claim generation.",
          },
        ],
      }),
    ).toEqual({
      score: 42,
      band: CLAIM_SCORE_BAND.RED,
      blockingIssues: [
        "NIN is required for HMO claims.",
        "Diagnosis is required before claim generation.",
      ],
      warningIssues: [],
      canGenerate: false,
    })
  })

  test("adds fourteen days to derive the expected payment date", () => {
    expect(addDays(Date.UTC(2026, 2, 25), 14)).toBe(Date.UTC(2026, 3, 8))
  })
})

describe("Phase 5 - Routing and source integration", () => {
  test("defines the claims route", () => {
    expect(ROUTES.CLAIMS).toBe("/claims")
  })

  test("wires the claims page, claims backend, groq scoring config, and overdue tracker", async () => {
    const appSource = await Bun.file("./src/App.tsx").text()
    const claimsPageSource = await Bun.file("./src/pages/Claims.tsx").text()
    const claimsLibSource = await Bun.file("./src/lib/claims.ts").text()
    const calendarSource = await Bun.file("./src/components/ui/calendar.tsx").text()
    const claimsConvexSource = await Bun.file("./convex/claims.ts").text()
    const claimsScoringSource = await Bun.file("./convex/lib/claimsScoring.ts").text()
    const claimsPdfSource = await Bun.file("./convex/lib/claimsPdf.ts").text()
    const claimsDataSource = await Bun.file("./convex/lib/claimsData.ts").text()
    const paginationSource = await Bun.file("./src/components/ui/pagination.tsx").text()
    const schemaSource = await Bun.file("./convex/schema.ts").text()
    const inngestEventsSource = await Bun.file("./src/inngest/events.ts").text()
    const inngestFunctionsSource = await Bun.file("./src/inngest/functions/index.ts").text()
    const envSource = await Bun.file("./docs/env.md").text()
    const planSource = await Bun.file("./docs/plan.md").text()

    expect(appSource).toContain("ClaimsPage")
    expect(claimsPageSource).toContain("api.claims.listClaimCandidates")
    expect(claimsPageSource).toContain("api.claims.listClaimBatches")
    expect(claimsPageSource).toContain("api.claims.scoreClaimCompleteness")
    expect(claimsPageSource).toContain("api.claims.generateClaimBatch")
    expect(claimsPageSource).toContain("api.claims.submitClaimBatch")
    expect(claimsPageSource).toContain("api.claims.markClaimBatchPaid")
    expect(claimsPageSource).toContain("Generate claim batch")
    expect(claimsPageSource).toContain("Claim readiness")
    expect(claimsPageSource).toContain("Select all available")
    expect(claimsPageSource).toContain("toggleAllSelection")
    expect(claimsPageSource).toContain("allSelectableSelected")
    expect(claimsPageSource).toContain("CLAIM_CANDIDATES_PER_PAGE")
    expect(claimsPageSource).toContain("Pagination")
    expect(claimsPageSource).toContain("mode=\"range\"")
    expect(claimsPageSource).toContain("dateRange")
    expect(claimsPageSource).toContain("Period covered")
    expect(calendarSource).toContain("DayPicker")
    expect(paginationSource).toContain("size = \"icon-xs\"")
    expect(paginationSource).toContain("text-xs")
    expect(claimsLibSource).toContain("CLAIM_WORKFLOW_STEP")
    expect(claimsConvexSource).toContain("listClaimCandidates")
    expect(claimsConvexSource).toContain("scoreClaimCompleteness")
    expect(claimsConvexSource).toContain("generateClaimBatch")
    expect(claimsConvexSource).toContain("submitClaimBatch")
    expect(claimsConvexSource).toContain("markClaimBatchPaid")
    expect(claimsConvexSource).toContain("from \"./lib/claimsScoring\"")
    expect(claimsConvexSource).toContain("from \"./lib/claimsPdf\"")
    expect(claimsConvexSource).toContain("from \"./lib/claimsData\"")
    expect(claimsScoringSource).toContain("GROQ_MODEL")
    expect(claimsScoringSource).toContain("scoreClaimRecords")
    expect(claimsPdfSource).toContain("E2B_API_KEY")
    expect(claimsPdfSource).toContain("drawPoliceHmoClaimForm")
    expect(claimsPdfSource).toContain("resolveTemplateVariant")
    expect(claimsPdfSource).toContain("renderClaimPdfByVariant")
    expect(claimsDataSource).toContain("loadClaimRecords")
    expect(schemaSource).toContain("claimPdfStorageId")
    expect(schemaSource).toContain("mergedPdfStorageId")
    expect(schemaSource).toContain("zipBundleStorageId")
    expect(schemaSource).toContain("templateAssetPath")
    expect(schemaSource).toContain("templateFieldMapJson")
    expect(inngestEventsSource).toContain("claims/overdue.check")
    expect(inngestFunctionsSource).toContain("claimsOverdueCheck")
    expect(envSource).toContain("GROQ_API_KEY")
    expect(envSource).toContain("GROQ_MODEL")
    expect(planSource).toContain("Phase 5")
    expect(planSource).toContain("HMO Claims Generator")
  })
})
