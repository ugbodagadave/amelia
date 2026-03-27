import { Inngest } from "inngest"

export const INNGEST_APP_ID = "amelia"
export function resolveInngestIsDev(inngestDev?: string, nodeEnv?: string) {
  return inngestDev === "1" && nodeEnv !== "production"
}

export const inngest = new Inngest({
  id: INNGEST_APP_ID,
  isDev: resolveInngestIsDev(process.env.INNGEST_DEV, process.env.NODE_ENV),
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
