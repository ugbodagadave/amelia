import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { SignInPage } from "@/pages/SignIn"
import { SignUpPage } from "@/pages/SignUp"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { ROUTES } from "@/constants/routes"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.SIGN_IN} element={<SignInPage />} />
        <Route path={ROUTES.SIGN_UP} element={<SignUpPage />} />

        {/* Protected routes — Phase 0.6+ will replace these placeholders */}
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <div className="p-8 font-sans text-foreground bg-background min-h-screen">
                Dashboard — Phase 0.6
              </div>
            </ProtectedRoute>
          }
        />

        {/* Default: redirect to dashboard (Clerk will redirect to sign-in if unauthenticated) */}
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
