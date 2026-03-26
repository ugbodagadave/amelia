import { describe, expect, test } from "bun:test"

describe("Brand assets and browser metadata", () => {
  test("index.html points favicon links to the Amelia logo mark", async () => {
    const source = await Bun.file("./index.html").text()
    expect(source).toContain('/brand/amelia-logo-mark.svg')
    expect(source).toContain('/brand/favicon-32.png')
    expect(source).toContain('/brand/apple-touch-icon.png')
    expect(source).toContain('rel="icon"')
    expect(source).toContain("AI-Powered Revenue Cycle Management for Nigerian Private Clinics")
  })

  test("app sidebar uses the full logo and logo mark assets", async () => {
    const source = await Bun.file("./src/components/app-sidebar.tsx").text()
    const brandLogoSource = await Bun.file("./src/components/brand/BrandLogo.tsx").text()
    const brandingSource = await Bun.file("./src/lib/branding.ts").text()
    expect(source).toContain('BrandLogo variant="full"')
    expect(source).toContain('BrandLogo variant="mark"')
    expect(brandLogoSource).toContain("BRAND_ASSETS.fullLogo")
    expect(brandLogoSource).toContain("BRAND_ASSETS.logoMark")
    expect(brandingSource).toContain("/brand/amelia-full-logo.svg")
    expect(brandingSource).toContain("/brand/amelia-logo-mark.svg")
  })

  test("sign-in and sign-up pages use Amelia logo assets instead of text-only branding", async () => {
    const signInSource = await Bun.file("./src/pages/SignIn.tsx").text()
    const signUpSource = await Bun.file("./src/pages/SignUp.tsx").text()

    expect(signInSource).toContain('<BrandLogo variant="full" />')
    expect(signInSource).toContain('<BrandLogo variant="mark" />')
    expect(signUpSource).toContain('<BrandLogo variant="full" />')
    expect(signUpSource).toContain('<BrandLogo variant="mark" />')
  })
})

describe("Document title helpers", () => {
  test("branding helper exports the default Amelia app description", async () => {
    const source = await Bun.file("./src/lib/branding.ts").text()
    expect(source).toContain("AI-Powered Revenue Cycle Management for Nigerian Private Clinics")
  })

  test("branding helper builds public and app page titles with the expected separators", async () => {
    const { getDocumentTitleForPath } = await import("../src/lib/branding")

    expect(getDocumentTitleForPath("/sign-in")).toBe("Amelia - Sign In")
    expect(getDocumentTitleForPath("/dashboard")).toBe("Amelia | Dashboard")
    expect(getDocumentTitleForPath("/analytics")).toBe("Amelia | Analytics")
    expect(getDocumentTitleForPath("/patients/abc")).toBe("Amelia | Patient Profile")
    expect(getDocumentTitleForPath("/")).toBe(
      "Amelia - AI-Powered Revenue Cycle Management for Nigerian Private Clinics",
    )
  })

  test("App mounts a centralized document title manager inside the router", async () => {
    const source = await Bun.file("./src/App.tsx").text()
    expect(source).toContain("DocumentTitleManager")
    expect(source).toContain("<DocumentTitleManager />")
  })
})

describe("In-app logo sizing", () => {
  test("brand size tokens render the logo smaller than the raw asset artboard", async () => {
    const source = await Bun.file("./src/index.css").text()
    expect(source).toContain("--brand-logo-full-width: 156px;")
    expect(source).toContain("--brand-logo-full-height: 42px;")
    expect(source).toContain("--brand-logo-mark-size: 18px;")
  })

  test("sidebar logo layout centers the collapsed mark and uses a compact expanded header", async () => {
    const source = await Bun.file("./src/components/app-sidebar.tsx").text()
    expect(source).toContain('flex h-12 items-center px-3')
    expect(source).toContain('className="flex size-8 items-center justify-center"')
    expect(source).toContain('flex h-12 items-center justify-center px-0')
  })
})
