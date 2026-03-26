import { ConvexError } from "convex/values"

import { internal } from "../_generated/api"
import type { Doc, Id } from "../_generated/dataModel"
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server"
import { requireClerkUserId } from "../lib/auth"
import { BILL_STATUS } from "../../src/lib/billing"
import { buildPatientFullName } from "../../src/lib/patients"
import type { ClaimCandidateRecord } from "./claimsTypes"

export type ClaimsQueryCtx = QueryCtx | MutationCtx
type ClaimsDatabase = QueryCtx["db"] | MutationCtx["db"]

export async function getCurrentClinicId(ctx: ClaimsQueryCtx) {
  const clerkUserId = await requireClerkUserId(ctx)
  const clinic = await ctx.db
    .query("clinics")
    .withIndex("by_clerk_user_id", (q) => q.eq("createdByClerkUserId", clerkUserId))
    .unique()

  if (!clinic) {
    throw new ConvexError({
      code: "CLINIC_NOT_FOUND",
      message: "Complete onboarding before managing claims.",
    })
  }

  return clinic._id
}

export async function getCurrentClinicForAction(ctx: ActionCtx): Promise<Doc<"clinics">> {
  const clerkUserId = await requireClerkUserId(ctx)
  const clinic: Doc<"clinics"> | null = await ctx.runQuery(
    internal.claims.getClinicByClerkUserId,
    { clerkUserId },
  )

  if (!clinic) {
    throw new ConvexError({
      code: "CLINIC_NOT_FOUND",
      message: "Complete onboarding before managing claims.",
    })
  }

  return clinic
}

export async function loadClaimRecords(
  db: ClaimsDatabase,
  clinicId: Id<"clinics">,
  billIds: Id<"bills">[],
  options?: { includeClaimed?: boolean },
): Promise<ClaimCandidateRecord[]> {
  const records: ClaimCandidateRecord[] = []

  for (const billId of billIds) {
    const bill = await db.get(billId)
    const existingClaimBatchBill = await db
      .query("claim_batch_bills")
      .withIndex("by_bill", (q) => q.eq("billId", billId))
      .first()

    if (
      !bill ||
      bill.clinicId !== clinicId ||
      (!options?.includeClaimed && existingClaimBatchBill)
    ) {
      continue
    }

    const patient = await db.get(bill.patientId)
    if (!patient || patient.clinicId !== clinicId || patient.paymentType !== "hmo") {
      continue
    }

    const [items, medications] = await Promise.all([
      db
        .query("bill_items")
        .withIndex("by_clinic_and_bill", (q) => q.eq("clinicId", clinicId).eq("billId", bill._id))
        .collect(),
      db
        .query("bill_medications")
        .withIndex("by_clinic_and_bill", (q) => q.eq("clinicId", clinicId).eq("billId", bill._id))
        .collect(),
    ])

    records.push({ bill, patient, items, medications })
  }

  return records
}

export async function getClaimRecordForBill(
  db: ClaimsDatabase,
  clinicId: Id<"clinics">,
  billId: Id<"bills">,
) {
  const [record] = await loadClaimRecords(db, clinicId, [billId], {
    includeClaimed: true,
  })
  return record ?? null
}

export async function getTemplateForClinic(
  db: ClaimsDatabase,
  clinicId: Id<"clinics">,
  templateId: Id<"hmo_templates">,
) {
  const template = await db.get(templateId)

  if (!template || template.clinicId !== clinicId) {
    return null
  }

  return template
}

export async function listClaimCandidateRows(ctx: ClaimsQueryCtx) {
  const clinicId = await getCurrentClinicId(ctx)
  const [bills, patients, claimBatchBills] = await Promise.all([
    ctx.db.query("bills").withIndex("by_clinic", (q) => q.eq("clinicId", clinicId)).collect(),
    ctx.db.query("patients").withIndex("by_clinic", (q) => q.eq("clinicId", clinicId)).collect(),
    ctx.db
      .query("claim_batch_bills")
      .withIndex("by_clinic", (q) => q.eq("clinicId", clinicId))
      .collect(),
  ])

  const claimedBillIds = new Set(claimBatchBills.map((entry) => entry.billId))
  const patientMap = new Map(patients.map((patient) => [patient._id, patient]))

  return bills
    .filter(
      (bill) =>
        !claimedBillIds.has(bill._id) &&
        (bill.status === BILL_STATUS.PAID || bill.status === BILL_STATUS.AUTH_CONFIRMED),
    )
    .map((bill) => {
      const patient = patientMap.get(bill.patientId)
      if (!patient || patient.paymentType !== "hmo") {
        return null
      }

      const fullName = buildPatientFullName(patient.surname, patient.otherNames)
      const isLocked = !bill.authorizationCode?.trim() || !patient.nin?.trim()

      return {
        _id: bill._id,
        patientId: patient._id,
        patientName: fullName,
        hmoName: patient.hmoName ?? "HMO",
        amount: bill.totalAmount,
        expectedReceivable: bill.expectedReceivable,
        authorizationCode: bill.authorizationCode ?? null,
        hasAuthCode: Boolean(bill.authorizationCode?.trim()),
        hasNin: Boolean(patient.nin?.trim()),
        status: bill.status,
        isLocked,
        lockReason: !bill.authorizationCode?.trim()
          ? "Missing authorization code."
          : !patient.nin?.trim()
            ? "Missing patient NIN."
            : null,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => left.patientName.localeCompare(right.patientName))
}
