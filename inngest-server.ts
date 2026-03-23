import { Hono } from "hono"
import { serve } from "inngest/hono"
import { inngest } from "./src/inngest/client"
import { inngestFunctions } from "./src/inngest/functions"

const app = new Hono()
app.on(["GET", "POST", "PUT"], "/api/inngest", serve({ client: inngest, functions: inngestFunctions }))

export default {
  port: 3000,
  fetch: app.fetch.bind(app),
}
