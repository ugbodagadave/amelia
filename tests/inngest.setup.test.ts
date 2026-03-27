import { describe, expect, test } from "bun:test"

import { INNGEST_APP_ID, resolveInngestIsDev } from "../src/inngest/client"
import {
  APP_BOOTSTRAP_PING_EVENT,
  APP_BOOTSTRAP_PING_FUNCTION_ID,
  AUTH_USER_CREATED_EVENT,
  AUTH_USER_CREATED_FUNCTION_ID,
  BILL_PAYMENT_LINK_SENT_EVENT,
  BILL_PAYMENT_LINK_SENT_FUNCTION_ID,
  CLAIMS_OVERDUE_CHECK_EVENT,
  CLAIMS_OVERDUE_CHECK_FUNCTION_ID,
  PAYMENT_CONFIRMED_EVENT,
  PAYMENT_CONFIRMED_FUNCTION_ID,
  inngestFunctions,
} from "../src/inngest/functions"

describe("Inngest setup", () => {
  test("uses the stable Amelia app id", () => {
    expect(INNGEST_APP_ID).toBe("amelia")
  })

  test("registers at least one function for local sync", () => {
    expect(inngestFunctions.length).toBeGreaterThan(0)
  })

  test("exports the bootstrap ping event constant", () => {
    expect(APP_BOOTSTRAP_PING_EVENT).toBe("app/bootstrap.ping")
  })

  test("only enables Inngest dev mode outside production builds", () => {
    expect(resolveInngestIsDev("1", "development")).toBe(true)
    expect(resolveInngestIsDev("1", "production")).toBe(false)
    expect(resolveInngestIsDev(undefined, "production")).toBe(false)
  })

  test("registers the bootstrap function with a stable id", () => {
    expect(APP_BOOTSTRAP_PING_FUNCTION_ID).toBe("app-bootstrap-ping")
    expect(BILL_PAYMENT_LINK_SENT_EVENT).toBe("bill/payment_link.sent")
    expect(CLAIMS_OVERDUE_CHECK_EVENT).toBe("claims/overdue.check")
    expect(PAYMENT_CONFIRMED_EVENT).toBe("payment/confirmed")
    expect(AUTH_USER_CREATED_EVENT).toBe("auth/user.created")
    expect(BILL_PAYMENT_LINK_SENT_FUNCTION_ID).toBe("bill-payment-link-sent")
    expect(CLAIMS_OVERDUE_CHECK_FUNCTION_ID).toBe("claims-overdue-check")
    expect(PAYMENT_CONFIRMED_FUNCTION_ID).toBe("payment-confirmed")
    expect(AUTH_USER_CREATED_FUNCTION_ID).toBe("auth-user-created")
    expect(inngestFunctions).toHaveLength(5)
  })
})
