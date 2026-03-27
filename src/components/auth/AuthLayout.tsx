import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowLeftIcon } from "@phosphor-icons/react"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { AMELIA_DESCRIPTION } from "@/lib/branding"
import { ROUTES } from "@/constants/routes"

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lp-public-grid min-h-screen flex flex-col lg:flex-row text-lp-on-surface">

      {/* ── LEFT PANEL (desktop only) ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] flex-shrink-0 flex-col relative overflow-hidden p-10 xl:p-14">

        {/* Amber atmospheric glow */}
        <div className="lp-amber-glow absolute inset-0 pointer-events-none" aria-hidden="true" />

        {/* Logo — top */}
        <div className="relative z-10">
          <Link to={ROUTES.LANDING}>
            <BrandLogo variant="full" />
          </Link>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center gap-6 max-w-sm">
          <h1
            className="font-mono font-bold text-lp-on-surface"
            style={{ fontSize: "clamp(2.5rem, 4vw, 3.5rem)", lineHeight: 0.92, letterSpacing: "-0.02em" }}
          >
            Revenue
            <br />
            without
            <br />
            <span className="text-lp-primary-dim">the chaos.</span>
          </h1>
          <p className="text-lp-on-surface-muted font-light leading-relaxed text-sm">
            {AMELIA_DESCRIPTION}.
          </p>
        </div>

        {/* Footer — back link + credit */}
        <div className="relative z-10 flex flex-col gap-2">
          <Link
            to={ROUTES.LANDING}
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-zinc-600 hover:text-lp-primary transition-colors w-fit"
          >
            <ArrowLeftIcon size={12} />
            Back to home
          </Link>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-700">
            Enyata × Interswitch Buildathon 2026
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL (form) ─────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10 lg:p-12">

        {/* Mobile: logo + back link above form */}
        <div className="lg:hidden mb-8 flex flex-col items-center gap-3">
          <Link to={ROUTES.LANDING}>
            <BrandLogo variant="mark" />
          </Link>
          <Link
            to={ROUTES.LANDING}
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-lp-primary transition-colors"
          >
            <ArrowLeftIcon size={12} />
            Back to home
          </Link>
        </div>

        {/* Glass card wrapping Clerk form */}
        <div className="lp-glass-panel border border-lp-outline/20 w-full max-w-[25rem]">
          {children}
        </div>
      </div>

    </div>
  )
}
