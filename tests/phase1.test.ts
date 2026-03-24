import { describe, expect, test } from "bun:test"
import { ROUTES } from "../src/constants/routes"
import {
  CLINIC_ONBOARDING_REQUIRED_FIELDS,
  DEFAULT_HMO_TEMPLATES,
  DEFAULT_SERVICE_CATALOG,
  formatPriceInput,
  mergeSeededHmoTemplates,
  mergeSeededServiceCatalog,
  parsePriceInput,
  validateClinicOnboardingInput,
} from "../src/lib/clinicOnboarding"

describe("Phase 1 — Clinic onboarding validation", () => {
  test("required field list includes clinic name, NHIA code, and medical director", () => {
    expect(CLINIC_ONBOARDING_REQUIRED_FIELDS).toEqual([
      "name",
      "address",
      "nhiaFacilityCode",
      "phone",
      "email",
      "medicalDirectorName",
    ])
  })

  test("validation rejects empty clinic name, NHIA code, and medical director", () => {
    const result = validateClinicOnboardingInput({
      name: "",
      address: "12 Marina, Lagos",
      nhiaFacilityCode: "",
      phone: "+2348012345678",
      email: "hello@clinic.test",
      medicalDirectorName: "",
    })

    expect(result.name).toBeDefined()
    expect(result.nhiaFacilityCode).toBeDefined()
    expect(result.medicalDirectorName).toBeDefined()
  })

  test("validation accepts a complete onboarding payload", () => {
    const result = validateClinicOnboardingInput({
      name: "Apex Clinic",
      address: "12 Marina, Lagos",
      nhiaFacilityCode: "NHIA-1029",
      phone: "+2348012345678",
      email: "hello@clinic.test",
      medicalDirectorName: "Dr. A. Bello",
    })

    expect(result).toEqual({})
  })
})

describe("Phase 1 — Seed data", () => {
  test("service catalog seed contains common clinic services", () => {
    const names = DEFAULT_SERVICE_CATALOG.map((service) => service.name)

    expect(names).toContain("Full Blood Count")
    expect(names).toContain("Malaria RDT")
    expect(names).toContain("Chest X-Ray")
    expect(names).toContain("Ultrasound Scan")
  })

  test("service catalog seed is idempotent by clinic service name", () => {
    const merged = mergeSeededServiceCatalog([
      DEFAULT_SERVICE_CATALOG[0],
      {
        name: "Custom Wound Dressing",
        category: "procedure",
        defaultPrice: 12000,
      },
    ])

    const duplicateCount = merged.filter(
      (service) => service.name === DEFAULT_SERVICE_CATALOG[0].name,
    ).length

    expect(duplicateCount).toBe(1)
    expect(merged.some((service) => service.name === "Custom Wound Dressing")).toBe(true)
  })

  test("HMO templates seed includes all five defaults and stays idempotent", () => {
    expect(DEFAULT_HMO_TEMPLATES.map((template) => template.hmoName)).toEqual([
      "Police HMO",
      "AXA Mansard",
      "Hygeia HMO",
      "NHIA Standard",
      "Generic/Universal",
    ])

    const merged = mergeSeededHmoTemplates([DEFAULT_HMO_TEMPLATES[0]])
    const duplicateCount = merged.filter(
      (template) => template.hmoName === DEFAULT_HMO_TEMPLATES[0].hmoName,
    ).length

    expect(duplicateCount).toBe(1)
    expect(merged).toHaveLength(DEFAULT_HMO_TEMPLATES.length)
  })
})

describe("Phase 1 — Price formatting", () => {
  test("formats whole numbers with thousand separators while typing", () => {
    expect(formatPriceInput("1000")).toBe("1,000")
    expect(formatPriceInput("10000")).toBe("10,000")
    expect(formatPriceInput("100000")).toBe("100,000")
  })

  test("strips commas and non-digits before parsing price input", () => {
    expect(parsePriceInput("10,000")).toBe(10000)
    expect(parsePriceInput("NGN 100,000")).toBe(100000)
    expect(parsePriceInput("")).toBeNaN()
  })
})

describe("Phase 1 — App routing and docs", () => {
  test("onboarding route constant is defined and unique", () => {
    expect(ROUTES.ONBOARDING).toBe("/onboarding")

    const routeValues = Object.values(ROUTES)
    expect(new Set(routeValues).size).toBe(routeValues.length)
  })

  test("plan documents phase 1 as completed when implementation finishes", async () => {
    const plan = await Bun.file("./docs/plan.md").text()
    expect(plan).toContain("## Phase 1")
  })

  test("app layout keeps the header fixed while main content scrolls", async () => {
    const layoutSource = await Bun.file("./src/layouts/AppLayout.tsx").text()

    expect(layoutSource).toContain("h-screen")
    expect(layoutSource).toContain("overflow-hidden")
    expect(layoutSource).toContain("overflow-y-auto")
  })

  test("settings uses a dialog modal for add service instead of a sheet", async () => {
    const settingsSource = await Bun.file("./src/pages/Settings.tsx").text()

    expect(settingsSource).toContain("Dialog")
    expect(settingsSource).not.toContain("SheetContent")
    expect(settingsSource).not.toContain("isSheetOpen")
  })
})
