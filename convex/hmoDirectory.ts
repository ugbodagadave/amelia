import { internalMutation } from "./_generated/server"
import { v } from "convex/values"

import { mergeDirectoryIntoTemplates } from "../src/lib/hmoDirectory"
import { HMO_DIRECTORY_SEED_RECORDS } from "../src/lib/hmoDirectorySeed"

const directoryRecordValidator = v.object({
  canonicalHmoName: v.string(),
  aliases: v.array(v.string()),
  website: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  address: v.optional(v.string()),
  sourceUrls: v.array(v.string()),
  sourceType: v.union(v.literal("nhia"), v.literal("hmo_website"), v.literal("manual")),
  directoryConfidence: v.union(v.literal("high"), v.literal("medium"), v.literal("manual")),
  tpaName: v.optional(v.string()),
  tpaEmail: v.optional(v.string()),
  tpaPhone: v.optional(v.string()),
  notes: v.optional(v.string()),
})

function normalizeHmoKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
}

export const backfillDirectoryForAllClinics = internalMutation({
  args: {
    records: v.array(directoryRecordValidator),
  },
  returns: v.object({
    clinicsUpdated: v.number(),
    templatesInserted: v.number(),
    templatesPatched: v.number(),
  }),
  handler: async (ctx, args) => {
    const clinics = await ctx.db.query("clinics").collect()
    let templatesInserted = 0
    let templatesPatched = 0

    for (const clinic of clinics) {
      const existingTemplates = await ctx.db
        .query("hmo_templates")
        .withIndex("by_clinic", (q) => q.eq("clinicId", clinic._id))
        .collect()

      const mergedTemplates = mergeDirectoryIntoTemplates(existingTemplates, args.records)
      const existingByKey = new Map(
        existingTemplates.map((template) => [normalizeHmoKey(template.hmoName), template] as const),
      )

      for (const template of mergedTemplates) {
        const existing = existingByKey.get(normalizeHmoKey(template.hmoName))

        if (existing) {
          await ctx.db.patch(existing._id, {
            hmoName: template.hmoName,
            aliases: template.aliases,
            website: template.website,
            contactEmail: template.contactEmail,
            contactPhone: template.contactPhone,
            address: template.address,
            sourceUrls: template.sourceUrls,
            directorySourceType: template.directorySourceType,
            directoryConfidence: template.directoryConfidence,
            directoryUpdatedAt: template.directoryUpdatedAt,
            tpaName: template.tpaName,
            tpaEmail: template.tpaEmail,
            tpaPhone: template.tpaPhone,
            additionalFields: template.additionalFields,
            formLayoutConfig: template.formLayoutConfig,
            updatedAt: Date.now(),
          })
          templatesPatched += 1
          continue
        }

        const timestamp = Date.now()
        await ctx.db.insert("hmo_templates", {
          clinicId: clinic._id,
          hmoName: template.hmoName,
          aliases: template.aliases,
          website: template.website,
          contactEmail: template.contactEmail,
          contactPhone: template.contactPhone,
          address: template.address,
          sourceUrls: template.sourceUrls,
          directorySourceType: template.directorySourceType,
          directoryConfidence: template.directoryConfidence,
          directoryUpdatedAt: template.directoryUpdatedAt ?? timestamp,
          tpaName: template.tpaName,
          tpaEmail: template.tpaEmail,
          tpaPhone: template.tpaPhone,
          additionalFields: template.additionalFields,
          formLayoutConfig: template.formLayoutConfig,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        templatesInserted += 1
      }
    }

    return {
      clinicsUpdated: clinics.length,
      templatesInserted,
      templatesPatched,
    }
  },
})

export const backfillSeedDirectoryForAllClinics = internalMutation({
  args: {},
  returns: v.object({
    clinicsUpdated: v.number(),
    templatesInserted: v.number(),
    templatesPatched: v.number(),
  }),
  handler: async (ctx) => {
    const clinics = await ctx.db.query("clinics").collect()
    let templatesInserted = 0
    let templatesPatched = 0

    for (const clinic of clinics) {
      const existingTemplates = await ctx.db
        .query("hmo_templates")
        .withIndex("by_clinic", (q) => q.eq("clinicId", clinic._id))
        .collect()

      const mergedTemplates = mergeDirectoryIntoTemplates(existingTemplates, HMO_DIRECTORY_SEED_RECORDS)
      const existingByKey = new Map(
        existingTemplates.map((template) => [normalizeHmoKey(template.hmoName), template] as const),
      )

      for (const template of mergedTemplates) {
        const existing = existingByKey.get(normalizeHmoKey(template.hmoName))

        if (existing) {
          await ctx.db.patch(existing._id, {
            hmoName: template.hmoName,
            aliases: template.aliases,
            website: template.website,
            contactEmail: template.contactEmail,
            contactPhone: template.contactPhone,
            address: template.address,
            sourceUrls: template.sourceUrls,
            directorySourceType: template.directorySourceType,
            directoryConfidence: template.directoryConfidence,
            directoryUpdatedAt: template.directoryUpdatedAt,
            tpaName: template.tpaName,
            tpaEmail: template.tpaEmail,
            tpaPhone: template.tpaPhone,
            additionalFields: template.additionalFields,
            formLayoutConfig: template.formLayoutConfig,
            updatedAt: Date.now(),
          })
          templatesPatched += 1
          continue
        }

        const timestamp = Date.now()
        await ctx.db.insert("hmo_templates", {
          clinicId: clinic._id,
          hmoName: template.hmoName,
          aliases: template.aliases,
          website: template.website,
          contactEmail: template.contactEmail,
          contactPhone: template.contactPhone,
          address: template.address,
          sourceUrls: template.sourceUrls,
          directorySourceType: template.directorySourceType,
          directoryConfidence: template.directoryConfidence,
          directoryUpdatedAt: template.directoryUpdatedAt ?? timestamp,
          tpaName: template.tpaName,
          tpaEmail: template.tpaEmail,
          tpaPhone: template.tpaPhone,
          additionalFields: template.additionalFields,
          formLayoutConfig: template.formLayoutConfig,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        templatesInserted += 1
      }
    }

    return {
      clinicsUpdated: clinics.length,
      templatesInserted,
      templatesPatched,
    }
  },
})
