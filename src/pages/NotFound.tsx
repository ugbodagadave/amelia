import { Link } from "react-router-dom"
import { useAuth } from "@clerk/clerk-react"
import { CompassToolIcon, SignInIcon } from "@phosphor-icons/react"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function NotFoundPage() {
  const { isSignedIn } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="font-mono text-xl">Page not found</CardTitle>
          <CardDescription>
            The page you requested does not exist in this Amelia workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CompassToolIcon />
              </EmptyMedia>
              <EmptyTitle>We could not find that route</EmptyTitle>
              <EmptyDescription>
                Check the URL or return to a known page.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>

          <div className="flex flex-col gap-3 sm:flex-row">
            {isSignedIn ? (
              <Button asChild>
                <Link to={ROUTES.DASHBOARD}>
                  <CompassToolIcon data-icon="inline-start" />
                  Back to dashboard
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to={ROUTES.SIGN_IN}>
                  <SignInIcon data-icon="inline-start" />
                  Go to sign in
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
