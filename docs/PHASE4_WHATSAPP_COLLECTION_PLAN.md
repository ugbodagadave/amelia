# Phase 4A — WhatsApp-First Payment Collection

## Summary

Amelia should move from a clinic-device payment workflow to a patient-collection workflow.

The clinic finance user should:
- finalize a saved bill
- send a payment request to the patient on WhatsApp
- monitor payment status in the dashboard

The patient should:
- receive a WhatsApp utility template
- open the Amelia public payment page from the message
- choose Card or OPay on that page
- complete payment on their own device

Amelia should:
- track request delivery state separately from settlement state
- reconcile payment automatically using the existing Interswitch card and OPay flows
- update the bill and dashboard in real time when payment is confirmed

## Product Direction

Primary workflow:
- `Send payment request` from the saved bill detail page

Secondary workflow:
- `Copy payment link`

Assisted fallback workflow:
- `Pay with Card`
- `Pay with OPay`

The current direct payment actions should move into an assisted-payment section and stop being the primary clinic workflow.

## Scope For This Pass

In scope:
- WhatsApp-first payment request flow from bill detail
- Meta Cloud API sender integration
- payment request state on bills
- reusable payment-request template payload builder
- bill detail UI reset around `Send payment request`
- keep current Amelia public payment page and Interswitch settlement logic

Out of scope:
- inbound WhatsApp conversational flows
- delivery/read analytics beyond basic message state
- WhatsApp chatbot behavior
- virtual account implementation
- changing the existing public payment route structure

## Data Model Changes

Add payment request metadata to `bills`:
- `paymentRequestChannel`: `"whatsapp"` | `"sms"` | `null`
- `paymentRequestStatus`: `"unsent"` | `"sent"` | `"failed"`
- `paymentRequestSentAt`: number | null
- `paymentRequestMessageId`: string | null
- `paymentRequestFailedReason`: string | null

Keep settlement state unchanged:
- `pending_payment`
- `paid`
- `overdue`

Do not overload payment settlement state to mean delivery state.

## Backend Changes

### Meta Cloud API integration

Create a dedicated server-side WhatsApp sender module that uses:
- `META_ACCESS_TOKEN`
- `META_PHONE_NUMBER_ID`
- `META_WABA_ID`
- `META_WEBHOOK_VERIFY_TOKEN`
- optional existing app credentials if already available

Add a Convex action:
- `sendPaymentRequestViaWhatsApp(billId)`

Action behavior:
- load bill + patient + clinic
- reject if bill is already paid
- ensure patient phone number is present and normalized
- ensure a valid payment link/token exists
- send the approved WhatsApp utility template
- store request status and provider message id on success
- store failure reason on failure

### Existing payment flows

Keep:
- `initiateCardPayment`
- `initiateOPayPayment`
- card callback reconciliation
- OPay confirm polling
- public payment route

No rail change is required. Only the delivery and staff-facing workflow changes.

## Frontend Changes

### Bill detail page

Reset the payment panel:
- primary CTA: `Send payment request`
- secondary CTA: `Copy payment link`
- secondary section label: `Assisted payment`
- assisted actions:
  - `Pay with Card`
  - `Pay with OPay`

Display:
- request status
- sent timestamp
- settlement status
- transaction reference if payment has started

### Bills list

Do not add send controls here in this pass.

Reason:
- smaller scope
- avoids table-state complexity
- keeps all patient/payment context on the saved bill detail page

## WhatsApp Template Strategy

Use a **Utility** template, not Marketing.

Recommended template type:
- body text with variables
- one **Visit Website** CTA button

Recommended button behavior:
- button opens Amelia public payment page
- patient chooses Card or OPay after landing on Amelia

Do **not** use separate WhatsApp buttons for `Pay with Card` and `Pay with OPay` in this pass.

Reason:
- one CTA button is the safest approval path
- Meta template/button rules are stricter around URL buttons and examples
- your Amelia payment page already handles payment-method choice
- one button gives cleaner UX and avoids having to send provider-specific URLs in the template

## Recommended Template

### Template category
- `Utility`
- `Default`

### Template language
- `English`

### Recommended template name
- `bill_payment_request`

Good alternatives:
- `patient_payment_request`
- `clinic_bill_payment`

Use lowercase with underscores only.

### Header

Optional text header:
- `Payment request`

If Meta review feels strict, omit the header entirely.

### Body

Recommended body:

`Hello {{1}}, your bill from {{2}} is {{3}}.`

`Reference: {{4}}.`

`Tap the button below to view your payment options and complete payment securely.`

Variable mapping:
- `{{1}}` = patient first name
- `{{2}}` = clinic name
- `{{3}}` = formatted amount, e.g. `NGN 12,000`
- `{{4}}` = transaction or bill reference

### Footer

Recommended footer:
- `Amelia secure payment`

### Button

Add button:
- `Visit Website`

Recommended button text:
- `Open payment page`

Use the Amelia public payment page URL as the website target pattern.

Recommended final URL behavior:
- fixed base URL registered in template
- dynamic path or suffix supplied at send time if supported in your setup

Preferred patient landing route:
- `/pay/:token`

If Meta requires a URL example for review, use a realistic example from your deployed or ngrok frontend domain.

## Template Inputs To Use In WhatsApp Manager

### Step 1
- Category: `Utility`
- Type: `Default`

### Step 2
- Template name: `bill_payment_request`
- Language: `English`

### Step 3
- Header: `Payment request`
- Body:

`Hello {{1}}, your bill from {{2}} is {{3}}.`

`Reference: {{4}}.`

`Tap the button below to view your payment options and complete payment securely.`

- Footer:

`Amelia secure payment`

### Step 4
- Add button: `Visit Website`
- Button text: `Open payment page`
- URL target: use your Amelia public payment link pattern

If Meta asks for sample values, use:
- `{{1}}` → `Emeka`
- `{{2}}` → `Fruitex Clinic`
- `{{3}}` → `NGN 12,000`
- `{{4}}` → `AM1774381681527`
- sample URL → `https://your-domain/pay/pay_tok_example123456`

## Why One Button Is Better Than Two

Do not create:
- `Pay with Card`
- `Pay with OPay`

inside the WhatsApp template for v1.

Better UX:
- one WhatsApp CTA
- one Amelia payment page
- patient picks payment method there

Benefits:
- simpler template approval
- simpler message copy
- no provider-specific branching in WhatsApp
- easier to maintain if payment methods change later

## Implementation Order

1. Add bill request-state fields to schema and queries.
2. Add Meta Cloud API sender helper and WhatsApp action.
3. Reset bill detail UI around `Send payment request`.
4. Keep assisted card/OPay controls behind a secondary section.
5. Add request-state rendering on bill detail.
6. Manually verify template send to a test number.
7. Manually verify patient opens link and pays by card.
8. Manually verify patient opens link and pays by OPay.

## Manual Acceptance Checks

- finance user can send a payment request from bill detail
- bill shows `sent` state after successful WhatsApp send
- patient receives template with correct values
- CTA opens Amelia public payment page
- patient can choose Card or OPay there
- successful card payment marks bill as `paid`
- successful OPay payment marks bill as `paid`
- sending is blocked or clearly handled for already paid bills
- failed sends show a visible failure state and reason

## Notes

- Marketplace verification remains a separate unfinished Phase 4 slice and should not block this workflow reset.
- SMS can stay deferred.
- Meta webhook setup can be added later for delivery/read tracking, but it is not required to ship the outbound payment-request flow.
