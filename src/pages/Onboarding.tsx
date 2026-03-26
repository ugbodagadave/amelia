import { useState } from "react"
import { useUser } from "@clerk/clerk-react"
import { useAction, useMutation, useQuery } from "convex/react"
import { Navigate, useNavigate } from "react-router-dom"
import {
  BuildingsIcon,
  FileTextIcon,
  FirstAidKitIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { api } from "../../convex/_generated/api"
import { ROUTES } from "@/constants/routes"
import {
  type ClinicOnboardingField,
  type ClinicOnboardingInput,
  validateClinicOnboardingInput,
} from "@/lib/clinicOnboarding"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"

const INITIAL_FORM_STATE: ClinicOnboardingInput = {
  name: "",
  address: "",
  nhiaFacilityCode: "",
  phone: "",
  email: "",
  medicalDirectorName: "",
  bankCode: "",
  bankName: "",
  accountNumber: "",
  accountName: "",
  bankAccountVerified: false,
}

const ONBOARDING_HIGHLIGHTS = [
  {
    title: "Clinic profile",
    description: "Set your facility identity once so every patient, bill, and claim is tied back to the right clinic.",
    icon: BuildingsIcon,
  },
  {
    title: "Service catalog",
    description: "Amelia preloads common Nigerian investigations, medications, and procedures immediately after setup.",
    icon: FirstAidKitIcon,
  },
  {
    title: "Claims readiness",
    description: "Default HMO templates are added during setup.",
    icon: FileTextIcon,
  },
] as const

export function ClinicOnboardingPage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const createClinic = useMutation(api.clinics.createClinic)
  const currentClinic = useQuery(api.clinics.getCurrentClinic)
  const listBanks = useAction(api.payments.listBanks)
  const verifyBankAccount = useAction(api.payments.verifyBankAccount)

  const [formState, setFormState] = useState(INITIAL_FORM_STATE)
  const [errors, setErrors] = useState<Partial<Record<ClinicOnboardingField, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [bankOptions, setBankOptions] = useState<Array<{ name: string; code: string }>>([])
  const [isLoadingBanks, setIsLoadingBanks] = useState(false)
  const [isResolvingAccount, setIsResolvingAccount] = useState(false)

  if (currentClinic) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  const handleChange = (field: ClinicOnboardingField, value: string | boolean) => {
    setFormState((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const loadBanks = async () => {
    if (bankOptions.length > 0 || isLoadingBanks) {
      return
    }

    setIsLoadingBanks(true)
    try {
      const banks = await listBanks()
      setBankOptions(banks)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load bank options.")
    } finally {
      setIsLoadingBanks(false)
    }
  }

  const handleResolveAccount = async () => {
    setIsResolvingAccount(true)
    try {
      const result = await verifyBankAccount({
        accountNumber: formState.accountNumber,
        bankCode: formState.bankCode,
      })

      setFormState((current) => ({
        ...current,
        accountName: result.accountName,
        bankAccountVerified: Boolean(result.accountName),
      }))
      setErrors((current) => ({
        ...current,
        bankCode: undefined,
        accountNumber: undefined,
        accountName: undefined,
      }))
      toast.success("Bank account verified.")
    } catch (error) {
      setFormState((current) => ({
        ...current,
        accountName: "",
        bankAccountVerified: false,
      }))
      toast.error(error instanceof Error ? error.message : "Unable to verify account.")
    } finally {
      setIsResolvingAccount(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateClinicOnboardingInput(formState)

    setErrors(nextErrors)
    setSubmitError(null)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createClinic({
        name: formState.name,
        address: formState.address,
        nhiaFacilityCode: formState.nhiaFacilityCode,
        phone: formState.phone,
        email: formState.email,
        medicalDirectorName: formState.medicalDirectorName,
        bankCode: formState.bankCode,
        bankName: formState.bankName,
        accountNumber: formState.accountNumber,
        accountName: formState.accountName,
      })

      if (user) {
        try {
          await user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              clinicId: result.clinicId,
            },
          })
        } catch (metadataError) {
          console.warn("Unable to mirror clinic metadata to Clerk", metadataError)
        }
      }

      toast.success("Clinic profile created.")
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create the clinic profile."
      setSubmitError(message)
      toast.error("Clinic onboarding failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="border-none bg-foreground text-background ring-0">
          <CardHeader className="gap-4 border-b border-background/10 pb-8">
            <div className="flex items-center gap-2 font-mono text-base uppercase tracking-[0.24em] text-primary">
              <ShieldCheckIcon />
              Amelia setup
            </div>
            <CardTitle
              className="max-w-2xl text-3xl leading-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Configure the clinic once.
              <br />
              Everything else builds on it.
            </CardTitle>
            <CardDescription className="max-w-xl text-sm/relaxed text-background/70">
              First login is reserved for clinic identity. Amelia uses this profile to scope
              staff data, seed your catalog, and prepare HMO claim defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-8">
            {ONBOARDING_HIGHLIGHTS.map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.title}
                  className="grid gap-2 border border-background/10 bg-background/5 p-4"
                >
                  <div className="flex items-center gap-2 font-mono text-sm text-primary">
                    <Icon />
                    {item.title}
                  </div>
                  <p className="max-w-xl text-sm/relaxed text-background/72">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xl">Clinic onboarding</CardTitle>
            <CardDescription>
              Required now: clinic identity, NHIA facility code, and Medical Director details.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Alert>
              <ShieldCheckIcon />
              <AlertTitle>What happens after submit</AlertTitle>
              <AlertDescription>
                Amelia creates the clinic record, seeds 30 default services, and loads the
                first five HMO templates for this workspace.
              </AlertDescription>
            </Alert>

            {submitError ? (
              <Alert variant="destructive">
                <ShieldCheckIcon />
                <AlertTitle>Onboarding failed</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <label className="text-xs font-medium text-foreground" htmlFor="clinic-name">
                  Clinic name
                </label>
                <Input
                  id="clinic-name"
                  value={formState.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  placeholder="Apex Specialist Clinic"
                />
                {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-medium text-foreground" htmlFor="clinic-address">
                  Address
                </label>
                <Textarea
                  id="clinic-address"
                  value={formState.address}
                  onChange={(event) => handleChange("address", event.target.value)}
                  aria-invalid={Boolean(errors.address)}
                  placeholder="12 Marina Road, Lagos"
                />
                {errors.address ? (
                  <p className="text-xs text-destructive">{errors.address}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="clinic-code">
                    NHIA / HCP facility code
                  </label>
                  <Input
                    id="clinic-code"
                    value={formState.nhiaFacilityCode}
                    onChange={(event) =>
                      handleChange("nhiaFacilityCode", event.target.value)
                    }
                    aria-invalid={Boolean(errors.nhiaFacilityCode)}
                    placeholder="NHIA-1029"
                  />
                  {errors.nhiaFacilityCode ? (
                    <p className="text-xs text-destructive">{errors.nhiaFacilityCode}</p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="clinic-phone">
                    Clinic phone
                  </label>
                  <Input
                    id="clinic-phone"
                    value={formState.phone}
                    onChange={(event) => handleChange("phone", event.target.value)}
                    aria-invalid={Boolean(errors.phone)}
                    placeholder="+2348012345678"
                  />
                  {errors.phone ? (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="clinic-email">
                    Contact email
                  </label>
                  <Input
                    id="clinic-email"
                    value={formState.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    placeholder="ops@apexclinic.ng"
                    type="email"
                  />
                  {errors.email ? (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <label
                    className="text-xs font-medium text-foreground"
                    htmlFor="medical-director"
                  >
                    Medical Director
                  </label>
                  <Input
                    id="medical-director"
                    value={formState.medicalDirectorName}
                    onChange={(event) =>
                      handleChange("medicalDirectorName", event.target.value)
                    }
                    aria-invalid={Boolean(errors.medicalDirectorName)}
                    placeholder="Dr. Amina Bello"
                  />
                  {errors.medicalDirectorName ? (
                    <p className="text-xs text-destructive">{errors.medicalDirectorName}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="clinic-bank">
                    Payout bank
                  </label>
                  <Select
                    value={formState.bankCode}
                    onOpenChange={(open) => {
                      if (open) {
                        void loadBanks()
                      }
                    }}
                    onValueChange={(value) => {
                      const selectedBank = bankOptions.find((bank) => bank.code === value)
                      setFormState((current) => ({
                        ...current,
                        bankCode: value,
                        bankName: selectedBank?.name ?? "",
                        accountName: "",
                        bankAccountVerified: false,
                      }))
                      setErrors((current) => ({ ...current, bankCode: undefined, accountName: undefined }))
                    }}
                  >
                    <SelectTrigger
                      id="clinic-bank"
                      className="w-full"
                      aria-invalid={Boolean(errors.bankCode)}
                    >
                      <SelectValue
                        placeholder={isLoadingBanks ? "Loading banks..." : "Select payout bank"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {bankOptions.length > 0 ? (
                          bankOptions.map((bank) => (
                            <SelectItem key={bank.code} value={bank.code}>
                              {bank.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-banks" disabled>
                            {isLoadingBanks ? "Loading banks..." : "No banks available"}
                          </SelectItem>
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {errors.bankCode ? (
                    <p className="text-xs text-destructive">{errors.bankCode}</p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="clinic-account">
                    Payout account number
                  </label>
                  <Input
                    id="clinic-account"
                    value={formState.accountNumber}
                    onChange={(event) =>
                      handleChange("accountNumber", event.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    aria-invalid={Boolean(errors.accountNumber)}
                    placeholder="0123456789"
                    inputMode="numeric"
                  />
                  {errors.accountNumber ? (
                    <p className="text-xs text-destructive">{errors.accountNumber}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-foreground">Resolved account name</p>
                    <p className="text-sm text-muted-foreground">
                      Confirm the clinic payout destination before continuing.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleResolveAccount()}
                    disabled={isResolvingAccount}
                  >
                    {isResolvingAccount ? <Spinner data-icon="inline-start" /> : null}
                    Verify account
                  </Button>
                </div>
                <Input value={formState.accountName} readOnly placeholder="Account name will appear here" />
                {errors.accountName ? (
                  <p className="text-xs text-destructive">{errors.accountName}</p>
                ) : null}
              </div>

              <Button className="mt-2 w-full sm:w-auto" disabled={isSubmitting} type="submit">
                {isSubmitting ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Creating clinic workspace
                  </>
                ) : (
                  "Complete onboarding"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
