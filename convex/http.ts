import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { serve } from "inngest/edge"
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

export default http
