# Amelia — Environment Variables
**File:** `.env.local` (development) | Vercel Dashboard (production)
Never commit `.env.local` to git. Add to `.gitignore`.

---

## Convex

```env
# From: Convex dashboard → your project → Settings → URL & Deploy Key
CONVEX_DEPLOYMENT=dev:your-project-slug          # e.g. dev:warm-dingo-123

# Vite exposes env vars to the frontend via VITE_ prefix
VITE_CONVEX_URL=https://your-slug.convex.cloud
```

**Where to get it:** `npx convex dev` prints your deployment URL on first run. Dashboard at `dashboard.convex.dev`.

---

## Clerk Authentication

```env
# From: Clerk Dashboard → your app → API Keys
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx

# Clerk webhook secret (for verifying Clerk webhook events if needed)
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

**Where to get it:** `clerk.com` → Dashboard → Your Application → API Keys.
**Note:** `VITE_` prefix exposes to frontend bundle. Secret key is server/Convex-only — never use `VITE_CLERK_SECRET_KEY`.

---

## Interswitch — Quickteller Business (Payments)

```env
# From: business.quickteller.com → Settings
# Auth method: SHA-512 hash signing (NOT OAuth)
INTERSWITCH_CLIENT_ID=IKIA_xxxxxxxxxxxxxxxx
INTERSWITCH_SECRET_KEY=your_secret_key
INTERSWITCH_MERCHANT_CODE=MXxxxxxx
INTERSWITCH_PAY_ITEM_ID=Default_Payable_MXxxxxxx
INTERSWITCH_MAC_KEY=your_mac_key
INTERSWITCH_WEBHOOK_SECRET=your_webhook_secret
```

**Where to get it:** `business.quickteller.com` → Settings.
**Note:** These credentials CANNOT obtain OAuth tokens. Authentication is done by SHA-512 hash of payment parameters using the MAC key. All sandbox endpoints use `qa.interswitchng.com`. All Interswitch payment calls are server-side only (Convex actions). Never expose credentials to the frontend.

---

## Interswitch — Developer Marketplace (Identity Verification)

```env
# From: developer.interswitchgroup.com → Your Project → Credentials
ISW_MARKETPLACE_CLIENT_ID=IKIA_xxxxxxxxxxxxxxxx
ISW_MARKETPLACE_CLIENT_SECRET=your_marketplace_secret
ISW_MARKETPLACE_BASE_URL=https://qa.interswitchng.com
```

**Where to get it:** `developer.interswitchgroup.com` → Your Project → Credentials.
**Note:** Uses OAuth 2.0 Bearer token. Token obtained from `https://qa.interswitchng.com/passport/oauth/token`. APIs activated: VerifyMeNin, UVBankVerification. All calls are server-side only (Convex actions).

---

## Mistral AI (OCR)

```env
# From: console.mistral.ai → API Keys
MISTRAL_API_KEY=your_mistral_api_key
```

**Where to get it:** `console.mistral.ai` → Your workspace → API Keys.
**Model used:** `mistral-ocr-latest` for document/image OCR.

---

## Inngest

```env
# Local development
INNGEST_DEV=1

# From: Inngest Dashboard → Your App → Keys
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=signkey-prod-xxxxxxxxxxxxxxxxxxxx

# Optional when using a non-default dev server port
# INNGEST_BASE_URL=http://localhost:8288
```

**Where to get it:** `inngest.com` → Dashboard → Your App → Manage → Keys.
**Note:** `INNGEST_DEV=1` is required for local serve-mode development with Inngest v4 unless you hardcode `isDev: true`. `INNGEST_EVENT_KEY` is used to send events in production. `INNGEST_SIGNING_KEY` is used to verify Inngest calls to your production endpoint.

---

## Africa's Talking (SMS)

```env
# From: africastalking.com → Dashboard → API Key
AT_USERNAME=sandbox       # Use "sandbox" for development, your AT account name for production
AT_API_KEY=your_at_api_key
```

**Where to get it:** `africastalking.com` → Dashboard → API Key.
**Package:** `africastalking`
**Notes:**
- Sandbox: `username: "sandbox"`, omit `from` field entirely (empty string fails SDK validation)
- `to` must be international format with `+` prefix: `+2348012345678`
- Production: `AT_USERNAME` = your AT account name, add `from: "Amelia"` (registered sender ID)

---

## Meta WhatsApp Cloud API

```env
# From: Meta for Developers / WhatsApp Manager
META_ACCESS_TOKEN=your_meta_system_user_or_permanent_access_token
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
META_SENDER_NUMBER=+2349056836313
META_WABA_ID=your_whatsapp_business_account_id
META_WEBHOOK_VERIFY_TOKEN=your_custom_webhook_verify_token
META_GRAPH_API_VERSION=v23.0
```

**Used for:** outbound payment-request template sends and WhatsApp webhook status updates.
**Notes:**
- Amelia sends the approved utility template `bill_payment_request`
- The public payment link host for this phase should be `https://app.getamelia.online`
- Convex webhook route: `/api/webhooks/meta`
- Convex actions cannot rely on `.env.local`; set these in Convex before testing sends

---

## E2B (Sandboxed Code Execution)

```env
# From: e2b.dev → Dashboard → API Keys
E2B_API_KEY=e2b_xxxxxxxxxxxxxxxxxxxx
```

**Where to get it:** `e2b.dev` → Sign in → Dashboard → API Keys.
**Used for:** Running PDF generation scripts in isolation (Puppeteer / pdf-lib in sandboxed environment).

---

## Groq (LLM Scoring)

```env
# From: console.groq.com → API Keys
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=moonshotai/kimi-k2-instruct-0905
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_TEMPERATURE=0.6
GROQ_MAX_COMPLETION_TOKENS=4096
GROQ_TOP_P=1
```

**Where to get it:** `console.groq.com` → API Keys.
**Used for:** Claim completeness scoring and diagnosis-quality warnings in Phase 5.

---

## Firecrawl (Web Scraping — Setup Phase Only)

```env
# From: firecrawl.dev → Dashboard → API Keys
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxxxxxxxxx
```

**Where to get it:** `firecrawl.dev` → Dashboard → API Keys.
**Note:** Only used in the one-time `scripts/scrape-hmo-directory.ts` setup script. Not needed at runtime.

---

## App Configuration

```env
# Your deployed app URL (used for webhook registration and SMS links)
VITE_APP_URL=http://localhost:5173                # development
# VITE_APP_URL=https://amelia.vercel.app          # production
```

---

## Summary Table

| Variable | Used In | Required for Hackathon |
|---|---|---|
| `VITE_CONVEX_URL` | Frontend | ✅ |
| `CONVEX_DEPLOYMENT` | Convex CLI | ✅ |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend | ✅ |
| `CLERK_SECRET_KEY` | Convex actions | ✅ |
| `INTERSWITCH_CLIENT_ID` | Convex actions | ✅ |
| `INTERSWITCH_SECRET_KEY` | Convex actions | ✅ |
| `INTERSWITCH_MERCHANT_CODE` | Convex actions | ✅ |
| `INTERSWITCH_PAY_ITEM_ID` | Convex actions | ✅ |
| `INTERSWITCH_MAC_KEY` | Convex actions | ✅ |
| `INTERSWITCH_WEBHOOK_SECRET` | Convex HTTP action | ✅ |
| `ISW_MARKETPLACE_CLIENT_ID` | Convex actions | ✅ |
| `ISW_MARKETPLACE_CLIENT_SECRET` | Convex actions | ✅ |
| `ISW_MARKETPLACE_BASE_URL` | Convex actions | ✅ |
| `MISTRAL_API_KEY` | Convex actions | ✅ |
| `INNGEST_EVENT_KEY` | Convex actions | ✅ |
| `INNGEST_SIGNING_KEY` | Convex HTTP action | ✅ |
| `AT_USERNAME` | Convex actions | ✅ |
| `AT_API_KEY` | Convex actions | ✅ |
| `META_ACCESS_TOKEN` | Convex actions | ✅ |
| `META_PHONE_NUMBER_ID` | Convex actions | ✅ |
| `META_WABA_ID` | Convex actions | ✅ |
| `META_WEBHOOK_VERIFY_TOKEN` | Convex HTTP action | ✅ |
| `E2B_API_KEY` | Convex actions | ✅ |
| `GROQ_API_KEY` | Convex actions | ✅ |
| `GROQ_MODEL` | Convex actions | ✅ |
| `GROQ_BASE_URL` | Convex actions | ✅ |
| `GROQ_TEMPERATURE` | Convex actions | ✅ |
| `GROQ_MAX_COMPLETION_TOKENS` | Convex actions | ✅ |
| `GROQ_TOP_P` | Convex actions | ✅ |
| `FIRECRAWL_API_KEY` | Setup scripts only | ⬜ (pre-build) |
| `VITE_APP_URL` | Frontend + SMS | ✅ |

---

## Convex Environment Variables Setup

Convex actions run server-side and cannot read `.env.local` directly. Set all server-side variables in Convex:

```bash
npx convex env set INTERSWITCH_CLIENT_ID "your_value"
npx convex env set INTERSWITCH_SECRET_KEY "your_value"
npx convex env set INTERSWITCH_MERCHANT_CODE "your_value"
npx convex env set INTERSWITCH_PAY_ITEM_ID "your_value"
npx convex env set INTERSWITCH_MAC_KEY "your_value"
npx convex env set INTERSWITCH_WEBHOOK_SECRET "your_value"
npx convex env set ISW_MARKETPLACE_CLIENT_ID "your_value"
npx convex env set ISW_MARKETPLACE_CLIENT_SECRET "your_value"
npx convex env set ISW_MARKETPLACE_BASE_URL "https://qa.interswitchng.com"
npx convex env set MISTRAL_API_KEY "your_value"
npx convex env set INNGEST_EVENT_KEY "your_value"
npx convex env set INNGEST_SIGNING_KEY "your_value"
npx convex env set AT_USERNAME "sandbox"
npx convex env set AT_API_KEY "your_value"
npx convex env set META_ACCESS_TOKEN "your_value"
npx convex env set META_APP_ID "your_value"
npx convex env set META_APP_SECRET "your_value"
npx convex env set META_PHONE_NUMBER_ID "your_value"
npx convex env set META_SENDER_NUMBER "+2349056836313"
npx convex env set META_WABA_ID "your_value"
npx convex env set META_WEBHOOK_VERIFY_TOKEN "your_value"
npx convex env set META_GRAPH_API_VERSION "v23.0"
npx convex env set E2B_API_KEY "your_value"
npx convex env set GROQ_API_KEY "your_value"
npx convex env set GROQ_MODEL "moonshotai/kimi-k2-instruct-0905"
npx convex env set GROQ_BASE_URL "https://api.groq.com/openai/v1"
npx convex env set GROQ_TEMPERATURE "0.6"
npx convex env set GROQ_MAX_COMPLETION_TOKENS "4096"
npx convex env set GROQ_TOP_P "1"
```

View current Convex env: `npx convex env list`
Convex dashboard: `dashboard.convex.dev` → Your Project → Settings → Environment Variables

---

## `.env.local` Template (Copy & Fill)

```env
# CONVEX
VITE_CONVEX_URL=
CONVEX_DEPLOYMENT=

# CLERK
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# INTERSWITCH — Quickteller Business (Payments) (set via `npx convex env set`)
INTERSWITCH_CLIENT_ID=
INTERSWITCH_SECRET_KEY=
INTERSWITCH_MERCHANT_CODE=
INTERSWITCH_PAY_ITEM_ID=
INTERSWITCH_MAC_KEY=
INTERSWITCH_WEBHOOK_SECRET=

# INTERSWITCH — Developer Marketplace (Identity) (set via `npx convex env set`)
ISW_MARKETPLACE_CLIENT_ID=
ISW_MARKETPLACE_CLIENT_SECRET=
ISW_MARKETPLACE_BASE_URL=https://qa.interswitchng.com

# MISTRAL (set via `npx convex env set`)
MISTRAL_API_KEY=

# INNGEST (set via `npx convex env set`)
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# AFRICA'S TALKING (set via `npx convex env set`)
AT_USERNAME=sandbox
AT_API_KEY=

# META WHATSAPP (set via `npx convex env set`)
META_ACCESS_TOKEN=
META_APP_ID=
META_APP_SECRET=
META_PHONE_NUMBER_ID=
META_SENDER_NUMBER=
META_WABA_ID=
META_WEBHOOK_VERIFY_TOKEN=
META_GRAPH_API_VERSION=v23.0

# E2B (set via `npx convex env set`)
E2B_API_KEY=

# GROQ (set via `npx convex env set`)
GROQ_API_KEY=
GROQ_MODEL=moonshotai/kimi-k2-instruct-0905
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_TEMPERATURE=0.6
GROQ_MAX_COMPLETION_TOKENS=4096
GROQ_TOP_P=1

# FIRECRAWL (local scripts only)
FIRECRAWL_API_KEY=

# APP
VITE_APP_URL=http://localhost:5173
```
