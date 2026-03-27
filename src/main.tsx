import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ClerkProvider, useAuth } from "@clerk/clerk-react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { ConvexReactClient } from "convex/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import "./index.css"
import App from "./App.tsx"
import { ROUTES } from "@/constants/routes"

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
const signInUrl = (import.meta.env.VITE_CLERK_SIGN_IN_URL as string | undefined) ?? ROUTES.SIGN_IN
const signUpUrl = (import.meta.env.VITE_CLERK_SIGN_UP_URL as string | undefined) ?? ROUTES.SIGN_UP
const signInForceRedirectUrl =
  (import.meta.env.VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL as string | undefined) ??
  ROUTES.DASHBOARD
const signUpForceRedirectUrl =
  (import.meta.env.VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL as string | undefined) ??
  ROUTES.ONBOARDING

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInForceRedirectUrl={signInForceRedirectUrl}
      signUpForceRedirectUrl={signUpForceRedirectUrl}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <TooltipProvider delayDuration={0}>
          <App />
          <Toaster position="top-right" />
        </TooltipProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>
)
