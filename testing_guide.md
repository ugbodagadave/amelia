# Amelia Testing Guide

Last updated: March 27, 2026

Amelia is running against sandbox and test credentials for submission.

- Interswitch payments: sandbox only
- Interswitch Marketplace NIN and bank verification: sandbox only
- OPay: sandbox only
- WhatsApp payment messaging: Meta Cloud API test configuration
- No live settlement or live virtual account flow is enabled

## Shared Reviewer Account

- App URL: `https://app.getamelia.online`
- Shared account email: `esther@getamelia.online`
- Shared account password: set this before submission and replace it here

Reviewer access model:

- Reviewers sign in with the shared account above
- The workspace is pre-seeded programmatically in Convex production
- Client Trust is disabled in Clerk for this submission flow

## What Reviewers Should Test

### 1. Dashboard And Seeded Workspace

After signing in, reviewers should land inside a fully configured clinic workspace for:

- `Apex Specialist Clinic`
- NHIA / HCP code: `NHIA-1029`
- verified payout bank:
  - bank: `Guaranty Trust Bank`
  - bank code: `058`
  - account number: `1000000000`
  - resolved name: `MICHAEL JOHN DOE`

The seeded workspace contains:

- female-first patient roster with realistic demographics
- one self-pay pending-payment bill for payment flow testing
- paid bill history across card and OPay
- HMO bills covering `awaiting_auth`, `auth_confirmed`, and `claimed`
- one overdue claim batch so dashboard and claims tracking are populated

### 2. Bank Verification

Go to `Settings` → `General settings`.

Use:

- bank: `Guaranty Trust Bank`
- bank code: `058`
- account number: `1000000000`

Expected result:

- Amelia resolves the account name as `MICHAEL JOHN DOE`

### 3. NIN Verification

Go to `Patients` and create a new HMO patient.

Use these sandbox identity details:

- first name: `Bunch`
- last name: `Dillon`
- NIN: `63184876213`

Expected result:

- NIN verification succeeds
- patient registration can continue

Note:

- the Interswitch sandbox response contains a base64 photo field internally, but Amelia should not expose that field in reviewer-facing flows

### 4. WhatsApp Payment Flow

Preferred reviewer path:

1. Create a fresh self-pay patient with the reviewer’s own Nigerian mobile number
2. Create a bill for that patient
3. Open the bill detail page
4. Click `Send payment request`
5. Receive the WhatsApp payment message
6. Open the Amelia payment link from WhatsApp

Why this path is preferred:

- it proves the full collection flow on the reviewer’s own device
- it avoids having to edit seeded patient phone numbers

### 5. Existing Seeded Bill Flow

If time is short, reviewers can also inspect the existing seeded pending self-pay bill in the Bills workspace and trigger the payment request path from there.

## Operator Commands

These are for the demo operator, not reviewers.

### Seed the shared production workspace

Required Convex production env var:

```powershell
npx convex env set DEMO_WORKSPACE_ADMIN_SECRET "replace-with-a-strong-secret" --prod
```

Local command to seed production:

```powershell
$env:DEMO_WORKSPACE_ADMIN_SECRET="replace-with-the-same-secret"
bun run demo:seed:prod
```

Optional override if you ever change the shared account email:

```powershell
$env:DEMO_SHARED_ACCOUNT_EMAIL="esther@getamelia.online"
```

### Local Meta WhatsApp smoke test

This uses the pre-seeded self-pay smoke bill, rewrites that patient phone number to your test number, and sends the live Meta template through Amelia’s existing payment-request flow.

Local script path:

- `scripts/local/send-meta-payment-test.ts`

Command:

```powershell
$env:DEMO_WORKSPACE_ADMIN_SECRET="replace-with-the-same-secret"
$env:META_SMOKE_PHONE="2349067748876"
bun run scripts/local/send-meta-payment-test.ts
```

Expected output:

- `billId`
- `patientId`
- `paymentUrl`
- `messageId`

## Important Submission Notes

- Shared reviewers should not complete onboarding manually if the production workspace has already been seeded.
- Rerunning the seed resets the shared clinic workspace for `esther@getamelia.online`.
- Payment and identity responses are sandbox responses only and should be described as such to judges.
