import { SignUp } from "@clerk/clerk-react"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { DARK_CLERK_APPEARANCE } from "@/lib/clerkAppearance"
import { ROUTES } from "@/constants/routes"

export function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp
        routing="path"
        path={ROUTES.SIGN_UP}
        appearance={DARK_CLERK_APPEARANCE}
      />
    </AuthLayout>
  )
}
