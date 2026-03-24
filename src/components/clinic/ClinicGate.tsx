import { type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useQuery } from "convex/react"
import { BuildingsIcon } from "@phosphor-icons/react"
import { api } from "../../../convex/_generated/api"
import { ROUTES } from "@/constants/routes"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

interface ClinicGateProps {
  children: ReactNode
}

export function ClinicGate({ children }: ClinicGateProps) {
  const location = useLocation()
  const clinic = useQuery(api.clinics.getCurrentClinic)

  if (clinic === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono">
              <BuildingsIcon />
              Checking clinic setup
            </CardTitle>
            <CardDescription>
              Amelia is loading your clinic workspace and service defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-muted-foreground">
            <Spinner />
            <span>Verifying onboarding status...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!clinic && location.pathname !== ROUTES.ONBOARDING) {
    return <Navigate to={ROUTES.ONBOARDING} replace />
  }

  if (clinic && location.pathname === ROUTES.ONBOARDING) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <>{children}</>
}
