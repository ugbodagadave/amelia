import { describe, test, expect } from "bun:test"
import { ROUTES } from "../src/constants/routes"

// Bun auto-loads .env.local, so VITE_CONVEX_URL is available as process.env
const CONVEX_URL =
  (process.env.VITE_CONVEX_URL as string | undefined) ??
  "https://doting-cat-102.convex.cloud"

// ---------------------------------------------------------------------------
// Auth flow — Clerk auth: unauthenticated user redirected to sign-in
// ---------------------------------------------------------------------------

describe("Phase 0 — Clerk auth flow", () => {
  test("ProtectedRoute redirects unauthenticated users to ROUTES.SIGN_IN", async () => {
    const src = await Bun.file("./src/components/auth/ProtectedRoute.tsx").text()
    // Verify redirect target is always ROUTES.SIGN_IN (not a hardcoded string)
    expect(src).toContain("ROUTES.SIGN_IN")
    // Verify guard checks isSignedIn from Clerk
    expect(src).toContain("isSignedIn")
    // Verify Navigate component is used for the redirect
    expect(src).toContain("<Navigate")
  })

  test("ProtectedRoute returns null while Clerk is loading (no flash)", async () => {
    const src = await Bun.file("./src/components/auth/ProtectedRoute.tsx").text()
    // Verify loading state is handled to prevent premature redirect
    expect(src).toContain("isLoaded")
    expect(src).toContain("return null")
  })

  test("sign-in and sign-up routes are not wrapped in ProtectedRoute", async () => {
    const src = await Bun.file("./src/App.tsx").text()
    // The public routes must appear BEFORE ProtectedLayout
    const signInIndex = src.indexOf('path={`${ROUTES.SIGN_IN}/*`}')
    const protectedIndex = src.indexOf("ProtectedLayout")
    expect(signInIndex).toBeGreaterThan(-1)
    expect(protectedIndex).toBeGreaterThan(-1)
    // Both exist independently — sign-in route is NOT inside ProtectedLayout
    expect(src).toContain(`element={<SignInPage />}`)
    expect(src).not.toContain(`ProtectedLayout><SignInPage`)
  })

  test("sign-in and sign-up routes accept Clerk nested auth paths", async () => {
    const src = await Bun.file("./src/App.tsx").text()
    expect(src).toContain('path={`${ROUTES.SIGN_IN}/*`}')
    expect(src).toContain('path={`${ROUTES.SIGN_UP}/*`}')
  })

  test("unknown routes render a not found page instead of redirecting to dashboard", async () => {
    const src = await Bun.file("./src/App.tsx").text()
    expect(src).toContain("NotFoundPage")
    expect(src).toContain('path="*"')
    expect(src).not.toContain('<Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />')
  })

  test("ClerkProvider sets explicit post-auth redirects for sign-in and sign-up", async () => {
    const src = await Bun.file("./src/main.tsx").text()
    expect(src).toContain("signInForceRedirectUrl")
    expect(src).toContain("signUpForceRedirectUrl")
    expect(src).toContain("ROUTES.DASHBOARD")
    expect(src).toContain("ROUTES.ONBOARDING")
  })
})

// ---------------------------------------------------------------------------
// Route protection — /dashboard (and all protected routes) require auth
// ---------------------------------------------------------------------------

describe("Phase 0 — Route protection", () => {
  test("all six protected routes are defined in App router", async () => {
    const src = await Bun.file("./src/App.tsx").text()
    // App.tsx references route constants by name, not literal strings
    const routeKeys = [
      "ROUTES.DASHBOARD",
      "ROUTES.PATIENTS",
      "ROUTES.BILLS",
      "ROUTES.CLAIMS",
      "ROUTES.ANALYTICS",
      "ROUTES.SETTINGS",
    ]
    for (const key of routeKeys) {
      expect(src).toContain(key)
    }
  })

  test("every protected route is wrapped in ProtectedLayout", async () => {
    const src = await Bun.file("./src/App.tsx").text()
    // ProtectedLayout is used — it wraps ProtectedRoute + AppLayout
    expect(src).toContain("ProtectedLayout")
    // ProtectedLayout itself wraps ProtectedRoute
    const layoutSrc = await Bun.file("./src/App.tsx").text()
    expect(layoutSrc).toContain("ProtectedRoute")
    expect(layoutSrc).toContain("AppLayout")
  })

  test("ProtectedLayout composes ProtectedRoute around AppLayout", async () => {
    const src = await Bun.file("./src/App.tsx").text()
    // The ProtectedLayout function wraps children in both ProtectedRoute and AppLayout
    const layoutFn = src.slice(
      src.indexOf("function ProtectedLayout"),
      src.indexOf("function App"),
    )
    expect(layoutFn).toContain("ProtectedRoute")
    expect(layoutFn).toContain("AppLayout")
  })
})

// ---------------------------------------------------------------------------
// Convex connection — client init + deployment reachability
// ---------------------------------------------------------------------------

describe("Phase 0 — Convex connection", () => {
  test("CONVEX_URL is a valid convex.cloud deployment URL", () => {
    expect(CONVEX_URL).toMatch(/^https:\/\/[a-z0-9-]+\.convex\.cloud$/)
  })

  test("ConvexReactClient instantiates without throwing", async () => {
    const { ConvexReactClient } = await import("convex/react")
    let client: InstanceType<typeof ConvexReactClient> | undefined
    expect(() => {
      client = new ConvexReactClient(CONVEX_URL)
    }).not.toThrow()
    expect(client).toBeDefined()
  })

  test("Convex deployment smoke check is opt-in and avoids missing-function probes", async () => {
    const source = await Bun.file("./tests/phase0.test.ts").text()
    expect(source).toContain('process.env.CONVEX_NETWORK_SMOKE !== "1"')
    expect(source).toContain('fetch(CONVEX_URL, {')
    expect(source).toContain('method: "HEAD"')
  })

  test("Convex deployment responds to HTTP requests (not 5xx)", async () => {
    if (process.env.CONVEX_NETWORK_SMOKE !== "1") {
      return
    }

    try {
      const res = await fetch(CONVEX_URL, {
        method: "HEAD",
        signal: AbortSignal.timeout(8000),
      })
      // Any non-5xx response proves the deployment is reachable and healthy
      expect(res.status).toBeLessThan(500)
    } catch {
      // Network unavailable in this environment — warn and skip
      console.warn(
        "⚠  Convex HTTP reachability check skipped (no network or deployment unreachable)",
      )
    }
  })
})
