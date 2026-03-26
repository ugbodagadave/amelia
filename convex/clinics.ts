import { ConvexError, v } from "convex/values"
import {
  action,
  internalQuery,
  internalMutation,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import {
  DEFAULT_HMO_TEMPLATES,
  DEFAULT_SERVICE_CATALOG,
  validateClinicOnboardingInput,
} from "../src/lib/clinicOnboarding"
import { mergeDirectoryIntoTemplates } from "../src/lib/hmoDirectory"
import { HMO_DIRECTORY_SEED_RECORDS } from "../src/lib/hmoDirectorySeed"
import { requireClerkUserId } from "./lib/auth"
import { fetchMarketplaceToken, resolveMarketplaceBankAccount } from "./lib/marketplace"

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

async function getClinicForCurrentUserAction(
  ctx: ActionCtx,
): Promise<{ clinic: Doc<"clinics"> | null; clerkUserId: string }> {
  const clerkUserId = await requireClerkUserId(ctx)
  const clinic = (await ctx.runQuery(internal.clinics.getClinicByClerkUserId, {
    clerkUserId,
  })) as Doc<"clinics"> | null

  return { clinic, clerkUserId }
}

async function buildVerifiedClinicPayload(input: {
  name: string
  address: string
  nhiaFacilityCode: string
  phone: string
  email: string
  medicalDirectorName: string
  bankCode: string
  bankName?: string
  accountNumber: string
}) {
  const { access_token } = await fetchMarketplaceToken()
  const bankVerification = await resolveMarketplaceBankAccount({
    accessToken: access_token,
    accountNumber: input.accountNumber,
    bankCode: input.bankCode,
  })

  const payload = {
    name: input.name.trim(),
    address: input.address.trim(),
    nhiaFacilityCode: input.nhiaFacilityCode.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    medicalDirectorName: input.medicalDirectorName.trim(),
    bankCode: input.bankCode.trim(),
    bankName: bankVerification.bankName || input.bankName?.trim() || "",
    accountNumber: input.accountNumber.trim(),
    accountName: bankVerification.accountName,
    bankAccountVerified: Boolean(bankVerification.accountName),
  }

  const fieldErrors = validateClinicOnboardingInput(payload)
  if (Object.keys(fieldErrors).length > 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Clinic settings are invalid.",
      fieldErrors,
    })
  }

  return {
    ...payload,
    bankAccountVerifiedAt: Date.now(),
    bankVerificationProvider: "interswitch_marketplace",
    bankVerificationReference: bankVerification.reference || undefined,
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

export const createClinicRecord = internalMutation({
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
    bankAccountVerifiedAt: v.number(),
    bankVerificationProvider: v.string(),
    bankVerificationReference: v.optional(v.string()),
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
      name: args.name,
      address: args.address,
      nhiaFacilityCode: args.nhiaFacilityCode,
      phone: args.phone,
      email: args.email,
      medicalDirectorName: args.medicalDirectorName,
      bankCode: args.bankCode,
      bankName: args.bankName,
      accountNumber: args.accountNumber,
      accountName: args.accountName,
      bankAccountVerifiedAt: args.bankAccountVerifiedAt,
      bankVerificationProvider: args.bankVerificationProvider,
      bankVerificationReference: args.bankVerificationReference,
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

export const createClinicProfile = action({
  args: {
    name: v.string(),
    address: v.string(),
    nhiaFacilityCode: v.string(),
    phone: v.string(),
    email: v.string(),
    medicalDirectorName: v.string(),
    bankCode: v.string(),
    bankName: v.optional(v.string()),
    accountNumber: v.string(),
    accountName: v.optional(v.string()),
  },
  returns: v.object({ clinicId: v.id("clinics") }),
  handler: async (ctx, args): Promise<{ clinicId: Id<"clinics"> }> => {
    const { clinic } = await getClinicForCurrentUserAction(ctx)

    if (clinic) {
      throw new ConvexError({
        code: "CLINIC_EXISTS",
        message: "This user already has a clinic profile.",
      })
    }

    const payload = await buildVerifiedClinicPayload(args)
    return await ctx.runMutation(internal.clinics.createClinicRecord, payload)
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

export const updateClinicRecord = internalMutation({
  args: {
    clinicId: v.id("clinics"),
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
    bankAccountVerifiedAt: v.number(),
    bankVerificationProvider: v.string(),
    bankVerificationReference: v.optional(v.string()),
  },
  returns: v.id("clinics"),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clinicId, {
      name: args.name,
      address: args.address,
      nhiaFacilityCode: args.nhiaFacilityCode,
      phone: args.phone,
      email: args.email,
      medicalDirectorName: args.medicalDirectorName,
      bankCode: args.bankCode,
      bankName: args.bankName,
      accountNumber: args.accountNumber,
      accountName: args.accountName,
      bankAccountVerifiedAt: args.bankAccountVerifiedAt,
      bankVerificationProvider: args.bankVerificationProvider,
      bankVerificationReference: args.bankVerificationReference,
    })

    return args.clinicId
  },
})

export const updateCurrentClinicProfile = action({
  args: {
    name: v.string(),
    address: v.string(),
    nhiaFacilityCode: v.string(),
    phone: v.string(),
    email: v.string(),
    medicalDirectorName: v.string(),
    bankCode: v.string(),
    bankName: v.optional(v.string()),
    accountNumber: v.string(),
    accountName: v.optional(v.string()),
    bankAccountVerified: v.optional(v.boolean()),
  },
  returns: v.id("clinics"),
  handler: async (ctx, args): Promise<Id<"clinics">> => {
    const { clinic } = await getClinicForCurrentUserAction(ctx)

    if (!clinic) {
      throw new ConvexError({
        code: "CLINIC_NOT_FOUND",
        message: "Complete onboarding before updating clinic settings.",
      })
    }

    const payload = await buildVerifiedClinicPayload(args)
    return await ctx.runMutation(internal.clinics.updateClinicRecord, {
      clinicId: clinic._id,
      ...payload,
    })
  },
})
