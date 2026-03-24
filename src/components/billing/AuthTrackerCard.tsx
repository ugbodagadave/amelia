import { CheckCircleIcon, LockSimpleIcon, NotePencilIcon } from "@phosphor-icons/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BILL_STATUS, formatBillStatusLabel } from "@/lib/billing"

export function BillBuilderAuthTrackerCard({
  paymentType,
  authorizationCode,
  onAuthorizationCodeChange,
}: {
  paymentType: "self_pay" | "hmo"
  authorizationCode: string
  onAuthorizationCodeChange: (value: string) => void
}) {
  if (paymentType === "self_pay") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">Authorization tracker</CardTitle>
          <CardDescription>Self-pay bills skip auth entirely.</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Self-pay</Badge>
        </CardContent>
      </Card>
    )
  }

  const hasAuthCode = !!authorizationCode.trim()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-base">Authorization tracker</CardTitle>
        <CardDescription>
          HMO bills save as awaiting auth until a code is confirmed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {hasAuthCode ? (
          <Alert>
            <CheckCircleIcon />
            <AlertTitle>Auth ready</AlertTitle>
            <AlertDescription>
              Saving now will place this bill in {formatBillStatusLabel(BILL_STATUS.AUTH_CONFIRMED)}.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <LockSimpleIcon />
            <AlertTitle>Awaiting auth</AlertTitle>
            <AlertDescription>
              You can save now, but this bill will stay blocked until the auth code arrives.
            </AlertDescription>
          </Alert>
        )}

        <Field>
          <FieldLabel htmlFor="authorization-code">Authorization code</FieldLabel>
          <FieldContent>
            <Input
              id="authorization-code"
              value={authorizationCode}
              onChange={(event) => onAuthorizationCodeChange(event.target.value)}
              placeholder="AUTH-HYG-20260324-100"
            />
            <FieldDescription>Leave blank to save as Awaiting Auth.</FieldDescription>
          </FieldContent>
        </Field>
      </CardContent>
    </Card>
  )
}

export function BillDetailAuthTrackerCard({
  authorizationCode,
  authCodeReceivedAt,
  onOpenChangeDialog,
}: {
  authorizationCode?: string | null
  authCodeReceivedAt?: number
  onOpenChangeDialog: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-base">Authorization tracker</CardTitle>
        <CardDescription>
          Auth stays first-class on HMO bills and uses an explicit change action.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {authorizationCode ? (
          <Alert>
            <CheckCircleIcon />
            <AlertTitle>Auth confirmed</AlertTitle>
            <AlertDescription>
              {authorizationCode} ·{" "}
              {authCodeReceivedAt
                ? new Date(authCodeReceivedAt).toLocaleString("en-NG")
                : "Timestamp unavailable"}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <LockSimpleIcon />
            <AlertTitle>Awaiting auth</AlertTitle>
            <AlertDescription>
              This bill is blocked until the clinic confirms the authorization code.
            </AlertDescription>
          </Alert>
        )}
        <Button variant="outline" onClick={onOpenChangeDialog}>
          <NotePencilIcon data-icon="inline-start" />
          {authorizationCode ? "Change Auth Code" : "Confirm Auth Code"}
        </Button>
      </CardContent>
    </Card>
  )
}
