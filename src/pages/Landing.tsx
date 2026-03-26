import {
  BrainIcon,
  ChatCircleIcon,
  ChartLineUpIcon,
  ArrowUpRightIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react"
import { Link } from "react-router-dom"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { PublicFooter } from "@/components/public/PublicFooter"
import { ROUTES } from "@/constants/routes"
import {
  GOVERNANCE_LINKS,
  HACKATHON_CREDIT,
  PLATFORM_LINKS,
} from "@/lib/publicContent"

const APP_SIGN_UP = "https://app.getamelia.online/sign-up"
const APP_SIGN_IN = "https://app.getamelia.online/sign-in"

export function LandingPage() {
  return (
    <div className="bg-lp-surface text-lp-on-surface font-sans">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-lp-surface">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center">
          <Link to={ROUTES.LANDING}>
            <BrandLogo variant="full" />
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <a
              href={APP_SIGN_IN}
              className="hidden sm:inline text-zinc-400 hover:text-lp-on-surface text-sm font-light transition-all"
            >
              Log in
            </a>
            <a
              href={APP_SIGN_UP}
              className="bg-lp-primary text-lp-on-primary px-4 sm:px-6 py-2 font-mono text-xs font-bold uppercase tracking-wider sm:tracking-widest rounded-sm hover:brightness-110 active:scale-95 transition-all whitespace-nowrap"
            >
              Get started
            </a>
          </div>
        </div>
      </nav>

      <main className="pt-20 sm:pt-24 min-h-screen">
        {/* ── Hero ────────────────────────────────────────────────── */}
        <section className="relative px-4 sm:px-8 py-12 sm:py-20 overflow-hidden max-w-screen-2xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16 lp-amber-glow">
          {/* Left: Headline + CTAs */}
          <div className="flex-1 space-y-6 sm:space-y-8 z-10 w-full">
            <div className="lp-ribbon">
              <span className="lp-ribbon-label">Hackathon Build</span>
              <span className="lp-ribbon-copy">{HACKATHON_CREDIT}</span>
            </div>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-mono font-bold tracking-tighter"
              style={{ lineHeight: 0.9 }}
            >
              <span className="text-lp-on-surface">Private Clinic Billing,</span>
              <br />
              <span className="text-lp-primary-dim">Done Properly.</span>
            </h1>
            <p className="max-w-xl text-base sm:text-lg text-zinc-400 font-light leading-relaxed">
              Amelia handles billing, HMO claims, and payment collection for
              Nigerian private clinics. Your team focuses on care — we handle
              the numbers with clinical precision.
            </p>
            <div className="flex flex-wrap gap-3 text-xs font-mono uppercase tracking-widest text-zinc-500">
              <Link className="transition hover:text-lp-primary" to={ROUTES.REVENUE_CYCLE}>
                Revenue Cycle
              </Link>
              <span className="text-lp-outline">/</span>
              <Link className="transition hover:text-lp-primary" to={ROUTES.HMO_MANAGEMENT}>
                HMO Management
              </Link>
              <span className="text-lp-outline">/</span>
              <Link className="transition hover:text-lp-primary" to={ROUTES.CLAIMS_PROCESSING}>
                Claims Processing
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
              <a
                href={APP_SIGN_UP}
                className="inline-block bg-lp-primary text-lp-on-primary px-8 py-4 font-mono font-bold uppercase tracking-wider rounded-sm hover:brightness-110 transition-all active:scale-95 text-center"
                style={{ boxShadow: "0 0 20px rgba(212,136,42,0.15)" }}
              >
                Start free trial
              </a>
              <a
                href={APP_SIGN_IN}
                className="inline-block border text-lp-on-surface px-8 py-4 font-mono font-bold uppercase tracking-wider rounded-sm hover:bg-white/5 transition-all border-lp-outline/30 text-center"
              >
                Log in <span className="ml-2">→</span>
              </a>
            </div>
          </div>

          {/* Right: Terminal Dashboard Mock */}
          <div className="flex-1 w-full max-w-2xl">
            <div className="lp-glass-panel border border-lp-outline/20 rounded-sm p-4 sm:p-6 shadow-2xl relative overflow-hidden">
              {/* Window chrome */}
              <div className="flex justify-between items-center mb-6 sm:mb-8 border-b border-lp-outline/10 pb-4">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span
                  className="font-mono text-zinc-500 uppercase tracking-widest"
                  style={{ fontSize: "10px" }}
                >
                  Live Ledger // Node_Lagos_HQ
                </span>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1">
                  <span
                    className="text-zinc-500 font-mono uppercase"
                    style={{ fontSize: "10px" }}
                  >
                    Daily Collection
                  </span>
                  <div className="text-2xl sm:text-3xl font-mono text-lp-primary">₦2.4M</div>
                  <div
                    className="flex items-center gap-1 text-lp-secondary font-mono"
                    style={{ fontSize: "10px" }}
                  >
                    <ArrowUpRightIcon size={12} weight="bold" />
                    <span>+14.2% VS YESTERDAY</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span
                    className="text-zinc-500 font-mono uppercase"
                    style={{ fontSize: "10px" }}
                  >
                    HMO Claims Pending
                  </span>
                  <div className="text-2xl sm:text-3xl font-mono text-lp-on-surface">12</div>
                  <div
                    className="text-zinc-600 font-mono uppercase"
                    style={{ fontSize: "10px" }}
                  >
                    Est. value: ₦840k
                  </div>
                </div>
                <div className="col-span-2 p-3 sm:p-4 bg-lp-surface-lowest rounded-sm border border-lp-outline/5">
                  <div className="flex justify-between items-end mb-2">
                    <span
                      className="text-zinc-500 font-mono uppercase"
                      style={{ fontSize: "10px" }}
                    >
                      Collection Efficiency
                    </span>
                    <span className="text-lg sm:text-xl font-mono text-lp-secondary">78%</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-lp-secondary" style={{ width: "78%" }} />
                  </div>
                </div>
              </div>

              {/* Ambient glow */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-lp-primary/5 blur-3xl rounded-full" />
            </div>
          </div>
        </section>

        {/* ── Feature Tiles ───────────────────────────────────────── */}
        <section className="px-4 sm:px-8 py-16 sm:py-24 max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            {/* Tile 1: AI Claims */}
            <div className="group p-6 sm:p-10 bg-lp-surface-low hover:bg-lp-surface-mid transition-all duration-500 relative overflow-hidden">
              <div className="mb-6 sm:mb-12 text-lp-primary opacity-60 group-hover:opacity-100 transition-opacity">
                <BrainIcon size={36} />
              </div>
              <h3 className="text-xl sm:text-2xl font-mono font-bold uppercase tracking-tight mb-3 sm:mb-4 text-lp-on-surface">
                AI Claims
              </h3>
              <p className="text-zinc-500 font-light leading-relaxed group-hover:text-zinc-300 transition-colors">
                Automated coding and submission for NHIS and private HMOs.
                Reduce rejection rates by 94% using our proprietary clinical NLP.
              </p>
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="font-mono text-lp-primary" style={{ fontSize: "10px" }}>
                  MODULE_01
                </span>
              </div>
            </div>

            {/* Tile 2: WhatsApp Collection */}
            <div className="group p-6 sm:p-10 bg-lp-surface-low hover:bg-lp-surface-mid transition-all duration-500 relative overflow-hidden">
              <div className="mb-6 sm:mb-12 text-lp-secondary opacity-60 group-hover:opacity-100 transition-opacity">
                <ChatCircleIcon size={36} />
              </div>
              <h3 className="text-xl sm:text-2xl font-mono font-bold uppercase tracking-tight mb-3 sm:mb-4 text-lp-on-surface">
                WhatsApp Collection
              </h3>
              <p className="text-zinc-500 font-light leading-relaxed group-hover:text-zinc-300 transition-colors">
                Seamlessly send bills and collect payments where your patients
                are. Secure, instant Interswitch integration directly in the chat.
              </p>
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="font-mono text-lp-secondary" style={{ fontSize: "10px" }}>
                  MODULE_02
                </span>
              </div>
            </div>

            {/* Tile 3: Live Analytics */}
            <div className="group p-6 sm:p-10 bg-lp-surface-low hover:bg-lp-surface-mid transition-all duration-500 relative overflow-hidden">
              <div className="mb-6 sm:mb-12 text-lp-on-surface-muted opacity-60 group-hover:opacity-100 transition-opacity">
                <ChartLineUpIcon size={36} />
              </div>
              <h3 className="text-xl sm:text-2xl font-mono font-bold uppercase tracking-tight mb-3 sm:mb-4 text-lp-on-surface">
                Live Analytics
              </h3>
              <p className="text-zinc-500 font-light leading-relaxed group-hover:text-zinc-300 transition-colors">
                Real-time cash flow visibility. Monitor daily clinic throughput,
                doctor performance, and pending receivables in a single view.
              </p>
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="font-mono text-zinc-400" style={{ fontSize: "10px" }}>
                  MODULE_03
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-screen-2xl mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="border border-lp-outline/10 bg-lp-surface-low p-6 sm:p-8">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                Explore Amelia
              </p>
              <h2 className="mt-4 max-w-2xl font-mono text-2xl font-bold uppercase tracking-tight text-lp-on-surface sm:text-4xl">
                See how Amelia helps clinics collect faster, manage HMOs, and handle claims with more discipline.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <LinkGroupCard heading="Platform" links={PLATFORM_LINKS} />
              <LinkGroupCard heading="Governance" links={GOVERNANCE_LINKS} />
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

type LinkGroupCardProps = {
  heading: string
  links: ReadonlyArray<{ label: string; href: string }>
}

function LinkGroupCard({ heading, links }: LinkGroupCardProps) {
  return (
    <div className="border border-lp-outline/10 bg-lp-surface-low p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-lp-primary">{heading}</p>
      <div className="mt-5 flex flex-col gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="group flex items-center justify-between gap-3 border-b border-lp-outline/10 pb-3 font-mono text-xs uppercase tracking-widest text-zinc-400 transition hover:text-lp-on-surface"
          >
            <span>{link.label}</span>
            <ArrowRightIcon
              size={14}
              className="translate-x-0 text-lp-primary transition group-hover:translate-x-1"
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
