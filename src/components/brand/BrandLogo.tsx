import { BRAND_ASSETS } from "@/lib/branding"

type BrandLogoProps = {
  variant: "full" | "mark"
  className?: string
}

export function BrandLogo({ variant, className }: BrandLogoProps) {
  const isFull = variant === "full"

  return (
    <img
      src={isFull ? BRAND_ASSETS.fullLogo : BRAND_ASSETS.logoMark}
      alt="Amelia"
      className={className}
      style={
        isFull
          ? {
              display: "block",
              width: "var(--brand-logo-full-width)",
              height: "var(--brand-logo-full-height)",
            }
          : {
              display: "block",
              width: "var(--brand-logo-mark-size)",
              height: "var(--brand-logo-mark-size)",
            }
      }
    />
  )
}
