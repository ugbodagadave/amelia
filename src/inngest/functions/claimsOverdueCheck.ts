import { inngest } from "../client"
import { CLAIMS_OVERDUE_CHECK_EVENT } from "../events"

export const CLAIMS_OVERDUE_CHECK_FUNCTION_ID = "claims-overdue-check"

export const claimsOverdueCheck = inngest.createFunction(
  {
    id: CLAIMS_OVERDUE_CHECK_FUNCTION_ID,
    triggers: [{ cron: "TZ=Africa/Lagos 0 8 * * *" }],
  },
  async ({ step }) => {
    const checkedAt = await step.run("capture-claims-overdue-check", () =>
      new Date().toISOString(),
    )

    return {
      eventName: CLAIMS_OVERDUE_CHECK_EVENT,
      checkedAt,
    }
  },
)
