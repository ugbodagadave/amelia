import { useEffect, useState } from "react"
import { useAction } from "convex/react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react"
import { api } from "../../convex/_generated/api"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export function PaymentCallbackCardPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const finalizeCardPaymentCallback = useAction(api.payments.finalizeCardPaymentCallback)
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading")
  const [message, setMessage] = useState("Finalizing card payment...")
  const [billId, setBillId] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const callbackStatus = searchParams.get("status")
  const callbackMessage = searchParams.get("message")
  const callbackBillId = searchParams.get("billId")
  const txnRef = searchParams.get("txnref") ?? ""
  const payRef = searchParams.get("payRef") ?? undefined
  const responseCode = searchParams.get("ResponseCode") ?? ""

  async function finalizePayment() {
    try {
      const result = await finalizeCardPaymentCallback({
        txnRef,
        payRef,
        responseCode,
      })
      setStatus(result.status === "success" ? "success" : "failed")
      setMessage(result.message)
      setBillId(result.billId ?? null)
      return result
    } catch (error) {
      setStatus("failed")
      setMessage(error instanceof Error ? error.message : "Unable to finalize payment.")
      setBillId(null)
      return null
    }
  }

  useEffect(() => {
    if (callbackStatus && callbackMessage) {
      setStatus(callbackStatus === "success" ? "success" : "failed")
      setMessage(callbackMessage)
      setBillId(callbackBillId)
      return
    }

    void finalizePayment()
  }, [callbackBillId, callbackMessage, callbackStatus, finalizeCardPaymentCallback, payRef, responseCode, txnRef])

  useEffect(() => {
    if (status !== "success" || !billId) {
      return
    }

    const timeout = window.setTimeout(() => {
      void navigate(ROUTES.BILL_DETAIL.replace(":billId", billId))
    }, 1800)

    return () => window.clearTimeout(timeout)
  }, [billId, navigate, status])

  async function handleRetry() {
    setIsRetrying(true)
    await finalizePayment()
    setIsRetrying(false)
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-xl justify-center">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="font-mono text-xl">Card payment result</CardTitle>
            <CardDescription>Amelia is reconciling the hosted checkout response.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {status === "loading" ? <Spinner /> : null}
              {status === "success" ? <CheckCircleIcon data-icon="inline-start" /> : null}
              {status === "failed" ? <WarningCircleIcon data-icon="inline-start" /> : null}
              <span>{message}</span>
            </div>

            {billId ? (
              <p className="text-sm text-muted-foreground">
                Redirecting to the bill record now. If nothing happens, open the bill manually.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => void handleRetry()}
                disabled={status === "loading" || isRetrying || !txnRef || !responseCode}
              >
                {isRetrying ? <Spinner data-icon="inline-start" /> : null}
                Finalize payment again
              </Button>
              {billId ? (
                <Button asChild>
                  <Link to={ROUTES.BILL_DETAIL.replace(":billId", billId)}>View bill</Link>
                </Button>
              ) : (
                <Button asChild variant="secondary">
                  <Link to={ROUTES.BILLS}>Back to bills</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
