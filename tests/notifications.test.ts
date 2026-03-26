import { describe, expect, test } from "bun:test"
import { NOTIFICATION_LIMIT, NOTIFICATION_TYPE, buildNotificationTimestampLabel } from "../src/lib/notifications"

describe("Notification helpers", () => {
  test("exports the v1 notification limit", () => {
    expect(NOTIFICATION_LIMIT).toBe(20)
  })

  test("defines stable notification type constants for app activity", () => {
    expect(NOTIFICATION_TYPE.PATIENT_CREATED).toBe("patient_created")
    expect(NOTIFICATION_TYPE.BILL_CREATED).toBe("bill_created")
    expect(NOTIFICATION_TYPE.AUTH_CONFIRMED).toBe("auth_confirmed")
    expect(NOTIFICATION_TYPE.PAYMENT_CONFIRMED).toBe("payment_confirmed")
    expect(NOTIFICATION_TYPE.CLAIM_BATCH_GENERATED).toBe("claim_batch_generated")
  })

  test("buildNotificationTimestampLabel formats same-day timestamps with time only", () => {
    const label = buildNotificationTimestampLabel(
      new Date("2026-03-26T15:45:00.000Z").getTime(),
      new Date("2026-03-26T18:00:00.000Z"),
    )

    expect(label).toContain(":")
    expect(label).not.toContain("/")
  })

  test("buildNotificationTimestampLabel formats older timestamps with date and time", () => {
    const label = buildNotificationTimestampLabel(
      new Date("2026-03-24T15:45:00.000Z").getTime(),
      new Date("2026-03-26T18:00:00.000Z"),
    )

    expect(label).toContain("/")
  })
})

test("schema defines notifications with read-state and routing indexes", async () => {
  const source = await Bun.file("./convex/schema.ts").text()
  expect(source).toContain("notifications: defineTable({")
  expect(source).toContain('type: notificationTypeValidator')
  expect(source).toContain("recipientClerkUserId: v.string()")
  expect(source).toContain("isRead: v.boolean()")
  expect(source).toContain('.index("by_recipient_and_created_at", ["recipientClerkUserId", "createdAt"])')
  expect(source).toContain('.index("by_recipient_and_read_state", ["recipientClerkUserId", "isRead"])')
})

test("convex/notifications.ts exports the bell feed query and read mutations", async () => {
  const source = await Bun.file("./convex/notifications.ts").text()
  expect(source).toContain("getRecentNotifications")
  expect(source).toContain("getUnreadNotificationCount")
  expect(source).toContain("markNotificationRead")
  expect(source).toContain("markAllNotificationsRead")
  expect(source).toContain("createNotification")
})

test("key business flows emit notifications at the source event", async () => {
  const patientSource = await Bun.file("./convex/patients.ts").text()
  const billSource = await Bun.file("./convex/bills.ts").text()
  const claimSource = await Bun.file("./convex/claims.ts").text()
  const paymentSource = await Bun.file("./convex/payments.ts").text()

  expect(patientSource).toContain("internal.notifications.createNotification")
  expect(billSource).toContain("internal.notifications.createNotification")
  expect(claimSource).toContain("internal.notifications.createNotification")
  expect(paymentSource).toContain("internal.notifications.createNotification")
})

test("topbar renders a real notifications popover with unread state", async () => {
  const source = await Bun.file("./src/components/topbar.tsx").text()
  expect(source).toContain("api.notifications.getRecentNotifications")
  expect(source).toContain("api.notifications.getUnreadNotificationCount")
  expect(source).toContain("Popover")
  expect(source).toContain("Mark all read")
  expect(source).toContain("Notifications")
})
