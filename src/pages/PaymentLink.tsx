import { useState } from "react"
import { useAction, useQuery } from "convex/react"
import { useParams } from "react-router-dom"
import { CreditCardIcon, WalletIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { api } from "../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

function formatCurrency(value: number) {
  return value.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  })
}

export function PaymentLinkPage() {
  const { token = "" } = useParams<{ token: string }>()
  const payment = useQuery(api.payments.getPublicPaymentByToken, token ? { token } : "skip")
  const initiateCardPayment = useAction(api.payments.initiatePublicCardPayment)
  const initiateOPayPayment = useAction(api.payments.initiatePublicOPayPayment)

  const [isCardPending, setIsCardPending] = useState(false)
  const [isOpayPending, setIsOpayPending] = useState(false)

  const submitHostedPayment = (endpoint: string, fields: Record<string, string>) => {
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

  const handleCardPayment = async () => {
    setIsCardPending(true)
    try {
      const response = await initiateCardPayment({ token })
      submitHostedPayment(response.endpoint, response.fields)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start card payment.")
    } finally {
      setIsCardPending(false)
    }
  }

  const handleOPayPayment = async () => {
    setIsOpayPending(true)
    try {
      const response = await initiateOPayPayment({ token })
      window.location.assign(response.redirectUrl)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start OPay payment.")
    } finally {
      setIsOpayPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="font-mono text-xl">Patient payment</CardTitle>
          <CardDescription>
            Pay the clinic bill securely through Interswitch Web Checkout or OPay.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {payment === undefined ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Spinner />
              <span>Loading payment link...</span>
            </div>
          ) : payment === null ? (
            <div className="rounded-none border p-4 text-sm text-muted-foreground">
              This payment link is invalid or no longer available.
            </div>
          ) : (
            <>
              <div className="rounded-none border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Clinic</p>
                <p className="font-medium">{payment.clinicName}</p>
                <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">Patient</p>
                <p>{payment.patientName}</p>
                <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">Amount due</p>
                <p className="font-mono text-lg">{formatCurrency(payment.totalAmount)}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={() => void handleCardPayment()} disabled={payment.isPaid || isCardPending}>
                  {isCardPending ? <Spinner data-icon="inline-start" /> : <CreditCardIcon data-icon="inline-start" />}
                  Pay with Card
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleOPayPayment()}
                  disabled={payment.isPaid || isOpayPending}
                >
                  {isOpayPending ? <Spinner data-icon="inline-start" /> : <WalletIcon data-icon="inline-start" />}
                  Pay with OPay
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
