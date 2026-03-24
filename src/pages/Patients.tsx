import { startTransition, useDeferredValue, useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery } from "convex/react"
import {
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UsersIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { api } from "../../convex/_generated/api"
import {
  calculateAgeFromDateOfBirth,
  normalizePhoneNumber,
  type PatientAdditionalFieldInput,
  type PatientFormErrors,
  type PatientFormInput,
  validatePatientInput,
} from "@/lib/patients"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface MutationErrorWithData {
  data?: {
    fieldErrors?: PatientFormErrors
  }
}

const INITIAL_FORM_STATE: PatientFormInput = {
  surname: "",
  otherNames: "",
  dateOfBirth: "",
  sex: "male",
  phone: "",
  nin: "",
  paymentType: "self_pay",
  hmoName: "",
  enrolleeNhisNo: "",
  hmoAdditionalFields: [],
}

function buildPatientDetailPath(patientId: string) {
  return ROUTES.PATIENT_DETAIL.replace(":patientId", patientId)
}

function getMutationFieldErrors(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as MutationErrorWithData).data === "object"
  ) {
    return (error as MutationErrorWithData).data?.fieldErrors
  }

  return undefined
}

function syncAdditionalFields(
  fields: Array<{ fieldKey: string; label: string }>,
  currentValues: PatientAdditionalFieldInput[],
) {
  return fields.map((field) => ({
    fieldKey: field.fieldKey,
    label: field.label,
    value:
      currentValues.find((currentValue) => currentValue.fieldKey === field.fieldKey)?.value ?? "",
  }))
}

export function PatientsPage() {
  const patients = useQuery(api.patients.list)
  const hmoTemplates = useQuery(api.patients.listHmoTemplates)
  const createPatient = useMutation(api.patients.create)

  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formState, setFormState] = useState<PatientFormInput>(INITIAL_FORM_STATE)
  const [formErrors, setFormErrors] = useState<PatientFormErrors>({})
  const deferredSearch = useDeferredValue(searchTerm.trim().toLowerCase())

  const selectedTemplate =
    hmoTemplates?.find((template) => template.hmoName === formState.hmoName) ?? null

  const filteredPatients = (patients ?? []).filter((patient) => {
    if (!deferredSearch) {
      return true
    }

    const haystack = `${patient.fullName} ${patient.phone}`.toLowerCase()
    return haystack.includes(deferredSearch)
  })

  const age = formState.dateOfBirth
    ? calculateAgeFromDateOfBirth(formState.dateOfBirth)
    : null

  function resetForm() {
    setFormState(INITIAL_FORM_STATE)
    setFormErrors({})
  }

  function openDialog() {
    startTransition(() => {
      resetForm()
      setIsDialogOpen(true)
    })
  }

  function updateForm<K extends keyof PatientFormInput>(field: K, value: PatientFormInput[K]) {
    setFormState((currentFormState) => ({
      ...currentFormState,
      [field]: value,
    }))
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
      hmoAdditionalFields: undefined,
    }))
  }

  async function handleSubmit() {
    const validationErrors = validatePatientInput({
      ...formState,
      phone: normalizePhoneNumber(formState.phone),
    })

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      return
    }

    setIsSaving(true)

    try {
      await createPatient({
        surname: formState.surname,
        otherNames: formState.otherNames,
        dateOfBirth: formState.dateOfBirth,
        sex: formState.sex,
        phone: normalizePhoneNumber(formState.phone),
        nin: formState.nin?.trim() || undefined,
        paymentType: formState.paymentType,
        hmoName: formState.paymentType === "hmo" ? formState.hmoName?.trim() || undefined : undefined,
        enrolleeNhisNo:
          formState.paymentType === "hmo"
            ? formState.enrolleeNhisNo?.trim() || undefined
            : undefined,
        hmoSpecificId: undefined,
        hmoAdditionalFields:
          formState.paymentType === "hmo" ? formState.hmoAdditionalFields : [],
      })

      toast.success("Patient registered.")
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      const fieldErrors = getMutationFieldErrors(error)

      if (fieldErrors) {
        setFormErrors(fieldErrors)
      }

      toast.error(error instanceof Error ? error.message : "Unable to save patient.")
    } finally {
      setIsSaving(false)
    }
  }

  if (patients === undefined || hmoTemplates === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xl">Patients</CardTitle>
          <CardDescription>Loading patient registry and HMO templates.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-muted-foreground">
          <Spinner />
          <span>Fetching clinic patient data...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-2">
            <CardTitle className="font-mono text-xl">Patient Registry</CardTitle>
            <CardDescription>
              Capture NHIA-ready patient demographics, insurance details, and contact records
              before billing starts.
            </CardDescription>
          </div>
          <CardAction className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <div className="relative min-w-0 flex-1 sm:w-72">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  const { value } = event.target
                  startTransition(() => setSearchTerm(value))
                }}
                placeholder="Search by patient name or phone"
                className="pl-10"
              />
            </div>
            <Button onClick={openDialog}>
              <PlusIcon data-icon="inline-start" />
              New Patient
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {filteredPatients.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersIcon />
                </EmptyMedia>
                <EmptyTitle>No patients yet</EmptyTitle>
                <EmptyDescription>
                  Register your first patient to start billing and claims workflows.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={openDialog}>
                  <PlusIcon data-icon="inline-start" />
                  Register patient
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="overflow-hidden border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>NIN</TableHead>
                    <TableHead>HMO</TableHead>
                    <TableHead>Last visit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Profile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient._id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{patient.fullName}</span>
                          <span className="text-muted-foreground">{patient.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>{patient.age ?? "Unknown"}</TableCell>
                      <TableCell className="font-mono">{patient.maskedNin}</TableCell>
                      <TableCell>{patient.hmoName ?? "Self-pay"}</TableCell>
                      <TableCell>{patient.lastVisitDate ?? "No bills yet"}</TableCell>
                      <TableCell>
                        <Badge variant={patient.paymentType === "hmo" ? "default" : "secondary"}>
                          {patient.statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost">
                          <Link to={buildPatientDetailPath(patient._id)}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register patient</DialogTitle>
            <DialogDescription>
              Capture the identity and insurance fields needed before billing and HMO claims.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={!!formErrors.surname || undefined}>
                <FieldLabel htmlFor="surname">Surname</FieldLabel>
                <FieldContent>
                  <Input
                    id="surname"
                    value={formState.surname}
                    onChange={(event) => updateForm("surname", event.target.value)}
                    aria-invalid={!!formErrors.surname}
                  />
                  <FieldError>{formErrors.surname}</FieldError>
                </FieldContent>
              </Field>

              <Field data-invalid={!!formErrors.otherNames || undefined}>
                <FieldLabel htmlFor="otherNames">Other names</FieldLabel>
                <FieldContent>
                  <Input
                    id="otherNames"
                    value={formState.otherNames}
                    onChange={(event) => updateForm("otherNames", event.target.value)}
                    aria-invalid={!!formErrors.otherNames}
                  />
                  <FieldError>{formErrors.otherNames}</FieldError>
                </FieldContent>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={!!formErrors.dateOfBirth || undefined}>
                <FieldLabel htmlFor="dateOfBirth">Date of birth</FieldLabel>
                <FieldContent>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formState.dateOfBirth}
                    onChange={(event) => updateForm("dateOfBirth", event.target.value)}
                    aria-invalid={!!formErrors.dateOfBirth}
                  />
                  <FieldDescription>
                    {age === null ? "Age will appear once a valid date is selected." : `Age: ${age}`}
                  </FieldDescription>
                  <FieldError>{formErrors.dateOfBirth}</FieldError>
                </FieldContent>
              </Field>

              <Field data-invalid={!!formErrors.sex || undefined}>
                <FieldLabel>Sex</FieldLabel>
                <FieldContent>
                  <ToggleGroup
                    type="single"
                    value={formState.sex}
                    onValueChange={(value) => {
                      if (value === "male" || value === "female") {
                        updateForm("sex", value)
                      }
                    }}
                    variant="outline"
                  >
                    <ToggleGroupItem value="male">Male</ToggleGroupItem>
                    <ToggleGroupItem value="female">Female</ToggleGroupItem>
                  </ToggleGroup>
                  <FieldError>{formErrors.sex}</FieldError>
                </FieldContent>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={!!formErrors.phone || undefined}>
                <FieldLabel htmlFor="phone">Phone number</FieldLabel>
                <FieldContent>
                  <Input
                    id="phone"
                    value={formState.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    placeholder="08012345678"
                    aria-invalid={!!formErrors.phone}
                  />
                  <FieldDescription>Accepts Nigerian mobile numbers starting with 07, 08, or 09.</FieldDescription>
                  <FieldError>{formErrors.phone}</FieldError>
                </FieldContent>
              </Field>

              <Field data-invalid={!!formErrors.paymentType || undefined}>
                <FieldLabel>Payment type</FieldLabel>
                <FieldContent>
                  <ToggleGroup
                    type="single"
                    value={formState.paymentType}
                    onValueChange={(value) => {
                      if (value !== "self_pay" && value !== "hmo") {
                        return
                      }

                      updateForm("paymentType", value)

                      if (value === "self_pay") {
                        setFormState((currentFormState) => ({
                          ...currentFormState,
                          paymentType: "self_pay",
                          hmoName: "",
                          enrolleeNhisNo: "",
                          hmoAdditionalFields: [],
                        }))
                      }
                    }}
                    variant="outline"
                  >
                    <ToggleGroupItem value="self_pay">Self-Pay</ToggleGroupItem>
                    <ToggleGroupItem value="hmo">HMO</ToggleGroupItem>
                  </ToggleGroup>
                  <FieldError>{formErrors.paymentType}</FieldError>
                </FieldContent>
              </Field>
            </div>

            <Field data-invalid={!!formErrors.nin || undefined}>
              <FieldLabel htmlFor="nin">National Identity Number</FieldLabel>
              <FieldContent>
                <Input
                  id="nin"
                  value={formState.nin ?? ""}
                  onChange={(event) => updateForm("nin", event.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="12345678901"
                  aria-invalid={!!formErrors.nin}
                />
                <FieldDescription>
                  {formState.paymentType === "hmo"
                    ? "Required for HMO and NHIA claims."
                    : "Optional for self-pay, but recommended for future claims."}
                </FieldDescription>
                <FieldError>{formErrors.nin}</FieldError>
              </FieldContent>
            </Field>

            {formState.paymentType === "hmo" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field data-invalid={!!formErrors.hmoName || undefined}>
                    <FieldLabel>HMO name</FieldLabel>
                    <FieldContent>
                      <Select
                        value={formState.hmoName}
                        onValueChange={(value) => {
                          const template =
                            hmoTemplates.find((item) => item.hmoName === value) ?? null
                          setFormState((currentFormState) => ({
                            ...currentFormState,
                            hmoName: value,
                            hmoAdditionalFields: template
                              ? syncAdditionalFields(
                                  template.additionalFields,
                                  currentFormState.hmoAdditionalFields,
                                )
                              : [],
                          }))
                          setFormErrors((currentErrors) => ({
                            ...currentErrors,
                            hmoName: undefined,
                            hmoAdditionalFields: undefined,
                          }))
                        }}
                      >
                        <SelectTrigger aria-invalid={!!formErrors.hmoName}>
                          <SelectValue placeholder="Select an HMO template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {hmoTemplates.map((template) => (
                              <SelectItem key={template._id} value={template.hmoName}>
                                {template.hmoName}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldError>{formErrors.hmoName}</FieldError>
                    </FieldContent>
                  </Field>

                  <Field data-invalid={!!formErrors.enrolleeNhisNo || undefined}>
                    <FieldLabel htmlFor="enrolleeNhisNo">Enrollee NHIS number</FieldLabel>
                    <FieldContent>
                      <Input
                        id="enrolleeNhisNo"
                        value={formState.enrolleeNhisNo ?? ""}
                        onChange={(event) => updateForm("enrolleeNhisNo", event.target.value)}
                        aria-invalid={!!formErrors.enrolleeNhisNo}
                      />
                      <FieldError>{formErrors.enrolleeNhisNo}</FieldError>
                    </FieldContent>
                  </Field>
                </div>

                {selectedTemplate?.additionalFields.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {formState.hmoAdditionalFields.map((field, index) => (
                      <Field
                        key={field.fieldKey}
                        data-invalid={!!formErrors.hmoAdditionalFields || undefined}
                      >
                        <FieldLabel htmlFor={field.fieldKey}>{field.label}</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.fieldKey}
                            value={field.value}
                            onChange={(event) => {
                              const nextFields = [...formState.hmoAdditionalFields]
                              nextFields[index] = {
                                ...field,
                                value: event.target.value,
                              }
                              updateForm("hmoAdditionalFields", nextFields)
                            }}
                            aria-invalid={!!formErrors.hmoAdditionalFields}
                          />
                        </FieldContent>
                      </Field>
                    ))}
                    <Field className="md:col-span-2">
                      <FieldContent>
                        <FieldError>{formErrors.hmoAdditionalFields}</FieldError>
                      </FieldContent>
                    </Field>
                  </div>
                ) : null}
              </>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={isSaving}>
              {isSaving ? <Spinner data-icon="inline-start" /> : <IdentificationCardIcon data-icon="inline-start" />}
              Save patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
