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
