import { Mistral } from "@mistralai/mistralai"
import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import { action, internalQuery, type ActionCtx, type QueryCtx } from "./_generated/server"
import { requireClerkUserId } from "./lib/auth"
import {
  OCR_SOURCE,
  isSupportedOcrMediaType,
  normalizeExtractedHmoDetails,
  type ExtractHmoDetailsResult,
  type HmoOcrAuditPayload,
} from "../src/lib/ocr"

const MISTRAL_EXTRACTION_MODEL = "mistral-small-latest"

const EXTRACTION_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  jsonSchema: {
    name: "hmo_document_extraction",
    strict: true,
    schemaDefinition: {
      type: "object",
      additionalProperties: false,
      properties: {
        hmoName: { type: "string" },
        memberId: { type: "string" },
        enrolleeName: { type: "string" },
        nhisNumber: { type: "string" },
        authorizationCode: { type: "string" },
        coverageType: { type: "string" },
        coverageLimit: { type: "string" },
        additionalIds: {
          type: "object",
          additionalProperties: { type: "string" },
        },
      },
      required: [
        "hmoName",
        "memberId",
        "enrolleeName",
        "nhisNumber",
        "authorizationCode",
        "coverageType",
        "coverageLimit",
        "additionalIds",
      ],
    },
  },
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new ConvexError({
      code: "ENV_MISSING",
      message: `${name} is not configured for this deployment.`,
    })
  }

  return value
}

async function getCurrentClinicForAction(ctx: ActionCtx) {
  const clerkUserId = await requireClerkUserId(ctx)
  const clinic = await ctx.runQuery(internal.ocr.getClinicByClerkUserId, { clerkUserId })

  if (!clinic) {
    throw new ConvexError({
      code: "CLINIC_NOT_FOUND",
      message: "Complete onboarding before using OCR features.",
    })
  }

  return clinic
}

function decodeBase64ToUint8Array(base64Data: string) {
  const normalized = base64Data.replace(/^data:[^;]+;base64,/, "").trim()

  if (!normalized) {
    throw new ConvexError({
      code: "INVALID_FILE",
      message: "Upload a non-empty file before extracting details.",
    })
  }

  const binaryString = atob(normalized)
  return Uint8Array.from(binaryString, (character) => character.charCodeAt(0))
}

function readMessageText(content: unknown) {
  if (typeof content === "string") {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .flatMap((chunk) => {
        if (
          typeof chunk === "object" &&
          chunk !== null &&
          "type" in chunk &&
          "text" in chunk &&
          (chunk as { type?: string }).type === "text"
        ) {
          return [String((chunk as { text: string }).text)]
        }

        return []
      })
      .join("\n")
  }

  return ""
}

export const getClinicByClerkUserId = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db
      .query("clinics")
      .withIndex("by_clerk_user_id", (q) => q.eq("createdByClerkUserId", args.clerkUserId))
      .unique()
  },
})

export const extractHmoDetails = action({
  args: {
    base64Data: v.string(),
    mediaType: v.string(),
    fileName: v.string(),
    source: v.union(
      v.literal(OCR_SOURCE.PATIENT_REGISTRATION),
      v.literal(OCR_SOURCE.BILL_BUILDER),
    ),
  },
  handler: async (ctx, args): Promise<ExtractHmoDetailsResult> => {
    await getCurrentClinicForAction(ctx)

    if (!isSupportedOcrMediaType(args.mediaType)) {
      throw new ConvexError({
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Only JPEG, PNG, WebP, and PDF files are supported for OCR.",
      })
    }

    const client = new Mistral({
      apiKey: requireEnv("MISTRAL_API_KEY"),
    })

    const uploadedFile = await client.files.upload({
      file: {
        fileName: args.fileName,
        content: decodeBase64ToUint8Array(args.base64Data),
      },
      purpose: "ocr",
    })

    const ocrResponse = await client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "file",
        fileId: uploadedFile.id,
      },
    })

    const markdown = ocrResponse.pages.map((page) => page.markdown ?? "").join("\n\n").trim()
    const extractionResponse = await client.chat.complete({
      model: MISTRAL_EXTRACTION_MODEL,
      messages: [
        {
          role: "system",
          content: [
            "You extract structured fields from Nigerian HMO cards and pre-authorization documents.",
            "Return only verified values from the OCR markdown.",
            "Use empty strings for any missing scalar field.",
            "Use an empty object for additionalIds when nothing else is found.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            "Extract the insurer, member identifiers, authorization details, and any extra IDs.",
            "Document markdown:",
            markdown,
          ].join("\n\n"),
        },
      ],
      responseFormat: EXTRACTION_RESPONSE_FORMAT,
    })

    const extractionContent = readMessageText(extractionResponse.choices[0]?.message?.content)
    const extracted = normalizeExtractedHmoDetails(
      extractionContent ? (JSON.parse(extractionContent) as Record<string, unknown>) : {},
    )

    const audit: HmoOcrAuditPayload = {
      source: args.source,
      fileName: args.fileName,
      mediaType: args.mediaType,
      extractedAt: Date.now(),
      responseId: uploadedFile.id,
      pagesProcessed: ocrResponse.usageInfo.pagesProcessed ?? ocrResponse.pages.length,
      markdown,
      extracted,
      rawResponse: JSON.stringify(ocrResponse),
    }

    return {
      extracted,
      audit,
    }
  },
})
