import { useEffect, useState } from "react"
import { useAction } from "convex/react"
import { useSearchParams } from "react-router-dom"
import { api } from "../../convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export function PaymentCallbackOpayPage() {
  const [searchParams] = useSearchParams()
  const confirmOPayPayment = useAction(api.payments.confirmOPayPayment)
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading")
  const [message, setMessage] = useState("Confirming OPay payment...")

  useEffect(() => {
    void (async () => {
      try {
        const result = await confirmOPayPayment({
          reference: searchParams.get("reference") ?? searchParams.get("txnref") ?? "",
        })
        setStatus(result.status as "success" | "pending")
        setMessage(
          result.status === "success"
            ? "Payment confirmed."
            : "Payment is still pending with OPay.",
        )
      } catch (error) {
        setStatus("failed")
        setMessage(error instanceof Error ? error.message : "Unable to confirm OPay payment.")
      }
    })()
  }, [confirmOPayPayment, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="font-mono text-xl">OPay payment result</CardTitle>
          <CardDescription>Amelia is reconciling the wallet payment callback.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          {status === "loading" ? <Spinner /> : null}
          <span>{message}</span>
        </CardContent>
      </Card>
    </div>
  )
}
