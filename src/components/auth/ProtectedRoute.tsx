import { useAuth } from "@clerk/clerk-react"
import { Navigate, useLocation } from "react-router-dom"
import { ROUTES } from "@/constants/routes"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()

  if (!isLoaded) return null

  if (!isSignedIn) {
    return <Navigate to={ROUTES.SIGN_IN} state={{ from: location }} replace />
  }

  return <>{children}</>
}
