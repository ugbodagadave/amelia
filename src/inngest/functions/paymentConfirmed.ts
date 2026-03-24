import { inngest } from "../client"
import { PAYMENT_CONFIRMED_EVENT } from "../events"

export const PAYMENT_CONFIRMED_FUNCTION_ID = "payment-confirmed"

export const paymentConfirmed = inngest.createFunction(
  {
    id: PAYMENT_CONFIRMED_FUNCTION_ID,
    triggers: [{ event: PAYMENT_CONFIRMED_EVENT }],
  },
  async ({ event, step }) => {
    const confirmedAt = await step.run("capture-payment-confirmed", () =>
      new Date().toISOString(),
    )

    return {
      clinicName: event.data.clinicName,
      patientPhone: event.data.patientPhone,
      totalAmount: event.data.totalAmount,
      confirmedAt,
    }
  },
)
