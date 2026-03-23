# Amelia — Architecture Decisions Record (ADR)

Why things are built the way they are. Reference this when Claude Code asks "why are we doing it this way?"

---

## ADR-001: Convex as Backend + Database

**Decision:** Use Convex instead of a traditional REST API + PostgreSQL setup.

**Reasons:**
- Real-time reactivity out of the box — when Interswitch fires the webhook and updates a bill status, every connected client sees it instantly without polling. This is the killer feature for the dashboard.
- TypeScript end-to-end schema — no separate ORM, no migration files, no type drift between DB and API.
- HTTP Actions let us receive Interswitch webhooks and Inngest calls directly inside Convex, no separate Express server needed.
- File storage built-in — PDF uploads stored without needing S3 setup.
- `npx convex dev` gives a complete backend in one command — critical for a 4-day hackathon.

**Trade-off:** Vendor lock-in. Acceptable for hackathon; evaluate post-funding.

---

## ADR-002: Inngest for Background Jobs

**Decision:** Use Inngest for all async workflows instead of Convex scheduled functions for everything.

**Reasons:**
- Inngest gives durable execution — if the SMS job fails, it retries automatically with backoff.
- Step functions: the claim generation workflow has 5 sequential steps. Inngest models this naturally; Convex scheduled functions are better for simple one-shot jobs.
- Better observability — Inngest dashboard shows every function run, retry history, and payload. Critical for debugging payment notification failures.
- Inngest Dev Server gives a local UI for testing workflows before deploying.

**Rule:** Use Convex scheduled functions only for simple time-based tasks (e.g. daily overdue check). Use Inngest for anything with multiple steps, retries, or external API calls.

---

## ADR-003: Clerk for Authentication

**Decision:** Use Clerk instead of building auth with Convex's built-in auth or a custom JWT setup.

**Reasons:**
- Multi-role support (admin vs staff) via Clerk metadata — no custom role table needed.
- Pre-built UI components match the Amelia design system with minimal customization.
- Clerk + Convex has a first-class integration with official docs and examples.
- Session management, token refresh, and device management handled automatically.

**Note:** Store `clinicId` in Clerk user's `publicMetadata` after clinic onboarding. This makes it available in every Convex query/mutation via `ctx.auth.getUserIdentity()`.

---

## ADR-004: Virtual Account per Bill (Not One Clinic Account)

**Decision:** Generate a fresh Interswitch virtual account for each individual bill, not one reusable account for the whole clinic.

**Reasons:**
- Eliminates manual reconciliation entirely. When payment hits the account, the webhook carries the transaction reference which maps directly to the bill ID. Zero ambiguity.
- A single clinic account would require staff to manually match incoming bank transfers to bills — the exact pain Amelia is trying to eliminate.
- Interswitch's dynamic virtual account mode supports this use case explicitly.

**Trade-off:** Each bill generation requires one API call. For 100 bills/day, this is 100 API calls — well within rate limits.

**Hackathon note:** The Virtual Account API is blocked — it requires separate Payment Gateway OAuth credentials not available via self-serve. For the hackathon, Web Checkout (card) and OPay Wallet replace virtual accounts as payment channels. The reconciliation principle remains the same: each payment carries a `transactionReference` that maps to a bill ID. Post-hackathon, contact Interswitch to provision Payment Gateway credentials for virtual accounts.

---

## ADR-005: pdf-lib for Claims Form PDF

**Decision:** Use `pdf-lib` (pure JS) as the primary PDF generation approach, with Puppeteer-in-E2B as fallback for the cover letter.

**Reasons:**
- `pdf-lib` runs in Node/Bun without a headless browser — faster and lighter.
- For the claims form, we know the exact field positions from the real HMO form. `pdf-lib` lets us create a template PDF with form fields and fill them programmatically — perfectly replicates the original form layout.
- Puppeteer (for the cover letter) needs a headless Chrome instance. Running this in E2B sandbox avoids installing Chromium in the Convex environment.

**Template approach:**
1. Create a base PDF template (recreating the Police HMO / Universal form) using `pdf-lib`'s form API.
2. Store the template as a base64 string in the `hmo_templates` table.
3. On claim generation: load template, fill fields, export.

---

## ADR-006: Auth Code as First-Class Data Model

**Decision:** Auth codes are stored as a structured field on the bill, not in a separate table or as a note.

**Reasons:**
- The auth code is the single most critical piece of data for HMO claim approval. It deserves first-class status.
- Storing it on the bill record makes it available in every bill query without joins.
- The `authCodeReceivedAt` timestamp creates an audit trail — the clinic can prove when they received the code.
- Bill status machine gates on auth code presence: `awaiting_auth` → `auth_confirmed` is a real state transition, not a soft validation.

**Validation rule:** A bill with `paymentType = 'hmo'` CANNOT transition to `pending_payment` or generate a payment link unless `authorizationCode` is non-null.

---

## ADR-007: 10% Deduction as Calculated Display, Not Stored Field

**Decision:** The HMO 10% deduction is calculated and displayed but not stored as a separate field.

**Reasons:**
- It is always exactly 10% of `totalAmount`. Storing it would be redundant and create potential inconsistency.
- `expectedReceivable = totalAmount * 0.90` is a pure function — always compute it on the fly.
- Exception: the claims batch PDF stores the final deduction amount for the HMO's records. This is generated at PDF time from the bill's total.

**Note:** Different HMOs may have different deduction rates post-hackathon. When that happens, add a `hmoDeductionRate` field to `hmo_templates` and use it in calculations.

---

## ADR-008: Webhook Idempotency

**Decision:** The Interswitch webhook handler must be idempotent.

**Implementation:**
- Before updating a bill, check current status. If already `paid`, return 200 without re-processing.
- Reason: Interswitch may retry a webhook if your endpoint is slow. Processing the same `TRANSACTION.COMPLETED` event twice would not double-collect money, but it could create duplicate SMS sends or analytics entries.

**Pattern:**
```typescript
// In Convex HTTP Action
const bill = await ctx.db.get(billId);
if (bill.status === 'paid') {
  return new Response('Already processed', { status: 200 });
}
// proceed with update
```

---

## ADR-009: NIN as Required for HMO, Encouraged for Self-Pay

**Decision:** NIN is mandatory for HMO patients, optional but prompted for self-pay.

**Reasons:**
- NHIA SOP explicitly requires NIN for all claims. A claim without NIN is automatically rejected by the TPA.
- For self-pay patients, NIN has no immediate operational purpose — forcing it will create friction at the front desk.
- Post-hackathon, NIN becomes useful for patient deduplication (same person across visits) and NHIA enrollment tracking.

**UI implementation:** Show NIN as required field (red asterisk) for HMO patients. Show it as optional with helper text "Required for NHIA claims" for self-pay patients.

---

## ADR-010: Claim Batch is Hospital → TPA, Not Hospital → HMO

**Decision:** The claim submission target is the TPA (Third Party Administrator), not the HMO directly.

**Why this matters:**
- The NHIA SOP is explicit: claims go Hospital → TPA → NHIA. The HMO is not the direct recipient of claim documents.
- Each HMO has an associated TPA. The cover letter is addressed to the TPA, not the HMO.
- Post-hackathon: different TPAs have different submission formats. The template system will need to expand to include TPA-specific configurations, not just HMO-specific ones.

**Data model implication:** `hmo_templates` stores both HMO name AND TPA name/contact. These are paired.

---

## State Machines Reference

### Bill Status Flow
```
CREATED
  └─[HMO patient]──→ AWAITING_AUTH
  └─[Self-pay]────→ PENDING_PAYMENT
                         ↓
AWAITING_AUTH ──[auth code entered]──→ AUTH_CONFIRMED
AUTH_CONFIRMED ──[payment generated]──→ PENDING_PAYMENT
PENDING_PAYMENT ──[webhook received]──→ PAID
PENDING_PAYMENT ──[24h elapsed]──→ OVERDUE
PAID ──[included in claim batch]──→ CLAIMED
```

**Note on PENDING_PAYMENT:** This state means a payment link has been generated and the patient has been notified. The system is waiting for the Interswitch webhook confirming payment via Web Checkout (card) or OPay Wallet.

<!-- PaymentOptionsCard now shows Web Checkout + OPay Wallet instead of Virtual Account + QR + USSD -->

### Claim Batch Status Flow
```
DRAFT ──[staff submits to TPA]──→ SUBMITTED
SUBMITTED ──[14 days elapsed, no payment]──→ OVERDUE
SUBMITTED / OVERDUE ──[staff marks paid]──→ PAID
```

### Auth Code State (UI only, not persisted)
```
HIDDEN ──[lock banner clicked]──→ VISIBLE
VISIBLE ──[code entered + confirmed]──→ CONFIRMED
CONFIRMED ──[edit clicked]──→ VISIBLE (new value)
```
