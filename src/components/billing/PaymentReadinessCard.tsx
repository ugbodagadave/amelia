import {
  ChatCircleTextIcon,
  CopyIcon,
  CreditCardIcon,
  LockSimpleIcon,
  WalletIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BILL_STATUS, type BillStatus } from "@/lib/billing"
import { PAYMENT_REQUEST_STATUS, type PaymentRequestStatus } from "@/lib/payments"

interface PaymentReadinessCardProps {
  status: BillStatus
  hasAuthCode: boolean
  paymentType: "self_pay" | "hmo"
  paymentLink?: string | null
  transactionReference?: string | null
  paymentRequestStatus?: PaymentRequestStatus | null
  paymentRequestSentAt?: number | null
  paymentRequestDeliveredAt?: number | null
  paymentRequestReadAt?: number | null
  paymentRequestFailedReason?: string | null
  paymentRequestAutoResendAt?: number | null
  isWhatsAppPending?: boolean
  isCardPending?: boolean
  isOpayPending?: boolean
  isConfirmingOpay?: boolean
  onSendPaymentRequest?: () => void
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
  paymentRequestStatus,
  paymentRequestSentAt,
  paymentRequestDeliveredAt,
  paymentRequestReadAt,
  paymentRequestFailedReason,
  paymentRequestAutoResendAt,
  isWhatsAppPending = false,
  isCardPending = false,
  isOpayPending = false,
  isConfirmingOpay = false,
  onSendPaymentRequest,
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

  const hasBeenSent =
    paymentRequestStatus !== undefined &&
    paymentRequestStatus !== null &&
    paymentRequestStatus !== PAYMENT_REQUEST_STATUS.UNSENT

  const sendLabel = hasBeenSent ? "Resend payment request" : "Send payment request"

  const requestStatusLabel =
    paymentRequestStatus && paymentRequestStatus !== PAYMENT_REQUEST_STATUS.UNSENT
      ? paymentRequestStatus.replace(/_/g, " ")
      : "unsent"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-base">Payment panel</CardTitle>
        <CardDescription>
          WhatsApp-first collection for the patient, with assisted card and OPay actions still
          available for clinic staff when needed.
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

        <div className="rounded-none border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Request status</p>
          <p className="capitalize">{requestStatusLabel}</p>
          {paymentRequestSentAt ? (
            <p className="text-sm text-muted-foreground">
              Sent: {new Date(paymentRequestSentAt).toLocaleString("en-NG")}
            </p>
          ) : null}
          {paymentRequestDeliveredAt ? (
            <p className="text-sm text-muted-foreground">
              Delivered: {new Date(paymentRequestDeliveredAt).toLocaleString("en-NG")}
            </p>
          ) : null}
          {paymentRequestReadAt ? (
            <p className="text-sm text-muted-foreground">
              Read: {new Date(paymentRequestReadAt).toLocaleString("en-NG")}
            </p>
          ) : null}
          {paymentRequestAutoResendAt ? (
            <p className="text-sm text-muted-foreground">
              Auto resend at: {new Date(paymentRequestAutoResendAt).toLocaleString("en-NG")}
            </p>
          ) : null}
          {paymentRequestFailedReason ? (
            <p className="text-sm text-destructive">{paymentRequestFailedReason}</p>
          ) : null}
        </div>

        <Button onClick={onSendPaymentRequest} disabled={isBlocked || isWhatsAppPending || !onSendPaymentRequest}>
          <ChatCircleTextIcon data-icon="inline-start" />
          {sendLabel}
        </Button>

        <Separator />

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Assisted payment</p>
            <p className="text-sm text-muted-foreground">
              Use these only when staff need to help the patient complete checkout directly.
            </p>
          </div>

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
