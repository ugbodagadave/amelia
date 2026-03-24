import { CopyIcon, CreditCardIcon, LockSimpleIcon, WalletIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BILL_STATUS, type BillStatus } from "@/lib/billing"

interface PaymentReadinessCardProps {
  status: BillStatus
  hasAuthCode: boolean
  paymentType: "self_pay" | "hmo"
  paymentLink?: string | null
  transactionReference?: string | null
  isCardPending?: boolean
  isOpayPending?: boolean
  isConfirmingOpay?: boolean
  onPayWithCard: () => void
  onPayWithOPay: () => void
  onConfirmOPay?: () => void
}

export function PaymentReadinessCard({
  status,
  hasAuthCode,
  paymentType,
  paymentLink,
  transactionReference,
  isCardPending = false,
  isOpayPending = false,
  isConfirmingOpay = false,
  onPayWithCard,
  onPayWithOPay,
  onConfirmOPay,
}: PaymentReadinessCardProps) {
  const isBlocked =
    paymentType === "hmo" && (status === BILL_STATUS.AWAITING_AUTH || !hasAuthCode)

  const copyPaymentLink = async () => {
    if (!paymentLink) {
      return
    }

    await navigator.clipboard.writeText(paymentLink)
    toast.success("Payment link copied.")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-base">Payment panel</CardTitle>
        <CardDescription>
          Generate a patient-facing payment link, redirect into Interswitch hosted checkout,
          or send the patient to OPay from the saved bill.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isBlocked ? (
          <Alert>
            <LockSimpleIcon />
            <AlertTitle>Payment blocked</AlertTitle>
            <AlertDescription>
              HMO bills must stay locked until the clinic confirms the authorization code.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CreditCardIcon />
            <AlertTitle>Ready for collection</AlertTitle>
            <AlertDescription>
              Staff can launch Web Checkout, redirect to OPay, or copy the public payment link
              for the patient.
            </AlertDescription>
          </Alert>
        )}

        {transactionReference ? (
          <div className="rounded-none border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Transaction reference
            </p>
            <p className="font-mono text-sm">{transactionReference}</p>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button onClick={onPayWithCard} disabled={isBlocked || isCardPending}>
            <CreditCardIcon data-icon="inline-start" />
            Pay with Card
          </Button>
          <Button variant="outline" onClick={onPayWithOPay} disabled={isBlocked || isOpayPending}>
            <WalletIcon data-icon="inline-start" />
            Pay with OPay
          </Button>
        </div>

        {onConfirmOPay && transactionReference ? (
          <Button
            variant="secondary"
            onClick={onConfirmOPay}
            disabled={isBlocked || isConfirmingOpay}
          >
            <WalletIcon data-icon="inline-start" />
            Confirm OPay payment
          </Button>
        ) : null}

        <Button variant="secondary" onClick={() => void copyPaymentLink()} disabled={!paymentLink}>
          <CopyIcon data-icon="inline-start" />
          Copy payment link
        </Button>
      </CardContent>
    </Card>
  )
}
