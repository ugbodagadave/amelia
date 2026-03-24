# Amelia — API Contracts & Integration Reference

Exact request/response shapes for every external API used in Amelia. Use this as the source of truth when writing Convex actions.

---

## 1. Interswitch Marketplace — OAuth Token (Identity APIs Only)

**Endpoint:** `POST https://qa.interswitchng.com/passport/oauth/token`
**Auth:** Basic Auth (Base64 encoded `clientId:secretKey`)

> **Note:** This token is for Marketplace APIs (NIN, bank verification) only. The Quickteller Business payment system does NOT use OAuth — it uses SHA-512 hash signing.

**Request:**
```
Headers:
  Authorization: Basic {base64(ISW_MARKETPLACE_CLIENT_ID:ISW_MARKETPLACE_CLIENT_SECRET)}
  Content-Type: application/x-www-form-urlencoded

Body:
  grant_type=client_credentials
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "scope": "profile"
}
```

**Usage:** Cache `access_token` in Convex with `expiresAt = Date.now() + (expires_in * 1000) - 60000` (subtract 60s buffer). Reuse until expiry.

---

## 2. Interswitch Virtual Account — Dynamic Mode

> **⛔ BLOCKED** — This API requires separate Payment Gateway OAuth credentials not available via self-serve. Use Web Checkout + OPay instead for the hackathon.

**Endpoint:** `POST https://qa.interswitchng.com/paymentgateway/api/v1/payable/virtualaccount`
**Auth:** Bearer token from Passport

**Request:**
```json
{
  "merchantCode": "YOUR_MERCHANT_CODE",
  "payableCode": "YOUR_PAYABLE_CODE",
  "amount": 4100000,
  "customerName": "Emeka Okafor",
  "customerEmail": "emeka@example.com",
  "customerMobile": "08012345678",
  "transactionReference": "BILL-2026-00441",
  "currencyCode": "566",
  "requestDate": "2026-03-13T14:30:00"
}
```

**Notes:**
- `amount` is in **kobo** (multiply naira by 100): ₦41,000 → `4100000`
- `transactionReference` should be your bill ID for easy webhook matching
- `currencyCode`: `566` = NGN

**Response (200):**
```json
{
  "responseCode": "90000",
  "responseDescription": "Approved by Financial Institution",
  "bankName": "GTBank",
  "accountNumber": "0123456789",
  "accountName": "AMELIA/Emeka Okafor",
  "amount": 4100000,
  "expiryDate": "2026-03-14T14:30:00",
  "transactionReference": "BILL-2026-00441"
}
```

**Store on bill:**
- `virtualAccountNumber` ← `accountNumber`
- `virtualAccountBank` ← `bankName`
- `interswitchRef` ← `transactionReference`

---

## 3. Interswitch Web Checkout (Card Payment)

**Auth:** SHA-512 hash signing — no OAuth token required.

**Parameters:**

| Parameter          | Description                                      |
|--------------------|--------------------------------------------------|
| `merchant_code`    | Your Quickteller Business merchant code          |
| `txn_ref`          | Transaction reference (≤15 characters)           |
| `product_id`       | Same as your payable code                        |
| `amount`           | Amount in **kobo** (₦41,000 → `4100000`)        |
| `currency`         | `566` (NGN)                                      |
| `site_redirect_url`| URL to redirect after payment                    |
| `pay_item_id`      | Pay item identifier (same as payable code)       |
| `hash`             | SHA-512 hash for request integrity               |

**Hash Computation:**

```
SHA512(txnref + product_id + pay_item_id + amount + site_redirect_url + mac_key)
```

> **Important:** No separators between fields — concatenate directly.

```typescript
import { createHash } from "crypto";

const raw = txnref + product_id + pay_item_id + amount + site_redirect_url + mac_key;
const hash = createHash("sha512").update(raw).digest("hex");
```

**Endpoint:**

```
POST https://newwebpay.qa.interswitchng.com/collections/w/pay
```

Submit as an HTML form POST with the parameters above (including the computed `hash`).

**Redirect Response:**

After payment, Interswitch redirects back to `site_redirect_url` with query parameters:

```
?txnref=XX&payRef=XX&ResponseCode=00
```

- `ResponseCode=00` → Approved / Successful
- Any other code → Failed or pending

**Sandbox Test Card:**

```
Card Number: 5061050254756707864
Expiry:      06/26
CVV:         111
PIN:         1111
```

---

## 4. OPay Wallet Payment

### Initialize Payment

```
POST https://qa.interswitchng.com/collections/api/v1/opay/initialize
Content-Type: application/json
```

> No `Authorization` header required.

**Request:**
```json
{
  "merchantCode": "YOUR_MERCHANT_CODE",
  "payableCode": "YOUR_PAYABLE_CODE",
  "amount": 4100000,
  "transactionReference": "AM1234567890123"
}
```

**Response (200):**
```json
{
  "responseCode": "09",
  "redirectUrl": "https://sandboxcashier.opaycheckout.com/...",
  "authenticationType": "REDIRECT"
}
```

Redirect the user to `redirectUrl` to complete payment in OPay.

The initialize response does not provide a reliable merchant callback hook in sandbox. Amelia should keep the bill page open, launch OPay in a new tab/window, then confirm status from the app with the saved `transactionReference`.

### Check Payment Status

```
POST https://qa.interswitchng.com/collections/api/v1/opay/status
Content-Type: application/json
```

**Request:**
```json
{
  "reference": "AM1234567890123"
}
```

**Response (200):**
```json
{
  "responseCode": "00"
}
```

- `responseCode: "00"` → Payment confirmed
- Any other code → Not yet paid / failed

### Sandbox Credentials

| Field | Value              |
|-------|--------------------|
| Phone | `1259257649`       |
| PIN   | `123456`           |
| OTP (success) | `315632`  |
| OTP (failure) | `315633`  |

---

## 5. Interswitch Webhook — TRANSACTION.COMPLETED

**Direction:** Interswitch → Your endpoint
**Your endpoint:** `POST /api/webhooks/interswitch` (Convex HTTP Action)

**Payload:**
```json
{
  "event": "TRANSACTION.COMPLETED",
  "data": {
    "transactionReference": "BILL-2026-00441",
    "amount": 4100000,
    "currency": "NGN",
    "narration": "AMELIA/Emeka Okafor",
    "responseCode": "00",
    "paymentReference": "ISW-20260313-XXXXXXXX",
    "channel": "BANK_TRANSFER",
    "completedAt": "2026-03-13T15:42:00"
  }
}
```

**Channels:** `BANK_TRANSFER` | `CARD` | `USSD` | `WALLET`

**Signature Verification:**
```typescript
// Interswitch sends signature in header: X-Interswitch-Signature
// Verify with HMAC-SHA512
import { createHmac } from 'crypto';

const signature = request.headers.get('X-Interswitch-Signature');
const body = await request.text();
const expected = createHmac('sha512', INTERSWITCH_WEBHOOK_SECRET)
  .update(body)
  .digest('hex');

if (signature !== expected) {
  return new Response('Unauthorized', { status: 401 });
}
```

**Response:** Always return `200` within 5 seconds. Interswitch retries on non-200 or timeout.

---

## 6. NIN Verification (Marketplace)

**Endpoint:** `POST https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/nin`
**Auth:** Bearer token from Marketplace OAuth (Section 1)

**Request:**
```json
{
  "firstName": "Emeka",
  "lastName": "Okafor",
  "nin": "12345678901"
}
```

**Response (200):**
```json
{
  "nin_check": {
    "status": "EXACT_MATCH"
  },
  "gender": "Male",
  "phone": "080****5678",
  "photo": "/9j/4AAQSkZJRgABAQ..."
}
```

**Status values:**
- `"EXACT_MATCH"` — First name + last name match NIN records
- `"NOT_MATCH"` — Name does not match NIN records

**Notes:**
- `phone` is masked for privacy
- `photo` is a base64-encoded JPEG image from the NIN database

---

## 7. Bank Account Verification (Marketplace)

### Step 1: Get Bank List

```
GET https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/account-number/bank-list
Authorization: Bearer {marketplace_token}
```

**Response (200):**
```json
[
  { "name": "Access Bank", "code": "044" },
  { "name": "GTBank", "code": "058" },
  { "name": "First Bank", "code": "011" },
  ...
]
```

> Returns 100+ banks. Cache this list — it rarely changes.

### Step 2: Resolve Account Number

```
POST https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/account-number/resolve
Authorization: Bearer {marketplace_token}
Content-Type: application/json
```

**Request:**
```json
{
  "accountNumber": "0123456789",
  "bankCode": "058"
}
```

**Response (200):**
```json
{
  "bankDetails": {
    "accountName": "MICHAEL JOHN DOE"
  }
}
```

**Usage:** Display the resolved `accountName` back to the user for confirmation before proceeding.

---

## 8. Africa's Talking SMS

**Package:** `africastalking`

**Install:** `bun add africastalking`

**Usage:**
```typescript
import AfricasTalking from "africastalking";

const at = AfricasTalking({
  username: process.env.AT_USERNAME,
  apiKey: process.env.AT_API_KEY,
});

const sms = at.SMS;

const result = await sms.send({
  to: ["+2348012345678"],   // international format with + prefix
  message: "Your bill at Bright Life Clinic is ₦41,000.\nPay online: https://amelia.vercel.app/pay/AM1234567890123"
  // In sandbox: omit `from` entirely — empty string fails Joi validation
  // In production: from: "Amelia"
});
```

**Response:**
```json
{
  "SMSMessageData": {
    "Recipients": [
      {
        "statusCode": 101,
        "status": "Success",
        "messageId": "ATXid_abc123..."
      }
    ]
  }
}
```

**Phone normalization:** `08012345678` → `+2348012345678` (add `+234`, drop leading `0`)

```typescript
function normalizeNigerianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '+234' + digits.slice(1);
  if (digits.startsWith('234')) return '+234' + digits.slice(3);
  return '+234' + digits;
}
```

---

## 9. Mistral OCR

**Endpoint:** `POST https://api.mistral.ai/v1/ocr`
**Auth:** Bearer API key

**Request:**
```json
{
  "model": "mistral-ocr-latest",
  "document": {
    "type": "base64_encoded",
    "data": "base64encodedfilehere...",
    "media_type": "image/jpeg"
  }
}
```

**Accepted media types:** `image/jpeg` | `image/png` | `image/webp` | `application/pdf`

**Response:**
```json
{
  "id": "ocr-xxxx",
  "object": "ocr.result",
  "pages": [
    {
      "index": 0,
      "markdown": "## POLICE HEALTH MAINTENANCE LIMITED\n\nName of Enrollee: **CHUKWUDI EZE**\nForce No: **PN-34521**\nNHIS No: **PHML-4421**\n..."
    }
  ],
  "usage": {
    "pages_processed": 1
  }
}
```

**Post-processing:** Take `pages[0].markdown` and send to Claude or Mistral with a structured extraction prompt to get clean JSON.

**Extraction prompt template:**
```
Extract the following fields from this HMO card or pre-authorization document. Return ONLY valid JSON, no other text.

Fields to extract:
- hmo_name (string)
- member_id (string)
- enrollee_name (string)
- nhis_number (string)
- authorization_code (string, if present)
- coverage_type (string, e.g. "Outpatient", "Inpatient", "Comprehensive")
- coverage_limit (number, in NGN, if present)
- additional_ids (object, any other ID fields found e.g. force_no, ap_no, command)

Return empty string "" for fields not found. Never return null or undefined.

Document text:
{markdown_text}
```

---

## 10. Inngest Functions Reference

**Event names (string constants — define in `inngest/events.ts`):**

```typescript
export const EVENTS = {
  BILL_CREATED:          'bill/created',
  PAYMENT_CONFIRMED:     'payment/confirmed',
  BILL_OVERDUE:          'bill/overdue',
  CLAIM_BATCH_SUBMITTED: 'claims/batch.submitted',
  CLAIMS_OVERDUE_CHECK:  'claims/overdue.check',
  AUTH_PENDING_REMINDER: 'auth/pending.reminder',
} as const;
```

**Send event from Convex action:**
```typescript
await inngest.send({
  name: EVENTS.BILL_CREATED,
  data: {
    billId: bill._id,
    patientPhone: patient.phone,
    clinicName: clinic.name,
    amount: bill.totalAmount,
    paymentLink: bill.paymentLink,
  }
});
```

**Function definition pattern:**
```typescript
export const onBillCreated = inngest.createFunction(
  { id: 'send-payment-sms', retries: 3 },
  { event: EVENTS.BILL_CREATED },
  async ({ event, step }) => {
    await step.run('send-sms', async () => {
      await sendSMS({
        to: event.data.patientPhone,
        message: formatPaymentSMS(event.data),
      });
    });
  }
);
```

---

## 11. E2B — PDF Generation Sandbox

**Install:** `bun add @e2b/code-interpreter`

**Usage pattern for Puppeteer PDF:**
```typescript
import { CodeInterpreter } from '@e2b/code-interpreter';

const sandbox = await CodeInterpreter.create({ apiKey: E2B_API_KEY });

const result = await sandbox.notebook.execCell(`
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(\`${htmlContent}\`);
const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
await browser.close();

// Write to file so we can download it
const fs = require('fs');
fs.writeFileSync('/tmp/output.pdf', pdfBuffer);
console.log('PDF_READY');
`);

const pdfBytes = await sandbox.downloadFile('/tmp/output.pdf');
await sandbox.close();
```

---

## 12. Firecrawl — HMO Directory Scraping

**Install:** `bun add @mendable/firecrawl-js`

**Usage:**
```typescript
import FirecrawlApp from '@mendable/firecrawl-js';

const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

const result = await app.scrapeUrl('https://nhia.gov.ng/hmos', {
  formats: ['markdown'],
  onlyMainContent: true,
});

console.log(result.markdown); // pass to Claude for structured extraction
```

---

## 13. Internal Convex API Conventions

### Naming
- Queries: `get{Resource}`, `list{Resource}s`, `getDashboard{X}`
- Mutations: `create{Resource}`, `update{Resource}`, `delete{Resource}`
- Actions: verb-first — `generateVirtualAccount`, `sendPaymentSMS`, `processWebhook`
- HTTP Actions: mounted at `/api/{resource}/{action}`

### Error Handling
```typescript
// In Convex mutations/actions
if (!resource) {
  throw new ConvexError({ code: 'NOT_FOUND', message: `Bill ${billId} not found` });
}
```

### Auth Pattern (Every Mutation/Query)
```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new ConvexError({ code: 'UNAUTHORIZED' });
const clinicId = identity.clinicId as Id<'clinics'>; // stored in Clerk metadata
```
