import { INNGEST_APP_ID, inngest } from "../client"
import { APP_BOOTSTRAP_PING_EVENT } from "../events"

export const APP_BOOTSTRAP_PING_FUNCTION_ID = "app-bootstrap-ping"

export const appBootstrapPing = inngest.createFunction(
  {
    id: APP_BOOTSTRAP_PING_FUNCTION_ID,
    triggers: [{ event: APP_BOOTSTRAP_PING_EVENT }],
  },
  async ({ event, step }) => {
    const receivedAt = await step.run("capture-bootstrap-metadata", () => {
      return new Date().toISOString()
    })

    return {
      appId: INNGEST_APP_ID,
      eventName: event.name,
      receivedAt,
    }
  },
)
