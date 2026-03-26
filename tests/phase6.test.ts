import { describe, expect, test } from "bun:test"
import {
  buildLastNDays,
  getDayWindow,
  sumCollectionsForWindow,
  calculateCollectionRate,
  groupItemsByService,
  daysOutstanding,
  buildClaimBatchAlertId,
} from "../src/lib/dashboardStats"

describe("Phase 6 — Dashboard Stats (pure helpers)", () => {
  test("sumCollectionsForWindow: only sums bills within the UTC day window", () => {
    const todayStart = new Date("2026-03-25T00:00:00.000Z").getTime()
    const todayEnd = todayStart + 86_400_000 - 1
    const bills = [
      { paidAt: todayStart + 3_600_000, totalAmount: 5000 }, // in window
      { paidAt: todayStart - 1, totalAmount: 3000 }, // before window
      { paidAt: undefined, totalAmount: 1000 }, // unpaid — excluded
      { paidAt: todayEnd + 1, totalAmount: 2000 }, // after window
    ]
    expect(sumCollectionsForWindow(bills, todayStart, todayEnd)).toBe(5000)
  })

  test("calculateCollectionRate: 3 paid out of 5 billable = 0.6", () => {
    expect(calculateCollectionRate(3, 5)).toBe(0.6)
  })

  test("calculateCollectionRate: returns 0 when no bills paid", () => {
    expect(calculateCollectionRate(0, 10)).toBe(0)
  })

  test("calculateCollectionRate: returns 0 when no billable bills (no division by zero)", () => {
    expect(calculateCollectionRate(0, 0)).toBe(0)
  })

  test("buildLastNDays: returns exactly 7 dates for n=7", () => {
    const days = buildLastNDays(7, Date.now())
    expect(days).toHaveLength(7)
  })

  test("buildLastNDays: dates are ordered oldest to newest", () => {
    const days = buildLastNDays(7, Date.now())
    expect(days[0] < days[6]).toBe(true)
  })

  test("buildLastNDays: returns exactly 30 dates for n=30", () => {
    const days = buildLastNDays(30, Date.now())
    expect(days).toHaveLength(30)
  })

  test("getDayWindow: window is exactly 86400000ms - 1 wide", () => {
    const { start, end } = getDayWindow("2026-03-25")
    expect(end - start).toBe(86_400_000 - 1)
  })

  test("groupItemsByService: sums lineTotal per service name correctly", () => {
    const items = [
      { name: "FBC", lineTotal: 3000 },
      { name: "Malaria RDT", lineTotal: 1500 },
      { name: "FBC", lineTotal: 2000 },
    ]
    const result = groupItemsByService(items)
    const fbc = result.find((s) => s.serviceName === "FBC")
    expect(fbc?.totalRevenue).toBe(5000)
  })

  test("groupItemsByService: sorted descending by totalRevenue", () => {
    const items = [
      { name: "Service A", lineTotal: 100 },
      { name: "Service B", lineTotal: 500 },
      { name: "Service C", lineTotal: 300 },
    ]
    const result = groupItemsByService(items)
    expect(result[0].serviceName).toBe("Service B")
    expect(result[1].serviceName).toBe("Service C")
    expect(result[2].serviceName).toBe("Service A")
  })

  test("daysOutstanding: bill created 3 days ago has daysOutstanding of 3", () => {
    const now = 1_000 * 86_400_000
    const createdAt = now - 3 * 86_400_000
    expect(daysOutstanding(createdAt, now)).toBe(3)
  })

  test("buildClaimBatchAlertId: produces deterministic ID from batch ID", () => {
    expect(buildClaimBatchAlertId("abc123")).toBe("claim-batch-overdue-abc123")
  })
})

test("convex/dashboard.ts exports all required query names", async () => {
  const source = await Bun.file("./convex/dashboard.ts").text()
  const requiredExports = [
    "getDashboardStats",
    "getSevenDayRevenue",
    "getPaymentMix",
    "getRecentBills",
    "getAnalyticsStats",
    "getThirtyDayRevenueTrend",
    "getClaimsByStatus",
    "getTopServicesByRevenue",
    "getOutstandingBills",
  ]
  for (const name of requiredExports) {
    expect(source).toContain(name)
  }
})

test("chart components use ChartContainer (not raw ResponsiveContainer)", async () => {
  const chartFiles = [
    "./src/components/dashboard/SevenDayRevenueChart.tsx",
    "./src/components/dashboard/ThirtyDayTrendChart.tsx",
    "./src/components/dashboard/ClaimsByStatusChart.tsx",
    "./src/components/dashboard/TopServicesChart.tsx",
    "./src/components/dashboard/PaymentMixChart.tsx",
  ]
  for (const file of chartFiles) {
    const source = await Bun.file(file).text()
    expect(source).toContain("ChartContainer")
    expect(source).not.toContain("ResponsiveContainer")
  }
})

test("dashboard and analytics charts disable series animation for fast layout changes", async () => {
  const chartFiles = [
    "./src/components/dashboard/SevenDayRevenueChart.tsx",
    "./src/components/dashboard/ThirtyDayTrendChart.tsx",
    "./src/components/dashboard/ClaimsByStatusChart.tsx",
    "./src/components/dashboard/TopServicesChart.tsx",
    "./src/components/dashboard/PaymentMixChart.tsx",
  ]
  for (const file of chartFiles) {
    const source = await Bun.file(file).text()
    expect(source).toContain("isAnimationActive={false}")
  }
})

test("analytics page uses explicit active-state tab styling", async () => {
  const source = await Bun.file("./src/pages/Analytics.tsx").text()
  expect(source).toContain('<TabsList className="gap-2 bg-transparent p-0">')
  expect(source).toContain("data-[state=active]:bg-primary")
  expect(source).toContain("data-[state=active]:text-primary-foreground")
})

test("outstanding bills empty state uses the shared Empty component", async () => {
  const source = await Bun.file("./src/components/dashboard/OutstandingBillsTable.tsx").text()
  expect(source).toContain("Empty")
  expect(source).not.toContain("No outstanding bills — all caught up</p>")
})

test("analytics page does not remount charts on sidebar state changes", async () => {
  const source = await Bun.file("./src/pages/Analytics.tsx").text()
  expect(source).not.toContain("useSidebar")
  expect(source).not.toContain("analyticsChartLayoutKey")
  expect(source).not.toContain("key={`${analyticsChartLayoutKey}")
})

test("dashboard page does not remount charts on sidebar state changes", async () => {
  const source = await Bun.file("./src/pages/Dashboard.tsx").text()
  expect(source).not.toContain("useSidebar")
  expect(source).not.toContain("dashboardChartLayoutKey")
  expect(source).not.toContain("key={`${dashboardChartLayoutKey}")
})

test("dashboard hero greets the current clinic instead of repeating the page title", async () => {
  const source = await Bun.file("./src/pages/Dashboard.tsx").text()
  expect(source).toContain("api.clinics.getCurrentClinic")
  expect(source).toContain("Welcome,")
  expect(source).not.toContain('>Dashboard</h1>')
})
