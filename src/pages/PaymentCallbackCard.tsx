import { useEffect, useState } from "react"
import { useAction } from "convex/react"
import { useSearchParams } from "react-router-dom"
import { api } from "../../convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export function PaymentCallbackCardPage() {
  const [searchParams] = useSearchParams()
  const finalizeCardPaymentCallback = useAction(api.payments.finalizeCardPaymentCallback)
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading")
  const [message, setMessage] = useState("Finalizing card payment...")

  useEffect(() => {
    void (async () => {
      try {
        const result = await finalizeCardPaymentCallback({
          txnRef: searchParams.get("txnref") ?? "",
          payRef: searchParams.get("payRef") ?? undefined,
          responseCode: searchParams.get("ResponseCode") ?? "",
        })
        setStatus(result.status === "success" ? "success" : "failed")
        setMessage(result.message)
      } catch (error) {
        setStatus("failed")
        setMessage(error instanceof Error ? error.message : "Unable to finalize payment.")
      }
    })()
  }, [finalizeCardPaymentCallback, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="font-mono text-xl">Card payment result</CardTitle>
          <CardDescription>Amelia is reconciling the hosted checkout response.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          {status === "loading" ? <Spinner /> : null}
          <span>{message}</span>
        </CardContent>
      </Card>
    </div>
  )
}
