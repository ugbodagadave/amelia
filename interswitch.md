# Interswitch in Amelia

This document explains every Interswitch integration used in Amelia, why it exists, how the app uses it, where it lives in the codebase, and what guardrails are in place around it.

It complements [howitworks.md](./howitworks.md). `howitworks.md` is the full-system map; this file is the provider-specific deep dive for Interswitch.

## 1. Why Interswitch Matters in Amelia

Amelia is a revenue cycle product for Nigerian private clinics. Interswitch is used in three different parts of that workflow:

1. Card payment collection via Quickteller Business Web Checkout
2. Wallet payment collection via the OPay collection endpoints exposed through the same Interswitch collections surface
3. Identity verification via Interswitch Marketplace OAuth APIs

Those three integrations support different business jobs:

- Quickteller helps clinics collect patient payments without relying on cash at the point of care
- OPay gives staff an alternative payment path for patients who prefer wallet payments
- Marketplace verification reduces bad settlement-bank setup during onboarding and blocks unverified NIN-based HMO registration

## 2. Integration Map

| Capability | Provider Surface | Purpose in Amelia | Main Code |
|---|---|---|---|
| Card checkout | Quickteller Business Web Checkout | Start a hosted card payment session | [convex/payments.ts](/C:/Users/HP/amelia/convex/payments.ts), [src/lib/payments.ts](/C:/Users/HP/amelia/src/lib/payments.ts) |
| Card reconciliation | Interswitch signed webhook + browser callback | Reconcile hosted card payments safely | [convex/http.ts](/C:/Users/HP/amelia/convex/http.ts), [convex/payments.ts](/C:/Users/HP/amelia/convex/payments.ts) |
| OPay initialization | Interswitch collections OPay endpoint | Start wallet payment | [convex/payments.ts](/C:/Users/HP/amelia/convex/payments.ts) |
| OPay confirmation | Interswitch collections OPay status endpoint | Confirm wallet payment after redirect | [convex/payments.ts](/C:/Users/HP/amelia/convex/payments.ts) |
| Marketplace OAuth | Interswitch Passport OAuth | Obtain bearer token for verification APIs | [convex/lib/marketplace.ts](/C:/Users/HP/amelia/convex/lib/marketplace.ts) |
| Marketplace bank verification | Marketplace account resolve | Verify clinic settlement account | [convex/payments.ts](/C:/Users/HP/amelia/convex/payments.ts), [convex/lib/marketplace.ts](/C:/Users/HP/amelia/convex/lib/marketplace.ts) |
| Marketplace NIN verification | Marketplace NIN verification | Verify HMO patient identity before create | [convex/payments.ts](/C:/Users/HP/amelia/convex/payments.ts), [convex/lib/marketplace.ts](/C:/Users/HP/amelia/convex/lib/marketplace.ts) |

## 3. Quickteller Card Payments

### Purpose

Use Interswitch-hosted card checkout instead of collecting card details inside Amelia. This reduces PCI scope and lets the clinic send patients to a provider-hosted payment page.

### Flow

1. Staff opens a bill or a patient opens a public payment link
2. Amelia creates a payment session and an immutable `payment_attempts` record
3. Amelia generates the Quickteller SHA-512 request hash
4. The browser posts the hosted-checkout form to Interswitch
5. Interswitch redirects the browser back to Amelia's card callback URL
6. Interswitch separately sends a signed server-to-server webhook
7. Amelia marks the bill paid only after the signed webhook validates against the stored attempt

### Code Path

- Session building: [convex/payments.ts](/C:/Users/HP/amelia/convex/payments.ts)
- Hashing and shared helpers: [src/lib/payments.ts](/C:/Users/HP/amelia/src/lib/payments.ts)
- Browser callback route: [convex/http.ts](/C:/Users/HP/amelia/convex/http.ts)
- Callback page UI: [src/pages/PaymentCallbackCard.tsx](/C:/Users/HP/amelia/src/pages/PaymentCallbackCard.tsx)

### Transaction Reference Strategy

Amelia uses `buildTxnRef()` in [src/lib/payments.ts](/C:/Users/HP/amelia/src/lib/payments.ts) to produce a short Interswitch-compatible reference:

```ts
AM + last 13 digits of Date.now()
```

That reference is stored in the dedicated `payment_attempts` table, not treated as a mutable bill field of record.

### Request Signing

Quickteller Web Checkout uses SHA-512, not OAuth. Amelia computes:

```text
txnRef + merchantCode + payItemId + amountInKobo + redirectUrl + macKey
```

and hashes the resulting string with SHA-512 in `buildWebCheckoutHash()`.

### Security Model

Amelia intentionally does not trust the browser callback as proof of payment.

The callback only:
- records callback metadata
- updates attempt state to `callback_pending` when appropriate
- redirects the user to a result page

The bill is marked paid only when the signed webhook also confirms:
- `event === "TRANSACTION.COMPLETED"`
- `responseCode === "00"`
- `currency === "NGN"`
- `amountInKobo === expectedAmountInKobo`
- the payment channel is supported
- the referenced attempt exists

### Why the Payment Attempt Ledger Exists

The earlier single-field bill reference model was fragile. Restarting checkout could overwrite the bill's only transaction reference and make earlier sessions hard to reconcile.

Amelia now stores each initiation in `payment_attempts` with:
- `billId`
- `clinicId`
- `paymentChannel`
- `transactionReference`
- `amountInKobo`
- `amountInNaira`
- `paymentLinkToken`
- `paymentLink`
- callback metadata
- webhook metadata
- final status

That makes reconciliation deterministic even if users retry payment.

## 4. Interswitch Webhook Handling

### Endpoint

`POST /api/webhooks/interswitch`

Defined in [convex/http.ts](/C:/Users/HP/amelia/convex/http.ts) and delegated into `internal.payments.processInterswitchWebhook`.

### Signature Verification

Amelia verifies `X-Interswitch-Signature` against the raw request body using HMAC-SHA512 before it accepts the webhook.

Helper: `buildInterswitchWebhookSignature()` in [src/lib/payments.ts](/C:/Users/HP/amelia/src/lib/payments.ts)

### Payload Validation

After signature verification, Amelia validates business semantics, not just authenticity:

- the event must be `TRANSACTION.COMPLETED`
- the response code must be `00`
- currency must be `NGN`
- amount must equal the stored attempt amount
- channel must normalize to a supported Amelia payment channel

This second validation layer is important because a signed provider event can still represent a failed or irrelevant payment state.

### Callback vs Webhook

Browser callback and webhook serve different purposes:

- callback: user experience and attempt-state capture
- webhook: source of truth for card-payment final settlement

That split is deliberate and is one of the key release hardening changes in the project.

## 5. OPay Through the Interswitch Collections Surface

### Purpose

Some patients prefer wallet-style payment rather than entering card details. Amelia supports that through the OPay initialization and status-confirmation endpoints surfaced by Interswitch collections.

### Flow

1. Amelia creates a `payment_attempts` record
2. Amelia calls the OPay initialize endpoint
3. User is redirected to the returned payment URL
4. User returns to `/pay/callback/opay`
5. Amelia calls the OPay status endpoint with the stored transaction reference
6. On a successful result, Amelia marks the bill paid and finalizes the attempt

### Important Difference from Card Payments

There is no webhook path here in Amelia's current implementation. Confirmation is polling-driven from the callback page and any later manual retry.

### Code Path

- Initialization and confirmation: [convex/payments.ts](/C:/Users/HP/amelia/convex/payments.ts)
- Callback UI: [src/pages/PaymentCallbackOpay.tsx](/C:/Users/HP/amelia/src/pages/PaymentCallbackOpay.tsx)

## 6. Interswitch Marketplace OAuth

### Purpose

Marketplace powers the identity-verification surfaces in Amelia:

- clinic settlement-bank verification
- patient NIN verification for HMO registration

### Token Acquisition

Amelia obtains a bearer token from:

`POST {ISW_MARKETPLACE_BASE_URL}/passport/oauth/token`

with:
- `Authorization: Basic base64(clientId:clientSecret)`
- `Content-Type: application/x-www-form-urlencoded`
- body `grant_type=client_credentials`

Implementation: [convex/lib/marketplace.ts](/C:/Users/HP/amelia/convex/lib/marketplace.ts)

### Token Caching

Tokens are cached in process memory using:

```ts
issuedAt + expiresInSeconds * 1000 - 60_000
```

This avoids re-authenticating on every verification call while still renewing before the provider expiry window.

### Why This Matters

Without token caching, every bank verification and NIN verification would first pay an extra auth round trip. For a hackathon app that becomes a noticeable latency penalty under repeated use.

## 7. Marketplace Bank Verification

### Purpose

Prevent clinics from finishing onboarding or settings changes with an unverified settlement account.

### User-Facing Flow

1. User selects a bank and enters a 10-digit account number
2. Amelia validates the local format first
3. Amelia calls Marketplace account resolve
4. Amelia checks that a real non-empty `accountName` came back
5. Amelia persists the verified account details and provider metadata on the clinic record

### Data Stored on `clinics`

- `bankCode`
- `bankName`
- `accountNumber`
- `accountName`
- `bankAccountVerifiedAt`
- `bankVerificationProvider`
- `bankVerificationReference`

### Guardrails

- write paths now funnel through the verified onboarding/settings actions
- legacy bypass mutations should not be used
- false-positive empty payloads are rejected
- request timeouts are normalized into user-friendly failures

## 8. Marketplace NIN Verification

### Purpose

For HMO patients, Amelia verifies NIN server-side before the patient record is created.

### Current Contract

Amelia sends:
- `firstName`
- `lastName`
- `nin`

to the Marketplace NIN verification endpoint and accepts the result as verified only when the match status resolves to `EXACT_MATCH`.

### Data Stored on `patients`

- `nin`
- `ninVerificationStatus`
- `ninVerificationProvider`
- `ninVerifiedAt`
- `ninVerificationMatchStatus`
- `ninVerificationReference`

### Security Note

The verification action itself is authenticated and is not intended to be an anonymous proxy for Marketplace credentials.

## 9. Environment Variables Used by Interswitch Integrations

### Quickteller / collections

- `INTERSWITCH_MERCHANT_CODE`
- `INTERSWITCH_PAY_ITEM_ID`
- `INTERSWITCH_MAC_KEY`
- `INTERSWITCH_WEBHOOK_SECRET`
- `INTERSWITCH_WEBHOOK_URL`

### Marketplace

- `ISW_MARKETPLACE_CLIENT_ID`
- `ISW_MARKETPLACE_CLIENT_SECRET`
- `ISW_MARKETPLACE_BASE_URL`

### Supporting app URLs

- `VITE_APP_URL`
- `VITE_CONVEX_SITE_URL`
- `CONVEX_SITE_URL`

## 10. Related Data Model

The main Interswitch-related records live in:

- `bills`: current bill-level payment state and public payment-link metadata
- `payment_attempts`: immutable ledger of payment initiation and reconciliation
- `clinics`: verified settlement-bank metadata
- `patients`: verified NIN metadata
- `marketplace_banks`: backend cache of Marketplace bank-list data

Schema source: [convex/schema.ts](/C:/Users/HP/amelia/convex/schema.ts)

## 11. Public Payment Links and Interswitch

Interswitch card checkout is available from both staff-assisted bill detail pages and public payment links.

Public link rules:
- token format must pass validation
- bill must not already be `paid` or `claimed`
- token expires after 7 days

That logic lives in `validatePaymentLinkToken()` and `isPublicPaymentLinkAvailable()` in [src/lib/payments.ts](/C:/Users/HP/amelia/src/lib/payments.ts).

## 12. What Amelia Does Not Use from Interswitch

To avoid confusion, Amelia does not currently use:

- tokenized recurring card payments
- virtual accounts
- direct card capture inside Amelia
- Marketplace bank-list loading in the current UI path

The UI bank selector now reads the static catalog in [data/nigerian-banks.ts](/C:/Users/HP/amelia/data/nigerian-banks.ts), even though the backend still keeps a Marketplace bank-list cache.

## 13. Operational Notes

- Sandbox base for Marketplace OAuth is `https://qa.interswitchng.com`
- Marketplace routing calls use `https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1`
- Quickteller callback URL is generated from the configured Convex site base
- OPay confirmation depends on active polling from Amelia, not a provider webhook
- For card payments, missing webhook delivery can leave the callback page successful while settlement remains pending

## 14. Code Reading Guide

If you are reviewing the integration in source order, start here:

1. [src/lib/payments.ts](/C:/Users/HP/amelia/src/lib/payments.ts)
2. [convex/lib/marketplace.ts](/C:/Users/HP/amelia/convex/lib/marketplace.ts)
3. [convex/payments.ts](/C:/Users/HP/amelia/convex/payments.ts)
4. [convex/http.ts](/C:/Users/HP/amelia/convex/http.ts)
5. [src/pages/PaymentCallbackCard.tsx](/C:/Users/HP/amelia/src/pages/PaymentCallbackCard.tsx)
6. [src/pages/PaymentCallbackOpay.tsx](/C:/Users/HP/amelia/src/pages/PaymentCallbackOpay.tsx)
