import { Suspense, lazy, type ReactNode } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { SignInPage } from "@/pages/SignIn"
import { SignUpPage } from "@/pages/SignUp"
import { LandingPage } from "@/pages/Landing"
import { NotFoundPage } from "@/pages/NotFound"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { DocumentTitleManager } from "@/components/brand/DocumentTitleManager"
import { ScrollToTop } from "@/components/brand/ScrollToTop"
import { Spinner } from "@/components/ui/spinner"
import { AppLayout } from "@/layouts/AppLayout"
import { ClinicGate } from "@/components/clinic/ClinicGate"
import { ROUTES } from "@/constants/routes"

const ClinicOnboardingPage = lazy(() =>
  import("@/pages/Onboarding").then((module) => ({ default: module.ClinicOnboardingPage })),
)
const PaymentLinkPage = lazy(() =>
  import("@/pages/PaymentLink").then((module) => ({ default: module.PaymentLinkPage })),
)
const PaymentCallbackCardPage = lazy(() =>
  import("@/pages/PaymentCallbackCard").then((module) => ({
    default: module.PaymentCallbackCardPage,
  })),
)
const PaymentCallbackOpayPage = lazy(() =>
  import("@/pages/PaymentCallbackOpay").then((module) => ({
    default: module.PaymentCallbackOpayPage,
  })),
)
const DashboardPage = lazy(() =>
  import("@/pages/Dashboard").then((module) => ({ default: module.DashboardPage })),
)
const PatientsPage = lazy(() =>
  import("@/pages/Patients").then((module) => ({ default: module.PatientsPage })),
)
const PatientProfilePage = lazy(() =>
  import("@/pages/PatientProfile").then((module) => ({ default: module.PatientProfilePage })),
)
const BillsPage = lazy(() =>
  import("@/pages/Bills").then((module) => ({ default: module.BillsPage })),
)
const BillBuilderPage = lazy(() =>
  import("@/pages/BillBuilder").then((module) => ({ default: module.BillBuilderPage })),
)
const BillDetailPage = lazy(() =>
  import("@/pages/BillDetail").then((module) => ({ default: module.BillDetailPage })),
)
const ClaimsPage = lazy(() =>
  import("@/pages/Claims").then((module) => ({ default: module.ClaimsPage })),
)
const AnalyticsPage = lazy(() =>
  import("@/pages/Analytics").then((module) => ({ default: module.AnalyticsPage })),
)
const SettingsPage = lazy(() =>
  import("@/pages/Settings").then((module) => ({ default: module.SettingsPage })),
)
const PublicPage = lazy(() =>
  import("@/pages/PublicPage").then((module) => ({ default: module.PublicPage })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-muted-foreground">
      <div className="flex items-center gap-3">
        <Spinner />
        <span>Loading Amelia workspace...</span>
      </div>
    </div>
  )
}

function ProtectedLayout({ children }: { children: ReactNode }) {
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
      <DocumentTitleManager />
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path={`${ROUTES.SIGN_IN}/*`} element={<SignInPage />} />
          <Route path={`${ROUTES.SIGN_UP}/*`} element={<SignUpPage />} />
          <Route path={ROUTES.ONBOARDING} element={<ProtectedOnboardingRoute />} />
          <Route path={ROUTES.PAYMENT_LINK} element={<PaymentLinkPage />} />
          <Route path={ROUTES.PAYMENT_CALLBACK_CARD} element={<PaymentCallbackCardPage />} />
          <Route path={ROUTES.PAYMENT_CALLBACK_OPAY} element={<PaymentCallbackOpayPage />} />
          <Route path={ROUTES.REVENUE_CYCLE} element={<PublicPage pageId="revenueCycle" />} />
          <Route path={ROUTES.HMO_MANAGEMENT} element={<PublicPage pageId="hmoManagement" />} />
          <Route
            path={ROUTES.CLAIMS_PROCESSING}
            element={<PublicPage pageId="claimsProcessing" />}
          />
          <Route path={ROUTES.PRIVACY_POLICY} element={<PublicPage pageId="privacyPolicy" />} />
          <Route path={ROUTES.TERMS_OF_SERVICE} element={<PublicPage pageId="termsOfService" />} />
          <Route path={ROUTES.CLINICAL_ETHICS} element={<PublicPage pageId="clinicalEthics" />} />
          <Route
            path={ROUTES.SECURITY_WHITEPAPER}
            element={<PublicPage pageId="securityWhitepaper" />}
          />

          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedLayout>
                <DashboardPage />
              </ProtectedLayout>
            }
          />
          <Route
            path={ROUTES.PATIENTS}
            element={
              <ProtectedLayout>
                <PatientsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path={ROUTES.PATIENT_DETAIL}
            element={
              <ProtectedLayout>
                <PatientProfilePage />
              </ProtectedLayout>
            }
          />
          <Route
            path={ROUTES.BILLS}
            element={
              <ProtectedLayout>
                <BillsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path={ROUTES.BILLS_NEW}
            element={
              <ProtectedLayout>
                <BillBuilderPage />
              </ProtectedLayout>
            }
          />
          <Route
            path={ROUTES.BILL_DETAIL}
            element={
              <ProtectedLayout>
                <BillDetailPage />
              </ProtectedLayout>
            }
          />
          <Route
            path={ROUTES.CLAIMS}
            element={
              <ProtectedLayout>
                <ClaimsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path={ROUTES.ANALYTICS}
            element={
              <ProtectedLayout>
                <AnalyticsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path={ROUTES.SETTINGS}
            element={
              <ProtectedLayout>
                <SettingsPage />
              </ProtectedLayout>
            }
          />

          <Route path={ROUTES.LANDING} element={<LandingPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
