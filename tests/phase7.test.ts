import { describe, expect, test } from "bun:test"

import {
  OCR_SOURCE,
  buildHmoCoverageSnapshotFromOcr,
  isSupportedOcrMediaType,
  matchHmoTemplateName,
  mergeBillAuthorizationCodeWithOcr,
  mergePatientFormWithOcr,
  normalizeExtractedHmoDetails,
} from "../src/lib/ocr"
import { DEFAULT_HMO_TEMPLATES } from "../src/lib/clinicOnboarding"
import type { PatientFormInput } from "../src/lib/patients"

const BASE_PATIENT_FORM: PatientFormInput = {
  surname: "",
  otherNames: "",
  dateOfBirth: "",
  sex: "male",
  phone: "",
  nin: "",
  paymentType: "self_pay",
  hmoName: "",
  enrolleeNhisNo: "",
  hmoAdditionalFields: [],
}

describe("Phase 7 - OCR helpers", () => {
  test("accepts the supported OCR media types", () => {
    expect(isSupportedOcrMediaType("application/pdf")).toBe(true)
    expect(isSupportedOcrMediaType("image/jpeg")).toBe(true)
    expect(isSupportedOcrMediaType("image/png")).toBe(true)
    expect(isSupportedOcrMediaType("image/webp")).toBe(true)
    expect(isSupportedOcrMediaType("image/gif")).toBe(false)
  })

  test("normalizes missing OCR fields to empty strings and objects", () => {
    expect(
      normalizeExtractedHmoDetails({
        hmoName: undefined,
        memberId: null as never,
        coverageLimit: 250000 as never,
        additionalIds: null as never,
      }),
    ).toEqual({
      hmoName: "",
      memberId: "",
      enrolleeName: "",
      nhisNumber: "",
      authorizationCode: "",
      coverageType: "",
      coverageLimit: "250000",
      additionalIds: {},
    })
  })

  test("matches HMO names case-insensitively and punctuation-insensitively", () => {
    const match = matchHmoTemplateName("hygeia-hmo", DEFAULT_HMO_TEMPLATES)
    expect(match?.hmoName).toBe("Hygeia HMO")
  })

  test("patient OCR autofill does not overwrite manually entered fields", () => {
    const result = mergePatientFormWithOcr(
      {
        ...BASE_PATIENT_FORM,
        paymentType: "hmo",
        hmoName: "Police HMO",
        enrolleeNhisNo: "STAFF-LOCKED",
        hmoAdditionalFields: [
          {
            fieldKey: "forceNumber",
            label: "Force No.",
            value: "FORCE-7781",
          },
        ],
      },
      {
        hmoName: "Police HMO",
        memberId: "",
        enrolleeName: "Chukwudi Eze",
        nhisNumber: "PHML-4421",
        authorizationCode: "AUTH-7781",
        coverageType: "",
        coverageLimit: "",
        additionalIds: {
          force_no: "FORCE-9999",
        },
      },
      DEFAULT_HMO_TEMPLATES,
    )

    expect(result.nextForm.enrolleeNhisNo).toBe("STAFF-LOCKED")
    expect(result.nextForm.hmoAdditionalFields[0]?.value).toBe("FORCE-7781")
    expect(result.skippedFields).toContain("enrolleeNhisNo")
    expect(result.skippedFields).toContain("hmoAdditionalFields.forceNumber")
  })

  test("patient OCR autofill can promote a self-pay draft into HMO mode and match template fields", () => {
    const result = mergePatientFormWithOcr(
      BASE_PATIENT_FORM,
      {
        hmoName: "Police Health Maintenance Limited",
        memberId: "",
        enrolleeName: "Chukwudi Eze",
        nhisNumber: "PHML-4421",
        authorizationCode: "AUTH-7781",
        coverageType: "",
        coverageLimit: "",
        additionalIds: {
          force_no: "PN-34521",
          ap_no: "AP-0182",
        },
      },
      DEFAULT_HMO_TEMPLATES,
    )

    expect(result.nextForm.paymentType).toBe("hmo")
    expect(result.nextForm.hmoName).toBe("Police HMO")
    expect(result.nextForm.enrolleeNhisNo).toBe("PHML-4421")
    expect(result.nextForm.hmoAdditionalFields).toEqual([
      {
        fieldKey: "forceNumber",
        label: "Force No.",
        value: "PN-34521",
      },
      {
        fieldKey: "authorizationPaperNumber",
        label: "AP No.",
        value: "AP-0182",
      },
    ])
  })

  test("bill OCR autofill does not overwrite a manually entered authorization code", () => {
    expect(mergeBillAuthorizationCodeWithOcr("AUTH-MANUAL", "AUTH-OCR")).toEqual({
      authorizationCode: "AUTH-MANUAL",
      suggestedAuthorizationCode: "AUTH-OCR",
      applied: false,
    })
  })

  test("bill OCR autofill can fill an empty authorization code", () => {
    expect(mergeBillAuthorizationCodeWithOcr("", "AUTH-OCR")).toEqual({
      authorizationCode: "AUTH-OCR",
      suggestedAuthorizationCode: "",
      applied: true,
    })
  })

  test("builds a persisted HMO coverage snapshot from OCR audit metadata", () => {
    const snapshot = buildHmoCoverageSnapshotFromOcr("patient_123", "Police HMO", {
      source: OCR_SOURCE.PATIENT_REGISTRATION,
      fileName: "police-card.jpg",
      mediaType: "image/jpeg",
      extractedAt: 1710000000000,
      responseId: "ocr_123",
      pagesProcessed: 1,
      markdown: "raw markdown",
      rawResponse: "{\"id\":\"ocr_123\"}",
      extracted: {
        hmoName: "Police HMO",
        memberId: "MEM-22",
        enrolleeName: "Chukwudi Eze",
        nhisNumber: "PHML-4421",
        authorizationCode: "AUTH-7781",
        coverageType: "Comprehensive",
        coverageLimit: "₦250,000",
        additionalIds: {
          force_no: "PN-34521",
        },
      },
    })

    expect(snapshot.coverageLimit).toBe(250000)
    expect(snapshot.authorizationCode).toBe("AUTH-7781")
    expect(snapshot.additionalIds).toEqual([{ key: "force_no", value: "PN-34521" }])
    expect(snapshot.rawOcrData).toContain("\"responseId\":\"ocr_123\"")
  })
})

describe("Phase 7 - Source integration", () => {
  test("wires OCR helpers, Convex OCR action, and both form pages", async () => {
    const packageSource = await Bun.file("./package.json").text()
    const ocrLibSource = await Bun.file("./src/lib/ocr.ts").text()
    const patientsPageSource = await Bun.file("./src/pages/Patients.tsx").text()
    const billBuilderSource = await Bun.file("./src/pages/BillBuilder.tsx").text()
    const patientsConvexSource = await Bun.file("./convex/patients.ts").text()
    const schemaSource = await Bun.file("./convex/schema.ts").text()
    const planSource = await Bun.file("./docs/plan.md").text()

    expect(packageSource).toContain("@mistralai/mistralai")
    expect(ocrLibSource).toContain("mistral-ocr-latest")
    expect(ocrLibSource).toContain("mergePatientFormWithOcr")
    expect(ocrLibSource).toContain("mergeBillAuthorizationCodeWithOcr")
    expect(schemaSource).toContain("rawOcrData")
    expect(patientsConvexSource).toContain("hmo_coverages")
    expect(planSource).toContain("latest-snapshot record per patient")
    expect(planSource).toContain("Bill Creation OCR is assistive only")

    expect(await Bun.file("./convex/ocr.ts").exists()).toBe(true)
    const convexOcrSource = await Bun.file("./convex/ocr.ts").text()
    expect(convexOcrSource).toContain("extractHmoDetails")
    expect(convexOcrSource).toContain("Mistral")
    expect(convexOcrSource).toContain("mistral-ocr-latest")
    expect(convexOcrSource).toContain("client.ocr.process")

    expect(await Bun.file("./src/components/ocr/HmoDocumentOcrCard.tsx").exists()).toBe(true)
    const ocrComponentSource = await Bun.file("./src/components/ocr/HmoDocumentOcrCard.tsx").text()
    expect(ocrComponentSource).toContain("Extract details")
    expect(ocrComponentSource).toContain("application/pdf")

    expect(patientsPageSource).toContain("api.ocr.extractHmoDetails")
    expect(patientsPageSource).toContain("HmoDocumentOcrCard")
    expect(patientsPageSource).toContain("buildHmoCoverageSnapshotFromOcr")
    expect(billBuilderSource).toContain("api.ocr.extractHmoDetails")
    expect(billBuilderSource).toContain("mergeBillAuthorizationCodeWithOcr")
    expect(billBuilderSource).toContain("HmoDocumentOcrCard")
  })
})
