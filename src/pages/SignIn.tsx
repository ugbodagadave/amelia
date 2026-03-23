import { SignIn } from "@clerk/clerk-react"
import { ROUTES } from "@/constants/routes"

export function SignInPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0 flex-col justify-between p-12"
        style={{ backgroundColor: "var(--foreground)", color: "var(--background)" }}
      >
        {/* Logo */}
        <div>
          <span
            className="text-xl font-bold tracking-widest uppercase"
            style={{ fontFamily: "var(--font-mono)", color: "var(--primary)" }}
          >
            Amelia
          </span>
        </div>

        {/* Centre copy */}
        <div className="space-y-6">
          <h1
            className="text-4xl xl:text-5xl font-bold leading-tight"
            style={{ fontFamily: "var(--font-mono)", color: "var(--background)" }}
          >
            Revenue
            <br />
            without
            <br />
            the chaos.
          </h1>
          <p
            className="text-base leading-relaxed max-w-xs"
            style={{ color: "color-mix(in oklch, var(--background) 65%, transparent)" }}
          >
            AI-powered billing, HMO claims, and payment collection — built for Nigerian clinics.
          </p>
        </div>

        {/* Footer */}
        <p
          className="text-xs"
          style={{ color: "color-mix(in oklch, var(--background) 40%, transparent)" }}
        >
          Enyata × Interswitch Buildathon 2026
        </p>
      </div>

      {/* Right panel — form */}
      <div
        className="flex flex-1 flex-col items-center justify-center p-8"
        style={{ backgroundColor: "var(--background)" }}
      >
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <span
            className="text-2xl font-bold tracking-widest uppercase"
            style={{ fontFamily: "var(--font-mono)", color: "var(--primary)" }}
          >
            Amelia
          </span>
        </div>

        <SignIn
          routing="path"
          path={ROUTES.SIGN_IN}
          appearance={{
            variables: {
              colorPrimary: "oklch(0.6171 0.1375 39.0427)",
              colorBackground: "var(--background)",
              colorText: "oklch(0.3438 0.0269 95.7226)",
              colorTextSecondary: "oklch(0.6059 0.0075 97.4233)",
              colorInputBackground: "oklch(1.0000 0 0)",
              colorInputText: "oklch(0.1908 0.0020 106.5859)",
              fontFamily: "Poppins, ui-sans-serif, sans-serif",
              borderRadius: "0px",
            },
            elements: {
              card: "shadow-none bg-transparent",
              rootBox: "w-full max-w-sm",
              headerTitle: "font-sans font-semibold",
              headerSubtitle: "font-sans",
              formButtonPrimary: "font-sans font-medium",
              formFieldLabel: "font-sans text-sm",
              formFieldInput: "font-sans",
              footerActionText: "font-sans",
              footerActionLink: "font-sans",
              socialButtonsBlockButton: "font-sans",
              dividerText: "font-sans text-xs",
            },
          }}
        />
      </div>
    </div>
  )
}
