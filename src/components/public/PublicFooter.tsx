import { Link } from "react-router-dom"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { Separator } from "@/components/ui/separator"
import { GOVERNANCE_LINKS, PLATFORM_LINKS } from "@/lib/publicContent"

export function PublicFooter() {
  return (
    <footer className="bg-lp-surface-lowest pt-12 pb-12 sm:pt-20">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-8 px-4 sm:px-8">
        <Separator className="bg-lp-outline/10" />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-[1.2fr_0.9fr_0.9fr_1fr] xl:gap-10">
          <div className="flex flex-col gap-5">
            <BrandLogo variant="full" />
            <p className="max-w-sm text-sm leading-7 text-lp-on-surface-muted">
              Modernizing the financial infrastructure of Nigerian private clinics with
              billing discipline, payer visibility, and cleaner payment operations.
            </p>
          </div>

          <FooterLinkColumn heading="Platform" links={PLATFORM_LINKS} />
          <FooterLinkColumn heading="Governance" links={GOVERNANCE_LINKS} />

          <div className="flex flex-col gap-4 border border-lp-outline/10 bg-lp-surface-low p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-lp-primary">
              Founder&apos;s Office
            </p>
            <p className="text-sm leading-7 text-zinc-400">
              Direct access for clinic owners, operators, and design partners evaluating
              Amelia for real-world billing and claims workflows.
            </p>
            <a
              href="mailto:dave@getamelia.online"
              className="inline-flex items-center justify-center border border-lp-outline/20 bg-lp-primary px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-lp-on-primary transition hover:brightness-110"
            >
              Contact the Founder
            </a>
          </div>
        </div>

        <Separator className="bg-lp-outline/10" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-lp-secondary" />
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-600">
              Operational: public information surface online
            </p>
          </div>
          <p className="text-center font-mono text-xs uppercase tracking-widest text-zinc-700 sm:text-right">
            © 2026 Amelia Clinical Intelligence. Built for Nigerian private clinics.
          </p>
        </div>
      </div>
    </footer>
  )
}

type FooterLinkColumnProps = {
  heading: string
  links: ReadonlyArray<{ label: string; href: string }>
}

function FooterLinkColumn({ heading, links }: FooterLinkColumnProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="border-b border-lp-outline/20 pb-2 font-mono text-xs uppercase tracking-widest text-zinc-300">
        {heading}
      </p>
      <div className="flex flex-col gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="font-mono text-xs uppercase tracking-widest text-zinc-500 transition hover:text-lp-primary"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
