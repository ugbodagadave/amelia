import { CreditCardIcon } from "@phosphor-icons/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BILL_STATUS, type BillStatus } from "@/lib/billing"

export function PaymentReadinessCard({
  status,
  hasAuthCode,
}: {
  status: BillStatus
  hasAuthCode: boolean
}) {
  const readyForPhaseFour =
    status === BILL_STATUS.PENDING_PAYMENT || status === BILL_STATUS.AUTH_CONFIRMED || hasAuthCode

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-base">Payment panel</CardTitle>
        <CardDescription>
          Payment collection lands in Phase 4. This panel only shows readiness in Phase 3.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Alert>
          <CreditCardIcon />
          <AlertTitle>{readyForPhaseFour ? "Ready for collection" : "Not ready yet"}</AlertTitle>
          <AlertDescription>
            {readyForPhaseFour
              ? "This bill is structurally ready for Web Checkout and OPay once Phase 4 is added."
              : "HMO bills need an auth code before payment collection can begin."}
          </AlertDescription>
        </Alert>
        <Button disabled>
          <CreditCardIcon data-icon="inline-start" />
          Payment actions unlock in Phase 4
        </Button>
      </CardContent>
    </Card>
  )
}
