# Amelia — Testing Strategy

**Framework:** bun test (built-in) · No extra test packages needed

---

## Setup

No installation step required. Bun ships with a built-in test runner — no vitest, no jest, no config files.

Test files live in `tests/` at the project root. Every test file imports directly from `"bun:test"`:

```typescript
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
```

No setup file. No global mocks. No `vitest.config.ts`.

---

## No Mocking Rule

**Do NOT mock databases, APIs, or external services unless absolutely unavoidable.**

Prefer real API calls against sandbox/test environments:
- Interswitch: use `qa.interswitchng.com` sandbox
- Africa's Talking: use `username: "sandbox"` (messages go to simulator, not real phones)
- Convex: test against a real Convex dev deployment
- E2B: test against real sandboxes (they're ephemeral anyway)

Why: Mocked tests passed but the prod migration failed. Real integrations catch real bugs.

---

## Test File Structure

```
tests/
  unit/
    calculations.test.ts
    validation.test.ts
    normalization.test.ts
    stateMachine.test.ts
  integration/
    interswitch-payment.test.ts
    interswitch-marketplace.test.ts
    sms.test.ts
    ocr.test.ts
  convex/
    bills.test.ts
    claims.test.ts
    auth.test.ts
```

---

## Critical Test Cases (Must Pass Before Demo)

### Calculations (Pure Functions)
```typescript
import { test, expect, describe } from "bun:test";

describe("Bill Calculations", () => {
  test("investigations total sums correctly", ...);
  test("medications total sums correctly", ...);
  test("grand total is sum of both subtotals", ...);
  test("HMO deduction is exactly 10%", ...);
  test("expected receivable = total - deduction", ...);
  test("self-pay has zero deduction", ...);
  test("deduction rounds to nearest naira", ...);
});
```

### Validation
```typescript
import { test, expect, describe } from "bun:test";

describe("NIN Validation", () => {
  test("rejects 10-digit NIN", ...);
  test("rejects 12-digit NIN", ...);
  test("rejects NIN with letters", ...);
  test("accepts exactly 11 digits", ...);
});

describe("Phone Validation", () => {
  test("accepts 08012345678 format", ...);
  test("rejects landline format", ...);
  test("normalizes 08012345678 to +2348012345678 for Africa's Talking", ...);
});
```

### Auth Code State Machine
```typescript
import { test, expect, describe } from "bun:test";

describe("Auth Code Tracker", () => {
  test("HMO bill starts in AWAITING_AUTH state", ...);
  test("self-pay bill skips auth entirely", ...);
  test("payment generation blocked without auth code", ...);
  test("auth code confirmed with non-empty string", ...);
  test("auth code rejects empty string", ...);
  test("timestamp recorded on confirmation", ...);
});
```

### Interswitch Payment Integration
```typescript
import { test, expect, describe, beforeAll } from "bun:test";

describe("Interswitch Payment", () => {
  test("generates valid SHA-512 hash from payment parameters", ...);
  test("txnref is 15 characters or fewer", ...);
  test("web checkout URL returns 200 from qa.interswitchng.com", ...);
  test("OPay initialize returns responseCode 09", ...);
  test("OPay status endpoint confirms payment with responseCode 00", ...);
});
```

### Interswitch Marketplace Integration
```typescript
import { test, expect, describe, beforeAll } from "bun:test";

describe("Interswitch Marketplace", () => {
  test("obtains OAuth Bearer token from sandbox", ...);
  test("NIN verification returns EXACT_MATCH for valid data", ...);
  test("bank list returns 100+ Nigerian banks", ...);
  test("account resolve returns account holder name", ...);
});
```

### SMS Integration
```typescript
import { test, expect, describe } from "bun:test";

describe("Africa's Talking SMS", () => {
  test("sends SMS to sandbox simulator successfully", ...);
  test("response contains statusCode 101 and status Success", ...);
  test("phone number must be international format with + prefix", ...);
  test("omits from field in sandbox mode", ...);
});
```

### Webhook Handler
```typescript
import { test, expect, describe } from "bun:test";

describe("Interswitch Webhook", () => {
  test("rejects request with invalid signature", ...);
  test("accepts request with valid HMAC-SHA512 signature", ...);
  test("updates bill status to paid on TRANSACTION.COMPLETED", ...);
  test("sets paidAt timestamp correctly", ...);
  test("returns 200 if bill already paid (idempotent)", ...);
  test("returns 404 if bill not found", ...);
  test("returns 200 within timeout threshold", ...);
});
```

### Claim Generation
```typescript
import { test, expect, describe } from "bun:test";

describe("Claim Batch", () => {
  test("creates claim_batch record with correct bill count", ...);
  test("updates all included bills to CLAIMED status", ...);
  test("excludes bills without auth codes", ...);
  test("calculates batch total correctly", ...);
  test("calculates 10% deduction on batch total", ...);
  test("sets expectedPaymentBy to submittedAt + 14 days", ...);
});
```

---

## Running Tests

```bash
bun test                     # Run all tests
bun test --watch             # Watch mode
bun test tests/unit/         # Run specific directory
bun test tests/unit/calculations.test.ts  # Run specific file
```

---

## Rule

Run the full test suite (`bun test`) before marking any phase complete. All new AND previous tests must pass.
