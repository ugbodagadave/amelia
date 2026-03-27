import type { Appearance } from "@clerk/clerk-react"

export const DARK_CLERK_APPEARANCE: Appearance = {
  variables: {
    colorBackground: "#1c1c1a",       // --lp-surface-low
    colorText: "#e5e2de",             // --lp-on-surface
    colorTextSecondary: "#b0ada8",    // visible muted text (Google button label, subtitles)
    colorInputBackground: "#20201e",  // --lp-surface-mid
    colorInputText: "#e5e2de",        // --lp-on-surface
    colorPrimary: "#ffb86c",          // --lp-primary (amber)
    borderRadius: "0px",
    fontFamily: "Poppins, ui-sans-serif, sans-serif",
  },
  elements: {
    // Centering
    rootBox: "w-full flex justify-center",
    card: "shadow-none bg-transparent border-0 w-full",
    cardBox: "shadow-none w-full",
    // Hide the internal navbar sidebar that appears in some Clerk flows
    navbar: "hidden",
    navbarButtons: "hidden",
    // Typography
    headerTitle: "font-sans font-semibold",
    headerSubtitle: "font-sans",
    formFieldLabel: "font-sans text-sm",
    formFieldInput: "font-sans",
    // Primary CTA: mono + uppercase (only this button, not social)
    formButtonPrimary: "font-mono font-bold uppercase tracking-wider",
    // Social buttons: warm off-white background with dark text for proper contrast
    socialButtonsBlockButton: "!bg-[#e5e2de] font-sans",
    socialButtonsBlockButtonText: "!text-zinc-900 font-sans",
    // Misc
    dividerText: "font-sans text-xs",
    footerActionText: "font-sans",
    footerActionLink: "font-sans",
  },
}
