import { describe, expect, test } from "bun:test"

describe("Production readiness guide and welcome email flow", () => {
  test("gitignores the local production guide and creates it in the repo root", async () => {
    const gitignoreSource = await Bun.file("./.gitignore").text()

    expect(gitignoreSource).toContain("guide.md")
    expect(await Bun.file("./guide.md").exists()).toBe(true)
  })

  test("documents the production env vars and deployment hosts", async () => {
    const envSource = await Bun.file("./docs/env.md").text()
    const guideSource = await Bun.file("./guide.md").text()

    expect(envSource).toContain("CLERK_WEBHOOK_SIGNING_SECRET")
    expect(envSource).toContain("RESEND_API_KEY")
    expect(envSource).toContain("RESEND_FROM_EMAIL")
    expect(guideSource).toContain("app.getamelia.online")
    expect(guideSource).toContain("vercel link --repo")
    expect(guideSource).toContain("npx convex deploy")
    expect(guideSource).toContain("npx convex env list --prod")
    expect(guideSource).toContain("npx convex env set --prod")
    expect(guideSource).toContain("vercel env add")
    expect(guideSource).toContain("/api/webhooks/clerk")
    expect(guideSource).toContain("/api/webhooks/meta")
    expect(guideSource).toContain("/api/webhooks/interswitch")
    expect(guideSource).toContain("Google")
  })

  test("wires clerk webhooks into inngest and resend welcome emails", async () => {
    const httpSource = await Bun.file("./convex/http.ts").text()
    const eventsSource = await Bun.file("./src/inngest/events.ts").text()
    const functionsIndexSource = await Bun.file("./src/inngest/functions/index.ts").text()
    const welcomeFunctionSource = await Bun.file("./src/inngest/functions/authUserCreated.ts").text()

    expect(httpSource).toContain("/api/webhooks/clerk")
    expect(httpSource).toContain("verifyWebhook")
    expect(httpSource).toContain("user.created")
    expect(eventsSource).toContain("auth/user.created")
    expect(functionsIndexSource).toContain("authUserCreated")
    expect(welcomeFunctionSource).toContain("Resend")
    expect(welcomeFunctionSource).toContain("RESEND_API_KEY")
    expect(welcomeFunctionSource).toContain("RESEND_FROM_EMAIL")
    expect(welcomeFunctionSource).toContain("Welcome to Amelia")
  })

  test("adds a vercel spa rewrite so clerk callback routes do not 404", async () => {
    const vercelConfigSource = await Bun.file("./vercel.json").text()

    expect(vercelConfigSource).toContain('"rewrites"')
    expect(vercelConfigSource).toContain('"/(.*)"')
    expect(vercelConfigSource).toContain('"/index.html"')
  })
})
