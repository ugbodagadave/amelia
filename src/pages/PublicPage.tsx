import { Link } from "react-router-dom"
import { ArrowLeftIcon } from "@phosphor-icons/react"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { PublicFooter } from "@/components/public/PublicFooter"
import { ROUTES } from "@/constants/routes"
import {
  GOVERNANCE_LINKS,
  PLATFORM_LINKS,
  PUBLIC_PAGE_CONTENT,
  type PublicPageId,
} from "@/lib/publicContent"

type PublicPageProps = {
  pageId: PublicPageId
}

export function PublicPage({ pageId }: PublicPageProps) {
  const content = PUBLIC_PAGE_CONTENT[pageId]
  const pageLinks = content.eyebrow === "Platform" ? PLATFORM_LINKS : GOVERNANCE_LINKS

  return (
    <div className="min-h-screen bg-lp-surface text-lp-on-surface">
      <div className="lp-public-grid">
        <header className="border-b border-lp-outline/10 bg-lp-surface/95">
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-5 px-4 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Link to={ROUTES.LANDING} className="inline-flex items-center">
                <BrandLogo variant="full" />
              </Link>
              <Link
                to={ROUTES.LANDING}
                className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-500 transition hover:text-lp-primary sm:hidden"
              >
                <ArrowLeftIcon size={14} />
                Back
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
              {pageLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`font-mono text-xs uppercase tracking-widest transition ${
                    link.label === content.title
                      ? "text-lp-primary"
                      : "text-zinc-500 hover:text-lp-on-surface"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <Link
              to={ROUTES.LANDING}
              className="hidden items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-500 transition hover:text-lp-primary sm:inline-flex"
            >
              <ArrowLeftIcon size={14} />
              Return to Landing
            </Link>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:gap-14">
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.7fr)] lg:items-end">
            <div className="flex flex-col gap-6">
              <p className="font-mono text-xs uppercase tracking-widest text-lp-secondary">
                {content.eyebrow}
              </p>
              <h1 className="max-w-4xl font-mono text-4xl font-bold uppercase tracking-tight sm:text-6xl">
                {content.title}
              </h1>
              <p className="max-w-3xl text-base leading-8 text-zinc-400 sm:text-lg">
                {content.intro}
              </p>
            </div>

            <aside className="border border-lp-outline/15 bg-lp-surface-low p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-lp-primary">
                Amelia Position
              </p>
              <p className="mt-4 text-sm leading-7 text-zinc-400">{content.highlight}</p>
            </aside>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {content.sections.map((section) => (
              <article
                key={section.title}
                className="flex flex-col gap-4 border border-lp-outline/10 bg-lp-surface-low p-6"
              >
                <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                  {section.eyebrow}
                </p>
                <h2 className="font-mono text-xl font-bold uppercase tracking-tight text-lp-on-surface">
                  {section.title}
                </h2>
                <p className="text-sm leading-7 text-zinc-400">{section.body}</p>
              </article>
            ))}
          </section>
        </main>

        <PublicFooter />
      </div>
    </div>
  )
}
