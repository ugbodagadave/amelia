# SPEC_AMELIA.md
# Amelia — AI-Powered Revenue Cycle Management for Nigerian Private Clinics
### Enyata x Interswitch Buildathon 2026 | Tracks: Payment (P) + Health (H) + Emerging Technology
### Last updated: March 26, 2026

---

## 1. THE IDEA IN ONE SENTENCE

Amelia is an AI-powered billing, payment collection, and insurance claims platform for Nigerian private clinics — built on Interswitch's payment infrastructure — that eliminates revenue leakage by digitizing the full patient payment cycle: from bill generation to Interswitch-powered payment collection, to auto-generated, correctly formatted HMO/NHIA claims submissions.

---

## PUBLIC SITE SURFACE

Amelia's public experience now extends beyond the landing page into linked product and governance pages so the hackathon demo has a complete trust and positioning layer, not just a hero section.

### Landing Page Attribution

- The landing hero includes a subtle editorial ribbon reading: **Built at Interswitch Beyond the Rails Hackathon 2026**
- This marker sits above the hero headline on desktop, tablet, and mobile instead of floating as a pill badge
- Alternative directions retained for future iterations: **Corner Ledger** and **Status Ticker**

### Product Pages

- **Revenue Cycle** — explains how Amelia reduces revenue leakage from structured billing through collection and reconciliation
- **HMO Management** — explains authorization tracking, enrollee context, and insurer-facing workflow discipline
- **Claims Processing** — explains claim readiness, completeness, and submission tracking for Nigerian private clinics

### Governance Pages

- **Privacy Policy** — covers clinic, patient, billing, and claims-related data handling in product terms
- **Terms of Service** — defines clinic responsibility, acceptable use, and service boundaries
- **Clinical Ethics** — states Amelia's stance on clinician primacy, patient dignity, and responsible automation
- **Security Whitepaper** — summarizes Amelia's access control, payment boundary, and data-handling posture

### Content Direction

- Product pages should read like operator-facing explanations for clinic owners and judges
- Governance pages should feel credible and trust-building without pretending to be final legal counsel or formal certification
- All copy should stay specific to Amelia's core mission: AI-powered revenue cycle management for Nigerian private clinics

---

## 2. WHY THIS EXISTS: THE PROBLEM

### The Nigerian Healthcare Billing Reality

- **70% of Nigerians pay healthcare costs out-of-pocket** (PMC/NCBI, 2023). No insurer buffer between hospital and patient wallet.
- Nigeria's **National Health Insurance Act (2022)** is expanding HMO and NHIA coverage to 83M+ previously uninsured Nigerians — creating a tidal wave of insurance claims that private clinics are completely unprepared to process.
- Private clinics run **manual, paper-based billing**. Receipts written by hand. Auth codes received on WhatsApp. Month-end claims compiled by a single clerk over 3 days.
- **Patient detention** — holding patients until bills are paid — is a documented, rising practice that is a direct symptom of broken cash collection infrastructure (Global Health NOW, 2023).

### Where the Money Disappears (The Exact Leak Points)

Based on primary research with an active HMO authorization officer, the revenue loss chain looks like this:

```
Procedure performed
    ↓
Auth code requested from HMO via WhatsApp/phone call
    ↓
Auth code arrives → saved in WhatsApp, possibly a notebook
    ↓
Weeks pass
    ↓
Month-end: clerk tries to compile claim
    ↓
Auth code cannot be found for 30-40% of procedures
    ↓
Claim submitted without auth code
    ↓
TPA rejects that line item
    ↓
Hospital loses that revenue permanently
```

This is not negligence. It is the absence of a system that connects pre-authorization to billing to claim compilation. **Amelia is that system.**

### The NHIA SOP Reality (Official Government Process)

From the NHIA Standard Operating Procedure for Claims Submission, Review and Payment:

- Claims must include: patient NIN, diagnosis and treatment, itemized service breakdown, admission/discharge dates
- Each batch submission requires a **cover letter signed by the Medical Director**
- Claims flow: **Hospital → TPA (Third Party Administrator) → NHIA**
- TPAs disburse funds to facilities within **14 days** of verified claims
- TPAs verify NIN before approving any claim — missing NIN = automatic rejection
- Submission cadence: **weekly** for NHIA CEmONC program; monthly for most private HMOs

Amelia captures every one of these requirements in its data model and output generation.

---

## 3. PROOF THIS IS A GOOD IDEA

### US Market Validation — The Category Is Massively Proven

> *"AI-backed revenue cycle management companies have raised more than $1.2 billion in venture capital since 2021."*
> — MedTech Dive, November 2025

> *"92% of healthcare leaders indicate their top priority is to invest in AI and advanced automation for RCM."*
> — Waystar/Qualtrics Survey of 600 RCM Leaders, March 2025

> *"Outsourced medical billing is a massive $15 billion industry, growing at about 13% per year."*
> — Fierce Healthcare / Procode AI, March 2026

### Comparable Funded Companies

| Company | Focus | Status |
|---|---|---|
| AKASA | GenAI for claims, prior auth, coding | $85M+ raised |
| Waystar | Enterprise RCM platform | NASDAQ: WAY (public) |
| Abridge | Clinical documentation AI | $550M+ raised |
| FinThrive | Agentic AI for RCM workflows | Enterprise |
| Procode AI | AI RCM for surgical billing | Funded 2026 |

**None of these operate in Africa. The entire category is open.**

### Why Interswitch Judges Will Love This

Amelia is built **on** Interswitch infrastructure, not beside it. Every payment that flows through Amelia adds transaction volume to Interswitch's rails. The product demonstrates their Payment Gateway, Web Checkout, and Webhook infrastructure solving a deeply Nigerian problem in the highest-value vertical imaginable: healthcare. Judges see their own APIs working in the real world.

Amelia simultaneously hits **three hackathon tracks: P (Payment) + H (Health) + Emerging Technology.** That is the strongest multi-track coverage possible from a solo build.

---

## 4. THE PRODUCT: WHAT GETS DELIVERED AT DEMO

A working web application deployed on Vercel that a private clinic's front desk staff can open right now and use to: register a patient, log a bill, collect payment through Interswitch channels, track authorization codes, and generate a correctly formatted, auto-filled HMO claims PDF and accompanying Medical Director cover letter — ready to email to the TPA.

### Core Modules

| Module | Description |
|---|---|
| **Patient Registration** | Capture patient demographics including NIN — required for NHIA claim approval |
| **Bill Builder** | Log services, investigations, medications with amounts from a service catalog |
| **Auth Code Tracker** | Flag every HMO procedure as "awaiting auth." Lock bill until auth code is entered. Never lose one again. |
| **Interswitch Payment Collection** | WhatsApp-first payment requests that open Amelia's public payment page, with Web Checkout (card) and OPay wallet settlement reconciled in real time |
| **HMO Claims Generator** | One-click export: auto-filled claims form PDF + Medical Director cover letter, per HMO template |
| **TPA Submission Tracker** | Log when claim was sent, to which TPA, and track the 14-day payment window |
| **Revenue Dashboard** | Real-time: collections today, outstanding bills, claim submission status, overdue TPA payments |

---

## 5. HMO CLAIMS FORM — UNIVERSAL FIELD STRUCTURE

Research across two real Nigerian HMO claims forms (Police HMO and Serene Healthcare) and the NHIA SOP reveals a consistent universal field structure. Amelia's claims generator targets this universal schema, with HMO-specific template variants for institution-specific fields.

### Universal Fields (All HMOs)

**Header / Provider Section**
- Health Provider Name
- HCP NHIS / Facility Code
- Date of Submission

**Patient / Enrollee Section**
- Patient Full Name (Surname + Other Names)
- Age + Sex
- National Identity Number (NIN) ← NHIA mandatory
- Enrollee NHIS Number / Member ID
- HMO-specific identifiers (e.g. AP No., Force No. for Police HMO — template-aware)

**Episode Section**
- Type of Service (Inpatient / Outpatient)
- Authorization Code / Notification ← the critical field
- Diagnosis
- Date of Notification / Admission / Discharge
- Admission Duration

**Services Section**
- Presenting Complaints with Duration of Symptoms
- Investigations / Laboratory / Radiological Procedures (line items + amounts)
- Medications / Prescriptions (drug name, dosage, duration/quantity, amount)
- Subtotals per section

**Totals Section**
- Total Amount Billed
- Less 10% (HMO administrative withholding — auto-calculated by Amelia)
- Grand Total Receivable ← hospitals currently discover this deduction when payment arrives; Amelia shows it upfront

**Signatures Section**
- Doctor's Name
- Patient Acknowledgment + Signature line
- Provider Signature
- HMO/PHML Officer Signature line

### Cover Letter Fields (NHIA SOP Requirement)

Per the NHIA SOP, every claim batch submission requires a cover letter signed by the Medical Director:
- Facility name and address
- NHIA/HCP code
- Submission date
- Period covered (e.g., "Claims for week of March 10–16, 2026")
- Total number of claims in batch
- Total amount claimed
- Medical Director name + signature block
- TPA name and address (addressee)
- CC: NHIA (cemonc@nhia.gov.ng for CEmONC program)

Amelia generates both the claims form PDF and the cover letter PDF in a single action.

---

## 6. USER FLOW (DETAILED)

### Role: Front Desk / Billing Staff

```
════════════════════════════════════════
STEP 1: LOGIN
════════════════════════════════════════
Staff opens Amelia on laptop or tablet
Authenticates via Clerk (email or Google SSO)
Lands on Dashboard: today's collections, pending auth codes, overdue claims

════════════════════════════════════════
STEP 2: PATIENT REGISTRATION
════════════════════════════════════════
Staff creates new patient record:
  - Full name (Surname + Other Names)
  - Date of Birth / Age
  - Sex
  - Phone number
  - National Identity Number (NIN) ← required for HMO claims
  - HMO/Insurance status:
      ├── Self-pay
      └── HMO-insured → select HMO name from dropdown
                       → enter Enrollee NHIS / Member ID
                       → enter HMO-specific identifiers (AP No. etc. if applicable)
System creates Patient record in Convex

════════════════════════════════════════
STEP 3: BILL CREATION
════════════════════════════════════════
Staff opens new bill for patient:
  - Select admission type: Inpatient / Outpatient
  - Enter dates: Notification, Admission, Discharge
  - Enter diagnosis (text field)
  - Enter presenting complaint + duration
  - Add services from catalog:
      ├── Investigations / Procedures (e.g. "FBC Test — ₦3,500")
      └── Medications (drug name, dosage, duration, unit price, quantity)

  System calculates:
    Investigations Total
    Medications Total
    Grand Total
    If HMO: Grand Total Less 10% = Expected Receivable (displayed in amber)

  If patient is HMO-insured:
    → Bill status automatically set to "AWAITING AUTH CODE"
    → Staff cannot proceed to payment without entering auth code
    → Staff enters auth code when received from HMO (via WhatsApp, phone, etc.)
    → Auth code logged with timestamp
    → Bill status changes to "AUTH CONFIRMED" → ready for payment

════════════════════════════════════════
STEP 4A: PAYMENT COLLECTION (Self-Pay)
════════════════════════════════════════
Staff clicks `Send payment request` on the saved bill
  → Amelia generates or reuses a tokenized public payment link
  → Amelia sends the approved WhatsApp Utility template to the patient
  → CTA opens Amelia's public payment page on `app.getamelia.online/pay/:token`

Patient pays on their own device via:
  ├── Card on Interswitch Web Checkout
  └── OPay Wallet

Clinic staff can still use assisted-payment fallbacks:
  ├── Pay with Card
  └── Pay with OPay

════════════════════════════════════════
STEP 4B: PAYMENT COLLECTION (HMO Co-Pay)
════════════════════════════════════════
Same as 4A but:
  - Amount = Co-pay portion only (Total Less HMO coverage amount)
  - HMO portion tracked separately in bill record
  - Full claim to HMO handled in Step 6

════════════════════════════════════════
STEP 5: REAL-TIME RECONCILIATION
════════════════════════════════════════
Interswitch fires TRANSACTION.COMPLETED webhook → Convex HTTP Action
  → Validate webhook signature
  → Match transaction reference to bill
  → Update bill status: PENDING → PAID
  → Timestamp paidAt
  → Staff dashboard updates instantly (Convex real-time reactivity)
  → Patient receives SMS confirmation: "Payment of ₦12,500 received. Thank you."

════════════════════════════════════════
STEP 6: HMO CLAIM GENERATION
════════════════════════════════════════
At any time (weekly or month-end), admin opens "Claims" section:

  View: All HMO bills with AUTH CONFIRMED status, not yet claimed

  Staff selects bills to include in this batch
  Staff selects HMO template (e.g. Police HMO, Serene Healthcare, Generic NHIA)

  Amelia generates for each patient:
    → Claims form PDF (auto-filled with all patient, episode, service, and medication data)
    → 10% deduction calculated and displayed
    → Auth code pre-filled from stored record
    → Doctor name pre-filled from clinic profile

  Amelia generates one cover letter PDF for the batch:
    → Facility name, NHIA code, submission date
    → Period covered
    → Total number of claims
    → Total amount claimed
    → Medical Director name + signature block
    → Addressed to TPA

  Output: ZIP download containing all claims PDFs + cover letter

  Staff submits to TPA (email or physical delivery)
  Amelia logs: submission date, TPA name, total amount, expected payment date (+14 days)

════════════════════════════════════════
STEP 7: TPA PAYMENT TRACKING
════════════════════════════════════════
Dashboard shows each claim batch:
  ├── Submitted: March 10, 2026
  ├── TPA: Hygeia HMO
  ├── Amount claimed: ₦245,000
  ├── Expected payment by: March 24, 2026
  └── Status: PENDING / PAID / OVERDUE (auto-flags after 14 days)

Overdue claims trigger dashboard alert: "₦245,000 from Hygeia HMO overdue by 3 days"
Staff can log TPA payment received via bank transfer (manual for hackathon)

════════════════════════════════════════
STEP 8: REVENUE DASHBOARD
════════════════════════════════════════
Admin view — real-time stats:

  Today's Collections (NGN)
  Outstanding Self-Pay Bills (count + value)
  HMO Claims Pending Submission
  HMO Claims Submitted (awaiting TPA payment)
  Overdue TPA Payments
  Collection Rate % (paid / total billed this month)

  Charts:
    7-day revenue trend (Recharts line chart)
    Payment method breakdown (Recharts pie chart)
    Top services by revenue (Recharts bar chart)

  Outstanding bills list:
    [Patient Name] [Amount] [Days Outstanding] [Resend SMS] button
```

---

## 7. INTERSWITCH APIS — CONFIRMED PUBLICLY ACCESSIBLE

All APIs are documented at `docs.interswitchgroup.com` and `developer.interswitch.com`. Authentication via Interswitch Passport (OAuth 2.0).

### Auth

| API | Purpose | Endpoint |
|---|---|---|
| **Interswitch Passport** | OAuth 2.0 access token for all API calls | `POST https://qa.interswitchng.com/passport/oauth/token` |

### Payment Collection

| API | Purpose | Reference |
|---|---|---|
| **Virtual Account API** | ~~Generate unique bank account per bill~~ **BLOCKED for hackathon** | https://docs.interswitchgroup.com/docs/non-card-payments |
| **Payment Gateway (Web Checkout)** | Card payments via hosted checkout page | https://docs.interswitchgroup.com/docs/payment-api |
| **OPay Wallet Payment** | POST /collections/api/v1/opay/initialize | No auth needed | Wallet payment redirect |
| **QR Code** | QR string generation for bill payment | https://developer.interswitch.com/paymentgateway/apis/ |
| **USSD** | Payment via USSD code | https://docs.interswitchgroup.com/docs/non-card-payments |

### Identity & Verification (Marketplace)

| API | Purpose | Endpoint |
|---|---|---|
| **NIN Verification** | Identity verification | `POST api-marketplace-routing.k8.isw.la/.../verify/identity/nin` | Marketplace OAuth |
| **Bank Account Verification** | Clinic onboarding | `POST api-marketplace-routing.k8.isw.la/.../verify/identity/account-number/resolve` | Marketplace OAuth |

### Webhooks

| Event | Description | Reference |
|---|---|---|
| **TRANSACTION.COMPLETED** | Fires on successful payment. POST to your webhook endpoint with transaction reference, amount, status. | https://docs.interswitchgroup.com/docs/non-card-payments |

### React SDK

Official React SDK available: `isw-react-sdk` on GitHub under `techquest` organization. Embed payment widget directly in Amelia frontend — no custom payment UI needed.

---

## 8. TECH STACK

### Core Stack (Your Standard)

| Layer | Choice |
|---|---|
| Runtime | Bun |
| Frontend | React + Vite |
| Styling | Tailwind v4 + shadcn/ui |
| Fonts | Space Mono + Poppins |
| Icons | @phosphor-icons/react |
| Backend / DB | Convex (mutations, queries, HTTP Actions for webhooks) |
| Auth | Clerk (email + Google SSO, multi-role: staff vs admin) |
| Deployment | Vercel |

### Third-Party Services

| Service | Role | Why Not Build From Scratch |
|---|---|---|
| **Interswitch Payment Gateway (Web Checkout)** | All patient payment collection (card) | Core hackathon requirement; battle-tested Nigerian rails |
| **OPay Wallet Payment** | Wallet-based payment option | Redirect-based; no auth needed; popular mobile wallet in Nigeria |
| **Interswitch Webhook** | Real-time payment reconciliation | Push-based; zero polling |
| **Mistral OCR** (`mistral-ocr-latest`) | HMO card + pre-auth document extraction | Already in your arsenal; excellent on scanned documents |
| **Inngest** | Async workflows: SMS triggers, webhook retries, overdue alerts | Durable background jobs without building a queue |
| **E2B** (e2b.dev) | Sandboxed claim PDF generation jobs | You have credits; isolates AI agent file creation from main system |
| **Firecrawl** | Pre-build HMO + TPA directory from NHIA/HMO websites | You have credits; avoids manual data entry |
| **Africa's Talking** | Nigerian SMS delivery (payment links + confirmations) | Excellent African carrier routing; reliable bulk SMS |
| **Vercel AI SDK** | Streaming in claim generation UI | No need to build streaming from scratch |
| **pdf-lib or Puppeteer** | PDF generation for claims forms + cover letters | Precise control over form field placement to match real HMO forms |

### AI Model Layer

| Task | Model |
|---|---|
| Document OCR (HMO cards, pre-auth letters) | `mistral-ocr-latest` |
| Claim document reasoning + generation | `claude-sonnet-4-6` via Anthropic API |
| HMO name normalization (fuzzy match OCR output to canonical list) | `mistral-embed` |

---

## 9. DATABASE SCHEMA (Convex)

```typescript
// Clinic profile — set once at onboarding
clinics: {
  name: string,
  address: string,
  nhisFacilityCode: string,
  medicalDirectorName: string,
  phone: string,
  email: string
}

// Patient records
patients: {
  clinicId: Id<"clinics">,
  surname: string,
  otherNames: string,
  dateOfBirth: string,
  sex: "male" | "female",
  phone: string,
  nin: string,                          // NIN — required for NHIA claims
  paymentType: "self_pay" | "hmo",
  hmoName?: string,
  enrolleeNhisNo?: string,
  hmoSpecificId?: string,               // AP No., Force No., etc.
  createdAt: number
}

// Bills
bills: {
  clinicId: Id<"clinics">,
  patientId: Id<"patients">,
  admissionType: "inpatient" | "outpatient",
  dateNotification: string,
  dateAdmission: string,
  dateDischarge: string,
  diagnosis: string,
  presentingComplaints: string,
  investigations: Array<{ name: string, amount: number }>,
  medications: Array<{ name: string, dosage: string, duration: string, quantity: number, unitPrice: number }>,
  investigationsTotal: number,
  medicationsTotal: number,
  totalAmount: number,
  hmoDeduction: number,                 // 10% if HMO patient
  expectedReceivable: number,
  authorizationCode?: string,           // HMO auth code
  authCodeReceivedAt?: number,
  status: "awaiting_auth" | "pending_payment" | "paid" | "claimed" | "overdue",
  webCheckoutHash?: string,
  opayReference?: string,
  interswitchRef?: string,
  paymentLink?: string,
  qrCode?: string,
  paidAt?: number,
  createdAt: number
}

// HMO claim batches
claim_batches: {
  clinicId: Id<"clinics">,
  hmoName: string,
  tpaName: string,
  tpaEmail: string,
  periodStart: string,
  periodEnd: string,
  billIds: Array<Id<"bills">>,
  totalClaimed: number,
  claimsPdfUrl: string,
  coverLetterPdfUrl: string,
  submittedAt: number,
  expectedPaymentBy: number,            // submittedAt + 14 days
  status: "draft" | "submitted" | "paid" | "overdue",
  paidAt?: number
}

// Service catalog
service_catalog: {
  clinicId: Id<"clinics">,
  name: string,
  category: "investigation" | "procedure" | "medication" | "consultation",
  defaultPrice: number
}

// HMO template definitions
hmo_templates: {
  hmoName: string,
  additionalFields: Array<{ label: string, fieldKey: string }>,  // e.g. AP No., Force No.
  formLayoutConfig: string  // JSON config for PDF generation
}
```

---

## 10. ARCHITECTURE

```
[React + Vite Frontend — Vercel]
        │
        ├── Clerk Auth (staff / admin roles)
        ├── Convex Client (real-time subscriptions — dashboard, bill status)
        ├── Interswitch React SDK (payment widget)
        ├── @phosphor-icons/react (icon library)
        └── Vercel AI SDK (streaming claim generation progress)

[Convex Backend]
        ├── Mutations: createPatient, createBill, updateAuthCode,
        │             updateBillStatus, createClaimBatch
        ├── Queries:   getDashboard, getOutstandingBills, getPendingClaims,
        │             getOverdueTpaPayments
        └── HTTP Actions:
              ├── POST /webhook/interswitch
              │     → validate signature
              │     → match bill by transaction reference
              │     → updateBillStatus(PAID)
              │     → trigger Inngest: payment.confirmed
              └── POST /api/generate-claim
                    → call Mistral OCR if document uploaded
                    → call Claude for claim content reasoning
                    → trigger E2B sandbox for PDF generation

[Inngest Workflows]
        ├── bill.created          → SMS patient via Africa's Talking (payment link)
        ├── auth.pending (6h)     → remind staff to chase auth code
        ├── bill.overdue (24h)    → resend payment reminder SMS
        ├── payment.confirmed     → if HMO bill, flag for claim inclusion
        └── claim.overdue (+14d) → dashboard alert: TPA payment overdue

[Payment Flow]
        ├── Web Checkout (card)   → Interswitch hosted checkout page
        │     → generate payment hash → redirect → webhook on completion
        └── OPay Wallet           → POST /collections/api/v1/opay/initialize
              → redirect to OPay → webhook on completion

[E2B Sandbox]
        └── Receives: bill data + HMO template config + clinic profile
            Runs: pdf-lib generation script
            Outputs: completed claims form PDF + cover letter PDF
            Returns: file URLs stored in Convex

[Mistral OCR — optional path]
        └── HMO card image / pre-auth letter upload
            → OCR markdown via `mistral-ocr-latest`
            → second Mistral structured-output pass returns normalized JSON
            → pre-fills blank patient HMO fields on registration without overwriting manual edits
            → latest OCR-backed HMO snapshot saved on successful patient save
            → bill builder uses OCR assistively for auth-code suggestions only

[Firecrawl — pre-build pipeline]
        └── Scrape NHIA accredited TPA list + top HMO websites
            → canonical HMO + TPA name/contact directory
            → loaded into hmo_templates table in Convex
```

---

## 11. HACKATHON BUILD SPRINT (March 23–26)

### Day 1 — Foundation + Payments (March 23)
- Scaffold: React + Vite + Convex + Clerk + Tailwind v4 + shadcn
- Clinic onboarding form (name, NHIA code, Medical Director name)
- Patient registration form with NIN field
- Service catalog setup
- Bill builder UI (investigations + medications line items, auto-total)
- Interswitch Passport OAuth token (server-side, Convex action)
- Web Checkout hash generation + OPay initialization
- Africa's Talking SMS trigger via Inngest on bill created

### Day 2 — Webhook + Auth Code Tracker (March 24)
- Interswitch TRANSACTION.COMPLETED webhook (Convex HTTP Action)
- Real-time bill status update → dashboard reactive update
- Auth Code Tracker: "AWAITING AUTH" lock state on HMO bills
- Auth code entry UI + timestamp logging
- Payment Gateway hosted page link + QR code display on bill detail
- End-to-end payment test with Interswitch sandbox credentials

### Day 3 — Claims Generator (March 25)
- HMO template system (Police HMO + Serene/Generic NHIA templates pre-loaded)
- Claims batch selection UI
- E2B sandbox PDF generation: claims form auto-fill
- Cover letter PDF generation (Medical Director sign-off block)
- 10% auto-deduction calculation in claim totals
- TPA submission log (date sent, TPA name, expected payment date)
- Mistral OCR for HMO card upload and bill-side auth assist

### Day 4 — Dashboard + Demo Polish (March 26)
- Revenue dashboard (Recharts: daily collections, collection rate, payment breakdown)
- Outstanding bills list with resend SMS action
- Overdue TPA payments alert section
- Claim batch status tracker
- Vercel production deploy + Clerk production env
- Demo script rehearsal

---

## 12. HACKATHON DEMO SCRIPT

This is what you walk judges through. 10 minutes. Every step is live, not a mockup.

---

**[0:00–1:00] The problem — in one sentence**

*"Nigerian private clinics bill on paper, collect cash at the door, and compile insurance claims by hand at month-end. They lose 30–40% of their HMO revenue because auth codes get lost on WhatsApp before the claim is ever submitted. Amelia fixes this."*

**[1:00–3:00] Patient registration — live**

Open Amelia. Register a patient: Mr. Emeka Okafor, HMO-insured with Hygeia HMO. Enter his NIN. System flags: "Auth code required before payment can proceed."

*"The NHIA requires NIN for all claims. Amelia captures it at registration — so you're never rejected by your TPA for a missing field."*

**[3:00–5:00] Bill creation + auth code — live**

Add services: FBC Test ₦3,500 + Malaria RDT ₦2,000 + Artemether 80mg ₦4,500.

System shows: Total ₦10,000 → Less 10% HMO deduction → Expected receivable ₦9,000.

*"Hospitals currently discover this 10% deduction when payment arrives — too late to plan cash flow. Amelia shows it upfront."*

Enter auth code: AUTH-HYG-20260313-00441. Status changes from AWAITING → CONFIRMED.

**[5:00–7:00] Interswitch payment — live**

Click "Collect Co-Pay." System calls Interswitch Web Checkout API live. Hosted checkout page opens with ₦500 co-pay amount.

Patient can also choose OPay Wallet — redirects to OPay for wallet payment.

SMS fires to patient phone number on screen.

*"Built on Interswitch's infrastructure. The moment payment completes, this dashboard updates — no manual reconciliation, no end-of-day cash counting."*

Wait for (or simulate) webhook — bill status flips to PAID in real time.

**[7:00–9:00] Claims generation — live**

Navigate to Claims. Select Emeka's bill + 3 other demo HMO bills. Select HMO template: Hygeia HMO.

Click "Generate Claim Batch."

Two PDFs download: the correctly formatted claims form (auto-filled, 10% calculated, auth code present) + the Medical Director cover letter addressed to Hygeia TPA.

*"This is what used to take a billing clerk 3 days. It just took 8 seconds."*

**[9:00–10:00] Close**

Show dashboard: ₦45,000 collected today, 2 claims pending TPA payment, 0 overdue auth codes.

*"Amelia sits at the intersection of Interswitch payments, Nigerian health insurance reform, and AI document intelligence. The category has attracted over $1.2B in funding in the US. We're building the African version — starting with the 5,000+ private clinics that Interswitch already serves through POS terminals."*

---

## 13. SCOPE CUTS FOR HACKATHON (Post-Hackathon Roadmap)

| Feature | Why Cut | When to Build |
|---|---|---|
| Multi-branch / multi-clinic | Complexity, not needed for demo | Series A |
| Direct NHIA portal integration | Regulatory + API access | Post-launch |
| Patient-facing mobile app | Separate surface area | 6 months post-launch |
| EHR integration | No public API | Partnership deal |
| Recurring payment plans | Interswitch supports tokenized recurring | 3 months post-launch |
| Automated TPA email submission | Email deliverability complexity | 1 month post-launch |
| Fraud detection on claims | Needs data volume | 12 months post-launch |

---

## 14. POST-HACKATHON: THE REAL COMPANY

### Why This Becomes a Business

The National Health Insurance Act (2022) is forcing HMO adoption at scale. Every private clinic that wants to accept insured patients needs to process claims. Claims require structured billing. Amelia is that infrastructure.

### Revenue Model

- **SaaS subscription**: ₦30,000–₦80,000/month per clinic (tiered by bill volume)
- **Transaction fee**: 0.3–0.5% on payments processed through the platform
- **Claims module**: premium add-on at higher tier
- **TPA/HMO SaaS**: eventually sell a dashboard to TPAs to receive and verify claims — two-sided marketplace

### Target Market Math

- 5,000+ registered private clinics in Nigeria
- Penetrate 1% = 50 clinics
- At ₦50,000/month average = ₦2.5M MRR from subscriptions
- Plus transaction fees on ₦500M+ monthly payments processed

### Distribution Advantage

Interswitch already has relationships with hospitals through POS terminal installations. Amelia is the software upsell on a relationship that already exists. Post-hackathon, an Interswitch partnership is the single most powerful distribution lever available.

### Expansion Path

Nigeria → Ghana → Kenya. Same Interswitch infrastructure presence. Same HMO claims problem. Same NHIA-equivalent regulatory tailwind expanding insurance coverage.

---

## 15. REFERENCES

- Interswitch API Docs: https://docs.interswitchgroup.com
- Interswitch Developer Center: https://developer.interswitch.com
- Interswitch Web Checkout + Webhook: https://docs.interswitchgroup.com/docs/non-card-payments
- Interswitch Passport OAuth: https://qa.interswitchng.com
- Interswitch React SDK: https://github.com/techquest/isw-react-sdk
- Interswitch Marketplace Routing: https://api-marketplace-routing.k8.isw.la
- NHIA SOP for Claims Submission, Review and Payment (primary research — obtained March 2026)
- Police HMO Claims Form (primary research — obtained March 2026)
- Serene Healthcare Treatment and Claims Form (primary research — obtained March 2026)
- Mistral OCR: https://docs.mistral.ai
- E2B: https://e2b.dev
- Inngest: https://inngest.com
- Firecrawl: https://firecrawl.dev
- Africa's Talking (SMS): https://africastalking.com
- MedTech Dive — AI RCM $1.2B funding: https://www.medtechdive.com/news/health-tech-venture-capital-funding-q3-2025-pitchbook/806259/
- Waystar RCM Survey 2025: https://investors.waystar.com/news-releases/news-release-details/new-research-reveals-investing-ai-and-advanced-automation-top
- Patient Detention in Nigeria: https://globalhealthnow.org/2023-11/nigeria-hospitals-are-unlawfully-detaining-newborns-force-payment-medical-bills
- Nigeria Health Insurance Act (2022): https://pmc.ncbi.nlm.nih.gov/articles/PMC10589412/

---

*Spec version: V4-Amelia | Revised: March 23, 2026 | Author: Dave / Irenium Ltd*
*Research sources: NHIA official SOP, Police HMO claims form, Serene Healthcare claims form, primary HMO authorization officer interview*
