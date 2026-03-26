import { useEffect, useMemo, useState } from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import { ShieldCheckIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { api } from "../../../convex/_generated/api"
import {
  buildClinicSettingsFormState,
  haveClinicBankDetailsChanged,
  type ClinicOnboardingField,
  type ClinicOnboardingInput,
  validateClinicOnboardingInput,
} from "@/lib/clinicOnboarding"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
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

function formEqual(a: ClinicOnboardingInput, b: ClinicOnboardingInput) {
  return (
    a.name === b.name &&
    a.address === b.address &&
    a.nhiaFacilityCode === b.nhiaFacilityCode &&
    a.phone === b.phone &&
    a.email === b.email &&
    a.medicalDirectorName === b.medicalDirectorName &&
    a.bankCode === b.bankCode &&
    a.bankName === b.bankName &&
    a.accountNumber === b.accountNumber &&
    a.accountName === b.accountName &&
    a.bankAccountVerified === b.bankAccountVerified
  )
}

export function GeneralClinicSettingsSection() {
  const clinic = useQuery(api.clinics.getCurrentClinic)
  const updateCurrentClinic = useMutation(api.clinics.updateCurrentClinic)
  const listBanks = useAction(api.payments.listBanks)
  const verifyBankAccount = useAction(api.payments.verifyBankAccount)

  const [formState, setFormState] = useState<ClinicOnboardingInput>(INITIAL_FORM_STATE)
  const [originalForm, setOriginalForm] = useState<ClinicOnboardingInput | null>(null)
  const [errors, setErrors] = useState<Partial<Record<ClinicOnboardingField, string>>>({})
  const [bankOptions, setBankOptions] = useState<Array<{ name: string; code: string }>>([])
  const [isLoadingBanks, setIsLoadingBanks] = useState(false)
  const [isResolvingAccount, setIsResolvingAccount] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (clinic && originalForm === null) {
      const nextFormState = buildClinicSettingsFormState(clinic)
      setFormState(nextFormState)
      setOriginalForm(nextFormState)
    }
  }, [clinic, originalForm])

  useEffect(() => {
    let isMounted = true

    async function loadBanks() {
      if (bankOptions.length > 0 || isLoadingBanks) {
        return
      }

      setIsLoadingBanks(true)
      try {
        const banks = await listBanks()
        if (isMounted) {
          setBankOptions(banks)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load bank options.")
      } finally {
        if (isMounted) {
          setIsLoadingBanks(false)
        }
      }
    }

    void loadBanks()

    return () => {
      isMounted = false
    }
  }, [bankOptions.length, isLoadingBanks, listBanks])

  const isDirty = originalForm === null || !formEqual(formState, originalForm)
  const bankDetailsChanged = useMemo(
    () => (originalForm ? haveClinicBankDetailsChanged(originalForm, formState) : false),
    [formState, originalForm],
  )

  const handleChange = (field: ClinicOnboardingField, value: string | boolean) => {
    setFormState((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleBankCodeChange = (value: string) => {
    const selectedBank = bankOptions.find((bank) => bank.code === value)
    setFormState((current) => ({
      ...current,
      bankCode: value,
      bankName: selectedBank?.name ?? "",
      accountName: "",
      bankAccountVerified: false,
    }))
    setErrors((current) => ({
      ...current,
      bankCode: undefined,
      accountName: undefined,
    }))
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

  const handleReset = () => {
    if (!originalForm) {
      return
    }

    setFormState(originalForm)
    setErrors({})
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateClinicOnboardingInput(formState)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSaving(true)
    try {
      await updateCurrentClinic({
        ...formState,
      })
      setOriginalForm(formState)
      toast.success("Clinic settings updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update clinic settings.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!clinic || originalForm === null) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
          <Spinner />
          <span>Loading clinic settings...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
      <Card className="border-none bg-foreground text-background ring-0">
        <CardHeader className="border-b border-background/10 pb-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="font-mono text-base uppercase tracking-[0.24em] text-primary">
              Current Profile
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {bankDetailsChanged ? "Bank update pending verification" : "Verified profile"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-6 text-sm text-background/80">
          <span>{clinic.name}</span>
          <span>NHIA Code: {clinic.nhiaFacilityCode}</span>
          <span>Medical Director: {clinic.medicalDirectorName}</span>
          <span>Payout: {clinic.accountName}</span>
          <span>{clinic.phone}</span>
          <span>{clinic.email}</span>
          <span>{clinic.address}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xl">Editable hospital profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          {bankDetailsChanged ? (
            <Alert>
              <ShieldCheckIcon />
              <AlertTitle>Bank re-verification required</AlertTitle>
              <AlertDescription>
                You changed the payout account details. Resolve the account again before saving
                these settings.
              </AlertDescription>
            </Alert>
          ) : null}

          <form className="grid gap-5" onSubmit={handleSave}>
            <FieldGroup>
              <Field data-invalid={Boolean(errors.name) || undefined}>
                <FieldLabel htmlFor="settings-clinic-name">Clinic name</FieldLabel>
                <FieldContent>
                  <Input
                    id="settings-clinic-name"
                    value={formState.name}
                    onChange={(event) => handleChange("name", event.target.value)}
                    aria-invalid={Boolean(errors.name)}
                  />
                  <FieldError>{errors.name}</FieldError>
                </FieldContent>
              </Field>

              <Field data-invalid={Boolean(errors.address) || undefined}>
                <FieldLabel htmlFor="settings-address">Address</FieldLabel>
                <FieldContent>
                  <Textarea
                    id="settings-address"
                    value={formState.address}
                    onChange={(event) => handleChange("address", event.target.value)}
                    aria-invalid={Boolean(errors.address)}
                  />
                  <FieldError>{errors.address}</FieldError>
                </FieldContent>
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field data-invalid={Boolean(errors.nhiaFacilityCode) || undefined}>
                  <FieldLabel htmlFor="settings-nhia-code">NHIA / HCP facility code</FieldLabel>
                  <FieldContent>
                    <Input
                      id="settings-nhia-code"
                      value={formState.nhiaFacilityCode}
                      onChange={(event) => handleChange("nhiaFacilityCode", event.target.value)}
                      aria-invalid={Boolean(errors.nhiaFacilityCode)}
                    />
                    <FieldError>{errors.nhiaFacilityCode}</FieldError>
                  </FieldContent>
                </Field>

                <Field data-invalid={Boolean(errors.medicalDirectorName) || undefined}>
                  <FieldLabel htmlFor="settings-medical-director">Medical Director</FieldLabel>
                  <FieldContent>
                    <Input
                      id="settings-medical-director"
                      value={formState.medicalDirectorName}
                      onChange={(event) => handleChange("medicalDirectorName", event.target.value)}
                      aria-invalid={Boolean(errors.medicalDirectorName)}
                    />
                    <FieldError>{errors.medicalDirectorName}</FieldError>
                  </FieldContent>
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field data-invalid={Boolean(errors.phone) || undefined}>
                  <FieldLabel htmlFor="settings-phone">Clinic phone</FieldLabel>
                  <FieldContent>
                    <Input
                      id="settings-phone"
                      value={formState.phone}
                      onChange={(event) => handleChange("phone", event.target.value)}
                      aria-invalid={Boolean(errors.phone)}
                    />
                    <FieldError>{errors.phone}</FieldError>
                  </FieldContent>
                </Field>

                <Field data-invalid={Boolean(errors.email) || undefined}>
                  <FieldLabel htmlFor="settings-email">Clinic email</FieldLabel>
                  <FieldContent>
                    <Input
                      id="settings-email"
                      type="email"
                      value={formState.email}
                      onChange={(event) => handleChange("email", event.target.value)}
                      aria-invalid={Boolean(errors.email)}
                    />
                    <FieldError>{errors.email}</FieldError>
                  </FieldContent>
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field data-invalid={Boolean(errors.bankCode) || undefined}>
                  <FieldLabel>Settlement bank</FieldLabel>
                  <FieldContent>
                    <Select value={formState.bankCode} onValueChange={handleBankCodeChange}>
                      <SelectTrigger className="w-full" aria-invalid={Boolean(errors.bankCode)}>
                        <SelectValue
                          placeholder={isLoadingBanks ? "Loading banks..." : "Select bank"}
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
                    <FieldError>{errors.bankCode}</FieldError>
                  </FieldContent>
                </Field>

                <Field data-invalid={Boolean(errors.accountNumber) || undefined}>
                  <FieldLabel htmlFor="settings-account-number">Account number</FieldLabel>
                  <FieldContent>
                    <Input
                      id="settings-account-number"
                      inputMode="numeric"
                      maxLength={10}
                      value={formState.accountNumber}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          accountNumber: event.target.value.replace(/\D/g, "").slice(0, 10),
                          accountName: "",
                          bankAccountVerified: false,
                        }))
                      }
                      aria-invalid={Boolean(errors.accountNumber)}
                    />
                    <FieldError>{errors.accountNumber}</FieldError>
                  </FieldContent>
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
                <Field data-invalid={Boolean(errors.accountName) || undefined}>
                  <FieldLabel htmlFor="settings-account-name">Verified account name</FieldLabel>
                  <FieldContent>
                    <Input
                      id="settings-account-name"
                      value={formState.accountName}
                      readOnly
                      aria-invalid={Boolean(errors.accountName)}
                    />
                    <FieldError>{errors.accountName}</FieldError>
                  </FieldContent>
                </Field>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResolveAccount}
                    disabled={isResolvingAccount}
                  >
                    {isResolvingAccount ? (
                      <>
                        <Spinner data-icon="inline-start" />
                        Resolving…
                      </>
                    ) : (
                      <>
                        <ShieldCheckIcon data-icon="inline-start" />
                        Verify account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </FieldGroup>

            <div className="flex items-center justify-end gap-3 border-t pt-5">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={!isDirty || isSaving}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={!isDirty || isSaving || isResolvingAccount}>
                  {isSaving ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Saving…
                    </>
                  ) : (
                    "Save settings"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
