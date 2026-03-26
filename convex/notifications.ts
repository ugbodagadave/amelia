import { ConvexError, v } from "convex/values"
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { requireClerkUserId } from "./lib/auth"
import { NOTIFICATION_LIMIT } from "../src/lib/notifications"

async function getCurrentClinic(ctx: MutationCtx | QueryCtx) {
  const clerkUserId = await requireClerkUserId(ctx)
  const clinic = await ctx.db
    .query("clinics")
    .withIndex("by_clerk_user_id", (q) => q.eq("createdByClerkUserId", clerkUserId))
    .unique()

  if (!clinic) {
    throw new ConvexError({
      code: "CLINIC_NOT_FOUND",
      message: "Complete onboarding before viewing notifications.",
    })
  }

  return { clinic, clerkUserId }
}

export const createNotification = internalMutation({
  args: {
    clinicId: v.id("clinics"),
    recipientClerkUserId: v.string(),
    type: v.union(
      v.literal("patient_created"),
      v.literal("bill_created"),
      v.literal("auth_confirmed"),
      v.literal("payment_request_sent"),
      v.literal("payment_request_failed"),
      v.literal("payment_confirmed"),
      v.literal("claim_batch_generated"),
      v.literal("claim_batch_submitted"),
      v.literal("claim_batch_paid"),
      v.literal("claim_batch_overdue"),
    ),
    title: v.string(),
    description: v.string(),
    route: v.string(),
    entityId: v.optional(v.string()),
    entityLabel: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      clinicId: args.clinicId,
      recipientClerkUserId: args.recipientClerkUserId,
      type: args.type,
      title: args.title,
      description: args.description,
      route: args.route,
      entityId: args.entityId,
      entityLabel: args.entityLabel,
      isRead: false,
      readAt: undefined,
      createdAt: args.createdAt ?? Date.now(),
    })
  },
})

export const getRecentNotifications = query({
  args: {},
  handler: async (ctx) => {
    const { clinic, clerkUserId } = await getCurrentClinic(ctx)
    return await ctx.db
      .query("notifications")
      .withIndex("by_recipient_clinic_and_created_at", (q) =>
        q.eq("recipientClerkUserId", clerkUserId).eq("clinicId", clinic._id),
      )
      .order("desc")
      .take(NOTIFICATION_LIMIT)
  },
})

export const getUnreadNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const { clinic, clerkUserId } = await getCurrentClinic(ctx)
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_clinic_and_read_state", (q) =>
        q.eq("recipientClerkUserId", clerkUserId).eq("clinicId", clinic._id).eq("isRead", false),
      )
      .collect()

    return notifications.length
  },
})

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { clinic, clerkUserId } = await getCurrentClinic(ctx)
    const notification = await ctx.db.get(args.notificationId)

    if (
      !notification ||
      notification.clinicId !== clinic._id ||
      notification.recipientClerkUserId !== clerkUserId
    ) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Notification not found for this user.",
      })
    }

    if (!notification.isRead) {
      await ctx.db.patch(args.notificationId, {
        isRead: true,
        readAt: Date.now(),
      })
    }

    return null
  },
})

export const markAllNotificationsRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { clinic, clerkUserId } = await getCurrentClinic(ctx)
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_clinic_and_read_state", (q) =>
        q.eq("recipientClerkUserId", clerkUserId).eq("clinicId", clinic._id).eq("isRead", false),
      )
      .collect()

    const readAt = Date.now()
    for (const notification of notifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt,
      })
    }

    return null
  },
})
