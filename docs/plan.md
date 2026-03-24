# Amelia — Development Plan
**Stack:** Bun · React + Vite · Convex · Clerk · Tailwind v4 · shadcn/ui · Phosphor Icons · Vercel
**Process:** Interview (if needed) → Research → Plan → Implement → Test → Update Docs

---

## Pre-Development Checklist

Before any code is written, confirm the following are in place:

- [ ] Interswitch developer account created at `developer.interswitch.com`
- [ ] Interswitch Quickteller Business credentials obtained + Marketplace credentials obtained
- [ ] Clerk application created, Publishable Key + Secret Key available
- [ ] Convex project initialized (`npx convex dev`)
- [ ] Mistral API key obtained
- [ ] Inngest account created, signing key available
- [ ] Africa's Talking account created, sandbox API key available
- [ ] E2B account created, API key available
- [ ] Firecrawl account created, API key available
- [ ] Vercel project linked to repository
- [ ] Environment variables file populated (see `env.md`)

---

## ✅ Phase 0 — Project Scaffold & Infrastructure

**Goal:** Working skeleton that compiles, authenticates, and connects to all services. Nothing is built yet — only wired.

### ✅ 0.1 Repository Setup
- Initialize monorepo with Bun as the package manager
- Configure `bunfig.toml`
- Setup `.gitignore` for Convex, Bun, and Vite artifacts
- Initialize `biome.json` for linting and formatting (replaces ESLint + Prettier)

### ✅ 0.2 Frontend Scaffold
- Create Vite project: `bun create vite amelia --template react-ts`
- Install and configure Tailwind v4 with the Vite plugin
- Initialize shadcn/ui: `bunx shadcn@latest init`
- Configure CSS variables for the Amelia design token system (cream/orange palette, dark mode)
- Set up fonts: Space Mono (display/code) + Poppins (body) — loaded from local OTF/TTF files via @font-face declarations in CSS. Font files go in `public/fonts/`.
- Install `@phosphor-icons/react` — do NOT install lucide-react
- Install and configure `react-router-dom` v6 for page routing

### ✅ 0.3 Convex Setup
- Initialize Convex: `npx convex dev`
- Connect Convex to the Vite app via `ConvexProvider`
- Set `CONVEX_DEPLOYMENT` in environment
- Create empty schema file (`convex/schema.ts`) — schema defined in Phase 1

### ✅ 0.4 Clerk Auth Setup
- Install `@clerk/clerk-react`
- Wrap app root with `ClerkProvider`
- Create sign-in page using Clerk's `<SignIn />` component, styled to match Amelia login design (left panel branding + right panel form)
- Configure Clerk roles: `admin` and `staff` using Clerk metadata
- Protect all app routes with `<SignedIn>` / `<RedirectToSignIn>`

### ✅ 0.5 Inngest Setup
- Install `inngest`
- Create `inngest/client.ts` with the Inngest client instance
- Register Inngest serve handler as a Convex HTTP Action (`/api/inngest`)
- Register a bootstrap function in the shared Inngest function registry so sync never happens with an empty app
- Use the local Hono bridge at `http://localhost:3000/api/inngest` for dev sync and keep the Convex HTTP Action as the production endpoint
- Verify Inngest Dev Server connects locally and reports at least one function

### ✅ 0.6 Base Layout
- Build the app shell: sidebar + topbar + main content area
- Sidebar: logo, nav items with active state, user card at bottom
- Topbar: page title, search input, notification bell, dark mode toggle
- All navigation wired with React Router, no page content yet

**Tests for Phase 0:** ✅ 22 tests across 3 files — all passing (`bun test`)
- ✅ Clerk auth flow: unauthenticated user redirected to sign-in
- ✅ Convex connection: client instantiation + deployment reachability
- ✅ Route protection: all protected routes wrapped in ProtectedRoute/ProtectedLayout
- ✅ Inngest setup: app ID, function registration, event constants
- ✅ Route constants: all 6 routes defined, unique, start with /
- ✅ Dark mode: applyDarkMode/readDarkModePreference persistence logic

---

## ✅ Phase 1 — Database Schema & Clinic Onboarding

**Goal:** Define the full data model and build the clinic profile setup flow that a new user completes on first login.

### ✅ 1.1 Convex Schema Definition
Define all tables in `convex/schema.ts`:

```
clinics
patients
bills
bill_items (investigations)
bill_medications
hmo_coverages
claim_batches
claim_batch_bills (join table)
service_catalog
hmo_templates
tpa_submissions
```

Full field definitions per table as specified in `docs/SPEC_AMELIA.md` schema section. Include all indexes needed for queries:
- `bills` indexed by `clinicId`, `status`, `patientId`
- `patients` indexed by `clinicId`, `phone`
- `claim_batches` indexed by `clinicId`, `status`

### ✅ 1.2 Clinic Onboarding Flow
First-login screen (shown when `clinics` table has no record for this Clerk user):
- Form fields: Clinic name, address, NHIA/HCP facility code, phone, email, Medical Director name
- On submit: create `clinics` record, mirror `clinicId` to Clerk `unsafeMetadata` on a best-effort basis
- Redirect to dashboard on completion

### ✅ 1.3 Service Catalog Seed
- On clinic creation, seed the `service_catalog` table with ~30 common Nigerian clinic services (FBC, Malaria RDT, Chest X-Ray, Ultrasound, common medications)
- Service Catalog Settings page: add, edit, delete services and their default prices

### ✅ 1.4 HMO Template Seed
- Seed `hmo_templates` table with: Police HMO, AXA Mansard, Hygeia HMO, NHIA Standard, Generic/Universal
- Each template includes: HMO name, additional identifier fields array (AP No., Force No., etc.), form layout config JSON

**Tests for Phase 1:** ✅ 8 new tests in `tests/phase1.test.ts` and full `bun test` suite passing
- ✅ Shared onboarding validation rejects empty clinic name, NHIA code, and medical director
- ✅ Shared onboarding validation accepts a complete clinic payload
- ✅ Service catalog seed includes common clinic services and remains idempotent
- ✅ HMO template seed contains all 5 defaults and remains idempotent
- ✅ Onboarding route constant is defined and unique

---

## ✅ Phase 2 — Patient Registration

**Goal:** Staff can register patients with all fields required for billing and NHIA claims submission.

### ✅ 2.1 Patient List Page (`/patients`)
- Table view: name, age, NIN (masked), HMO, last visit date, status badge
- Search bar: filters by name or phone number (client-side for hackathon, Convex search post-hackathon)
- "New Patient" button opens centered registration dialog

### ✅ 2.2 Patient Registration Form
Fields:
- Surname (required)
- Other Names (required)
- Date of Birth → auto-calculates Age display (required)
- Sex: Male / Female chip selector (required)
- Phone Number — Nigerian mobile validation for `07XXXXXXXXX`, `08XXXXXXXXX`, `09XXXXXXXXX` (required)
- National Identity Number (NIN) — exactly 11 digits, numeric only (required for HMO patients, optional for self-pay)
- Payment Type: Self-Pay / HMO chip selector
- If HMO: HMO Name dropdown (from `hmo_templates` table) + Enrollee NHIS No. + HMO-specific fields (rendered dynamically from template `additionalFields`)

### ✅ 2.3 Patient Profile Page (`/patients/:patientId`)
- Summary card: all patient details
- Bill history tab: list of all bills for this patient
- "New Bill" button reserved as the Phase 3 handoff point

### ✅ 2.4 Form Validation & Error States
- All required fields validated on submit
- NIN: must be exactly 11 digits
- Phone: must match Nigerian mobile format
- Inline error messages below each field
- Toast notification on successful save

**Tests for Phase 2:** ✅ 10 tests in `tests/phase2.test.ts` — all passing (`bun test`)
- NIN validation: rejects 10 digits, rejects letters, accepts exactly 11 digits
- Phone validation: rejects landline format, accepts 08XX, 07XX, 09XX
- HMO patient: NHIS number field required when HMO selected
- Self-pay patient: NHIS number field hidden and not required
- Patient record persists and appears in list after save
- Search filters list correctly by name substring

---

## ✅ Phase 3 — Bill Builder

**Goal:** Staff can create a complete patient bill with investigations, medications, auto-totals, and the authorization code tracker.

### ✅ 3.1 Bill Creation Page (`/bills/new`)
Two-column layout:
- Left: patient/episode form + line items
- Right: bill summary + auth tracker + payment panel

### ✅ 3.2 Patient & Episode Section
- Patient selector dropdown (searches registered patients)
- Admission type: Outpatient / Inpatient chip selector
- Date fields: Notification, Admission, Discharge
- Diagnosis free text field
- Presenting complaints + duration field

### ✅ 3.3 Investigations Line Items
- Dynamic table: add/remove rows
- Each row: service name (autocomplete from `service_catalog`), quantity, unit price, row total (auto-calculated)
- "Add Investigation" button appends new empty row
- Delete button removes row
- Investigations subtotal auto-updates on any change

### ✅ 3.4 Medications Line Items
- Dynamic table: add/remove rows
- Each row: drug name (free text), dosage, duration, quantity, unit price, row total
- Medications subtotal auto-updates

### ✅ 3.5 Auto-Calculation Engine
All calculations reactive (recalculate on every input change):
```
investigations_total = sum(qty × unit_price) for all investigation rows
medications_total = sum(qty × unit_price) for all medication rows
grand_total = investigations_total + medications_total
hmo_deduction = grand_total × 0.10 (shown only for HMO patients)
expected_receivable = grand_total - hmo_deduction
```
Display expected receivable in green with clear label: "Expected Receivable after 10% HMO deduction"

### ✅ 3.6 Authorization Code Tracker
State machine for HMO bills:
- **AWAITING_AUTH**: red lock banner shown, bill cannot proceed to payment. Click banner → auth code input expands
- **AUTH_CONFIRMED**: green confirmation banner with stored auth code + timestamp
- For self-pay bills: auth section hidden entirely

Auth code entry:
- Input field: free text (auth codes have no universal format)
- "Confirm Auth Code" button: validates non-empty, stores in bill record with `authCodeReceivedAt` timestamp
- Once confirmed: cannot be un-confirmed (edit requires explicit "Change Auth Code" action)

### ✅ 3.7 Bill Save & Status
- "Save Bill" saves draft without triggering payment
- Bill status on creation: `awaiting_auth` (HMO without code), `auth_confirmed` (HMO with confirmed code), or `pending_payment` (self-pay)
- Bill detail page (`/bills/:billId`): view all bill data, current status, payment status

### ✅ 3.8 Bill List Page (`/bills`)
- Table: patient name, HMO, total, status badge, auth status, date
- Filter tabs: All / Awaiting Auth / Auth Confirmed / Pending Payment / Paid / Overdue
- Click row → bill detail page

**Tests for Phase 3:** ✅ 9 tests in `tests/phase3.test.ts` and full `bun test` suite passing
- Calculation: investigations total correct with 3 rows, mixed quantities
- Calculation: HMO deduction exactly 10%, self-pay shows no deduction row
- Auth tracker: HMO bill blocks payment generation when auth not confirmed
- Auth tracker: stores auth code + timestamp on confirmation
- Auth tracker: self-pay bill skips auth state entirely
- Bill save: creates `bills` record + all `bill_items` + `bill_medications` records atomically
- Bill list: filter tabs return correct subset of bills

---

## Phase 4 — Interswitch Payment Integration

**Goal:** Collect payments via Interswitch Web Checkout and OPay wallet, verify identity via Marketplace APIs, reconcile via webhook in real time.

### 4.1 Interswitch Payment Architecture
Interswitch has two separate API systems with different credentials and auth mechanisms:
| System | Credentials | Auth | Purpose |
|---|---|---|---|
| Quickteller Business | INTERSWITCH_CLIENT_ID + SECRET_KEY + MAC_KEY | SHA-512 hash signing (no OAuth) | Web checkout, OPay wallet |
| Developer Marketplace | ISW_MARKETPLACE_CLIENT_ID + CLIENT_SECRET | OAuth 2.0 Bearer token | NIN verification, bank account verification |

Virtual Account API is blocked for the hackathon (requires Payment Gateway OAuth credentials not available via any self-serve portal). Payment collection uses Web Checkout + OPay instead.

### 4.2 Web Checkout (Card Payment)
- Convex action: `initiateCardPayment(billId)`
- Build payment parameters: txnref (max 15 chars, format `AM${Date.now().toString().slice(-13)}`), merchantcode, payitem, amount (kobo), site_redirect_url, currency (566), isswitch (1)
- Compute SHA-512 hash: `SHA512(txnref + merchantcode + payitem + amount + site_redirect_url + mac_key)` — concatenation order critical, no separators
- Return form POST params to frontend → frontend auto-submits form to `https://newwebpay.qa.interswitchng.com/collections/w/pay`
- Interswitch shows hosted card page, redirects back with ResponseCode in query string
- ResponseCode "00" = approved → update bill status to paid
- Sandbox test card: 5061050254756707864 / 06/26 / CVV 111 / PIN 1111

### 4.3 OPay Wallet Payment
- Convex action: `initiateOPayPayment(billId)`
- POST to `https://qa.interswitchng.com/collections/api/v1/opay/initialize` (no Authorization header needed)
- Body: `{ merchantCode, payableCode: "Default_Payable_MX180207", amount, transactionReference }`
- Returns `{ redirectUrl, transactionReference, responseCode: "09" }` — redirect patient to OPay cashier
- After payment, OPay redirects with `status=SUCCESS` in query string
- Confirm via POST to `https://qa.interswitchng.com/collections/api/v1/opay/status` with `{ reference }` — responseCode "00" = confirmed
- No webhooks for OPay — polling only
- Sandbox: phone 1259257649, PIN 123456, OTP 315632 (success) / 315633 (fail)

### 4.4 SMS Notification via Africa's Talking
- Inngest function: `bill.paymentLinkSent`
- Triggered after payment link created
- Package: `africastalking@0.7.9`
- Sandbox: `username: "sandbox"`, omit `from` field entirely (empty string fails SDK validation)
- Phone numbers in international format with `+` prefix: `+2348012345678`
- SMS content: "Your bill at [Clinic Name] is ₦[amount]. Pay online: [payment_link] Ref: [txnref]"
- In production: `from` becomes registered sender ID (e.g. "Amelia")

### 4.5 NIN Verification (Marketplace API)
- Convex action: `verifyNIN(firstName, lastName, nin)`
- Step 1: Get OAuth token from `https://qa.interswitchng.com/passport/oauth/token` using ISW_MARKETPLACE credentials
- Step 2: POST to `https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/nin`
- Body: `{ firstName, lastName, nin }`
- Returns nin_check.status: "EXACT_MATCH" or "NOT_MATCH", plus gender, masked phone, base64 photo
- Use at patient registration before NHIA claims

### 4.6 Bank Account Verification (Marketplace API)
- Convex action: `verifyBankAccount(accountNumber, bankCode)`
- Bank list: GET `https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/account-number/bank-list` — returns 100+ Nigerian banks with codes
- Resolve: POST `https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/account-number/resolve` with `{ accountNumber, bankCode }`
- Returns bankDetails.accountName — display for confirmation during clinic onboarding

### 4.7 Webhook + Real-Time Dashboard Update
- Web Checkout: Interswitch fires TRANSACTION.COMPLETED webhook → Convex HTTP Action at `/api/webhooks/interswitch`
- Validate webhook signature (HMAC-SHA512)
- On valid event: find bill by txnref, update status to paid, set paidAt, trigger Inngest payment.confirmed
- OPay: no webhooks — poll status endpoint on redirect callback, then update bill
- Convex reactivity pushes bill status updates to all connected dashboards automatically
- Transaction query does not work in sandbox — use redirect ResponseCode for hackathon

### 4.8 Payment Reminder
- Inngest scheduled function: `bill.overdueReminder`
- Runs 24 hours after bill created if status still `pending_payment`
- Sends SMS reminder to patient with payment link via Africa's Talking
- Updates bill status to `overdue`

**Tests for Phase 4:**
- Web checkout: hash generation produces valid SHA-512 for known inputs
- Web checkout: txnref format always ≤ 15 chars
- OPay: initialize returns redirectUrl with responseCode "09"
- OPay: status returns responseCode "00" for completed payment
- Webhook: rejects request with invalid HMAC signature
- Webhook: correctly finds bill and sets status to paid
- Webhook: idempotent — same event twice does not double-update
- NIN: returns EXACT_MATCH for matching name + NIN
- Bank verification: returns account holder name
- Reminder: only fires for bills still pending after 24h

---

## Phase 5 — HMO Claims Generator

**Goal:** Staff can select a batch of authorized bills and generate a correctly formatted claims PDF + Medical Director cover letter, ready for TPA submission.

### 5.1 Claims Page (`/claims`)
- Left panel: patient selection list (all HMO bills with status `paid` or `auth_confirmed`, not yet claimed)
- Each patient card shows: name, HMO, amount, auth code (green tick), locked-out patients (missing auth — greyed out, cannot select)
- Running batch summary: selected count, total billed, less 10%, net receivable
- Right panel: claim options form + generate button

### 5.2 Claim Options Form
- HMO Template selector (dropdown from `hmo_templates` table)
- TPA Name + TPA Email (pre-filled from template, editable)
- Period covered: date range picker (start + end)
- Medical Director name (pre-filled from clinic profile, editable)

### 5.3 PDF Generation Architecture
Two options evaluated for hackathon:
- **Primary:** `pdf-lib` — pure JS, no server, precise field placement. Use for claims form.
- **Fallback:** Puppeteer in E2B sandbox — render HTML template to PDF. Use for cover letter.

Note: E2B sandbox confirmed working during integration testing. Mistral OCR confirmed: `client.ocr.process()` with `mistral-ocr-latest` returns clean markdown.

Claims form PDF generation (`generateClaimPDF`):
- Load a pre-built PDF template (created from the Police HMO / universal field structure)
- Fill fields using `pdf-lib` `PDFForm.getTextField()` and `setText()`
- Fields mapped from bill data: all header fields, episode fields, investigation rows, medication rows, totals, auth code
- Export as Uint8Array, upload to Convex file storage, return URL

Cover letter PDF generation (`generateCoverLetterPDF`):
- HTML template string with all fields interpolated
- Render to PDF via Puppeteer in E2B sandbox
- Export and store same as above

### 5.4 Batch Generation Flow
Convex action: `generateClaimBatch(billIds, options)`
- Validate: all bills have auth codes
- For each bill: call `generateClaimPDF`
- Call `generateCoverLetterPDF` for the batch
- Create `claim_batches` record with status `draft`
- Create `claim_batch_bills` join records
- Update all included `bills.status` → `claimed`
- Return: `claimBatchId`, array of PDF URLs, cover letter URL

Frontend: 5-step animated progress bar during generation (mirrors demo):
1. Validating auth codes
2. Applying HMO template
3. Populating claim fields
4. Calculating totals
5. Generating cover letter

Success state: download buttons for Claims PDF bundle + Cover Letter.

### 5.5 TPA Submission Tracker
After generation, staff logs submission:
- TPA name, TPA email, submission date
- System calculates `expectedPaymentBy` = `submittedAt + 14 days`
- `claim_batches.status` → `submitted`

Inngest scheduled function: `claims.overdueCheck`
- Runs daily
- Finds all `claim_batches` with status `submitted` and `expectedPaymentBy` < now
- Updates status → `overdue`
- Triggers dashboard alert

TPA Submission Tracker list on claims page:
- Each batch: HMO name, submission date, claim count, total amount, status badge (Pending / Overdue / Paid)
- "Mark as Paid" button → updates status, logs `paidAt`

### 5.6 AI Claim Completeness Scorer
Before generating the batch, run AI validation:
- Convex action: `scoreClaimCompleteness(billIds)`
- For each bill, check:
  - Diagnosis present and non-empty
  - Auth code present and matches HMO format pattern
  - At least one investigation or medication line item
  - Patient NIN present
  - Dates logically consistent (admission before discharge)
  - Diagnosis code (ICD-10) either present or inferable from diagnosis text
- Return: per-bill score (0–100) + array of issues
- Display in UI before generation: green (80+), amber (50–79), red (<50)
- Red issues block generation; amber issues show warning but allow proceed

**Tests for Phase 5:**
- PDF generation: output is valid PDF binary (check magic bytes `%PDF`)
- PDF generation: patient name field correctly populated in output
- Batch generation: creates one `claim_batch` + correct number of `claim_batch_bills`
- Batch generation: updates all included bill statuses to `claimed`
- Batch generation: bills without auth codes excluded even if accidentally selected
- Claim scorer: returns issue for missing NIN
- Claim scorer: returns issue for missing diagnosis
- TPA overdue: Inngest job only flags batches past expected payment date

---

## Phase 6 — Revenue Dashboard & Analytics

**Goal:** Real-time revenue dashboard and analytics view for clinic administrators.

### 6.1 Dashboard Page (`/dashboard`)
All stats from a single reactive Convex query `getDashboardStats(clinicId, date)`:

**Stat Cards (real-time):**
- Today's Collections (₦): sum of `bills.totalAmount` where `paidAt` is today
- Outstanding Bills: count + sum of bills with status `pending_payment` or `overdue`
- Pending Auth Codes: count of bills with status `awaiting_auth`
- Overdue TPA Payments: count of `claim_batches` with status `overdue`

**Alert Section:**
- Overdue TPA payments: one alert per overdue batch (red)
- Auth code pending: aggregate count (amber)
- Alerts dismissible per session (localStorage)

**7-Day Revenue Chart:**
- Line chart (Recharts): daily collections for past 7 days
- Second line: HMO claims submitted per day
- Data from Convex query aggregating `bills` by `paidAt` date

**Payment Mix Donut:**
- Breakdown by payment channel (bank transfer, card, USSD, wallet)
- Data from `bills.transactionChannel`

**Recent Bills Table:**
- Last 10 bills, all columns, click to navigate to bill detail

### 6.2 Analytics Page (`/analytics`)
**Stat Cards:**
- Monthly Revenue (current month)
- Collection Rate (paid / total billed %)
- Claims Submitted (count + value)
- Average Days to Payment

**30-Day Revenue Trend:**
- Line chart, one data point per day
- Recharts `ResponsiveContainer` + `LineChart`

**Claims by Status Bar Chart:**
- Submitted / Approved / Paid / Rejected / Draft counts

**Top Services by Revenue:**
- Bar list (progress-bar style): service name + total revenue + visual bar
- Data from aggregating `bill_items` by service name

### 6.3 Outstanding Bills List
- Full list of unpaid bills with: patient name, amount, days outstanding, HMO name
- "Resend SMS" button per row → triggers Inngest `bill.paymentLinkSent` again
- Sort by: amount (desc), days outstanding (desc)

**Tests for Phase 6:**
- Dashboard stats: `todayCollections` is zero when no bills paid today
- Dashboard stats: updates reactively when bill status changes to `paid`
- Collection rate: calculated correctly (3 paid out of 5 billed = 60%)
- Chart data: 7 data points returned for 7-day query
- Resend SMS: Inngest function called with correct bill ID

---

## Phase 7 — Mistral OCR Integration (HMO Card Reader)

**Goal:** Staff can upload an HMO card photo or pre-authorization letter and have patient fields auto-populated.

### 7.1 Document Upload UI
- Available on Patient Registration form and Bill Creation form
- "Scan HMO Card" button: opens file picker (accepts image/*, application/pdf)
- Upload preview: shows selected file name + thumbnail if image
- "Extract Details" button triggers OCR action

### 7.2 Mistral OCR Action
Convex action: `extractHMODetails(fileBase64, mediaType)`
- Package: `@mistralai/mistralai@2.0.0`
- Encode file to base64
- POST to Mistral OCR API (`mistral-ocr-latest` model)
- Prompt: structured extraction request specifying exact fields to return as JSON:
  ```json
  {
    "hmo_name": "",
    "member_id": "",
    "enrollee_name": "",
    "nhis_number": "",
    "authorization_code": "",
    "coverage_type": "",
    "coverage_limit": "",
    "additional_ids": {}
  }
  ```
- Parse response JSON
- Return structured data to frontend

### 7.3 Auto-Fill
On successful OCR extraction:
- Map extracted fields to form fields
- Pre-fill: HMO Name (match to dropdown), Enrollee NHIS No., any additional identifiers
- Show extracted values with amber highlight + "Extracted via OCR" label
- Staff can edit any auto-filled value before saving
- Store raw OCR response in `hmo_coverages.rawOcrData` for audit

**Tests for Phase 7:**
- OCR action: handles PDF input (base64 encoded)
- OCR action: handles image input (JPEG/PNG)
- OCR action: returns empty strings (not null/undefined) for fields not found
- Auto-fill: does not overwrite fields already manually entered by staff
- Auto-fill: HMO name matched case-insensitively to dropdown options

---

## Phase 8 — Firecrawl HMO Directory

**Goal:** Pre-build a canonical HMO + TPA directory from public sources to enable name normalization and auto-complete.

Note: Package is `@mendable/firecrawl-js@4.16.0`, scrape method is `app.scrape()` (not scrapeUrl), agent uses `startAgent()` + `getAgentStatus()` polling, Zod schema needs `as any` cast, `maxCredits: 2000`.

### 8.1 Firecrawl Scrape Pipeline
Run once during initial setup (not during runtime):
- Script: `scripts/scrape-hmo-directory.ts`
- Firecrawl targets:
  - NHIA accredited HMO list: `nhia.gov.ng`
  - Major HMO websites: Hygeia, AXA Mansard, Reliance, Leadway, AIICO, Clearline, Police HMO
- Extract: HMO name (canonical), TPA name, TPA contact email, TPA phone
- Output: `hmo-directory.json` file

### 8.2 Seed HMO Directory into Convex
- Script: `scripts/seed-hmo-directory.ts`
- Reads `hmo-directory.json`
- Upserts into `hmo_templates` table
- Idempotent: matches by `hmoName` before insert

### 8.3 HMO Name Normalization
- Used during OCR auto-fill to match extracted HMO name to canonical list
- Simple fuzzy match: normalize to lowercase, strip punctuation, check substring match
- If match found: auto-select correct dropdown option
- If no match: leave dropdown empty, show extracted text as hint

**Tests for Phase 8:**
- Scrape script: produces valid JSON output
- Seed script: idempotent on second run (no duplicate entries)
- Name normalization: "POLICE HMO" matches "Police Health Maintenance Limited"
- Name normalization: "Hygeia" matches "Hygeia HMO Limited"
- Name normalization: unknown HMO returns null without throwing

---

## Phase 9 — Polish, Performance & Deployment

**Goal:** Production-ready deployment with error handling, loading states, and Vercel CI/CD.

### 9.1 Error Handling
- Global error boundary component wrapping all routes
- Convex query error states: show retry button
- Interswitch API errors: surface meaningful messages (e.g. "Payment initiation failed — check Interswitch credentials")
- Form submission errors: inline field-level + toast fallback
- Network offline detection: banner notification

### 9.2 Loading States
- Skeleton loaders for all table views and stat cards
- Optimistic updates for bill status changes
- Button loading spinners for all async actions
- Progress bar for claim batch generation (already in Phase 5)

### 9.3 Empty States
- Patients page: "No patients yet — register your first patient" with CTA
- Bills page: "No bills yet — create your first bill" with CTA
- Claims page: "No authorized bills ready for claiming"
- Dashboard: zero-state for all charts

### 9.4 Responsive Layout
- Sidebar collapses to icon-only on screens < 1024px
- Mobile: hamburger menu opens sidebar overlay
- Bill builder: stacks to single column on tablet/mobile
- Tables: horizontal scroll on small screens

### 9.5 Vercel Deployment
- Configure `vercel.json` with build settings
- Set all environment variables in Vercel dashboard
- Configure Convex production deployment (`npx convex deploy`)
- Configure Clerk production instance
- Configure Interswitch production credentials (switch from sandbox)
- Set Inngest production signing key

### 9.6 Webhook Registration
- Register Interswitch webhook endpoint URL in Interswitch developer dashboard: `https://amelia.vercel.app/api/webhooks/interswitch`
- Verify webhook delivery with test transaction

**Tests for Phase 9:**
- Error boundary: renders fallback UI when child throws
- Build: `bun run build` exits with code 0
- Convex deploy: all schema migrations apply cleanly
- Webhook: production URL reachable and returns 200 for valid test event
- Lighthouse: performance score > 80 on dashboard page

---

## Phase 10 — Post-Hackathon Backlog (Reference)

Not built during hackathon. Documented here for continuity.

- Multi-clinic / multi-branch support
- Patient-facing payment portal (mobile-optimized)
- Direct NHIA portal API integration
- EHR integration layer
- Automated TPA email submission (attach PDFs, send via Resend)
- Two-sided platform: HMO/TPA claim review dashboard (the pre-auth product for your cousin)
- Recurring payment plan support (Interswitch tokenized recurring)
- Denial management: AI appeal letter generator
- Remittance reconciliation: upload TPA payment advice → AI matches to claims
- Mobile app (React Native with Expo)
- Audit log: full history of every status change per bill and claim
- Role-based access: doctor, billing clerk, finance, admin with different permissions
- Interswitch Virtual Account API integration (requires Payment Gateway OAuth credentials — contact Interswitch)

---

## Development Cycle (Claude Code Process)

Every change follows this sequence:
1. **Interview:** When a change is requested or new phase starts, Claude interviews the user on what they want to build (if requirements are unclear).
2. **Research:** Search online docs for relevant APIs, patterns, or SDK changes.
3. **Plan:** Create or update the plan in this file. Confirm with user before implementing.
4. **Implement:** Write the code. One feature at a time.
5. **Test:** Write tests for new functions/modules using `bun test`.
6. **Verify:** Run `bun test` — all new AND previous tests must pass. Fix any failures before proceeding.
7. **Update docs:** Mark completed items in this plan file with ✅ before moving to the next phase.

Additional rules:
- **No mocking** — use real API calls against sandbox/test environments unless absolutely unavoidable
- **No magic strings** — API endpoints, event names, status strings defined as constants
- **Type safety** — no `any` types. All Convex mutations/queries/actions typed end-to-end.
- **Convex conventions** — mutations for writes, queries for reads, actions for side effects (external API calls)
- **One feature at a time** — no phase starts until the previous phase's tests pass
- **Test alongside** — tests are written in the same session as the feature, not deferred

---

## Recommended Claude Code Skills

| Phase | Skills |
|---|---|
| 0 — Scaffold | `shadcn`, `vite`, `tailwind-design-system`, `git-flow-branch-creator` |
| 1–3 — Schema, Patients, Bills | `vercel-react-best-practices`, `test-driven-development` |
| 4 — Payments | `systematic-debugging` |
| 5 — Claims | `frontend-design` |
| 6 — Dashboard | `web-design-guidelines` |
| 9 — Deploy | `deploy-to-vercel` |

Install via: `claude skill add <skill-name>` from skills.sh
