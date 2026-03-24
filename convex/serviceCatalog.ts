import { ConvexError, v } from "convex/values"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { requireClerkUserId } from "./lib/auth"

async function getCurrentClinicId(ctx: MutationCtx | QueryCtx) {
  const clerkUserId = await requireClerkUserId(ctx)
  const clinic = await ctx.db
    .query("clinics")
    .withIndex("by_clerk_user_id", (q) => q.eq("createdByClerkUserId", clerkUserId))
    .unique()

  if (!clinic) {
    throw new ConvexError({
      code: "CLINIC_NOT_FOUND",
      message: "Complete onboarding before managing your service catalog.",
    })
  }

  return clinic._id
}

export const listForClinic = query({
  args: {},
  handler: async (ctx) => {
    const clinicId = await getCurrentClinicId(ctx)

    return await ctx.db
      .query("service_catalog")
      .withIndex("by_clinic", (q) => q.eq("clinicId", clinicId))
      .collect()
  },
})

export const upsertService = mutation({
  args: {
    serviceId: v.optional(v.id("service_catalog")),
    name: v.string(),
    category: v.union(
      v.literal("consultation"),
      v.literal("investigation"),
      v.literal("medication"),
      v.literal("procedure"),
    ),
    defaultPrice: v.number(),
  },
  returns: v.id("service_catalog"),
  handler: async (ctx, args) => {
    const clinicId = await getCurrentClinicId(ctx)
    const timestamp = Date.now()

    if (args.serviceId) {
      const existingService = await ctx.db.get(args.serviceId)
      if (!existingService || existingService.clinicId !== clinicId) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Service not found for this clinic.",
        })
      }

      await ctx.db.patch(args.serviceId, {
        name: args.name,
        category: args.category,
        defaultPrice: args.defaultPrice,
        updatedAt: timestamp,
      })

      return args.serviceId
    }

    return await ctx.db.insert("service_catalog", {
      clinicId,
      name: args.name,
      category: args.category,
      defaultPrice: args.defaultPrice,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  },
})

export const removeService = mutation({
  args: { serviceId: v.id("service_catalog") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const clinicId = await getCurrentClinicId(ctx)
    const service = await ctx.db.get(args.serviceId)

    if (!service || service.clinicId !== clinicId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Service not found for this clinic.",
      })
    }

    await ctx.db.delete(args.serviceId)
    return null
  },
})
