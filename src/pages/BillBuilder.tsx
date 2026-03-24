import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useMutation, useQuery } from "convex/react"
import { FileTextIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { api } from "../../convex/_generated/api"
import { BillBuilderAuthTrackerCard } from "@/components/billing/AuthTrackerCard"
import { BillSummaryCard } from "@/components/billing/BillSummaryCard"
import { PatientSelector } from "@/components/billing/PatientSelector"
import { PaymentReadinessCard } from "@/components/billing/PaymentReadinessCard"
import { ServiceSelector } from "@/components/billing/ServiceSelector"
import { ROUTES } from "@/constants/routes"
import {
  BILL_STATUS,
  calculateBillSummary,
  createEmptyInvestigationItem,
  createEmptyMedicationItem,
  type InvestigationFormItem,
  type MedicationFormItem,
  validateBillInput,
} from "@/lib/billing"
import { formatPriceInput, parsePriceInput } from "@/lib/clinicOnboarding"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Textarea } from "@/components/ui/textarea"

interface BillMutationErrorWithData {
  data?: {
    fieldErrors?: Record<string, string>
  }
}

interface BillFormState {
  patientId: string
  admissionType: "outpatient" | "inpatient"
  dateNotification: string
  dateAdmission: string
  dateDischarge: string
  diagnosis: string
  presentingComplaints: string
  investigations: InvestigationFormItem[]
  medications: MedicationFormItem[]
  authorizationCode: string
}

interface BillFormErrors {
  patientId?: string
  admissionType?: string
  dateNotification?: string
  dateAdmission?: string
  dateDischarge?: string
  diagnosis?: string
  presentingComplaints?: string
  investigations?: string
  medications?: string
  lineItems?: string
  authorizationCode?: string
}

const INITIAL_BILL_FORM_STATE: BillFormState = {
  patientId: "",
  admissionType: "outpatient",
  dateNotification: "",
  dateAdmission: "",
  dateDischarge: "",
  diagnosis: "",
  presentingComplaints: "",
  investigations: [createEmptyInvestigationItem()],
  medications: [],
  authorizationCode: "",
}

function buildBillDetailPath(billId: string) {
  return ROUTES.BILL_DETAIL.replace(":billId", billId)
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  })
}

function getBillMutationFieldErrors(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as BillMutationErrorWithData).data === "object"
  ) {
    return (error as BillMutationErrorWithData).data?.fieldErrors
  }

  return undefined
}

export function BillBuilderPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const patients = useQuery(api.bills.listPatients)
  const services = useQuery(api.bills.listServices)
  const createBill = useMutation(api.bills.create)

  const [formState, setFormState] = useState<BillFormState>(INITIAL_BILL_FORM_STATE)
  const [formErrors, setFormErrors] = useState<BillFormErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  const selectedPatient = patients?.find((patient) => patient._id === formState.patientId) ?? null

  useEffect(() => {
    const patientId = searchParams.get("patientId")
    if (!patientId || !patients?.length || formState.patientId) {
      return
    }

    if (patients.some((patient) => patient._id === patientId)) {
      setFormState((current) => ({ ...current, patientId }))
    }
  }, [patients, searchParams, formState.patientId])

  const paymentType = selectedPatient?.paymentType ?? "self_pay"

  function updateInvestigation(index: number, patch: Partial<InvestigationFormItem>) {
    setFormState((current) => {
      const nextItems = [...current.investigations]
      nextItems[index] = { ...nextItems[index], ...patch }
      return { ...current, investigations: nextItems }
    })
    setFormErrors((current) => ({ ...current, investigations: undefined, lineItems: undefined }))
  }

  function updateMedication(index: number, patch: Partial<MedicationFormItem>) {
    setFormState((current) => {
      const nextItems = [...current.medications]
      nextItems[index] = { ...nextItems[index], ...patch }
      return { ...current, medications: nextItems }
    })
    setFormErrors((current) => ({ ...current, medications: undefined, lineItems: undefined }))
  }

  async function handleSave() {
    const validationErrors = validateBillInput({
      patientId: formState.patientId,
      patientPaymentType: paymentType,
      admissionType: formState.admissionType,
      dateNotification: formState.dateNotification,
      dateAdmission: formState.dateAdmission,
      dateDischarge: formState.dateDischarge,
      diagnosis: formState.diagnosis,
      presentingComplaints: formState.presentingComplaints,
      investigations: formState.investigations,
      medications: formState.medications,
      authorizationCode: formState.authorizationCode,
    })

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      return
    }

    setIsSaving(true)

    try {
      const billId = await createBill({
        patientId: formState.patientId as never,
        admissionType: formState.admissionType,
        dateNotification: formState.dateNotification,
        dateAdmission: formState.dateAdmission,
        dateDischarge: formState.dateDischarge,
        diagnosis: formState.diagnosis.trim(),
        presentingComplaints: formState.presentingComplaints.trim(),
        investigations: formState.investigations.map((item) => ({
          serviceName: item.serviceName.trim(),
          quantity: item.quantity,
          unitPrice: parsePriceInput(String(item.unitPrice)),
        })),
        medications: formState.medications.map((item) => ({
          drugName: item.drugName.trim(),
          dosage: item.dosage.trim(),
          duration: item.duration.trim(),
          quantity: item.quantity,
          unitPrice: parsePriceInput(String(item.unitPrice)),
        })),
        authorizationCode: formState.authorizationCode.trim() || undefined,
      })

      toast.success("Bill saved.")
      navigate(buildBillDetailPath(billId))
    } catch (error) {
      const fieldErrors = getBillMutationFieldErrors(error)
      if (fieldErrors) {
        setFormErrors(fieldErrors)
      }
      toast.error(error instanceof Error ? error.message : "Unable to save bill.")
    } finally {
      setIsSaving(false)
    }
  }

  if (patients === undefined || services === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xl">New Bill</CardTitle>
          <CardDescription>Loading patients and clinic service catalog.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-muted-foreground">
          <Spinner />
          <span>Preparing the bill builder...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,0.9fr)]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xl">New Bill</CardTitle>
            <CardDescription>
              Build a patient episode, add billable line items, and capture auth state in one flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <FieldGroup>
              <Field data-invalid={!!formErrors.patientId || undefined}>
                <FieldLabel>Patient</FieldLabel>
                <FieldContent>
                  <PatientSelector
                    patients={patients}
                    value={formState.patientId}
                    onSelect={(patientId) => {
                      setFormState((current) => ({ ...current, patientId }))
                      setFormErrors((current) => ({ ...current, patientId: undefined }))
                    }}
                  />
                  <FieldDescription>
                    Billing opens with a patient preselected when launched from the profile page.
                  </FieldDescription>
                  <FieldError>{formErrors.patientId}</FieldError>
                </FieldContent>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field data-invalid={!!formErrors.admissionType || undefined}>
                  <FieldLabel>Admission type</FieldLabel>
                  <FieldContent>
                    <ToggleGroup
                      type="single"
                      value={formState.admissionType}
                      onValueChange={(value) => {
                        if (value === "outpatient" || value === "inpatient") {
                          setFormState((current) => ({ ...current, admissionType: value }))
                          setFormErrors((current) => ({ ...current, admissionType: undefined }))
                        }
                      }}
                      variant="outline"
                    >
                      <ToggleGroupItem value="outpatient">Outpatient</ToggleGroupItem>
                      <ToggleGroupItem value="inpatient">Inpatient</ToggleGroupItem>
                    </ToggleGroup>
                    <FieldError>{formErrors.admissionType}</FieldError>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Patient payment type</FieldLabel>
                  <FieldContent>
                    <Input
                      value={
                        paymentType === "hmo" ? selectedPatient?.hmoName ?? "HMO" : "Self-pay"
                      }
                      readOnly
                    />
                  </FieldContent>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field data-invalid={!!formErrors.dateNotification || undefined}>
                  <FieldLabel htmlFor="date-notification">Notification date</FieldLabel>
                  <FieldContent>
                    <Input
                      id="date-notification"
                      type="date"
                      value={formState.dateNotification}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          dateNotification: event.target.value,
                        }))
                      }
                    />
                    <FieldError>{formErrors.dateNotification}</FieldError>
                  </FieldContent>
                </Field>
                <Field data-invalid={!!formErrors.dateAdmission || undefined}>
                  <FieldLabel htmlFor="date-admission">Admission date</FieldLabel>
                  <FieldContent>
                    <Input
                      id="date-admission"
                      type="date"
                      value={formState.dateAdmission}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          dateAdmission: event.target.value,
                        }))
                      }
                    />
                    <FieldError>{formErrors.dateAdmission}</FieldError>
                  </FieldContent>
                </Field>
                <Field data-invalid={!!formErrors.dateDischarge || undefined}>
                  <FieldLabel htmlFor="date-discharge">Discharge date</FieldLabel>
                  <FieldContent>
                    <Input
                      id="date-discharge"
                      type="date"
                      value={formState.dateDischarge}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          dateDischarge: event.target.value,
                        }))
                      }
                    />
                    <FieldError>{formErrors.dateDischarge}</FieldError>
                  </FieldContent>
                </Field>
              </div>

              <Field data-invalid={!!formErrors.diagnosis || undefined}>
                <FieldLabel htmlFor="diagnosis">Diagnosis</FieldLabel>
                <FieldContent>
                  <Textarea
                    id="diagnosis"
                    value={formState.diagnosis}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, diagnosis: event.target.value }))
                    }
                  />
                  <FieldError>{formErrors.diagnosis}</FieldError>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="presenting-complaints">
                  Presenting complaints and duration
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id="presenting-complaints"
                    value={formState.presentingComplaints}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        presentingComplaints: event.target.value,
                      }))
                    }
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="font-mono text-base">Investigations</CardTitle>
              <CardDescription>
                Choose from the service catalog or create a missing service inline.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormState((current) => ({
                  ...current,
                  investigations: [...current.investigations, createEmptyInvestigationItem()],
                }))
              }
            >
              <PlusIcon data-icon="inline-start" />
              Add investigation
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {formErrors.lineItems ? <p className="text-sm text-destructive">{formErrors.lineItems}</p> : null}
            {formErrors.investigations ? (
              <p className="text-sm text-destructive">{formErrors.investigations}</p>
            ) : null}
            {formState.investigations.map((item, index) => (
              <div key={`investigation-${index}`} className="grid gap-3 rounded-none border p-3 lg:grid-cols-[1.7fr_0.7fr_0.8fr_0.8fr_auto]">
                <ServiceSelector
                  services={services.map((service) => ({
                    _id: service._id,
                    name: service.name,
                    defaultPrice: service.defaultPrice,
                  }))}
                  value={item.serviceName}
                  onSelect={({ name, defaultPrice }) =>
                    updateInvestigation(index, {
                      serviceName: name,
                      unitPrice:
                        item.unitPrice || defaultPrice === undefined
                          ? item.unitPrice
                          : formatPriceInput(String(defaultPrice)),
                    })
                  }
                />
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) =>
                    updateInvestigation(index, { quantity: Number(event.target.value || 0) })
                  }
                  placeholder="Qty"
                />
                <Input
                  inputMode="numeric"
                  value={String(item.unitPrice)}
                  onChange={(event) =>
                    updateInvestigation(index, {
                      unitPrice: formatPriceInput(event.target.value),
                    })
                  }
                  placeholder="Unit price"
                />
                <div className="flex items-center font-mono text-sm">
                  {formatCurrency(
                    calculateBillSummary({
                      paymentType,
                      investigations: [item],
                      medications: [],
                    }).investigationsTotal,
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setFormState((current) => ({
                      ...current,
                      investigations:
                        current.investigations.length === 1
                          ? [createEmptyInvestigationItem()]
                          : current.investigations.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                >
                  <TrashIcon />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="font-mono text-base">Medications</CardTitle>
              <CardDescription>Capture prescriptions with dosage, duration, and price.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormState((current) => ({
                  ...current,
                  medications: [...current.medications, createEmptyMedicationItem()],
                }))
              }
            >
              <PlusIcon data-icon="inline-start" />
              Add medication
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {formErrors.medications ? (
              <p className="text-sm text-destructive">{formErrors.medications}</p>
            ) : null}
            {formState.medications.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileTextIcon />
                  </EmptyMedia>
                  <EmptyTitle>No medications yet</EmptyTitle>
                  <EmptyDescription>
                    Leave this section empty if the bill only contains investigations.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              formState.medications.map((item, index) => (
                <div
                  key={`medication-${index}`}
                  className="grid gap-3 rounded-none border p-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.6fr_0.8fr_0.8fr_auto]"
                >
                  <Input
                    value={item.drugName}
                    onChange={(event) => updateMedication(index, { drugName: event.target.value })}
                    placeholder="Drug name"
                  />
                  <Input
                    value={item.dosage}
                    onChange={(event) => updateMedication(index, { dosage: event.target.value })}
                    placeholder="Dosage"
                  />
                  <Input
                    value={item.duration}
                    onChange={(event) => updateMedication(index, { duration: event.target.value })}
                    placeholder="Duration"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) =>
                      updateMedication(index, { quantity: Number(event.target.value || 0) })
                    }
                    placeholder="Qty"
                  />
                  <Input
                    inputMode="numeric"
                    value={String(item.unitPrice)}
                    onChange={(event) =>
                      updateMedication(index, {
                        unitPrice: formatPriceInput(event.target.value),
                      })
                    }
                    placeholder="Unit price"
                  />
                  <div className="flex items-center font-mono text-sm">
                    {formatCurrency(
                      calculateBillSummary({
                        paymentType,
                        investigations: [],
                        medications: [item],
                      }).medicationsTotal,
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setFormState((current) => ({
                        ...current,
                        medications: current.medications.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }))
                    }
                  >
                    <TrashIcon />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <BillSummaryCard
          paymentType={paymentType}
          investigations={formState.investigations}
          medications={formState.medications}
        />
        <BillBuilderAuthTrackerCard
          paymentType={paymentType}
          authorizationCode={formState.authorizationCode}
          onAuthorizationCodeChange={(value) =>
            setFormState((current) => ({ ...current, authorizationCode: value }))
          }
        />
        <PaymentReadinessCard
          status={
            paymentType === "self_pay"
              ? BILL_STATUS.PENDING_PAYMENT
              : formState.authorizationCode.trim()
                ? BILL_STATUS.AUTH_CONFIRMED
                : BILL_STATUS.AWAITING_AUTH
          }
          hasAuthCode={!!formState.authorizationCode.trim()}
        />
        <Button onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? <Spinner data-icon="inline-start" /> : <FileTextIcon data-icon="inline-start" />}
          Save bill
        </Button>
      </div>
    </div>
  )
}
