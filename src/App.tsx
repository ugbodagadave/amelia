import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { SignInPage } from "@/pages/SignIn"
import { SignUpPage } from "@/pages/SignUp"
import { ClinicOnboardingPage } from "@/pages/Onboarding"
import { DashboardPage } from "@/pages/Dashboard"
import { PatientsPage } from "@/pages/Patients"
import { PatientProfilePage } from "@/pages/PatientProfile"
import { BillsPage } from "@/pages/Bills"
import { BillBuilderPage } from "@/pages/BillBuilder"
import { BillDetailPage } from "@/pages/BillDetail"
import { ClaimsPage } from "@/pages/Claims"
import { AnalyticsPage } from "@/pages/Analytics"
import { SettingsPage } from "@/pages/Settings"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppLayout } from "@/layouts/AppLayout"
import { ClinicGate } from "@/components/clinic/ClinicGate"
import { ROUTES } from "@/constants/routes"

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ClinicGate>
        <AppLayout>{children}</AppLayout>
      </ClinicGate>
    </ProtectedRoute>
  )
}

function ProtectedOnboardingRoute() {
  return (
    <ProtectedRoute>
      <ClinicOnboardingPage />
    </ProtectedRoute>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.SIGN_IN} element={<SignInPage />} />
        <Route path={ROUTES.SIGN_UP} element={<SignUpPage />} />
        <Route path={ROUTES.ONBOARDING} element={<ProtectedOnboardingRoute />} />

        <Route path={ROUTES.DASHBOARD} element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
        <Route path={ROUTES.PATIENTS}  element={<ProtectedLayout><PatientsPage /></ProtectedLayout>} />
        <Route path={ROUTES.PATIENT_DETAIL} element={<ProtectedLayout><PatientProfilePage /></ProtectedLayout>} />
        <Route path={ROUTES.BILLS}     element={<ProtectedLayout><BillsPage /></ProtectedLayout>} />
        <Route path={ROUTES.BILLS_NEW} element={<ProtectedLayout><BillBuilderPage /></ProtectedLayout>} />
        <Route path={ROUTES.BILL_DETAIL} element={<ProtectedLayout><BillDetailPage /></ProtectedLayout>} />
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
