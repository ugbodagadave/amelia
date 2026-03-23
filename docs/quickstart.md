# Amelia — Quick Start & Commands

**For use with Claude Code. Run these in order when starting a new session.**

---

## First-Time Setup

```bash
# 1. Create project
bun create vite amelia --template react-ts
cd amelia

# 2. Install core dependencies
bun add convex @clerk/clerk-react react-router-dom recharts @phosphor-icons/react
bun add inngest @e2b/code-interpreter
bun add pdf-lib qrcode africastalking
bun add class-variance-authority clsx tailwind-merge
bun add @tanstack/react-query

# 3. Install shadcn
bunx shadcn@latest init

# 4. Initialize Convex
npx convex dev

# 5. Set Convex env vars
npx convex env set INTERSWITCH_CLIENT_ID "your_value"
npx convex env set INTERSWITCH_SECRET_KEY "your_value"
npx convex env set INTERSWITCH_MERCHANT_CODE "your_value"
npx convex env set INTERSWITCH_PAY_ITEM_ID "your_value"
npx convex env set INTERSWITCH_MAC_KEY "your_value"
npx convex env set ISW_MARKETPLACE_CLIENT_ID "your_value"
npx convex env set ISW_MARKETPLACE_CLIENT_SECRET "your_value"
npx convex env set MISTRAL_API_KEY "your_value"
npx convex env set INNGEST_EVENT_KEY "your_value"
npx convex env set INNGEST_SIGNING_KEY "your_value"
npx convex env set AT_USERNAME "your_value"
npx convex env set AT_API_KEY "your_value"
npx convex env set E2B_API_KEY "your_value"
```

---

## Daily Development Commands

```bash
# Start everything
bun run dev          # Vite frontend at localhost:5173
npx convex dev       # Convex backend (run in separate terminal)
npx inngest-cli@latest dev  # Inngest Dev Server at localhost:8288

# For webhook testing (expose local to Interswitch sandbox)
ngrok http 5173

# Register ngrok URL as webhook in Interswitch dashboard:
# https://[ngrok-url]/api/webhooks/interswitch
```

---

## Testing Commands

```bash
bun test                  # Run all tests
bun test --watch          # Watch mode
bun test tests/unit/      # Run specific directory
```

---

## Convex Commands

```bash
npx convex dev            # Start local dev
npx convex deploy         # Deploy to production
npx convex env list       # Show all env vars
npx convex env set KEY VALUE
npx convex logs           # View function logs
npx convex dashboard      # Open browser dashboard
```

---

## Build & Deploy

```bash
bun run build             # Build for production
npx convex deploy         # Deploy Convex to production
vercel --prod             # Deploy frontend to Vercel
```

---

## shadcn Component Install (Quick Reference)

```bash
# Install individual components as needed
bunx shadcn@latest add [component-name]

# Full install (all Amelia components)
bunx shadcn@latest add button input label select textarea form dialog sheet drawer dropdown-menu command popover table badge card tabs toast sonner alert avatar separator skeleton progress tooltip calendar checkbox radio-group switch scroll-area hover-card collapsible
```

---

## File Structure

```
amelia/
├── convex/
│   ├── schema.ts           # Database schema
│   ├── bills.ts            # Bill mutations/queries
│   ├── patients.ts         # Patient mutations/queries
│   ├── claims.ts           # Claim batch mutations/queries
│   ├── clinics.ts          # Clinic mutations/queries
│   ├── dashboard.ts        # Dashboard aggregation queries
│   ├── actions/
│   │   ├── interswitch.ts  # Payment API calls
│   │   ├── mistral.ts      # OCR calls
│   │   ├── sms.ts          # SMS calls
│   │   └── pdfGen.ts       # PDF generation (E2B)
│   └── http.ts             # HTTP Actions (webhooks)
├── public/
│   └── fonts/              # Space Mono + Poppins OTF/TTF files
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── Dashboard.tsx
│   │   ├── Patients.tsx
│   │   ├── Bills.tsx
│   │   ├── Claims.tsx
│   │   └── Analytics.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   ├── ui/             # shadcn auto-generated
│   │   └── domain/         # Amelia-specific components
│   └── lib/
│       ├── utils.ts        # cn(), formatCurrency(), formatNigerianPhone()
│       ├── calculations.ts # Bill calculation pure functions
│       └── validation.ts   # NIN, phone validators
├── tests/
│   ├── setup.ts
│   └── __tests__/
├── inngest/
│   ├── client.ts
│   └── functions/
│       ├── billCreated.ts
│       ├── paymentConfirmed.ts
│       ├── billOverdue.ts
│       └── claimsOverdueCheck.ts
├── scripts/
│   ├── scrape-hmo-directory.ts
│   └── seed-hmo-directory.ts
└── docs/                   # This folder
    ├── plan.md
    ├── env.md
    ├── components.md
    ├── resources.md
    ├── architecture.md
    ├── api-contracts.md
    ├── testing.md
    └── quickstart.md
```
