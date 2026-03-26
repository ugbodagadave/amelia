import { useQuery } from "convex/react"
import {
  CurrencyNgnIcon,
  LockIcon,
  ReceiptIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"
import { api } from "../../convex/_generated/api"
import { buildClaimBatchAlertId } from "@/lib/dashboardStats"
import { formatCurrency } from "@/lib/formatting"
import type { DashboardAlert } from "@/components/dashboard/AlertBanner"
import { AlertBanner } from "@/components/dashboard/AlertBanner"
import { LiveBadge } from "@/components/dashboard/LiveBadge"
import { PaymentMixChart } from "@/components/dashboard/PaymentMixChart"
import { RecentBillsTable } from "@/components/dashboard/RecentBillsTable"
import { SevenDayRevenueChart } from "@/components/dashboard/SevenDayRevenueChart"
import { StatCard } from "@/components/dashboard/StatCard"

type DashboardStats = NonNullable<ReturnType<typeof useQuery<typeof api.dashboard.getDashboardStats>>>

function buildAlerts(stats: DashboardStats): DashboardAlert[] {
  const alerts: DashboardAlert[] = []

  for (const batch of stats.overdueClaimBatches) {
    const dueDateText = batch.expectedPaymentBy
      ? ` — expected by ${new Date(batch.expectedPaymentBy).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
        })}`
      : ""
    alerts.push({
      id: buildClaimBatchAlertId(batch._id),
      variant: "destructive",
      title: "Overdue TPA Payment",
      description: `${batch.hmoName} via ${batch.tpaName}${dueDateText}`,
    })
  }

  if (stats.pendingAuthCount > 0) {
    alerts.push({
      id: "auth-pending",
      variant: "warning",
      title: "Authorization Codes Pending",
      description: `${stats.pendingAuthCount} bill${stats.pendingAuthCount === 1 ? "" : "s"} awaiting authorization code — payment cannot proceed until confirmed.`,
    })
  }

  return alerts
}

export function DashboardPage() {
  const clinic = useQuery(api.clinics.getCurrentClinic)
  const stats = useQuery(api.dashboard.getDashboardStats)
  const sevenDayRevenue = useQuery(api.dashboard.getSevenDayRevenue)
  const paymentMix = useQuery(api.dashboard.getPaymentMix)
  const recentBills = useQuery(api.dashboard.getRecentBills)

  const isLoading = stats === undefined
  const alerts = stats ? buildAlerts(stats) : []
  const heroTitle = clinic?.name ? `Welcome, ${clinic.name}` : "Welcome"

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">{heroTitle}</h1>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-NG", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <LiveBadge />
      </div>

      {/* ── Dismissible alerts ── */}
      {alerts.length > 0 && <AlertBanner alerts={alerts} />}

      {/* ── 4-up stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today's Collections"
          value={isLoading ? "—" : formatCurrency(stats.todayCollections)}
          icon={<CurrencyNgnIcon className="size-3.5" />}
          variant="revenue"
          isLoading={isLoading}
        />
        <StatCard
          title="Outstanding Bills"
          value={isLoading ? "—" : `${stats.outstandingBillsCount}`}
          subLabel={
            isLoading || stats.outstandingBillsCount === 0
              ? undefined
              : formatCurrency(stats.outstandingBillsSum)
          }
          icon={<ReceiptIcon className="size-3.5" />}
          variant={!isLoading && stats.outstandingBillsCount > 0 ? "warning" : "neutral"}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Auth Codes"
          value={isLoading ? "—" : `${stats.pendingAuthCount}`}
          icon={<LockIcon className="size-3.5" />}
          variant={!isLoading && stats.pendingAuthCount > 0 ? "warning" : "neutral"}
          isLoading={isLoading}
        />
        <StatCard
          title="Overdue TPA Payments"
          value={isLoading ? "—" : `${stats.overdueClaimBatchCount}`}
          icon={<WarningCircleIcon className="size-3.5" />}
          variant={!isLoading && stats.overdueClaimBatchCount > 0 ? "critical" : "neutral"}
          isLoading={isLoading}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)]">
        <SevenDayRevenueChart data={sevenDayRevenue} />
        <PaymentMixChart data={paymentMix} />
      </div>

      {/* ── Recent bills table ── */}
      <RecentBillsTable bills={recentBills} />
    </div>
  )
}
