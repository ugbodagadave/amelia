import { describe, expect, test } from "bun:test"
import { ROUTES } from "../src/constants/routes"

describe("Public route constants", () => {
  test("all new public routes are defined and unique", () => {
    const values = [
      ROUTES.REVENUE_CYCLE,
      ROUTES.HMO_MANAGEMENT,
      ROUTES.CLAIMS_PROCESSING,
      ROUTES.PRIVACY_POLICY,
      ROUTES.TERMS_OF_SERVICE,
      ROUTES.CLINICAL_ETHICS,
      ROUTES.SECURITY_WHITEPAPER,
    ]

    expect(new Set(values).size).toBe(values.length)

    for (const route of values) {
      expect(route).toMatch(/^\//)
    }
  })
})

describe("Public page wiring", () => {
  test("App registers all public information routes", async () => {
    const source = await Bun.file("./src/App.tsx").text()

    expect(source).toContain('ROUTES.REVENUE_CYCLE')
    expect(source).toContain('pageId="revenueCycle"')
    expect(source).toContain('ROUTES.HMO_MANAGEMENT')
    expect(source).toContain('pageId="hmoManagement"')
    expect(source).toContain('ROUTES.CLAIMS_PROCESSING')
    expect(source).toContain('pageId="claimsProcessing"')
    expect(source).toContain('ROUTES.PRIVACY_POLICY')
    expect(source).toContain('pageId="privacyPolicy"')
    expect(source).toContain('ROUTES.TERMS_OF_SERVICE')
    expect(source).toContain('pageId="termsOfService"')
    expect(source).toContain('ROUTES.CLINICAL_ETHICS')
    expect(source).toContain('pageId="clinicalEthics"')
    expect(source).toContain('ROUTES.SECURITY_WHITEPAPER')
    expect(source).toContain('pageId="securityWhitepaper"')
  })

  test("landing page exposes hackathon attribution and real public links", async () => {
    const source = await Bun.file("./src/pages/Landing.tsx").text()
    const publicContentSource = await Bun.file("./src/lib/publicContent.ts").text()

    expect(source).toContain("HACKATHON_CREDIT")
    expect(publicContentSource).toContain("Built at Interswitch Beyond the Rails Hackathon 2026")
    expect(source).toContain("ROUTES.REVENUE_CYCLE")
    expect(source).toContain("ROUTES.HMO_MANAGEMENT")
    expect(source).toContain("ROUTES.CLAIMS_PROCESSING")
    expect(source).toContain("GOVERNANCE_LINKS")
    expect(source).not.toContain('href="#"')
    expect(source).toContain("LinkGroupCard")
    expect(source).toContain("PublicFooter")
    expect(source).not.toContain("you are building")
  })

  test("public content includes all governance and product page labels", async () => {
    const source = await Bun.file("./src/lib/publicContent.ts").text()
    const publicPageSource = await Bun.file("./src/pages/PublicPage.tsx").text()

    expect(source).toContain('title: "Revenue Cycle"')
    expect(source).toContain('title: "HMO Management"')
    expect(source).toContain('title: "Claims Processing"')
    expect(source).toContain('title: "Privacy Policy"')
    expect(source).toContain('title: "Terms of Service"')
    expect(source).toContain('title: "Clinical Ethics"')
    expect(source).toContain('title: "Security Whitepaper"')
    expect(source).toContain("HACKATHON_MARKER_VARIATIONS")
    expect(publicPageSource).not.toContain("Why This Page Exists")
  })
})
