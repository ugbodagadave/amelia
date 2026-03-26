import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { verifyWebhook } from "@clerk/backend/webhooks"
import { serve } from "inngest/edge"
import { internal } from "./_generated/api"
import { inngest } from "./inngestClient"
import { inngestFunctions } from "../src/inngest/functions"
import { isMetaWebhookSignatureValid } from "../src/lib/payments"

const http = httpRouter()

const inngestHandler = serve({
  client: inngest,
  functions: inngestFunctions,
})

http.route({ path: "/api/inngest", method: "GET", handler: httpAction(async (_, req) => inngestHandler(req)) })
http.route({ path: "/api/inngest", method: "POST", handler: httpAction(async (_, req) => inngestHandler(req)) })
http.route({ path: "/api/inngest", method: "PUT", handler: httpAction(async (_, req) => inngestHandler(req)) })
http.route({
  path: "/api/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (_, req) => {
    const payload = await verifyWebhook(req, {
      signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET ?? "",
    })

    if (payload.type === "user.created") {
      const primaryEmailId = payload.data.primary_email_address_id
      const primaryEmail = payload.data.email_addresses.find(
        (email) => email.id === primaryEmailId,
      )?.email_address

      if (primaryEmail) {
        await inngest.send({
          name: "auth/user.created",
          data: {
            clerkUserId: payload.data.id,
            email: primaryEmail,
            firstName: payload.data.first_name ?? "",
            lastName: payload.data.last_name ?? "",
          },
        })
      }
    }

    return new Response("ok", { status: 200 })
  }),
})

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

http.route({
  path: "/api/webhooks/meta",
  method: "GET",
  handler: httpAction(async (_, req) => {
    const url = new URL(req.url)
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")

    if (mode !== "subscribe" || token !== process.env.META_WEBHOOK_VERIFY_TOKEN) {
      return new Response("Forbidden", { status: 403 })
    }

    return new Response(challenge ?? "", { status: 200 })
  }),
})

http.route({
  path: "/api/webhooks/meta",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.text()
    const signature =
      req.headers.get("x-hub-signature-256") ?? req.headers.get("X-Hub-Signature-256")
    const appSecret = process.env.META_APP_SECRET ?? ""

    if (!isMetaWebhookSignatureValid(appSecret, body, signature)) {
      return new Response("Unauthorized", { status: 401 })
    }

    await ctx.runAction(internal.payments.processMetaWebhookPayload, { body })
    return new Response("ok", { status: 200 })
  }),
})

async function readCardCallbackParams(req: Request) {
  if (req.method === "GET") {
    return new URL(req.url).searchParams
  }

  const contentType = req.headers.get("content-type") ?? ""
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData()
    const params = new URLSearchParams()

    formData.forEach((value, key) => {
      params.set(key, String(value))
    })

    return params
  }

  const rawBody = await req.text()
  return new URLSearchParams(rawBody)
}

function buildCardCallbackRedirectUrl(input: {
  status: "success" | "failed"
  message: string
  billId: string | null
  txnRef: string
  payRef?: string
  responseCode: string
}) {
  const appUrl = (process.env.VITE_APP_URL ?? "").replace(/\/$/, "")
  if (!appUrl) {
    return null
  }

  const url = new URL(`${appUrl}/pay/callback/card`)
  url.searchParams.set("status", input.status)
  url.searchParams.set("message", input.message)
  url.searchParams.set("txnref", input.txnRef)
  url.searchParams.set("ResponseCode", input.responseCode)

  if (input.billId) {
    url.searchParams.set("billId", input.billId)
  }

  if (input.payRef) {
    url.searchParams.set("payRef", input.payRef)
  }

  return url.toString()
}

const cardCallbackHandler = httpAction(async (ctx, req) => {
  const params = await readCardCallbackParams(req)
  const txnRef = params.get("txnref") ?? params.get("txn_ref") ?? ""
  const payRef = params.get("payRef") ?? params.get("pay_ref") ?? undefined
  const responseCode = params.get("ResponseCode") ?? params.get("responseCode") ?? ""

  const result = await ctx.runAction(internal.payments.finalizeCardPaymentCallbackInternal, {
    txnRef,
    payRef,
    responseCode,
  })

  const redirectUrl = buildCardCallbackRedirectUrl({
    status: result.status,
    message: result.message,
    billId: result.billId ?? null,
    txnRef,
    payRef,
    responseCode,
  })

  if (!redirectUrl) {
    return new Response(result.message, { status: result.status === "success" ? 200 : 400 })
  }

  return Response.redirect(redirectUrl, 302)
})

http.route({
  path: "/api/payments/interswitch/card-callback",
  method: "GET",
  handler: cardCallbackHandler,
})
http.route({
  path: "/api/payments/interswitch/card-callback",
  method: "POST",
  handler: cardCallbackHandler,
})

export default http
