import { expect, test } from "bun:test"

test("convex/clinics.ts exposes the editable clinic settings mutation", async () => {
  const source = await Bun.file("./convex/clinics.ts").text()

  expect(source).toContain("export const updateCurrentClinic")
  expect(source).toContain("validateClinicOnboardingInput")
  expect(source).toContain("fieldErrors")
  expect(source).toContain("accountName")
  expect(source).toContain("nhiaFacilityCode")
})

test("settings sections are split into modular components", async () => {
  const pageSource = await Bun.file("./src/pages/Settings.tsx").text()

  expect(pageSource).toContain("SettingsTabsShell")
  expect(pageSource).not.toContain("Service catalog</CardTitle>")
  expect(pageSource).not.toContain("HMO Directory</CardTitle>")
})

test("settings and patient-facing views avoid implementation-facing helper copy", async () => {
  const [tabsShellSource, generalSettingsSource, hmoSettingsSource, patientProfileSource, claimsSource] =
    await Promise.all([
      Bun.file("./src/components/settings/SettingsTabsShell.tsx").text(),
      Bun.file("./src/components/settings/GeneralClinicSettingsSection.tsx").text(),
      Bun.file("./src/components/settings/HmoDirectorySettingsSection.tsx").text(),
      Bun.file("./src/pages/PatientProfile.tsx").text(),
      Bun.file("./src/pages/Claims.tsx").text(),
    ])

  expect(tabsShellSource).not.toContain(
    "Manage clinic configuration, payer references, and billing defaults from one workspace.",
  )
  expect(generalSettingsSource).not.toContain(
    "Changes update the live clinic profile stored in Convex.",
  )
  expect(generalSettingsSource).not.toContain("Keep the clinic profile current.")
  expect(generalSettingsSource).not.toContain("Clinic identity")
  expect(hmoSettingsSource).not.toContain(
    "Read-only reference for the payer directory that powers clinic dropdowns and OCR name matching.",
  )
  expect(hmoSettingsSource).not.toContain(
    "This is the exact read-only directory currently available to this clinic in the patient registration flow.",
  )
  expect(hmoSettingsSource).not.toContain(
    "This is the shipped canonical directory Amelia uses during onboarding and one-time bootstrap.",
  )
  expect(patientProfileSource).not.toContain(
    "Dynamic HMO identifiers captured during registration stay with the patient record.",
  )
  expect(patientProfileSource).not.toContain(
    "This tab becomes the handoff point into the Phase 3 bill builder.",
  )
  expect(patientProfileSource).not.toContain("Billing unlocks in Phase 3.")
  expect(claimsSource).not.toContain(
    "Scores combine hard validation checks with advisory AI warnings when Groq scoring is available.",
  )
})

test("general settings keeps the settlement bank control full-width and usable", async () => {
  const source = await Bun.file("./src/components/settings/GeneralClinicSettingsSection.tsx").text()

  expect(source).toContain('<SelectTrigger className="w-full"')
  expect(source).toContain('placeholder="Select bank"')
  expect(source).toContain("../../../data/nigerian-banks")
  expect(source).toContain("ScrollArea")
})
