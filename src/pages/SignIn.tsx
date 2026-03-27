import { SignIn } from "@clerk/clerk-react"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { DARK_CLERK_APPEARANCE } from "@/lib/clerkAppearance"
import { ROUTES } from "@/constants/routes"

export function SignInPage() {
  return (
    <AuthLayout>
      <SignIn
        routing="path"
        path={ROUTES.SIGN_IN}
        appearance={DARK_CLERK_APPEARANCE}
      />
    </AuthLayout>
  )
}
