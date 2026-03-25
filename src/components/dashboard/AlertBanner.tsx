import { useState } from "react"
import { XIcon, WarningCircleIcon, WarningIcon } from "@phosphor-icons/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export interface DashboardAlert {
  id: string
  variant: "destructive" | "warning"
  title: string
  description: string
}

interface AlertBannerProps {
  alerts: DashboardAlert[]
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem("amelia_dismissed_alerts")
      return stored ? (JSON.parse(stored) as string[]) : []
    } catch {
      return []
    }
  })

  function dismiss(id: string) {
    setDismissedIds((prev) => {
      const next = [...prev, id]
      try {
        sessionStorage.setItem("amelia_dismissed_alerts", JSON.stringify(next))
      } catch {
        // sessionStorage unavailable — dismiss only in memory
      }
      return next
    })
  }

  const visible = alerts.filter((a) => !dismissedIds.includes(a.id))

  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {visible.map((alert) => (
        <Alert
          key={alert.id}
          variant={alert.variant === "destructive" ? "destructive" : "default"}
          className={[
            "relative pr-10",
            alert.variant === "warning"
              ? "border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] text-[var(--alert-warning-text)] [&>svg]:text-[var(--alert-warning-icon)]"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {alert.variant === "destructive" ? (
            <WarningCircleIcon className="size-4" />
          ) : (
            <WarningIcon className="size-4" />
          )}
          <AlertTitle className="font-mono text-[11px] uppercase tracking-wider">
            {alert.title}
          </AlertTitle>
          <AlertDescription className="text-xs">{alert.description}</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-1.5 h-6 w-6 opacity-50 hover:opacity-100"
            onClick={() => dismiss(alert.id)}
          >
            <XIcon className="size-3" />
          </Button>
        </Alert>
      ))}
    </div>
  )
}
