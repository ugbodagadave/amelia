import { describe, expect, test } from "bun:test"

import { INNGEST_APP_ID } from "../src/inngest/client"
import {
  APP_BOOTSTRAP_PING_EVENT,
  APP_BOOTSTRAP_PING_FUNCTION_ID,
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

  test("registers the bootstrap function with a stable id", () => {
    expect(APP_BOOTSTRAP_PING_FUNCTION_ID).toBe("app-bootstrap-ping")
    expect(inngestFunctions).toHaveLength(1)
  })
})
