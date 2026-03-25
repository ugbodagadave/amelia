import OpenAI from "openai"

import { BILL_STATUS } from "../../src/lib/billing"
import {
  calculateClaimScoreSummary,
  normalizeClaimIssueCode,
  type ClaimIssue,
} from "../../src/lib/claims"
import { buildPatientFullName } from "../../src/lib/patients"
import type {
  ClaimCandidateRecord,
  ClaimScoreResult,
  GroqClaimEnrichment,
} from "./claimsTypes"

function summarizeIssue(issue: string) {
  const normalized = issue.toLowerCase()

  if (normalized.includes("nin")) {
    return "NIN"
  }

  if (normalized.includes("diagnosis")) {
    return "diagnosis"
  }

  if (normalized.includes("authorization")) {
    return "authorization code"
  }

  if (normalized.includes("line item") || normalized.includes("investigation") || normalized.includes("medication")) {
    return "claim line items"
  }

  if (normalized.includes("date")) {
    return "claim dates"
  }

  return issue.replace(/\.$/, "")
}

function capitalize(input: string) {
  return input.charAt(0).toUpperCase() + input.slice(1)
}

export function buildClaimSummaryText({
  blockingIssues,
  warningIssues,
}: {
  blockingIssues: string[]
  warningIssues: string[]
}) {
  if (blockingIssues.length > 0) {
    const labels = blockingIssues.slice(0, 2).map(summarizeIssue)
    if (labels.length === 1) {
      return `Missing ${labels[0]}.`
    }
    return `Missing ${labels[0]} and ${labels[1]}.`
  }

  if (warningIssues.length > 0) {
    const firstWarning = warningIssues[0]?.replace(/\.$/, "") ?? "Review claim details"
    if (warningIssues.length === 1) {
      return `${capitalize(firstWarning)}.`
    }
    return `${capitalize(firstWarning)}; ${warningIssues.length - 1} advisory fixes suggested.`
  }

  return "No blocking issues detected."
}

function fallbackInsightFromIssue(issue: string) {
  const normalized = issue.toLowerCase()

  if (normalized.includes("nin")) {
    return "Add the patient's NIN."
  }

  if (normalized.includes("diagnosis wording is vague") || normalized.includes("diagnosis")) {
    return "Clarify the diagnosis wording."
  }

  if (normalized.includes("authorization")) {
    return "Confirm and enter the authorization code."
  }

  if (normalized.includes("line item") || normalized.includes("investigation") || normalized.includes("medication")) {
    return "Add the missing investigation or medication line items."
  }

  if (normalized.includes("date")) {
    return "Correct the admission and discharge dates."
  }

  if (normalized.includes("nhis")) {
    return "Fill in the enrollee NHIS number."
  }

  return capitalize(issue.replace(/\.$/, "")) + "."
}

export function deriveActionableInsightsFallback(issues: string[]) {
  if (issues.length === 0) {
    return ["No correction needed. Claim is ready to generate."]
  }

  return Array.from(new Set(issues.map(fallbackInsightFromIssue))).slice(0, 4)
}

async function enrichActionableInsightsWithGroq({
  record,
  issues,
}: {
  record: ClaimCandidateRecord
  issues: string[]
}) {
  const client = createGroqClient()
  if (!client) {
    return null
  }

  const model = process.env.GROQ_MODEL ?? "moonshotai/kimi-k2-instruct-0905"
  const temperature = parseNumberEnv("GROQ_TEMPERATURE", 0.3)
  const max_completion_tokens = parseNumberEnv("GROQ_MAX_COMPLETION_TOKENS", 512)
  const top_p = parseNumberEnv("GROQ_TOP_P", 1)

  const prompt = [
    "You are helping clinic staff correct a Nigerian HMO claim.",
    "Return strict JSON: {\"insights\": string[]}",
    "Write 2 to 4 short, direct correction bullets.",
    "Use imperative phrasing.",
    "Do not explain or add background.",
    `Diagnosis: ${record.bill.diagnosis}`,
    `Authorization code: ${record.bill.authorizationCode ?? ""}`,
    `Existing issues: ${issues.join(" | ") || "None"}`,
  ].join("\n")

  try {
    const response = await client.chat.completions.create({
      model,
      temperature,
      max_completion_tokens,
      top_p,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return null
    }

    const parsed = JSON.parse(content) as { insights?: string[] }
    const insights = (parsed.insights ?? [])
      .filter((insight): insight is string => typeof insight === "string" && insight.trim().length > 0)
      .map((insight) => capitalize(insight.trim().replace(/\.$/, "")) + ".")
      .slice(0, 4)

    return insights.length > 0 ? insights : null
  } catch {
    return null
  }
}

export async function getClaimActionableInsightsForRecord(
  record: ClaimCandidateRecord,
  issues: string[],
) {
  const groqInsights = await enrichActionableInsightsWithGroq({ record, issues })
  return groqInsights ?? deriveActionableInsightsFallback(issues)
}

function createGroqClient() {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return null
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
  })
}

function parseNumberEnv(name: string, fallback: number) {
  const value = process.env[name]
  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function sanitizeIssue(input: ClaimIssue): ClaimIssue {
  return {
    code: normalizeClaimIssueCode(input.code),
    severity: input.severity,
    message: input.message.trim(),
  }
}

function buildDeterministicClaimIssues(record: ClaimCandidateRecord): ClaimIssue[] {
  const issues: ClaimIssue[] = []

  if (!record.patient.nin?.trim()) {
    issues.push({
      code: "missing_nin",
      severity: "blocking",
      message: "NIN is required for HMO claims.",
    })
  }

  if (!record.bill.diagnosis.trim()) {
    issues.push({
      code: "missing_diagnosis",
      severity: "blocking",
      message: "Diagnosis is required before claim generation.",
    })
  }

  if (!record.bill.authorizationCode?.trim()) {
    issues.push({
      code: "missing_auth_code",
      severity: "blocking",
      message: "Authorization code is required before claim generation.",
    })
  }

  if (record.items.length === 0 && record.medications.length === 0) {
    issues.push({
      code: "missing_line_items",
      severity: "blocking",
      message: "Add at least one investigation or medication before generating a claim.",
    })
  }

  const admissionTime = Date.parse(record.bill.dateAdmission)
  const dischargeTime = Date.parse(record.bill.dateDischarge)
  if (Number.isFinite(admissionTime) && Number.isFinite(dischargeTime) && admissionTime > dischargeTime) {
    issues.push({
      code: "dates_logically_inconsistent",
      severity: "blocking",
      message: "Admission date cannot be after discharge date.",
    })
  }

  if (record.bill.status === BILL_STATUS.CLAIMED) {
    issues.push({
      code: "already_claimed",
      severity: "blocking",
      message: "This bill is already linked to a claim batch.",
    })
  }

  if (!record.patient.enrolleeNhisNo?.trim()) {
    issues.push({
      code: "missing_nhis_number",
      severity: "warning",
      message: "Enrollee NHIS number is missing.",
    })
  }

  return issues
}

async function enrichClaimIssuesWithGroq(
  record: ClaimCandidateRecord,
): Promise<GroqClaimEnrichment> {
  const client = createGroqClient()

  if (!client) {
    return { scoreAdjustment: 0, issues: [] }
  }

  const model = process.env.GROQ_MODEL ?? "moonshotai/kimi-k2-instruct-0905"
  const temperature = parseNumberEnv("GROQ_TEMPERATURE", 0.6)
  const max_completion_tokens = parseNumberEnv("GROQ_MAX_COMPLETION_TOKENS", 4096)
  const top_p = parseNumberEnv("GROQ_TOP_P", 1)

  const prompt = [
    "You are validating a Nigerian HMO claim before PDF generation.",
    "Return strict JSON with the shape:",
    '{"scoreAdjustment": number, "issues": [{"code": string, "severity": "warning", "message": string}]}',
    "Only return warning issues. Do not return blocking issues.",
    "Focus on ICD-10 inference hints, weak diagnosis wording, and claim completeness warnings.",
    `Patient payment type: ${record.patient.paymentType}`,
    `Diagnosis: ${record.bill.diagnosis}`,
    `Admission date: ${record.bill.dateAdmission}`,
    `Discharge date: ${record.bill.dateDischarge}`,
    `Auth code: ${record.bill.authorizationCode ?? ""}`,
    `Patient NIN present: ${record.patient.nin ? "yes" : "no"}`,
  ].join("\n")

  try {
    const response = await client.chat.completions.create({
      model,
      temperature,
      max_completion_tokens,
      top_p,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { scoreAdjustment: 0, issues: [] }
    }

    const parsed = JSON.parse(content) as {
      scoreAdjustment?: number
      issues?: Array<{ code?: string; severity?: string; message?: string }>
    }

    return {
      scoreAdjustment:
        typeof parsed.scoreAdjustment === "number" ? parsed.scoreAdjustment : 0,
      issues: (parsed.issues ?? [])
        .filter(
          (issue): issue is { code: string; severity: string; message: string } =>
            typeof issue.code === "string" &&
            typeof issue.severity === "string" &&
            typeof issue.message === "string",
        )
        .map((issue) =>
          sanitizeIssue({
            code: issue.code,
            severity: issue.severity === "blocking" ? "warning" : "warning",
            message: issue.message,
          }),
        ),
    }
  } catch {
    return { scoreAdjustment: 0, issues: [] }
  }
}

export async function scoreClaimRecords(
  records: ClaimCandidateRecord[],
): Promise<ClaimScoreResult[]> {
  const scores: ClaimScoreResult[] = []

  for (const record of records) {
    const deterministicIssues = buildDeterministicClaimIssues(record)
    const groqResult = await enrichClaimIssuesWithGroq(record)
    const scoreSummary = calculateClaimScoreSummary({
      baseScore:
        100 -
        deterministicIssues.filter((issue) => issue.severity === "blocking").length * 30 +
        groqResult.scoreAdjustment,
      issues: [...deterministicIssues, ...groqResult.issues],
    })

    scores.push({
      billId: record.bill._id,
      patientName: buildPatientFullName(record.patient.surname, record.patient.otherNames),
      score: scoreSummary.score,
      band: scoreSummary.band,
      summary: buildClaimSummaryText({
        blockingIssues: scoreSummary.blockingIssues,
        warningIssues: scoreSummary.warningIssues,
      }),
      blockingIssues: scoreSummary.blockingIssues,
      warningIssues: scoreSummary.warningIssues,
      canGenerate: scoreSummary.canGenerate,
    })
  }

  return scores
}
