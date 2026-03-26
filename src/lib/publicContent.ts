import { ROUTES } from "@/constants/routes"

export const HACKATHON_CREDIT = "Built at Interswitch Beyond the Rails Hackathon 2026"

export const HACKATHON_MARKER_VARIATIONS = [
  {
    name: "Editorial Ribbon",
    description:
      "A slim structured strip above the hero copy, segmented like an editorial data line.",
  },
  {
    name: "Corner Ledger",
    description:
      "A subtle marker attached to the hero frame, reading like a system stamp rather than a badge.",
  },
  {
    name: "Status Ticker",
    description:
      "A low-profile status line that folds the event credit into Amelia's operational voice.",
  },
] as const

type PublicSection = {
  eyebrow: string
  title: string
  body: string
}

export type PublicPageId =
  | "revenueCycle"
  | "hmoManagement"
  | "claimsProcessing"
  | "privacyPolicy"
  | "termsOfService"
  | "clinicalEthics"
  | "securityWhitepaper"

type PublicPageContent = {
  title: string
  description: string
  eyebrow: string
  intro: string
  highlight: string
  sections: PublicSection[]
}

export const PUBLIC_PAGE_CONTENT: Record<PublicPageId, PublicPageContent> = {
  revenueCycle: {
    title: "Revenue Cycle",
    eyebrow: "Platform",
    description: "How Amelia closes revenue leakage from bill creation to payment confirmation.",
    intro:
      "Amelia gives private clinics a single operating layer for billing, collection, and reconciliation. Instead of fragmented spreadsheets, handwritten receipts, and delayed follow-up, teams work from one revenue timeline.",
    highlight:
      "The goal is straightforward: fewer missed charges, faster payment completion, and cleaner visibility into what has been billed, paid, or left exposed.",
    sections: [
      {
        eyebrow: "Charge Capture",
        title: "Every clinical service enters the ledger with structure.",
        body:
          "Bills are created against real patients, documented episodes, and itemized services. That keeps the financial record tied to the care event instead of relying on memory at the end of the month.",
      },
      {
        eyebrow: "Collection Flow",
        title: "Payment requests move through channels patients already use.",
        body:
          "Amelia supports clinic-led payment follow-up with clear references, hosted payment links, and status visibility so staff can track what is pending without guessing.",
      },
      {
        eyebrow: "Reconciliation",
        title: "Clinic teams can see what converted and what stalled.",
        body:
          "By joining billing events, payment status, and collection timing in one place, Amelia helps operators find leakage early and act before revenue quietly disappears.",
      },
    ],
  },
  hmoManagement: {
    title: "HMO Management",
    eyebrow: "Platform",
    description: "Operational structure for authorizations, enrollee data, and insurer-facing workflows.",
    intro:
      "Private clinics often lose HMO revenue because operational details live in chats, notebooks, and memory. Amelia turns those details into a trackable workflow with clear status and ownership.",
    highlight:
      "Authorization codes, member identifiers, and payer-specific fields stay attached to the patient and bill instead of getting lost between the front desk, finance, and clinical teams.",
    sections: [
      {
        eyebrow: "Eligibility Context",
        title: "Patient insurance details stay accessible at the point of billing.",
        body:
          "Amelia captures HMO names, enrollee identifiers, and supporting reference fields so the team does not have to reconstruct payer context after care has already been delivered.",
      },
      {
        eyebrow: "Authorization Discipline",
        title: "Authorization workflows stop preventable omissions.",
        body:
          "For HMO-covered encounters, Amelia can hold the process in an awaiting-auth state until the clinic records the required code. That reduces avoidable claim rejection later.",
      },
      {
        eyebrow: "Operational Visibility",
        title: "Billing, claims, and follow-up share the same payer record.",
        body:
          "Instead of separate workstreams for care delivery and insurer administration, Amelia keeps HMO-related decisions visible across the revenue cycle.",
      },
    ],
  },
  claimsProcessing: {
    title: "Claims Processing",
    eyebrow: "Platform",
    description: "Claim preparation designed for Nigerian private clinics handling HMO and NHIA workflows.",
    intro:
      "Claims processing is where small documentation misses become permanent revenue loss. Amelia helps clinics prepare batches with the fields, evidence, and structure needed for submission readiness.",
    highlight:
      "The product is built to reduce last-minute scrambling by keeping diagnosis, authorization, patient identity, and line-item detail connected throughout the workflow.",
    sections: [
      {
        eyebrow: "Readiness",
        title: "Claims are prepared from live billing data, not month-end reconstruction.",
        body:
          "That means the clinic starts with patient, episode, and itemized charge data already attached, making batch preparation faster and more defensible.",
      },
      {
        eyebrow: "Completeness",
        title: "Teams can identify missing claim fields before submission.",
        body:
          "Amelia is designed around the practical causes of rejection: missing authorization, weak supporting detail, absent patient identifiers, and inconsistent timelines.",
      },
      {
        eyebrow: "Submission Tracking",
        title: "The claim does not disappear after export.",
        body:
          "Batches can be tracked through submission and expected payment windows so finance teams know which receivables are aging and which payer follow-ups are overdue.",
      },
    ],
  },
  privacyPolicy: {
    title: "Privacy Policy",
    eyebrow: "Governance",
    description: "How Amelia handles clinic, patient, billing, and operational information.",
    intro:
      "Amelia is built for private clinics handling sensitive operational and patient-linked information. Our privacy position is to collect only what the workflow needs, restrict access by function, and keep clinic data tied to legitimate operational use.",
    highlight:
      "Privacy in Amelia means practical data minimization, accountable access, and careful separation between healthcare operations and payment processing.",
    sections: [
      {
        eyebrow: "Data We Handle",
        title: "We process clinic, patient, billing, and claims-related information.",
        body:
          "This can include clinic profile details, patient identity data, payer information, bill line items, claim metadata, and payment status records required to run the product.",
      },
      {
        eyebrow: "Why We Use It",
        title: "Information is used to operate billing, collection, and claims workflows.",
        body:
          "We use relevant data to help clinics prepare bills, monitor payment status, manage HMO processes, and generate claims-related output. We do not position Amelia as a consumer advertising product.",
      },
      {
        eyebrow: "Access and Retention",
        title: "Access should follow role and operational need.",
        body:
          "Clinic users should only access data required for their responsibilities. Amelia aims to retain operational records only for as long as they support legitimate clinic, billing, compliance, and dispute-resolution needs.",
      },
    ],
  },
  termsOfService: {
    title: "Terms of Service",
    eyebrow: "Governance",
    description: "The operating terms for clinics using Amelia's workflow and payment tooling.",
    intro:
      "Amelia provides software to support billing operations, HMO workflows, claims preparation, and payment collection for private clinics. Clinics remain responsible for how the software is used within their own operational, legal, and clinical environment.",
    highlight:
      "Amelia supports healthcare administration. It does not replace clinic judgment, medical documentation standards, payer obligations, or legal advice.",
    sections: [
      {
        eyebrow: "Clinic Responsibility",
        title: "Clinics remain accountable for the accuracy of the records they enter.",
        body:
          "Users are responsible for patient information, billing accuracy, supporting documentation, and payer-facing submissions generated from clinic data.",
      },
      {
        eyebrow: "Service Boundaries",
        title: "Payment and claims tooling supports operations but does not guarantee outcomes.",
        body:
          "External payment networks, payer reviews, claim acceptance, and settlement timing depend on third parties and clinic compliance with their requirements.",
      },
      {
        eyebrow: "Acceptable Use",
        title: "The service should be used for legitimate clinic operations only.",
        body:
          "Users must not use Amelia to submit misleading claims, process unauthorized patient data, or bypass obligations tied to consent, recordkeeping, or financial integrity.",
      },
    ],
  },
  clinicalEthics: {
    title: "Clinical Ethics",
    eyebrow: "Governance",
    description: "Amelia's product stance on dignity, clinical responsibility, and responsible automation.",
    intro:
      "Amelia exists to improve financial operations around care, not to replace care itself. The product should reduce administrative failure, support patient dignity, and preserve the authority of licensed clinicians and accountable clinic staff.",
    highlight:
      "Our ethical position is that revenue systems should support timely care and transparent billing without encouraging harmful coercion or careless automation.",
    sections: [
      {
        eyebrow: "Clinical Primacy",
        title: "Medical judgment stays with clinicians.",
        body:
          "Amelia may structure information and automate workflow, but it should never be treated as the final authority on diagnosis, treatment, or patient suitability for care decisions.",
      },
      {
        eyebrow: "Patient Dignity",
        title: "Administrative efficiency should not come at the expense of humane treatment.",
        body:
          "The product is motivated in part by the need to reduce preventable financial friction that can worsen patient distress, delay discharge, or create avoidable conflict around payment.",
      },
      {
        eyebrow: "Responsible Automation",
        title: "Automation must remain reviewable and accountable.",
        body:
          "Where Amelia assists with claims readiness, document handling, or operational scoring, clinic teams should be able to inspect outputs, correct errors, and remain accountable for final submission decisions.",
      },
    ],
  },
  securityWhitepaper: {
    title: "Security Whitepaper",
    eyebrow: "Governance",
    description: "Operational security posture for Amelia's public product and clinic-facing workflows.",
    intro:
      "Amelia handles revenue operations in a context that touches sensitive patient-linked and financial data. Our security model focuses on limiting exposure, separating responsibilities, and reducing the chance that a single workflow failure becomes a broader operational breach.",
    highlight:
      "Security for Amelia is not just infrastructure hardening. It includes access control, payment boundary clarity, auditability, and disciplined handling of clinic data across the product.",
    sections: [
      {
        eyebrow: "Access Control",
        title: "Authentication and role boundaries protect clinic operations.",
        body:
          "Authenticated access, clinic scoping, and role-aware product behavior help ensure staff see the records and actions appropriate to their responsibilities.",
      },
      {
        eyebrow: "Payment Boundaries",
        title: "Payment execution is kept distinct from core clinic workflow data.",
        body:
          "Amelia integrates payment flows with status tracking, while the underlying financial transaction path remains governed by the external payment provider and its controls.",
      },
      {
        eyebrow: "Data Handling",
        title: "Sensitive records should move with minimum exposure.",
        body:
          "Secure transport, limited retention, cautious secret management, and accountable operational logging all support a tighter security posture for a clinic-facing platform.",
      },
    ],
  },
}

export const PLATFORM_LINKS = [
  { label: "Revenue Cycle", href: ROUTES.REVENUE_CYCLE },
  { label: "HMO Management", href: ROUTES.HMO_MANAGEMENT },
  { label: "Claims Processing", href: ROUTES.CLAIMS_PROCESSING },
] as const

export const GOVERNANCE_LINKS = [
  { label: "Privacy Policy", href: ROUTES.PRIVACY_POLICY },
  { label: "Terms of Service", href: ROUTES.TERMS_OF_SERVICE },
  { label: "Clinical Ethics", href: ROUTES.CLINICAL_ETHICS },
  { label: "Security Whitepaper", href: ROUTES.SECURITY_WHITEPAPER },
] as const
