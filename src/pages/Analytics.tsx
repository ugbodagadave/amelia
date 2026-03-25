import { useMemo, useState } from "react"
import { useQuery, useAction } from "convex/react"
import {
  ChartBarIcon,
  ClockIcon,
  FileTextIcon,
  TrendUpIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { formatCurrency } from "@/lib/formatting"
import { ClaimsByStatusChart } from "@/components/dashboard/ClaimsByStatusChart"
import { OutstandingBillsTable } from "@/components/dashboard/OutstandingBillsTable"
import { StatCard } from "@/components/dashboard/StatCard"
import { ThirtyDayTrendChart } from "@/components/dashboard/ThirtyDayTrendChart"
import { TopServicesChart } from "@/components/dashboard/TopServicesChart"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AnalyticsPage() {
  const analyticsStats = useQuery(api.dashboard.getAnalyticsStats)
  const thirtyDayTrend = useQuery(api.dashboard.getThirtyDayRevenueTrend)
  const claimsByStatus = useQuery(api.dashboard.getClaimsByStatus)
  const topServices = useQuery(api.dashboard.getTopServicesByRevenue)
  const outstandingBills = useQuery(api.dashboard.getOutstandingBills)

  const sendWhatsApp = useAction(api.payments.sendPaymentRequestViaWhatsApp)

  const [sortOrder, setSortOrder] = useState<"amount" | "days">("amount")

  const sortedOutstanding = useMemo(() => {
    if (!outstandingBills) return outstandingBills
    return [...outstandingBills].sort((a, b) => {
      if (sortOrder === "days") return b.daysOutstanding - a.daysOutstanding
      return b.totalAmount - a.totalAmount
    })
  }, [outstandingBills, sortOrder])

  async function handleResendWhatsApp(billId: Id<"bills">) {
    try {
      await sendWhatsApp({ billId })
      toast.success("Payment request sent via WhatsApp")
    } catch {
      toast.error("Failed to send WhatsApp message — check connection and try again")
    }
  }

  const isLoading = analyticsStats === undefined
  const collectionRatePct = ((analyticsStats?.collectionRate ?? 0) * 100).toFixed(1)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-mono text-2xl font-bold tracking-tight">Analytics</h1>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="outstanding" className="gap-2">
            Outstanding Bills
            {outstandingBills !== undefined && outstandingBills.length > 0 && (
              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                {outstandingBills.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Overview tab ── */}
        <TabsContent value="overview" className="mt-6 flex flex-col gap-6">
          {/* 4-up stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Monthly Revenue"
              value={isLoading ? "—" : formatCurrency(analyticsStats.monthlyRevenue)}
              icon={<TrendUpIcon className="size-3.5" />}
              variant="revenue"
              isLoading={isLoading}
            />
            <StatCard
              title="Collection Rate"
              value={isLoading ? "—" : `${collectionRatePct}%`}
              icon={<ChartBarIcon className="size-3.5" />}
              variant="neutral"
              isLoading={isLoading}
            />
            <StatCard
              title="Claims Submitted"
              value={isLoading ? "—" : `${analyticsStats.claimsSubmittedCount}`}
              subLabel={
                isLoading || analyticsStats.claimsSubmittedCount === 0
                  ? undefined
                  : formatCurrency(analyticsStats.claimsSubmittedValue)
              }
              icon={<FileTextIcon className="size-3.5" />}
              variant="neutral"
              isLoading={isLoading}
            />
            <StatCard
              title="Avg Days to Payment"
              value={isLoading ? "—" : `${analyticsStats.avgDaysToPayment}d`}
              icon={<ClockIcon className="size-3.5" />}
              variant="neutral"
              isLoading={isLoading}
            />
          </div>

          {/* Collection rate progress bar */}
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Collection Rate
                  </span>
                  <span className="font-mono text-sm font-bold">{collectionRatePct}%</span>
                </div>
                <Progress value={analyticsStats.collectionRate * 100} className="h-1.5" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Percentage of activated bills that have been paid or claimed
                </p>
              </CardContent>
            </Card>
          )}

          {/* 30-day trend — full width */}
          <ThirtyDayTrendChart data={thirtyDayTrend} />

          {/* 2-col charts */}
          <div className="grid gap-4 xl:grid-cols-2">
            <ClaimsByStatusChart data={claimsByStatus} />
            <TopServicesChart data={topServices} />
          </div>
        </TabsContent>

        {/* ── Outstanding Bills tab ── */}
        <TabsContent value="outstanding" className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {outstandingBills === undefined ? (
                <Skeleton className="inline-block h-4 w-28" />
              ) : (
                <>
                  {outstandingBills.length} unpaid bill
                  {outstandingBills.length === 1 ? "" : "s"}
                </>
              )}
            </p>
            <Select
              value={sortOrder}
              onValueChange={(v) => setSortOrder(v as "amount" | "days")}
            >
              <SelectTrigger className="w-52 font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Sort by Amount (high → low)</SelectItem>
                <SelectItem value="days">Sort by Days Outstanding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <OutstandingBillsTable
            bills={sortedOutstanding}
            onResendWhatsApp={handleResendWhatsApp}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
