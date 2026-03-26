import { ConvexError, v } from "convex/values"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import {
  DEFAULT_HMO_TEMPLATES,
  DEFAULT_SERVICE_CATALOG,
  validateClinicOnboardingInput,
} from "../src/lib/clinicOnboarding"
import { mergeDirectoryIntoTemplates } from "../src/lib/hmoDirectory"
import { HMO_DIRECTORY_SEED_RECORDS } from "../src/lib/hmoDirectorySeed"
import { requireClerkUserId } from "./lib/auth"

async function getClinicForCurrentUser(
  ctx: MutationCtx | QueryCtx,
) {
  const clerkUserId = await requireClerkUserId(ctx)
  const clinic = await ctx.db
    .query("clinics")
    .withIndex("by_clerk_user_id", (q) => q.eq("createdByClerkUserId", clerkUserId))
    .unique()

  return { clinic, clerkUserId }
}

export const getCurrentClinic = query({
  args: {},
  handler: async (ctx) => {
    const { clinic } = await getClinicForCurrentUser(ctx)
    return clinic
  },
})

export const needsOnboarding = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const { clinic } = await getClinicForCurrentUser(ctx)

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
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
  },
  returns: v.object({ clinicId: v.id("clinics") }),
  handler: async (ctx, args) => {
    const { clinic: existingClinic, clerkUserId } = await getClinicForCurrentUser(ctx)

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

    const seededTemplates = mergeDirectoryIntoTemplates(
      DEFAULT_HMO_TEMPLATES,
      HMO_DIRECTORY_SEED_RECORDS,
    )

    for (const template of seededTemplates) {
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

export const updateCurrentClinic = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    nhiaFacilityCode: v.string(),
    phone: v.string(),
    email: v.string(),
    medicalDirectorName: v.string(),
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    bankAccountVerified: v.boolean(),
  },
  returns: v.id("clinics"),
  handler: async (ctx, args) => {
    const { clinic } = await getClinicForCurrentUser(ctx)

    if (!clinic) {
      throw new ConvexError({
        code: "CLINIC_NOT_FOUND",
        message: "Complete onboarding before updating clinic settings.",
      })
    }

    const fieldErrors = validateClinicOnboardingInput(args)
    if (Object.keys(fieldErrors).length > 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Clinic settings are invalid.",
        fieldErrors,
      })
    }

    await ctx.db.patch(clinic._id, {
      name: args.name.trim(),
      address: args.address.trim(),
      nhiaFacilityCode: args.nhiaFacilityCode.trim(),
      phone: args.phone.trim(),
      email: args.email.trim(),
      medicalDirectorName: args.medicalDirectorName.trim(),
      bankCode: args.bankCode.trim(),
      bankName: args.bankName.trim(),
      accountNumber: args.accountNumber.trim(),
      accountName: args.accountName.trim(),
    })

    return clinic._id
  },
})
