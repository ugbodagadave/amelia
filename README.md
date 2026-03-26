<div align="center">
  <img src="https://raw.githubusercontent.com/ugbodagadave/amelia/main/public/brand/amelia-full-logo.svg" alt="Amelia" width="200" />
  <br /><br />
  <strong>AI-Powered Revenue Cycle Management for Nigerian Private Clinics</strong>
  <br /><br />

  <img src="https://img.shields.io/badge/Enyata_×_Interswitch-Beyond_the_Rails_Hackathon_2026-orange?style=flat-square" alt="Hackathon" />
  <img src="https://img.shields.io/badge/Tracks-Payment_+_Health_+_Emerging_Technology-blue?style=flat-square" alt="Tracks" />
  <img src="https://img.shields.io/badge/Stack-React_+_Convex_+_Interswitch-black?style=flat-square" alt="Stack" />
</div>

---

## What is Amelia?

Nigerian private clinics lose **30–40% of their HMO revenue** because authorization codes received on WhatsApp get lost before month-end claims are compiled. Insurance claims are assembled by hand over three days. Payments are collected at the door in cash.

Amelia fixes this. It is an end-to-end billing, payment collection, and insurance claims platform built on Interswitch's payment infrastructure:

- **Bill creation** — structured itemized bills with HMO authorization code tracking; the system locks HMO bills until an auth code is entered, so not a single code is ever lost
- **Interswitch-powered payment collection** — card payments via Quickteller Web Checkout; WhatsApp payment requests with real-time delivery tracking; OPay wallet as an alternative channel
- **HMO claims generation** — one-click export of correctly formatted, auto-filled HMO claims PDFs + Medical Director cover letter, ready to submit to the TPA

Live: **[getamelia.online](https://getamelia.online)**

---

## The Problem (In Numbers)

- 70% of Nigerians pay healthcare costs out-of-pocket (PMC/NCBI, 2023)
- Nigeria's National Health Insurance Act (2022) is enrolling 83M+ Nigerians into HMO coverage — creating a wave of claims that private clinics are completely unprepared to process
- Auth codes arrive on WhatsApp, get saved in notebooks, and cannot be found at month-end — 30–40% of HMO claim line items are rejected for missing auth codes
- Patient detention (holding patients until bills are paid) is a documented, rising practice — a direct symptom of broken cash collection infrastructure

---

## Core Modules

| Module | Description |
|---|---|
| **Patient Registration** | Capture demographics including NIN — mandatory for NHIA claim approval |
| **Bill Builder** | Log services, investigations, and medications with amounts from a service catalog |
| **Auth Code Tracker** | Flag every HMO procedure as "awaiting auth." Lock the bill until the code is entered |
| **Payment Collection** | WhatsApp-first payment requests; Interswitch Web Checkout (card); OPay wallet |
| **HMO Claims Generator** | One-click: auto-filled claims PDF + Medical Director cover letter per HMO template |
| **TPA Submission Tracker** | Log submission date, track 14-day payment window, alert on overdue TPA payments |
| **Revenue Dashboard** | Real-time: collections today, outstanding bills, claim status, overdue payments |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Frontend | React 19 + Vite |
| Styling | Tailwind v4 + shadcn/ui |
| Icons | Phosphor Icons |
| Backend / DB | Convex (mutations, queries, HTTP actions, file storage) |
| Auth | Clerk (email + Google SSO) |
| Async Jobs | Inngest (durable background functions) |
| Payments | Interswitch Quickteller Web Checkout + OPay |
| Identity Verification | Interswitch Marketplace (NIN + bank account) |
| Messaging | Meta WhatsApp Cloud API |
| OCR | Mistral AI (`mistral-ocr-latest`) |
| Claim Scoring | Groq (`moonshotai/kimi-k2-instruct-0905`) |
| PDF Generation | pdf-lib + jszip |
| Email | Resend |
| Deployment | Vercel |

---

## How It's Built

For a detailed technical explanation of every integration — request shapes, auth mechanisms, webhook validation, data flows, and the claim generation pipeline — see **[howitworks.md](./howitworks.md)**.

---

## Team Contributions

### David Ugbodaga — `ugbodagadavid@gmail.com`
**Role: Lead Engineer**

Built the entire application from scratch across a 4-day sprint:

- **Frontend** — React + Vite application with 18 pages and 65+ components; Tailwind v4 design system with full dark mode; shadcn/ui component library integration; Recharts analytics dashboard; real-time Convex subscriptions; React Router navigation
- **Convex backend** — complete TypeScript schema (12 tables), all mutations, queries, actions, and HTTP actions; Convex file storage for claim PDF artifacts
- **Interswitch integration** — Quickteller Web Checkout with SHA-512 hash signing; `TRANSACTION.COMPLETED` webhook with HMAC-SHA512 signature verification; Interswitch Marketplace OAuth (NIN verification, bank account resolution); OPay payment gateway
- **WhatsApp payment requests** — Meta WhatsApp Cloud API template message sending; delivery/read status webhook processing; 12-hour auto-resend scheduler
- **Mistral OCR pipeline** — two-pass HMO document extraction (OCR → structured JSON); audit trail storage; field pre-filling in patient registration and bill builder
- **Groq claim scoring** — LLM-based completeness analysis with green/amber/red band classification and blocking issue detection
- **PDF claims generation** — pdf-lib HMO claims form generation; Medical Director cover letter; PDF merging; jszip bundle creation
- **Inngest background jobs** — durable functions for auth user onboarding, payment confirmation, claims overdue checks
- **Clerk authentication** — JWT bridging to Convex; multi-role access control; webhook-triggered onboarding
- **Resend email** — transactional welcome email on signup
- **Vercel deployment** — production deploy with Convex and Clerk production environments

---

### Joshua Okechukwu — `lodianaselora@gmail.com`
**Role: Research, Architecture & Documentation**

Produced the research foundation and technical documentation that the entire product is built on:

- **Primary research** — obtained and analysed the NHIA Standard Operating Procedure for Claims Submission, Review and Payment; sourced and mapped real Nigerian HMO claims forms (Police HMO and Serene Healthcare); conducted a primary interview with an active HMO authorization officer to document the exact revenue leak chain
- **Product specification** — authored the full product spec: problem framing, user flows, universal HMO field structure, data model, module definitions, hackathon demo script, and post-hackathon business case
- **System architecture** — designed the overall system architecture and data model; produced Architecture Decision Records (ADRs) documenting every major technology choice and trade-off
- **API contracts** — documented the exact request/response shapes for all external APIs (Interswitch, Meta WhatsApp, Inngest, Convex HTTP actions)
- **Environment setup** — wrote the complete environment variables reference covering all 40+ variables, their purpose, where to obtain them, and Convex env setup commands
- **Integration testing** — wrote integration test scenarios and verified external API connectivity across Interswitch sandbox, Mistral OCR, Meta WhatsApp, and Convex
- **Testing documentation** — authored the testing strategy, test structure, and test coverage guidelines

---

## Running Locally

**Prerequisites:** Bun, a Convex account, a Clerk application, an Interswitch sandbox account, a Meta WhatsApp Business account.

```bash
# Install dependencies
bun install

# Copy the example env file and fill in your values
cp .env.example .env.local
```

**`.env.example`** contains every environment variable with inline comments on where to obtain each value. Variables marked `[Convex]` must be set via the Convex CLI — they run server-side and cannot be read from `.env.local`:

```bash
# Set Convex backend variables (repeat for each [Convex] var in .env.example)
npx convex env set INTERSWITCH_MERCHANT_CODE "your_value"
npx convex env set MISTRAL_API_KEY "your_value"
# ... and so on for all [Convex]-marked variables

# Start Convex dev server
npx convex dev

# Start Inngest dev server (separate terminal)
npx inngest-cli@latest dev

# Start Vite dev server (separate terminal)
bun run dev
```

---

## License

Built for the **Enyata × Interswitch Beyond the Rails Hackathon 2026**. All rights reserved — Irenium Ltd.
