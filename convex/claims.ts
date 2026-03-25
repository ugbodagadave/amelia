import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { BILL_STATUS } from "../src/lib/billing"
import { CLAIM_BATCH_STATUS, CLAIM_SCORE_BAND, addDays } from "../src/lib/claims"
import { buildPatientFullName } from "../src/lib/patients"
import {
  getCurrentClinicForAction,
  getCurrentClinicId,
  getTemplateForClinic,
  listClaimCandidateRows,
  loadClaimRecords,
} from "./lib/claimsData"
import {
  buildZipBundle,
  createClaimPdf,
  createCoverLetterPdf,
  mergeClaimArtifacts,
  toBlobPart,
} from "./lib/claimsPdf"
import { scoreClaimRecords } from "./lib/claimsScoring"
import type { ClaimCandidateRecord, ClaimScoreResult } from "./lib/claimsTypes"

async function resolveBatchArtifacts(
  storage: {
    getUrl: (storageId: Id<"_storage">) => Promise<string | null>
  },
  batch: Doc<"claim_batches">,
) {
  return {
    mergedPdfUrl: batch.mergedPdfStorageId
      ? await storage.getUrl(batch.mergedPdfStorageId)
      : null,
    zipBundleUrl: batch.zipBundleStorageId
      ? await storage.getUrl(batch.zipBundleStorageId)
      : null,
    coverLetterUrl: batch.coverLetterStorageId
      ? await storage.getUrl(batch.coverLetterStorageId)
      : null,
  }
}

export const getClinicByClerkUserId = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clinics")
      .withIndex("by_clerk_user_id", (q) => q.eq("createdByClerkUserId", args.clerkUserId))
      .unique()
  },
})

export const getClaimRecordsForBills = internalQuery({
  args: {
    clinicId: v.id("clinics"),
    billIds: v.array(v.id("bills")),
  },
  handler: async (ctx, args) => {
    return await loadClaimRecords(ctx.db, args.clinicId, args.billIds)
  },
})

export const getTemplateById = internalQuery({
  args: {
    clinicId: v.id("clinics"),
    templateId: v.id("hmo_templates"),
  },
  handler: async (ctx, args) => {
    return await getTemplateForClinic(ctx.db, args.clinicId, args.templateId)
  },
})

export const createGeneratedClaimBatch = internalMutation({
  args: {
    clinicId: v.id("clinics"),
    hmoName: v.string(),
    tpaName: v.string(),
    tpaEmail: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
    totalClaimed: v.number(),
    billIds: v.array(v.id("bills")),
    coverLetterStorageId: v.id("_storage"),
    mergedPdfStorageId: v.id("_storage"),
    zipBundleStorageId: v.id("_storage"),
    claimFiles: v.array(
      v.object({
        billId: v.id("bills"),
        claimPdfStorageId: v.id("_storage"),
        completenessScore: v.number(),
        scoreBand: v.union(v.literal("green"), v.literal("amber"), v.literal("red")),
        blockingIssues: v.array(v.string()),
        warningIssues: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const claimBatchId = await ctx.db.insert("claim_batches", {
      clinicId: args.clinicId,
      hmoName: args.hmoName,
      tpaName: args.tpaName,
      tpaEmail: args.tpaEmail,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      billIds: args.billIds,
      totalClaimed: args.totalClaimed,
      claimsPdfUrl: undefined,
      coverLetterPdfUrl: undefined,
      coverLetterStorageId: args.coverLetterStorageId,
      mergedPdfStorageId: args.mergedPdfStorageId,
      zipBundleStorageId: args.zipBundleStorageId,
      status: CLAIM_BATCH_STATUS.DRAFT,
      submittedAt: undefined,
      expectedPaymentBy: undefined,
      paidAt: undefined,
    })

    for (const claimFile of args.claimFiles) {
      await ctx.db.insert("claim_batch_bills", {
        clinicId: args.clinicId,
        claimBatchId,
        billId: claimFile.billId,
        claimPdfStorageId: claimFile.claimPdfStorageId,
        completenessScore: claimFile.completenessScore,
        scoreBand: claimFile.scoreBand,
        blockingIssues: claimFile.blockingIssues,
        warningIssues: claimFile.warningIssues,
        createdAt: now,
      })

      await ctx.db.patch(claimFile.billId, {
        status: BILL_STATUS.CLAIMED,
      })
    }

    return claimBatchId
  },
})

export const markBatchOverdueInternal = internalMutation({
  args: { claimBatchId: v.id("claim_batches") },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.claimBatchId)
    if (!batch || batch.status !== CLAIM_BATCH_STATUS.SUBMITTED) {
      return null
    }

    await ctx.db.patch(args.claimBatchId, {
      status: CLAIM_BATCH_STATUS.OVERDUE,
    })

    return null
  },
})

export const listClaimCandidates = query({
  args: {},
  handler: async (ctx) => {
    return await listClaimCandidateRows(ctx)
  },
})

export const listClaimBatches = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)
    const batches = await ctx.db
      .query("claim_batches")
      .withIndex("by_clinic", (q) => q.eq("clinicId", clinicId))
      .order("desc")
      .collect()

    return await Promise.all(
      batches.map(async (batch) => ({
        ...batch,
        claimCount: (
          await ctx.db
            .query("claim_batch_bills")
            .withIndex("by_claim_batch", (q) => q.eq("claimBatchId", batch._id))
            .collect()
        ).length,
        ...(await resolveBatchArtifacts(ctx.storage, batch)),
      })),
    )
  },
})

export const getClaimBatch = query({
  args: { claimBatchId: v.id("claim_batches") },
  handler: async (ctx, args) => {
    const clinicId = await getCurrentClinicId(ctx)
    const batch = await ctx.db.get(args.claimBatchId)

    if (!batch || batch.clinicId !== clinicId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Claim batch not found for this clinic.",
      })
    }

    const batchBills = await ctx.db
      .query("claim_batch_bills")
      .withIndex("by_claim_batch", (q) => q.eq("claimBatchId", batch._id))
      .collect()

    return {
      ...batch,
      ...(await resolveBatchArtifacts(ctx.storage, batch)),
      claimFiles: await Promise.all(
        batchBills.map(async (entry) => ({
          ...entry,
          claimPdfUrl: entry.claimPdfStorageId
            ? await ctx.storage.getUrl(entry.claimPdfStorageId)
            : null,
        })),
      ),
    }
  },
})

export const scoreClaimCompleteness = action({
  args: { billIds: v.array(v.id("bills")) },
  handler: async (ctx, args): Promise<ClaimScoreResult[]> => {
    const clinic = await getCurrentClinicForAction(ctx)
    const records: ClaimCandidateRecord[] = await ctx.runQuery(
      internal.claims.getClaimRecordsForBills,
      {
        clinicId: clinic._id,
        billIds: args.billIds,
      },
    )

    return await scoreClaimRecords(records)
  },
})

export const generateClaimBatch = action({
  args: {
    billIds: v.array(v.id("bills")),
    templateId: v.id("hmo_templates"),
    periodStart: v.string(),
    periodEnd: v.string(),
    tpaName: v.string(),
    tpaEmail: v.string(),
    medicalDirectorName: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    claimBatchId: Id<"claim_batches">
    mergedPdfUrl: string | null
    zipBundleUrl: string | null
    coverLetterUrl: string | null
    claimFiles: Array<{
      billId: Id<"bills">
      claimPdfUrl: string | null
      fileName: string
    }>
  }> => {
    const clinic = await getCurrentClinicForAction(ctx)
    const template: Doc<"hmo_templates"> | null = await ctx.runQuery(
      internal.claims.getTemplateById,
      {
        clinicId: clinic._id,
        templateId: args.templateId,
      },
    )

    if (!template) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "HMO template not found for this clinic.",
      })
    }

    const records: ClaimCandidateRecord[] = await ctx.runQuery(
      internal.claims.getClaimRecordsForBills,
      {
        clinicId: clinic._id,
        billIds: args.billIds,
      },
    )

    if (records.length === 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Select at least one eligible HMO bill.",
      })
    }

    const scores = await scoreClaimRecords(records)
    const scoreMap = new Map<Id<"bills">, ClaimScoreResult>(
      scores.map((score) => [score.billId, score]),
    )

    if (scores.some((score) => !score.canGenerate)) {
      throw new ConvexError({
        code: "CLAIM_VALIDATION_FAILED",
        message: "Resolve blocking claim issues before generating the batch.",
      })
    }

    const claimFiles: Array<{ billId: Id<"bills">; fileName: string; bytes: Uint8Array }> = []
    for (const record of records) {
      const fileName = `${buildPatientFullName(record.patient.surname, record.patient.otherNames)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}-claim.pdf`
      const bytes = await createClaimPdf({
        clinic,
        record,
        template,
      })
      claimFiles.push({ billId: record.bill._id, fileName, bytes })
    }

    const totalClaimed = records.reduce(
      (sum, record) => sum + record.bill.expectedReceivable,
      0,
    )
    const coverLetterBytes = await createCoverLetterPdf({
      clinic,
      hmoName: template.hmoName,
      tpaName: args.tpaName.trim(),
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      totalClaimed,
      claimCount: records.length,
      medicalDirectorName: args.medicalDirectorName.trim(),
    })
    const mergedPdfBytes = await mergeClaimArtifacts(
      coverLetterBytes,
      claimFiles.map((claimFile) => claimFile.bytes),
    )
    const zipBundleBytes = await buildZipBundle({
      mergedPdfBytes,
      coverLetterBytes,
      claimFiles,
    })

    const coverLetterStorageId = await ctx.storage.store(
      new Blob([toBlobPart(coverLetterBytes)], { type: "application/pdf" }),
    )
    const mergedPdfStorageId = await ctx.storage.store(
      new Blob([toBlobPart(mergedPdfBytes)], { type: "application/pdf" }),
    )
    const zipBundleStorageId = await ctx.storage.store(
      new Blob([toBlobPart(zipBundleBytes)], { type: "application/zip" }),
    )

    const persistedClaimFiles: Array<{
      billId: Id<"bills">
      claimPdfStorageId: Id<"_storage">
      completenessScore: number
      scoreBand: "green" | "amber" | "red"
      blockingIssues: string[]
      warningIssues: string[]
    }> = []
    for (const claimFile of claimFiles) {
      const claimPdfStorageId = await ctx.storage.store(
        new Blob([toBlobPart(claimFile.bytes)], { type: "application/pdf" }),
      )
      const score = scoreMap.get(claimFile.billId)
      persistedClaimFiles.push({
        billId: claimFile.billId,
        claimPdfStorageId,
        completenessScore: score?.score ?? 0,
        scoreBand: score?.band ?? CLAIM_SCORE_BAND.RED,
        blockingIssues: score?.blockingIssues ?? [],
        warningIssues: score?.warningIssues ?? [],
      })
    }

    const claimBatchId = await ctx.runMutation(internal.claims.createGeneratedClaimBatch, {
      clinicId: clinic._id,
      hmoName: template.hmoName,
      tpaName: args.tpaName.trim(),
      tpaEmail: args.tpaEmail.trim(),
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      totalClaimed,
      billIds: records.map((record) => record.bill._id),
      coverLetterStorageId,
      mergedPdfStorageId,
      zipBundleStorageId,
      claimFiles: persistedClaimFiles,
    })

    return {
      claimBatchId,
      mergedPdfUrl: await ctx.storage.getUrl(mergedPdfStorageId),
      zipBundleUrl: await ctx.storage.getUrl(zipBundleStorageId),
      coverLetterUrl: await ctx.storage.getUrl(coverLetterStorageId),
      claimFiles: await Promise.all(
        persistedClaimFiles.map(async (claimFile, index) => ({
          billId: claimFile.billId,
          claimPdfUrl: await ctx.storage.getUrl(claimFile.claimPdfStorageId),
          fileName: claimFiles[index]?.fileName ?? `claim-${index + 1}.pdf`,
        })),
      ),
    }
  },
})

export const submitClaimBatch = mutation({
  args: {
    claimBatchId: v.id("claim_batches"),
    tpaName: v.string(),
    tpaEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const clinicId = await getCurrentClinicId(ctx)
    const batch = await ctx.db.get(args.claimBatchId)

    if (!batch || batch.clinicId !== clinicId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Claim batch not found for this clinic.",
      })
    }

    const submittedAt = Date.now()
    const expectedPaymentBy = addDays(submittedAt, 14)

    await ctx.db.patch(args.claimBatchId, {
      tpaName: args.tpaName.trim(),
      tpaEmail: args.tpaEmail.trim(),
      submittedAt,
      expectedPaymentBy,
      status: CLAIM_BATCH_STATUS.SUBMITTED,
    })

    return { submittedAt, expectedPaymentBy }
  },
})

export const markClaimBatchPaid = mutation({
  args: { claimBatchId: v.id("claim_batches") },
  handler: async (ctx, args) => {
    const clinicId = await getCurrentClinicId(ctx)
    const batch = await ctx.db.get(args.claimBatchId)

    if (!batch || batch.clinicId !== clinicId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Claim batch not found for this clinic.",
      })
    }

    const paidAt = Date.now()
    await ctx.db.patch(args.claimBatchId, {
      status: CLAIM_BATCH_STATUS.PAID,
      paidAt,
    })

    return { paidAt }
  },
})
