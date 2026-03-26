# How Amelia Works — Technical Integration Reference

This document describes the technical implementation of every integration in Amelia: request shapes, auth mechanisms, data flows, and internal wiring. Intended for engineers reviewing the codebase.

---

## 1. System Architecture

Amelia is a full-stack TypeScript application built on three pillars:

- **Convex** — serverless backend platform. Runs mutations (writes), queries (reads), actions (external API calls), and HTTP actions (webhooks). Provides a managed Postgres-like database with TypeScript-first schema definitions and real-time push subscriptions.
- **React + Vite** — frontend. Subscribes to Convex queries via `useQuery()` hooks; the UI re-renders automatically when the underlying data changes — no polling, no manual cache invalidation.
- **Inngest** — durable async job queue. Handles background workflows that need retry semantics, delays, or multi-step execution outside the Convex request/response cycle.

```
[React Frontend]
    ├── useQuery / useMutation → Convex (real-time)
    ├── Clerk JWT → every Convex request (auth)
    └── Payment redirect → Interswitch Web Checkout

[Convex Backend]
    ├── schema.ts          → 12-table database
    ├── mutations/queries  → business logic
    ├── actions            → external HTTP calls (Interswitch, Mistral, Groq, Meta)
    └── http.ts            → HTTP router for inbound webhooks

[Inngest]
    ├── /api/inngest       → Convex HTTP action serving function registry
    └── 5 registered functions (see §11)
```

---

## 2. Authentication — Clerk + Convex

**Provider setup (`src/main.tsx`):**
```
ClerkProvider (publishable key)
  └── ConvexProviderWithClerk
        └── App
```

`ConvexProviderWithClerk` from `@convex-dev/auth/react` attaches the active Clerk JWT to the Authorization header of every Convex request automatically.

**Convex side (`convex/auth.config.ts`):**
```typescript
export default {
  providers: [{
    domain: "https://logical-duckling-83.clerk.accounts.dev",
    applicationID: "convex"
  }]
}
```

Convex validates the JWT against Clerk's JWKS endpoint on every request.

**Auth enforcement in every mutation/query (`convex/lib/auth.ts`):**
```typescript
export async function requireClerkUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new ConvexError({ code: "UNAUTHORIZED", message: "Not authenticated" })
  return identity.subject  // Clerk user ID
}
```

**Clerk webhook → Inngest → Resend email:**
1. Clerk fires `user.created` to `POST /api/webhooks/clerk`
2. Convex HTTP action calls `verifyWebhook(req, CLERK_WEBHOOK_SIGNING_SECRET)` from `@clerk/backend/webhooks`
3. On success, sends `inngest.send({ name: "auth/user.created", data: { userId, email, firstName } })`
4. `authUserCreated` Inngest function sends welcome email via Resend API

---

## 3. Interswitch Quickteller — Card Payments

**Files:** `convex/payments.ts`, `src/lib/payments.ts`, `src/pages/PaymentLink.tsx`, `src/pages/PaymentCallbackCard.tsx`

### Payment initiation

Transaction reference format: `AM` + last 13 digits of `Date.now()` (max 15 chars total).

SHA-512 hash construction (using `@noble/hashes/sha2`):
```
payload = txnRef + merchantCode + payItemId + amountInKobo + redirectUrl + macKey
hash    = sha512(payload).hex()
```

Amount in kobo: `Math.round(amountNaira * 100)`

The Convex action returns the hash and transaction reference. The frontend redirects to:
```
https://newwebpay.qa.interswitchng.com/collections/w/pay
```
with form fields: `merchantcode`, `payItemID`, `transactionreference`, `amount`, `currency` (566 = NGN), `site_redirect_url`, `hash`.

### Card payment callback

Interswitch redirects the browser to:
```
GET /api/payments/interswitch/card-callback?txnref=AM...&ResponseCode=00&...
```

Convex HTTP action reads `txnref` and `ResponseCode`. On `ResponseCode === "00"`, calls `finalizeCardPaymentCallbackInternal` mutation → locates bill by `transactionReference` → sets `status: "paid"`, `paidAt`, `paidAmount`. Fires `payment/confirmed` Inngest event. Redirects browser to `/pay/callback/card?status=success&txnref=...`.

### TRANSACTION.COMPLETED webhook

Interswitch also fires a server-to-server POST on payment completion:

**Endpoint:** `POST /api/webhooks/interswitch`

**Signature verification:**
```typescript
const signature = req.headers.get("X-Interswitch-Signature")
const body      = await req.text()
const expected  = hmacSha512Hex(body, INTERSWITCH_WEBHOOK_SECRET)
if (signature !== expected) return new Response("Unauthorized", { status: 401 })
```

**Payload shape:**
```json
{
  "event": "TRANSACTION.COMPLETED",
  "data": {
    "transactionReference": "AM0347600123",
    "amount": 4100000,
    "currency": "NGN",
    "responseCode": "00",
    "paymentReference": "ISW-20260313-XXXXXXXX",
    "channel": "CARD",
    "completedAt": "2026-03-13T15:42:00"
  }
}
```

Handler: `processInterswitchWebhook` mutation matches `transactionReference` to a bill, calls `markBillPaid`.

---

## 4. Interswitch Marketplace — Identity Verification

Used during clinic onboarding to verify the clinic's bank account.

**OAuth token (`convex/payments.ts`):**
```
POST https://qa.interswitchng.com/passport/oauth/token
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```
Response: `{ access_token, expires_in: 3600 }`
Token is cached with: `expiresAt = Date.now() + (expires_in * 1000) - 60_000`

**Bank list:**
```
GET https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/account-number/bank-list
Authorization: Bearer {access_token}
```
Returns array of `{ name, code }` objects used to populate the bank dropdown.

**Bank account resolution:**
```
POST https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/account-number/resolve
Authorization: Bearer {access_token}
Content-Type: application/json

{ "accountNumber": "0123456789", "bankCode": "058" }
```
Response: `{ bankDetails: { accountName: "MICHAEL JOHN DOE" } }`

**NIN verification:**
```
POST https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/nin
Authorization: Bearer {access_token}

{ "firstName": "Emeka", "lastName": "Okafor", "nin": "12345678901" }
```
Response: `{ nin_check: { status: "EXACT_MATCH" }, gender, phone, photo: "{base64}" }`

---

## 5. OPay — Alternative Payment Gateway

**Initialization:**
```
POST https://qa.interswitchng.com/collections/api/v1/opay/initialize
Content-Type: application/json

{ "amount": 4100000, "currency": "NGN", "transactionReference": "AM...", ... }
```
Response: `{ responseCode: "00", redirectUrl: "https://opay.com/pay/..." }`

No Authorization header required. User is redirected to the OPay URL.

**Status confirmation (polling — no webhook):**
```
POST https://qa.interswitchng.com/collections/api/v1/opay/status
Content-Type: application/json

{ "transactionReference": "AM..." }
```
Response code `00` = payment confirmed. Frontend calls `confirmOPayPayment` Convex action on the callback page (`/pay/callback/opay`), which polls this endpoint and updates bill status to `paid` on success.

---

## 6. Meta WhatsApp Cloud API — Payment Requests

**Files:** `convex/payments.ts`, `convex/http.ts`

### Sending a payment request

When clinic staff clicks "Send Payment Request" on a bill:

```
POST https://graph.facebook.com/v23.0/{META_PHONE_NUMBER_ID}/messages
Authorization: Bearer {META_ACCESS_TOKEN}
Content-Type: application/json
```

Payload (template message):
```json
{
  "messaging_product": "whatsapp",
  "to": "2348012345678",
  "type": "template",
  "template": {
    "name": "bill_payment_request",
    "language": { "code": "en" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Emeka" },
          { "type": "text", "text": "St. Mary Clinic" },
          { "type": "text", "text": "NGN 41,000" },
          { "type": "text", "text": "AM0347600123" }
        ]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": "0",
        "parameters": [{ "type": "text", "text": "pay/pay_tok_abc123" }]
      }
    ]
  }
}
```

Phone number format for Meta: strip the `+` prefix → `2348012345678` (not `+2348012345678`).

Response: `{ messages: [{ id: "wamid.xxx", message_status: "accepted" }] }`

The `messageId` is stored on the bill as `paymentRequestMessageId`. Bill fields updated:
- `paymentRequestChannel: "whatsapp"`
- `paymentRequestStatus: "sent"`
- `paymentRequestSentAt: timestamp`

**Auto-resend:** After the first successful send, `ctx.scheduler.runAfter(12 * 60 * 60 * 1000, ...)` schedules a resend. `shouldAutoResendPaymentRequest()` validates the bill is still unpaid and the attempt count is 1 before firing.

### WhatsApp webhook — delivery status updates

**Endpoint:** `POST /api/webhooks/meta`

**GET verification (one-time setup):**
```
GET /api/webhooks/meta?hub.mode=subscribe&hub.verify_token={TOKEN}&hub.challenge={CHALLENGE}
```
Handler checks `hub.verify_token === META_WEBHOOK_VERIFY_TOKEN`, returns `hub.challenge` as plain text.

**POST — status update payload:**
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "statuses": [{
          "id": "wamid.xxx",
          "status": "delivered",
          "timestamp": "1234567890",
          "errors": []
        }]
      }
    }]
  }]
}
```

Handler: `processMetaWebhookPayload` → `applyMetaPaymentRequestStatus` mutation → matches bill by `paymentRequestMessageId` → updates `paymentRequestStatus` to `delivered`, `read`, or `failed`.

---

## 7. Mistral AI — HMO Document OCR

**Files:** `convex/ocr.ts`, `src/lib/ocr.ts`, `src/components/ocr/HmoDocumentOcrCard.tsx`

### Two-pass extraction pipeline

**Pass 1 — OCR (extract text from image/PDF):**
```typescript
const uploadedFile = await client.files.upload({
  file: { fileName: "card.jpg", content: decodedBytes },
  purpose: "ocr"
})

const ocrResult = await client.ocr.process({
  model: "mistral-ocr-latest",
  document: { type: "file", fileId: uploadedFile.id }
})

const markdown = ocrResult.pages.map(p => p.markdown).join("\n")
```

**Pass 2 — Structured extraction (JSON schema enforcement):**
```typescript
const response = await client.chat.complete({
  model: "mistral-small-latest",
  messages: [
    { role: "system", content: "Extract HMO card fields as JSON..." },
    { role: "user", content: markdown }
  ],
  responseFormat: {
    type: "json_schema",
    jsonSchema: {
      name: "hmo_document_extraction",
      properties: {
        hmoName: { type: "string" },
        memberId: { type: "string" },
        enrolleeName: { type: "string" },
        nhisNumber: { type: "string" },
        authorizationCode: { type: "string" },
        coverageType: { type: "string" },
        coverageLimit: { type: "string" },
        additionalIds: { type: "object", additionalProperties: { type: "string" } }
      },
      required: ["hmoName","memberId","enrolleeName","nhisNumber","authorizationCode","coverageType","coverageLimit","additionalIds"]
    }
  }
})
```

Supported input types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.

### Audit trail

Every extraction is persisted in `hmo_coverages.rawOcrData` as a JSON string:
```typescript
{
  source: "patient_registration" | "bill_builder",
  fileName: string,
  mediaType: string,
  extractedAt: number,
  responseId: string,       // Mistral upload file ID
  pagesProcessed: number,
  markdown: string,
  extracted: ExtractedHmoDetails,
  rawResponse: string
}
```

Extracted data pre-fills patient HMO fields and authorization code in the bill builder. It does not overwrite fields the user has already entered manually.

---

## 8. Groq LLM — HMO Claim Completeness Scoring

**File:** `convex/lib/claimsScoring.ts`

**Model:** `moonshotai/kimi-k2-instruct-0905` via Groq API

Before generating a claim PDF, each bill is scored for completeness and clinical documentation quality:

```typescript
const response = await groq.chat.completions.create({
  model: GROQ_MODEL,
  messages: [
    { role: "system", content: claimScoringSystemPrompt },
    { role: "user", content: JSON.stringify(claimRecord) }
  ],
  response_format: { type: "json_object" },
  temperature: 0.1
})
```

The model analyses:
- Missing mandatory fields (NIN, auth code, diagnosis, admission dates)
- Diagnosis specificity (e.g. "fever" vs "malaria with complications")
- Date consistency (notification before admission before discharge)
- Line item completeness (at least one investigation or medication)

**Score bands:**
| Band | Score | Meaning |
|------|-------|---------|
| green | 80–100 | All required fields present — generate freely |
| amber | 50–79 | Non-critical gaps — can generate with warnings |
| red | 0–49 | Blocking issues present — cannot generate |

Returns:
```typescript
{
  score: number,
  band: "green" | "amber" | "red",
  canGenerate: boolean,
  blockingIssues: string[],   // must fix before generating
  warningIssues: string[]     // advisory only
}
```

---

## 9. Claims PDF Generation

**Files:** `convex/lib/claimsPdf.ts`, `convex/lib/claimsData.ts`, `convex/claims.ts`

### Artifacts produced per batch

1. **Individual claim PDF** — one per bill — filled using `pdf-lib`. Fields: patient demographics, NIN, HMO member ID, diagnosis, investigations (line items + subtotal), medications (line items + subtotal), total billed, 10% HMO administrative deduction, expected receivable, authorization code, doctor's name.
2. **Medical Director cover letter PDF** — one per batch — clinic letterhead, submission date, period covered, total claims count, total amount, Medical Director signature block, addressed to TPA.
3. **Merged PDF** — cover letter + all individual claims concatenated into a single PDF using `pdf-lib`'s `PDFDocument.copyPages()`.
4. **ZIP bundle** — `jszip` packages all artifacts into a single `.zip` download.

### HMO deduction calculation

```typescript
const hmoDeduction     = totalAmount * 0.10   // 10% administrative withholding
const expectedReceivable = totalAmount - hmoDeduction
```

This 10% is pre-calculated and displayed upfront on the bill — clinics typically discover this deduction only when the TPA payment arrives.

### Storage

Generated PDFs are uploaded to Convex file storage via `ctx.storage.store(blob)`. The returned `storageId` is converted to a serving URL via `ctx.storage.getUrl(storageId)` and saved on the `claim_batch` record:
```typescript
{
  mergedPdfStorageId: Id<"_storage">,
  zipBundleStorageId: Id<"_storage">,
  coverLetterStorageId: Id<"_storage">
}
```

### Batch lifecycle

```
draft → submitted → paid
              ↓ (+14 days, unpaid)
           overdue
```

`submittedAt + 14 days = expectedPaymentBy` (per NHIA SOP TPA payment window). The `claimsOverdueCheck` Inngest function runs daily and marks batches past this threshold as `overdue`.

---

## 10. Inngest — Durable Background Jobs

**Files:** `src/inngest/client.ts`, `src/inngest/events.ts`, `src/inngest/functions/`, `convex/http.ts`

### Client initialization

```typescript
export const inngest = new Inngest({
  id: "amelia",
  isDev: process.env.INNGEST_DEV === "1",
  signingKey: process.env.INNGEST_SIGNING_KEY
})
```

### HTTP endpoint

Inngest functions are served via a Convex HTTP action at `GET|POST|PUT /api/inngest`. Inngest Cloud calls this endpoint to register function definitions and dispatch function runs.

### Registered functions

| Function ID | Trigger event | Action |
|---|---|---|
| `auth-user-created` | `auth/user.created` | Sends Resend welcome email to new clinic user |
| `payment-confirmed` | `payment/confirmed` | Logs payment confirmation, creates notification |
| `bill-payment-link-sent` | `bill/payment_link.sent` | Logs payment request sent event |
| `claims-overdue-check` | `claims/overdue.check` (scheduled daily) | Marks claim batches >14 days old as `overdue`, creates alert notifications |
| `app-bootstrap-ping` | `app/bootstrap.ping` | Health check — verifies Inngest connection is live |

### Step execution

Each function uses `step.run()` to memoize individual steps. If a function fails mid-execution, Inngest retries from the last completed step:

```typescript
export const paymentConfirmed = inngest.createFunction(
  { id: "payment-confirmed" },
  { event: "payment/confirmed" },
  async ({ event, step }) => {
    await step.run("log-confirmation", async () => {
      // idempotent: safe to retry
    })
  }
)
```

---

## 11. Convex Database Schema

**File:** `convex/schema.ts`

12 tables with typed indexes for every access pattern:

| Table | Purpose | Key indexes |
|---|---|---|
| `clinics` | Clinic org data, bank account, NHIA facility code | `by_clerk_user_id` |
| `patients` | Demographics, NIN, HMO enrollment | `by_clinic`, `by_clinic_and_phone` |
| `bills` | Admission bills, status, payment tracking | `by_clinic`, `by_clinic_and_status`, `by_payment_link_token` |
| `bill_items` | Investigation/procedure line items | `by_bill` |
| `bill_medications` | Medication line items | `by_bill` |
| `hmo_coverages` | HMO enrollment snapshots + OCR audit trail | `by_patient`, `by_clinic_and_patient` |
| `hmo_templates` | Per-HMO claim form field definitions | `by_clinic`, `by_clinic_and_hmo_name` |
| `claim_batches` | Grouped claim submissions with PDF artifacts | `by_clinic`, `by_clinic_and_status` |
| `claim_batch_bills` | Bill ↔ batch mapping with per-bill score | `by_claim_batch`, `by_bill` |
| `tpa_submissions` | TPA submission tracking | `by_clinic_and_status` |
| `service_catalog` | Clinic service price list | `by_clinic`, `by_clinic_and_name` |
| `notifications` | In-app notifications (read/unread) | `by_recipient_and_read_state` |

---

## 12. Bill Status State Machine

```
[HMO bill created]  →  awaiting_auth
                             ↓ (auth code entered)
                        auth_confirmed
                             ↓ (payment initiated)
                       pending_payment
                             ↓ (webhook / callback)
[Self-pay created]  →       paid
                             ↓ (added to claim batch)
                           claimed

                          paid / claimed
                             ↓ (TPA payment overdue > 14 days)
                           overdue
```

---

## 13. HTTP Webhook Router

**File:** `convex/http.ts`

All inbound HTTP traffic enters through a Hono-based router exported as a Convex HTTP handler:

| Method | Path | Handler |
|---|---|---|
| `GET\|POST\|PUT` | `/api/inngest` | Inngest SDK serve handler |
| `POST` | `/api/webhooks/clerk` | Clerk signature verify → Inngest `auth/user.created` |
| `POST` | `/api/webhooks/interswitch` | HMAC-SHA512 verify → `processInterswitchWebhook` |
| `GET` | `/api/webhooks/meta` | WhatsApp verify token challenge |
| `POST` | `/api/webhooks/meta` | WhatsApp delivery status → `applyMetaPaymentRequestStatus` |
| `GET\|POST` | `/api/payments/interswitch/card-callback` | Card payment finalization → redirect |

---

## 14. Payment Link — Public Page

**Route:** `/pay/:token`
**File:** `src/pages/PaymentLink.tsx`

No authentication required. The token format is `pay_tok_{32-char UUID without hyphens}`. Convex query `getBillByPaymentLinkToken(token)` resolves it to a bill, returning patient name, clinic name, and amount.

The page offers:
1. **Card (Interswitch)** — calls `initiateCardPayment` action, receives hash + txnRef, submits form to Interswitch Web Checkout.
2. **OPay Wallet** — calls `initiateOPayPayment` action, receives redirect URL, opens in new tab.

On return, `/pay/callback/card` or `/pay/callback/opay` renders the success/failure state.

---

## 15. Environment Variables

### Frontend (`VITE_` prefix — bundled into client)
| Variable | Purpose |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk auth UI |
| `VITE_CONVEX_URL` | Convex client endpoint |
| `VITE_CONVEX_SITE_URL` | Convex HTTP actions base URL |
| `VITE_APP_URL` | Base URL for payment link construction |

### Convex backend (set via `npx convex env set KEY value` — never in `.env.local`)
| Variable | Purpose |
|---|---|
| `INTERSWITCH_MERCHANT_CODE` | Quickteller merchant identifier |
| `INTERSWITCH_PAY_ITEM_ID` | Pay item identifier |
| `INTERSWITCH_MAC_KEY` | SHA-512 hash signing key |
| `INTERSWITCH_WEBHOOK_SECRET` | HMAC-SHA512 webhook verification |
| `ISW_MARKETPLACE_CLIENT_ID` | Identity verification OAuth client |
| `ISW_MARKETPLACE_CLIENT_SECRET` | Identity verification OAuth secret |
| `ISW_MARKETPLACE_BASE_URL` | Marketplace API base URL |
| `MISTRAL_API_KEY` | OCR + structured extraction |
| `META_PHONE_NUMBER_ID` | WhatsApp business phone number |
| `META_ACCESS_TOKEN` | WhatsApp Cloud API bearer token |
| `META_WEBHOOK_VERIFY_TOKEN` | Webhook verification token |
| `META_GRAPH_API_VERSION` | e.g. `v23.0` |
| `INNGEST_EVENT_KEY` | Inngest event signing key |
| `INNGEST_SIGNING_KEY` | Inngest webhook verification |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk webhook verification |
| `RESEND_API_KEY` | Transactional email |
| `RESEND_FROM_EMAIL` | Sender address |
| `GROQ_API_KEY` | Claim scoring LLM |
