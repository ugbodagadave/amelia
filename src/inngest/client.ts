import { Inngest } from "inngest"

export const INNGEST_APP_ID = "amelia"

export const inngest = new Inngest({
  id: INNGEST_APP_ID,
  isDev: process.env.INNGEST_DEV === "1",
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
