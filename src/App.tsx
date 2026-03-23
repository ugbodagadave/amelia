import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { SignInPage } from "@/pages/SignIn"
import { SignUpPage } from "@/pages/SignUp"
import { DashboardPage } from "@/pages/Dashboard"
import { PatientsPage } from "@/pages/Patients"
import { BillsPage } from "@/pages/Bills"
import { ClaimsPage } from "@/pages/Claims"
import { AnalyticsPage } from "@/pages/Analytics"
import { SettingsPage } from "@/pages/Settings"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppLayout } from "@/layouts/AppLayout"
import { ROUTES } from "@/constants/routes"

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.SIGN_IN} element={<SignInPage />} />
        <Route path={ROUTES.SIGN_UP} element={<SignUpPage />} />

        <Route path={ROUTES.DASHBOARD} element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
        <Route path={ROUTES.PATIENTS}  element={<ProtectedLayout><PatientsPage /></ProtectedLayout>} />
        <Route path={ROUTES.BILLS}     element={<ProtectedLayout><BillsPage /></ProtectedLayout>} />
        <Route path={ROUTES.CLAIMS}    element={<ProtectedLayout><ClaimsPage /></ProtectedLayout>} />
        <Route path={ROUTES.ANALYTICS} element={<ProtectedLayout><AnalyticsPage /></ProtectedLayout>} />
        <Route path={ROUTES.SETTINGS}  element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />

        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
