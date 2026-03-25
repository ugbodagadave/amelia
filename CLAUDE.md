# Amelia — Claude Code Instructions

AI-Powered Revenue Cycle Management for Nigerian Private Clinics.
Enyata x Interswitch Buildathon 2026.

## Stack
Bun · React 19 + Vite · Convex · Clerk · Tailwind v4 · shadcn/ui · Phosphor Icons · Vercel

## Fonts
Space Mono (display/code) + Poppins (body) — loaded from local OTF/TTF files in `public/fonts/` via @font-face. Do NOT use Google Fonts, @fontsource, or CDN links.

## Development Cycle
Every change follows this sequence:
1. **Interview** — ask the user what they want to build (if requirements are unclear)
2. **Research** — search online docs for relevant APIs, patterns, or libraries
3. **Plan** — create or update the plan in `docs/plan.md`
4. **Implement** — write the code
5. **Test** — write tests for new functions/modules
6. **Verify** — run `bun test` — all new AND previous tests must pass; fix failures before proceeding
7. **Update docs** — mark completed items in `docs/plan.md`

At every step, check for relevant skills (via `/skills`) and apply them. For example: use `test-driven-development` before writing implementation code, `systematic-debugging` when a test fails, `shadcn` when adding components, `frontend-design` or `userinterface-wiki` when building UI, `convex-quickstart` / `convex-setup-auth` when working with Convex, `deploy-to-vercel` when deploying.

## UI Components (shadcn/ui)
This project is heavily built on shadcn/ui. All UI must be built with shadcn components.
- **Before any UI change:** audit what shadcn components are needed. If a required component is not yet installed, add it first via `npx shadcn@latest add <component>` before writing any code.
- Use the `shadcn` skill whenever adding, composing, or debugging shadcn components.
- Never build a custom component from scratch if an equivalent shadcn component exists.

## Styling
- All design values (colors, spacing, radii, font sizes, shadows) must come from CSS custom properties defined in `src/index.css` — never hardcode hex values, pixel sizes, or raw Tailwind arbitrary values like `bg-[#fff]` or `text-[14px]`
- Use `var(--token-name)` in CSS or the corresponding Tailwind utility if the token is mapped in the Tailwind config
- When adding new design values, define them as CSS variables in `src/index.css` first

## Testing
- Runner: `bun test` (built-in). Do NOT use Vitest.
- **No mocking** unless absolutely unavoidable. Prefer real API calls against sandbox/test environments.
- Run the full test suite before marking any phase complete.
- Test files go in `tests/` at the project root.

## Integration Constraints
- **Interswitch sandbox:** all endpoints use `qa.interswitchng.com` — NOT `sandbox.interswitchng.com`
- **Payments:** Quickteller Business uses SHA-512 hash auth, NOT OAuth. No token needed.
- **Virtual Account API:** blocked (requires credentials not available via self-serve). Use Web Checkout + OPay instead.
- **OPay:** no auth header needed. Confirm payment via status polling (no webhook).
- **Marketplace APIs (NIN, bank verification):** OAuth via `ISW_MARKETPLACE_CLIENT_ID` + `ISW_MARKETPLACE_CLIENT_SECRET`
- **Icons:** `@phosphor-icons/react` — never use lucide-react
- **SMS:** Africa's Talking (`africastalking` package) — not Termii. Sandbox: `username: "sandbox"`, omit `from` field.

## Convex Conventions
- Mutations for writes, queries for reads, actions for external API calls
- HTTP Actions for webhooks (`convex/http.ts`)
- Server-side API keys set via `npx convex env set KEY value`

## Code Rules
- No magic strings — API endpoints, event names, status values defined as constants
- Type safety — no `any` types, end-to-end typed Convex functions
- Keep modules small and modular. Prefer splitting files by responsibility, and extract submodules once a file starts
   becoming hard to navigate, review, or reason about.
- No over-engineering — minimum complexity for the current task

## Key Docs
- `docs/plan.md` — development roadmap (10 phases)
- `docs/env.md` — environment variables reference
- `docs/test_integration.md` — integration test results from pre-build testing
- `docs/api-contracts.md` — exact request/response shapes for all APIs
