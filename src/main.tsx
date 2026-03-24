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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey} signInUrl={ROUTES.SIGN_IN} signUpUrl={ROUTES.SIGN_UP}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <TooltipProvider delayDuration={0}>
          <App />
          <Toaster position="top-right" />
        </TooltipProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>
)
