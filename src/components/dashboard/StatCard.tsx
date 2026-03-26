import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type StatCardVariant = "revenue" | "warning" | "critical" | "neutral"

interface StatCardProps {
  title: string
  value: string
  subLabel?: string
  icon: ReactNode
  variant?: StatCardVariant
  isLoading?: boolean
}

const variantBorder: Record<StatCardVariant, string> = {
  revenue: "",
  warning: "",
  critical: "",
  neutral: "",
}

export function StatCard({
  title,
  value,
  subLabel,
  icon,
  variant = "neutral",
  isLoading = false,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={variantBorder[variant]}>
        <CardContent className="flex flex-col gap-3 px-5 pt-5 pb-5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={variantBorder[variant]}>
      <CardContent className="flex flex-col gap-2 px-5 pt-5 pb-5">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {icon}
          {title}
        </span>
        <span className="font-mono text-[1.6rem] font-bold leading-none tracking-tight">
          {value}
        </span>
        {subLabel !== undefined && (
          <span className="font-mono text-xs text-muted-foreground">{subLabel}</span>
        )}
      </CardContent>
    </Card>
  )
}
