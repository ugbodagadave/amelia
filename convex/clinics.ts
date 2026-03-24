import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { DEFAULT_HMO_TEMPLATES, DEFAULT_SERVICE_CATALOG } from "../src/lib/clinicOnboarding"
import { requireClerkUserId } from "./lib/auth"

export const getCurrentClinic = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireClerkUserId(ctx)

    return await ctx.db
      .query("clinics")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("createdByClerkUserId", clerkUserId),
      )
      .unique()
  },
})

export const needsOnboarding = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const clerkUserId = await requireClerkUserId(ctx)
    const clinic = await ctx.db
      .query("clinics")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("createdByClerkUserId", clerkUserId),
      )
      .unique()

    return clinic === null
  },
})

export const createClinic = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    nhiaFacilityCode: v.string(),
    phone: v.string(),
    email: v.string(),
    medicalDirectorName: v.string(),
  },
  returns: v.object({ clinicId: v.id("clinics") }),
  handler: async (ctx, args) => {
    const clerkUserId = await requireClerkUserId(ctx)
    const existingClinic = await ctx.db
      .query("clinics")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("createdByClerkUserId", clerkUserId),
      )
      .unique()

    if (existingClinic) {
      throw new ConvexError({
        code: "CLINIC_EXISTS",
        message: "This user already has a clinic profile.",
      })
    }

    const timestamp = Date.now()
    const clinicId = await ctx.db.insert("clinics", {
      ...args,
      createdByClerkUserId: clerkUserId,
      createdAt: timestamp,
    })

    for (const service of DEFAULT_SERVICE_CATALOG) {
      await ctx.db.insert("service_catalog", {
        clinicId,
        ...service,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }

    for (const template of DEFAULT_HMO_TEMPLATES) {
      await ctx.db.insert("hmo_templates", {
        clinicId,
        ...template,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }

    return { clinicId }
  },
})
