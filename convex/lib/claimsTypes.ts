import type { Doc, Id } from "../_generated/dataModel"
import type { ClaimIssue } from "../../src/lib/claims"

export interface ClaimCandidateRecord {
  bill: Doc<"bills">
  patient: Doc<"patients">
  items: Doc<"bill_items">[]
  medications: Doc<"bill_medications">[]
}

export interface GroqClaimEnrichment {
  scoreAdjustment: number
  issues: ClaimIssue[]
}

export interface ClaimScoreResult {
  billId: Id<"bills">
  patientName: string
  score: number
  band: "green" | "amber" | "red"
  blockingIssues: string[]
  warningIssues: string[]
  canGenerate: boolean
}

export type ClaimTemplateVariant =
  | "police_hmo"
  | "axa_mansard"
  | "hygeia_hmo"
  | "nhia_standard"
  | "generic_universal"
