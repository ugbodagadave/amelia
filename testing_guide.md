# Amelia — Judge Testing Guide

**Live app:** [https://app.getamelia.online](https://app.getamelia.online)

Amelia runs against Interswitch sandbox and test credentials. No live money moves. All payment responses are simulated.

---

## Sign In

A shared reviewer account has been pre-configured with a fully seeded clinic workspace. Use these credentials:

| Field | Value |
|-------|-------|
| Email | `esther@getamelia.online` |
| Password | `inter@amelia` |

> Sign in is handled by Clerk. If prompted for a verification code, use the email above — it is a real inbox.

After signing in you will land directly inside **Apex Specialist Clinic** — no onboarding steps required.

---

## What You Will Find

The workspace has been pre-seeded with realistic data:

- A patient roster with realistic Nigerian demographics
- A mix of **self-pay** and **HMO** bills across multiple statuses
- A pending self-pay bill ready for payment flow testing
- Paid bill history showing card and OPay transactions
- HMO bills covering `awaiting auth`, `auth confirmed`, and `claimed` states
- An overdue claim batch so dashboard metrics and claims tracking are populated
- A verified payout bank account (GTBank · `1000000000` · `MICHAEL JOHN DOE`)
- NHIA/HCP code `NHIA-1029` pre-entered in settings

---

## Scenarios to Test

### 1. Dashboard

Sign in and review the revenue dashboard. It shows real-time collections, outstanding bills, claim status breakdown, and overdue TPA payment alerts — all drawn from the seeded data.

---

### 2. WhatsApp Payment Request

This is the primary collection flow. A bill is sent to the patient's WhatsApp number as an approved payment-request template, and the patient pays through a public link without logging in.

**Steps:**

1. Go to **Patients** and register a new self-pay patient using your own Nigerian mobile number
2. Go to **Bills**, create a bill for that patient, and open the bill detail page
3. Click **Send payment request** — Amelia sends the `bill_payment_request_v2` WhatsApp template to the number you entered
4. Open WhatsApp on your phone and receive the message
5. Tap the payment link in the message — it opens the public Amelia payment page at `https://app.getamelia.online/pay/…`

> **Note on card payment:** The hosted Interswitch card checkout is currently experiencing a sandbox-side issue with our merchant account configuration. The payment page loads and the form submits correctly, but Interswitch's sandbox returns an error before the card entry screen. This is a known sandbox limitation, not a code defect — the integration is correctly implemented against the Quickteller Business API spec.

---

### 3. Bank Account Verification

Go to **Settings → General settings**.

Enter these details:

| Field | Value |
|-------|-------|
| Bank | Guaranty Trust Bank |
| Account number | `1000000000` |

Expected: Amelia resolves the account name as **MICHAEL JOHN DOE** via the Interswitch Marketplace bank verification API.

---

### 4. NIN Verification

Go to **Patients** and create a new HMO patient.

Use these sandbox identity details:

| Field | Value |
|-------|-------|
| First name | `Bunch` |
| Last name | `Dillon` |
| NIN | `63184876213` |

Expected: NIN verification succeeds and patient registration proceeds. Amelia calls the Interswitch Marketplace NIN verification API and matches the name against the NIMC record.

---

### 5. HMO Claims Flow

Open an HMO bill with status **Auth confirmed**. Review the claim scoring panel — Amelia uses a Groq LLM to score completeness and surface any blocking issues.

Click **Generate claim PDF** to produce the auto-filled HMO claims form and Medical Director cover letter. Both are bundled into a downloadable ZIP.

---

### 6. Existing Seeded Bills

If time is short, the pre-seeded workspace already contains a pending self-pay bill. Open it from **Bills**, click **Send payment request**, and walk through the WhatsApp delivery flow without creating a new patient.

---

## Sandbox Credentials (for Payment Testing)

| Channel | Test credentials |
|---------|-----------------|
| Interswitch card | Card `5061050254756707864` · Expiry `06/26` · CVV `111` · PIN `1111` |
| OPay wallet | Phone `1259257649` · PIN `123456` · OTP `315632` (success) |

> These credentials are for the Interswitch and OPay sandbox environments only.

---

## Known Sandbox Limitations

| Feature | Status |
|---------|--------|
| Interswitch card checkout | Payment page submits correctly; sandbox merchant returns an error before card entry — known sandbox account configuration issue |
| OPay wallet | Sandbox endpoint occasionally drops connections; confirmed working in pre-submission testing |
| WhatsApp delivery | Live — real messages sent via Meta WhatsApp Cloud API |
| NIN verification | Live against Interswitch Marketplace sandbox |
| Bank verification | Live against Interswitch Marketplace sandbox |
| Settlement / live payouts | Disabled — sandbox only |
