export const AMELIA_NAME = "Amelia"
export const AMELIA_DESCRIPTION =
  "AI-Powered Revenue Cycle Management for Nigerian Private Clinics"

export const BRAND_ASSETS = {
  fullLogo: "/brand/amelia-full-logo.svg",
  logoMark: "/brand/amelia-logo-mark.svg",
} as const

function formatPublicTitle(label: string) {
  return `${AMELIA_NAME} - ${label}`
}

function formatAppTitle(label: string) {
  return `${AMELIA_NAME} | ${label}`
}

export function getDocumentTitleForPath(pathname: string) {
  if (pathname === "/") {
    return formatPublicTitle(AMELIA_DESCRIPTION)
  }

  if (pathname === "/sign-in") {
    return formatPublicTitle("Sign In")
  }

  if (pathname === "/sign-up") {
    return formatPublicTitle("Sign Up")
  }

  if (pathname === "/pay/callback/card") {
    return formatPublicTitle("Card Payment Result")
  }

  if (pathname === "/pay/callback/opay") {
    return formatPublicTitle("OPay Payment Result")
  }

  if (pathname.startsWith("/pay/")) {
    return formatPublicTitle("Patient Payment")
  }

  if (pathname === "/onboarding") {
    return formatAppTitle("Clinic Onboarding")
  }

  if (pathname === "/dashboard") {
    return formatAppTitle("Dashboard")
  }

  if (pathname === "/patients") {
    return formatAppTitle("Patients")
  }

  if (pathname.startsWith("/patients/")) {
    return formatAppTitle("Patient Profile")
  }

  if (pathname === "/bills") {
    return formatAppTitle("Bills")
  }

  if (pathname === "/bills/new") {
    return formatAppTitle("New Bill")
  }

  if (pathname.startsWith("/bills/")) {
    return formatAppTitle("Bill Detail")
  }

  if (pathname === "/claims") {
    return formatAppTitle("Claims")
  }

  if (pathname === "/analytics") {
    return formatAppTitle("Analytics")
  }

  if (pathname === "/settings") {
    return formatAppTitle("Settings")
  }

  return formatAppTitle("Not Found")
}
