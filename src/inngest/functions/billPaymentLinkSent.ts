import { inngest } from "../client"
import { BILL_PAYMENT_LINK_SENT_EVENT } from "../events"

export const BILL_PAYMENT_LINK_SENT_FUNCTION_ID = "bill-payment-link-sent"

export const billPaymentLinkSent = inngest.createFunction(
  {
    id: BILL_PAYMENT_LINK_SENT_FUNCTION_ID,
    triggers: [{ event: BILL_PAYMENT_LINK_SENT_EVENT }],
  },
  async ({ event, step }) => {
    const sentAt = await step.run("capture-payment-link-sent", () => new Date().toISOString())

    return {
      patientPhone: event.data.patientPhone,
      paymentLink: event.data.paymentLink,
      sentAt,
    }
  },
)
