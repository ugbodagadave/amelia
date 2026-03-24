import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { serve } from "inngest/edge"
import { internal } from "./_generated/api"
import { inngest } from "./inngestClient"
import { inngestFunctions } from "../src/inngest/functions"

const http = httpRouter()

const inngestHandler = serve({
  client: inngest,
  functions: inngestFunctions,
})

http.route({ path: "/api/inngest", method: "GET", handler: httpAction(async (_, req) => inngestHandler(req)) })
http.route({ path: "/api/inngest", method: "POST", handler: httpAction(async (_, req) => inngestHandler(req)) })
http.route({ path: "/api/inngest", method: "PUT", handler: httpAction(async (_, req) => inngestHandler(req)) })
http.route({
  path: "/api/webhooks/interswitch",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.text()

    try {
      await ctx.runAction(internal.payments.processInterswitchWebhook, {
        signature: req.headers.get("X-Interswitch-Signature") ?? undefined,
        body,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized"
      return new Response(message, { status: 401 })
    }

    return new Response("ok", { status: 200 })
  }),
})

export default http
