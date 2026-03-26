export const NOTIFICATION_LIMIT = 20

export const NOTIFICATION_TYPE = {
  PATIENT_CREATED: "patient_created",
  BILL_CREATED: "bill_created",
  AUTH_CONFIRMED: "auth_confirmed",
  PAYMENT_REQUEST_SENT: "payment_request_sent",
  PAYMENT_REQUEST_FAILED: "payment_request_failed",
  PAYMENT_CONFIRMED: "payment_confirmed",
  CLAIM_BATCH_GENERATED: "claim_batch_generated",
  CLAIM_BATCH_SUBMITTED: "claim_batch_submitted",
  CLAIM_BATCH_PAID: "claim_batch_paid",
  CLAIM_BATCH_OVERDUE: "claim_batch_overdue",
} as const

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE]

export function buildNotificationTimestampLabel(
  timestamp: number,
  now: Date = new Date(),
): string {
  const date = new Date(timestamp)
  const sameDay = date.toDateString() === now.toDateString()

  if (sameDay) {
    return date.toLocaleTimeString("en-NG", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return date.toLocaleString("en-NG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
