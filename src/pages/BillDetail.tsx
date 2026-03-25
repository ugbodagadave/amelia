import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useAction, useMutation, useQuery } from "convex/react"
import { CheckCircleIcon, FileTextIcon, UserCircleIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { api } from "../../convex/_generated/api"
import { BillDetailAuthTrackerCard } from "@/components/billing/AuthTrackerCard"
import { BillStatusBadge } from "@/components/billing/BillStatusBadge"
import { BillSummaryCard } from "@/components/billing/BillSummaryCard"
import { PaymentReadinessCard } from "@/components/billing/PaymentReadinessCard"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function formatCurrency(value: number) {
  return value.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  })
}

function formatAdmissionType(value: string) {
  return value === "inpatient" ? "Inpatient" : "Outpatient"
}

export function BillDetailPage() {
  const { billId } = useParams<{ billId: string }>()
  const bill = useQuery(api.bills.getById, billId ? { billId: billId as never } : "skip")
  const confirmAuthCode = useMutation(api.bills.confirmAuthCode)
  const changeAuthCode = useMutation(api.bills.changeAuthCode)
  const initiateCardPayment = useAction(api.payments.initiateCardPayment)
  const initiateOPayPayment = useAction(api.payments.initiateOPayPayment)
  const confirmOPayPayment = useAction(api.payments.confirmOPayPayment)

  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [authCodeDraft, setAuthCodeDraft] = useState("")
  const [isSavingAuth, setIsSavingAuth] = useState(false)
  const [isCardPending, setIsCardPending] = useState(false)
  const [isOpayPending, setIsOpayPending] = useState(false)
  const [isConfirmingOpay, setIsConfirmingOpay] = useState(false)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [transactionReference, setTransactionReference] = useState<string | null>(null)
  const [shouldAutoConfirmOpay, setShouldAutoConfirmOpay] = useState(false)

  useEffect(() => {
    if (bill?.authorizationCode) {
      setAuthCodeDraft(bill.authorizationCode)
    }
  }, [bill?.authorizationCode])

  useEffect(() => {
    setPaymentLink(bill?.paymentLink ?? null)
    setTransactionReference(bill?.transactionReference ?? null)
  }, [bill?.paymentLink, bill?.transactionReference])

  useEffect(() => {
    if (bill?.paymentChannel === "opay" && bill.status === "pending_payment" && bill.transactionReference) {
      setShouldAutoConfirmOpay(true)
    }
  }, [bill?.paymentChannel, bill?.status, bill?.transactionReference])

  function submitHostedPayment(endpoint: string, fields: Record<string, string>) {
    const form = document.createElement("form")
    form.method = "POST"
    form.action = endpoint

    for (const [key, value] of Object.entries(fields)) {
      const input = document.createElement("input")
      input.type = "hidden"
      input.name = key
      input.value = value
      form.appendChild(input)
    }

    document.body.appendChild(form)
    form.submit()
    form.remove()
  }

  async function handleCardPayment() {
    if (!billId) {
      return
    }

    setIsCardPending(true)
    try {
      const response = await initiateCardPayment({ billId: billId as never })
      if (!("fields" in response) || !response.endpoint) {
        throw new Error("Card payment session did not return hosted checkout fields.")
      }
      setPaymentLink(response.paymentLink)
      setTransactionReference(response.transactionReference)
      submitHostedPayment(response.endpoint, response.fields)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start card payment.")
    } finally {
      setIsCardPending(false)
    }
  }

  async function handleOPayPayment() {
    if (!billId) {
      return
    }

    setIsOpayPending(true)
    try {
      const response = await initiateOPayPayment({ billId: billId as never })
      if (!("redirectUrl" in response)) {
        throw new Error("OPay session did not return a redirect URL.")
      }
      setPaymentLink(response.paymentLink)
      setTransactionReference(response.transactionReference ?? null)
      setShouldAutoConfirmOpay(true)
      const redirectUrl = response.redirectUrl
      window.open(redirectUrl, "_blank", "noopener,noreferrer")
      toast.success("Complete the OPay payment, then return here and confirm it.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start OPay payment.")
    } finally {
      setIsOpayPending(false)
    }
  }

  async function handleConfirmOPayPayment() {
    if (!transactionReference) {
      toast.error("Start an OPay payment first to get a transaction reference.")
      return
    }

    setIsConfirmingOpay(true)
    try {
      const response = await confirmOPayPayment({ reference: transactionReference })
      if (response.status === "success") {
        setShouldAutoConfirmOpay(false)
        toast.success("OPay payment confirmed.")
        return
      }

      toast.message("OPay payment is still pending. Retry after the customer completes checkout.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to confirm OPay payment.")
    } finally {
      setIsConfirmingOpay(false)
    }
  }

  useEffect(() => {
    if (!shouldAutoConfirmOpay || !transactionReference) {
      return
    }

    const confirmFromFocus = () => {
      if (document.visibilityState !== "visible" || isConfirmingOpay) {
        return
      }

      void handleConfirmOPayPayment()
    }

    window.addEventListener("focus", confirmFromFocus)
    document.addEventListener("visibilitychange", confirmFromFocus)

    return () => {
      window.removeEventListener("focus", confirmFromFocus)
      document.removeEventListener("visibilitychange", confirmFromFocus)
    }
  }, [isConfirmingOpay, shouldAutoConfirmOpay, transactionReference])

  async function handleAuthSave() {
    if (!billId) {
      return
    }

    setIsSavingAuth(true)
    try {
      if (bill?.authorizationCode) {
        await changeAuthCode({
          billId: billId as never,
          authorizationCode: authCodeDraft,
        })
      } else {
        await confirmAuthCode({
          billId: billId as never,
          authorizationCode: authCodeDraft,
        })
      }

      toast.success("Authorization code saved.")
      setIsAuthDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save auth code.")
    } finally {
      setIsSavingAuth(false)
    }
  }

  if (!billId || bill === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xl">Bill Detail</CardTitle>
          <CardDescription>Loading saved bill and line items.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-muted-foreground">
          <Spinner />
          <span>Fetching bill record...</span>
        </CardContent>
      </Card>
    )
  }

  if (bill === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xl">Bill not found</CardTitle>
          <CardDescription>The bill could not be loaded for this clinic.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to={ROUTES.BILLS}>Back to bills</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const detailInvestigations = bill.items.map((item) => ({
    serviceName: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }))
  const detailMedications = bill.medications.map((item) => ({
    drugName: item.name,
    dosage: item.dosage,
    duration: item.duration,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }))

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,0.9fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-2">
                <CardTitle className="font-mono text-xl">{bill.patient.fullName}</CardTitle>
                <CardDescription>
                  {bill.diagnosis} · {new Date(bill.createdAt).toLocaleDateString("en-NG")}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <BillStatusBadge status={bill.status} />
                <Badge variant={bill.patient.paymentType === "hmo" ? "default" : "secondary"}>
                  {bill.patient.paymentType === "hmo"
                    ? bill.patient.hmoName ?? "HMO"
                    : "Self-pay"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-none border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Patient</p>
                <p>{bill.patient.fullName}</p>
                <p className="text-muted-foreground">{bill.patient.phone}</p>
              </div>
              <div className="rounded-none border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">NIN</p>
                <p>{bill.patient.maskedNin}</p>
              </div>
              <div className="rounded-none border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Admission</p>
                <p>{formatAdmissionType(bill.admissionType)}</p>
              </div>
              <div className="rounded-none border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">NHIS No.</p>
                <p>{bill.patient.enrolleeNhisNo ?? "Not provided"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-base">Episode details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-none border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Diagnosis</p>
                <p>{bill.diagnosis}</p>
              </div>
              <div className="rounded-none border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Presenting complaints</p>
                <p>{bill.presentingComplaints || "Not recorded"}</p>
              </div>
              <div className="rounded-none border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Notification</p>
                <p>{bill.dateNotification}</p>
              </div>
              <div className="rounded-none border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Admission / Discharge</p>
                <p>
                  {bill.dateAdmission} to {bill.dateDischarge}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-base">Investigations</CardTitle>
            </CardHeader>
            <CardContent>
              {bill.items.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bill.items.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(item.lineTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileTextIcon />
                    </EmptyMedia>
                    <EmptyTitle>No investigations</EmptyTitle>
                    <EmptyDescription>This bill only contains medications.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-base">Medications</CardTitle>
            </CardHeader>
            <CardContent>
              {bill.medications.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drug</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bill.medications.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.dosage}</TableCell>
                        <TableCell>{item.duration}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(item.lineTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UserCircleIcon />
                    </EmptyMedia>
                    <EmptyTitle>No medications</EmptyTitle>
                    <EmptyDescription>This bill only contains investigations.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <BillSummaryCard
            paymentType={bill.patient.paymentType}
            investigations={detailInvestigations}
            medications={detailMedications}
          />
          {bill.patient.paymentType === "hmo" ? (
            <BillDetailAuthTrackerCard
              authorizationCode={bill.authorizationCode}
              authCodeReceivedAt={bill.authCodeReceivedAt}
              onOpenChangeDialog={() => setIsAuthDialogOpen(true)}
            />
          ) : null}
          <PaymentReadinessCard
            status={bill.status}
            hasAuthCode={!!bill.authorizationCode}
            paymentType={bill.patient.paymentType}
            paymentLink={paymentLink}
            transactionReference={transactionReference}
            isCardPending={isCardPending}
            isOpayPending={isOpayPending}
            isConfirmingOpay={isConfirmingOpay}
            onPayWithCard={() => void handleCardPayment()}
            onPayWithOPay={() => void handleOPayPayment()}
            onConfirmOPay={() => void handleConfirmOPayPayment()}
          />
        </div>
      </div>

      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {bill.authorizationCode ? "Change auth code" : "Confirm auth code"}
            </DialogTitle>
            <DialogDescription>
              Updating the code moves the bill into Auth Confirmed and timestamps the change.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="auth-code-draft">Authorization code</FieldLabel>
              <FieldContent>
                <Input
                  id="auth-code-draft"
                  value={authCodeDraft}
                  onChange={(event) => setAuthCodeDraft(event.target.value)}
                  placeholder="AUTH-HMO-100"
                />
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAuthDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAuthSave()} disabled={isSavingAuth}>
              {isSavingAuth ? <Spinner data-icon="inline-start" /> : <CheckCircleIcon data-icon="inline-start" />}
              Save auth code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
