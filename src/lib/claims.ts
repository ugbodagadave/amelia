export const CLAIM_BATCH_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  PAID: "paid",
  OVERDUE: "overdue",
} as const

export type ClaimBatchStatus =
  (typeof CLAIM_BATCH_STATUS)[keyof typeof CLAIM_BATCH_STATUS]

export const CLAIM_SCORE_BAND = {
  GREEN: "green",
  AMBER: "amber",
  RED: "red",
} as const

export type ClaimScoreBand =
  (typeof CLAIM_SCORE_BAND)[keyof typeof CLAIM_SCORE_BAND]

export const CLAIM_WORKFLOW_STEP = {
  VALIDATE_AUTH_CODES: "Validating auth codes",
  APPLY_TEMPLATE: "Applying HMO template",
  POPULATE_FIELDS: "Populating claim fields",
  CALCULATE_TOTALS: "Calculating totals",
  GENERATE_COVER_LETTER: "Generating cover letter",
} as const

export interface ClaimIssue {
  code: string
  severity: "blocking" | "warning"
  message: string
}

export function normalizeClaimIssueCode(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}

export function hasBlockingClaimIssues(issues: ClaimIssue[]) {
  return issues.some((issue) => issue.severity === "blocking")
}

export function classifyClaimScoreBand(score: number): ClaimScoreBand {
  if (score >= 80) {
    return CLAIM_SCORE_BAND.GREEN
  }

  if (score >= 50) {
    return CLAIM_SCORE_BAND.AMBER
  }

  return CLAIM_SCORE_BAND.RED
}

export function buildClaimGenerationSteps() {
  return [
    CLAIM_WORKFLOW_STEP.VALIDATE_AUTH_CODES,
    CLAIM_WORKFLOW_STEP.APPLY_TEMPLATE,
    CLAIM_WORKFLOW_STEP.POPULATE_FIELDS,
    CLAIM_WORKFLOW_STEP.CALCULATE_TOTALS,
    CLAIM_WORKFLOW_STEP.GENERATE_COVER_LETTER,
  ]
}

export function calculateClaimScoreSummary({
  baseScore,
  issues,
}: {
  baseScore: number
  issues: ClaimIssue[]
}) {
  const score = Math.max(0, Math.min(100, Math.round(baseScore)))
  const blockingIssues = issues
    .filter((issue) => issue.severity === "blocking")
    .map((issue) => issue.message)
  const warningIssues = issues
    .filter((issue) => issue.severity === "warning")
    .map((issue) => issue.message)

  return {
    score,
    band: classifyClaimScoreBand(score),
    blockingIssues,
    warningIssues,
    canGenerate: blockingIssues.length === 0,
  }
}

export function addDays(timestamp: number, days: number) {
  return timestamp + days * 24 * 60 * 60 * 1000
}
