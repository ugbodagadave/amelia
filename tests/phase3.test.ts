import { describe, expect, test } from "bun:test"
import { ROUTES } from "../src/constants/routes"
import {
  BILL_STATUS,
  buildBillCreateStatus,
  calculateBillSummary,
  createEmptyInvestigationItem,
  createEmptyMedicationItem,
  validateBillInput,
} from "../src/lib/billing"

describe("Phase 3 - Billing calculations", () => {
  test("calculates investigation totals across mixed quantities", () => {
    const summary = calculateBillSummary({
      paymentType: "hmo",
      investigations: [
        { name: "Full Blood Count", quantity: 2, unitPrice: 3500 },
        { name: "Malaria RDT", quantity: 1, unitPrice: 2000 },
        { name: "Chest X-Ray", quantity: 3, unitPrice: 5000 },
      ],
      medications: [],
    })

    expect(summary.investigationsTotal).toBe(24000)
    expect(summary.medicationsTotal).toBe(0)
    expect(summary.totalAmount).toBe(24000)
    expect(summary.hmoDeduction).toBe(2400)
    expect(summary.expectedReceivable).toBe(21600)
  })

  test("calculates medication totals and skips hmo deduction for self-pay", () => {
    const summary = calculateBillSummary({
      paymentType: "self_pay",
      investigations: [],
      medications: [
        {
          name: "Artemether",
          dosage: "80mg",
          duration: "5 days",
          quantity: 2,
          unitPrice: 4500,
        },
        {
          name: "Paracetamol",
          dosage: "500mg",
          duration: "3 days",
          quantity: 1,
          unitPrice: 1500,
        },
      ],
    })

    expect(summary.investigationsTotal).toBe(0)
    expect(summary.medicationsTotal).toBe(10500)
    expect(summary.totalAmount).toBe(10500)
    expect(summary.hmoDeduction).toBe(0)
    expect(summary.expectedReceivable).toBe(10500)
  })
})

describe("Phase 3 - Bill validation and state", () => {
  test("rejects a bill without patient, diagnosis, or line items", () => {
    const result = validateBillInput({
      patientId: "",
      patientPaymentType: "self_pay",
      admissionType: "outpatient",
      dateNotification: "2026-03-24",
      dateAdmission: "2026-03-24",
      dateDischarge: "2026-03-24",
      diagnosis: "",
      presentingComplaints: "",
      investigations: [],
      medications: [],
      authorizationCode: "",
    })

    expect(result.patientId).toBeDefined()
    expect(result.diagnosis).toBeDefined()
    expect(result.lineItems).toBeDefined()
  })

  test("rejects zero or negative quantities and prices", () => {
    const result = validateBillInput({
      patientId: "patient_1",
      patientPaymentType: "hmo",
      admissionType: "inpatient",
      dateNotification: "2026-03-24",
      dateAdmission: "2026-03-24",
      dateDischarge: "2026-03-25",
      diagnosis: "Malaria",
      presentingComplaints: "Fever for three days",
      investigations: [{ name: "FBC", quantity: 0, unitPrice: 3500 }],
      medications: [
        {
          name: "Artemether",
          dosage: "80mg",
          duration: "5 days",
          quantity: 1,
          unitPrice: -100,
        },
      ],
      authorizationCode: "",
    })

    expect(result.investigations).toBeDefined()
    expect(result.medications).toBeDefined()
  })

  test("uses explicit auth-confirmed state for hmo bills and skips auth for self-pay", () => {
    expect(buildBillCreateStatus("hmo", "")).toBe(BILL_STATUS.AWAITING_AUTH)
    expect(buildBillCreateStatus("hmo", "AUTH-HYG-100")).toBe(BILL_STATUS.AUTH_CONFIRMED)
    expect(buildBillCreateStatus("self_pay", "")).toBe(BILL_STATUS.PENDING_PAYMENT)
  })

  test("provides empty starter rows for investigations and medications", () => {
    expect(createEmptyInvestigationItem()).toEqual({
      serviceName: "",
      quantity: 1,
      unitPrice: "",
    })

    expect(createEmptyMedicationItem()).toEqual({
      drugName: "",
      dosage: "",
      duration: "",
      quantity: 1,
      unitPrice: "",
    })
  })
})

describe("Phase 3 - Routing and source integration", () => {
  test("bill detail route constant is defined", () => {
    expect(ROUTES.BILL_DETAIL).toBe("/bills/:billId")
  })

  test("bills page and patient profile wire Phase 3 bill navigation", async () => {
    const billsSource = await Bun.file("./src/pages/Bills.tsx").text()
    const builderSource = await Bun.file("./src/pages/BillBuilder.tsx").text()
    const appSource = await Bun.file("./src/App.tsx").text()
    const patientProfileSource = await Bun.file("./src/pages/PatientProfile.tsx").text()

    expect(billsSource).toContain("Tabs")
    expect(billsSource).toContain("Table")
    expect(billsSource).toContain("api.bills.list")
    expect(builderSource).toContain("api.bills.create")
    expect(builderSource).toContain("PatientSelector")
    expect(builderSource).toContain("ServiceSelector")
    expect(builderSource).toContain("calculateBillSummary")
    expect(appSource).toContain("ROUTES.BILL_DETAIL")
    expect(patientProfileSource).toContain("ROUTES.BILLS_NEW")
  })

  test("schema and plan document the explicit auth-confirmed billing flow", async () => {
    const schemaSource = await Bun.file("./convex/schema.ts").text()
    const plan = await Bun.file("./docs/plan.md").text()

    expect(schemaSource).toContain('v.literal("auth_confirmed")')
    expect(plan).toContain("Auth Confirmed")
  })
})
