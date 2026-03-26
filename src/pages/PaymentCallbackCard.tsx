import { useEffect, useMemo } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function normalizeCallbackStatus(value: string | null) {
  return value === "success" ? "success" : "failed"
}

export function PaymentCallbackCardPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const status = normalizeCallbackStatus(searchParams.get("status"))
  const message = useMemo(() => {
    return searchParams.get("message") ?? "Amelia could not verify the hosted card payment callback."
  }, [searchParams])
  const billId = searchParams.get("billId")

  useEffect(() => {
    if (status !== "success" || !billId) {
      return
    }

    const timeout = window.setTimeout(() => {
      void navigate(ROUTES.BILL_DETAIL.replace(":billId", billId))
    }, 1800)

    return () => window.clearTimeout(timeout)
  }, [billId, navigate, status])

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-xl justify-center">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="font-mono text-xl">Card payment result</CardTitle>
            <CardDescription>Amelia only accepts the server callback result on this screen.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
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
