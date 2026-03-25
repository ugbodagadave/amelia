import { ConvexError } from "convex/values"
import { query, type QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { requireClerkUserId } from "./lib/auth"
import { BILL_STATUS } from "../src/lib/billing"
import { CLAIM_BATCH_STATUS } from "../src/lib/claims"
import {
  buildLastNDays,
  getDayWindow,
  sumCollectionsForWindow,
  calculateCollectionRate,
  groupItemsByService,
  daysOutstanding,
} from "../src/lib/dashboardStats"
import { buildPatientFullName } from "../src/lib/patients"

async function getCurrentClinicId(ctx: QueryCtx): Promise<Id<"clinics">> {
  const clerkUserId = await requireClerkUserId(ctx)
  const clinic = await ctx.db
    .query("clinics")
    .withIndex("by_clerk_user_id", (q) => q.eq("createdByClerkUserId", clerkUserId))
    .unique()

  if (!clinic) {
    throw new ConvexError({
      code: "CLINIC_NOT_FOUND",
      message: "Complete onboarding before viewing the dashboard.",
    })
  }

  return clinic._id
}

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)

    const [paidBills, pendingBills, overdueBills, awaitingAuthBills, overdueBatches] =
      await Promise.all([
        ctx.db
          .query("bills")
          .withIndex("by_clinic_and_status", (q) =>
            q.eq("clinicId", clinicId).eq("status", BILL_STATUS.PAID),
          )
          .collect(),
        ctx.db
          .query("bills")
          .withIndex("by_clinic_and_status", (q) =>
            q.eq("clinicId", clinicId).eq("status", BILL_STATUS.PENDING_PAYMENT),
          )
          .collect(),
        ctx.db
          .query("bills")
          .withIndex("by_clinic_and_status", (q) =>
            q.eq("clinicId", clinicId).eq("status", BILL_STATUS.OVERDUE),
          )
          .collect(),
        ctx.db
          .query("bills")
          .withIndex("by_clinic_and_status", (q) =>
            q.eq("clinicId", clinicId).eq("status", BILL_STATUS.AWAITING_AUTH),
          )
          .collect(),
        ctx.db
          .query("claim_batches")
          .withIndex("by_clinic_and_status", (q) =>
            q.eq("clinicId", clinicId).eq("status", CLAIM_BATCH_STATUS.OVERDUE),
          )
          .collect(),
      ])

    // Today's UTC window
    const todayDate = new Date()
    todayDate.setUTCHours(0, 0, 0, 0)
    const todayStart = todayDate.getTime()
    const todayEnd = todayStart + 86_400_000 - 1

    const todayCollections = sumCollectionsForWindow(paidBills, todayStart, todayEnd)
    const outstandingBills = [...pendingBills, ...overdueBills]

    return {
      todayCollections,
      outstandingBillsCount: outstandingBills.length,
      outstandingBillsSum: outstandingBills.reduce((sum, b) => sum + b.totalAmount, 0),
      pendingAuthCount: awaitingAuthBills.length,
      overdueClaimBatchCount: overdueBatches.length,
      overdueClaimBatches: overdueBatches.map((b) => ({
        _id: b._id,
        hmoName: b.hmoName,
        tpaName: b.tpaName,
        expectedPaymentBy: b.expectedPaymentBy,
      })),
    }
  },
})

export const getSevenDayRevenue = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)
    const now = Date.now()
    const days = buildLastNDays(7, now)

    const [paidBills, allBatches] = await Promise.all([
      ctx.db
        .query("bills")
        .withIndex("by_clinic_and_status", (q) =>
          q.eq("clinicId", clinicId).eq("status", BILL_STATUS.PAID),
        )
        .collect(),
      ctx.db
        .query("claim_batches")
        .withIndex("by_clinic", (q) => q.eq("clinicId", clinicId))
        .collect(),
    ])

    const submittedBatches = allBatches.filter((b) => b.submittedAt !== undefined)

    return days.map((date) => {
      const { start, end } = getDayWindow(date)
      const collections = sumCollectionsForWindow(paidBills, start, end)
      const claimsSubmitted = submittedBatches.filter((b) => {
        const sa = b.submittedAt
        return sa !== undefined && sa >= start && sa <= end
      }).length

      return { date, collections, claimsSubmitted }
    })
  },
})

export const getPaymentMix = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)

    const paidBills = await ctx.db
      .query("bills")
      .withIndex("by_clinic_and_status", (q) =>
        q.eq("clinicId", clinicId).eq("status", BILL_STATUS.PAID),
      )
      .collect()

    const channelMap = new Map<string, { count: number; totalAmount: number }>()

    for (const bill of paidBills) {
      const channel = bill.paymentChannel ?? "other"
      const current = channelMap.get(channel) ?? { count: 0, totalAmount: 0 }
      channelMap.set(channel, {
        count: current.count + 1,
        totalAmount: current.totalAmount + bill.totalAmount,
      })
    }

    return [...channelMap.entries()].map(([channel, data]) => ({
      channel,
      count: data.count,
      totalAmount: data.totalAmount,
    }))
  },
})

export const getRecentBills = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)

    const bills = await ctx.db
      .query("bills")
      .withIndex("by_clinic", (q) => q.eq("clinicId", clinicId))
      .order("desc")
      .take(10)

    return Promise.all(
      bills.map(async (bill) => {
        const patient = await ctx.db.get(bill.patientId)
        return {
          _id: bill._id,
          patientName: patient
            ? buildPatientFullName(patient.surname, patient.otherNames)
            : "Unknown Patient",
          hmoName: patient?.hmoName ?? null,
          totalAmount: bill.totalAmount,
          status: bill.status,
          paymentChannel: bill.paymentChannel ?? null,
          createdAt: bill.createdAt,
        }
      }),
    )
  },
})

export const getAnalyticsStats = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)

    const [paidBills, pendingBills, overdueBills, claimedBills, claimBatches] = await Promise.all([
      ctx.db
        .query("bills")
        .withIndex("by_clinic_and_status", (q) =>
          q.eq("clinicId", clinicId).eq("status", BILL_STATUS.PAID),
        )
        .collect(),
      ctx.db
        .query("bills")
        .withIndex("by_clinic_and_status", (q) =>
          q.eq("clinicId", clinicId).eq("status", BILL_STATUS.PENDING_PAYMENT),
        )
        .collect(),
      ctx.db
        .query("bills")
        .withIndex("by_clinic_and_status", (q) =>
          q.eq("clinicId", clinicId).eq("status", BILL_STATUS.OVERDUE),
        )
        .collect(),
      ctx.db
        .query("bills")
        .withIndex("by_clinic_and_status", (q) =>
          q.eq("clinicId", clinicId).eq("status", BILL_STATUS.CLAIMED),
        )
        .collect(),
      ctx.db
        .query("claim_batches")
        .withIndex("by_clinic", (q) => q.eq("clinicId", clinicId))
        .collect(),
    ])

    // Monthly revenue (UTC month boundary)
    const now = Date.now()
    const monthStart = new Date(now)
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const monthStartTs = monthStart.getTime()

    const monthlyRevenue = paidBills
      .filter((b) => {
        const paidAt = b.paidAt
        return paidAt !== undefined && paidAt >= monthStartTs
      })
      .reduce((sum, b) => sum + b.totalAmount, 0)

    // Collection rate: (paid + claimed) / (pending + overdue + paid + claimed)
    const collectedCount = paidBills.length + claimedBills.length
    const billableCount =
      pendingBills.length + overdueBills.length + paidBills.length + claimedBills.length
    const collectionRate = calculateCollectionRate(collectedCount, billableCount)

    // Claims submitted (any non-draft batch)
    const submittedBatches = claimBatches.filter((b) => b.status !== CLAIM_BATCH_STATUS.DRAFT)
    const claimsSubmittedCount = submittedBatches.length
    const claimsSubmittedValue = submittedBatches.reduce((sum, b) => sum + b.totalClaimed, 0)

    // Avg days to payment
    const billedAndPaid = paidBills.filter((b) => b.paidAt !== undefined)
    const avgDaysToPayment =
      billedAndPaid.length > 0
        ? billedAndPaid.reduce((sum, b) => {
            const paidAt = b.paidAt
            if (paidAt === undefined) return sum
            return sum + daysOutstanding(b.createdAt, paidAt)
          }, 0) / billedAndPaid.length
        : 0

    return {
      monthlyRevenue,
      collectionRate,
      claimsSubmittedCount,
      claimsSubmittedValue,
      avgDaysToPayment: Math.round(avgDaysToPayment),
    }
  },
})

export const getThirtyDayRevenueTrend = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)
    const now = Date.now()
    const days = buildLastNDays(30, now)

    const paidBills = await ctx.db
      .query("bills")
      .withIndex("by_clinic_and_status", (q) =>
        q.eq("clinicId", clinicId).eq("status", BILL_STATUS.PAID),
      )
      .collect()

    return days.map((date) => {
      const { start, end } = getDayWindow(date)
      return {
        date,
        revenue: sumCollectionsForWindow(paidBills, start, end),
      }
    })
  },
})

export const getClaimsByStatus = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)

    const batches = await ctx.db
      .query("claim_batches")
      .withIndex("by_clinic", (q) => q.eq("clinicId", clinicId))
      .collect()

    const statusOrder = [
      CLAIM_BATCH_STATUS.DRAFT,
      CLAIM_BATCH_STATUS.SUBMITTED,
      CLAIM_BATCH_STATUS.PAID,
      CLAIM_BATCH_STATUS.OVERDUE,
    ] as const

    const countMap = new Map<string, number>()
    for (const status of statusOrder) {
      countMap.set(status, 0)
    }
    for (const batch of batches) {
      countMap.set(batch.status, (countMap.get(batch.status) ?? 0) + 1)
    }

    return statusOrder.map((status) => ({
      status,
      count: countMap.get(status) ?? 0,
    }))
  },
})

export const getTopServicesByRevenue = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)

    const [billItems, medicationItems] = await Promise.all([
      ctx.db
        .query("bill_items")
        .withIndex("by_clinic_and_bill", (q) => q.eq("clinicId", clinicId))
        .collect(),
      ctx.db
        .query("bill_medications")
        .withIndex("by_clinic_and_bill", (q) => q.eq("clinicId", clinicId))
        .collect(),
    ])

    return groupItemsByService([...billItems, ...medicationItems]).slice(0, 10)
  },
})

export const getOutstandingBills = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)

    const [pendingBills, overdueBills] = await Promise.all([
      ctx.db
        .query("bills")
        .withIndex("by_clinic_and_status", (q) =>
          q.eq("clinicId", clinicId).eq("status", BILL_STATUS.PENDING_PAYMENT),
        )
        .collect(),
      ctx.db
        .query("bills")
        .withIndex("by_clinic_and_status", (q) =>
          q.eq("clinicId", clinicId).eq("status", BILL_STATUS.OVERDUE),
        )
        .collect(),
    ])

    const allOutstanding = [...pendingBills, ...overdueBills].sort(
      (a, b) => b.totalAmount - a.totalAmount,
    )

    const now = Date.now()

    return Promise.all(
      allOutstanding.map(async (bill) => {
        const patient = await ctx.db.get(bill.patientId)
        return {
          _id: bill._id,
          patientName: patient
            ? buildPatientFullName(patient.surname, patient.otherNames)
            : "Unknown Patient",
          hmoName: patient?.hmoName ?? null,
          totalAmount: bill.totalAmount,
          status: bill.status,
          daysOutstanding: daysOutstanding(bill.createdAt, now),
          paymentLink: bill.paymentLink ?? null,
          createdAt: bill.createdAt,
        }
      }),
    )
  },
})
