/**
 * Pure, testable analytics helpers.
 * Used by both convex/dashboard.ts (server-side) and tests/phase6.test.ts.
 * No browser APIs — safe to run in Convex's edge runtime.
 */

/**
 * Build an array of the last N days as ISO date strings (YYYY-MM-DD),
 * ordered oldest first (index 0 = oldest, index N-1 = today).
 */
export function buildLastNDays(n: number, fromEpoch: number): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(fromEpoch - i * 86_400_000)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

/**
 * Returns the UTC midnight start/end epoch range for a given ISO date string.
 */
export function getDayWindow(isoDate: string): { start: number; end: number } {
  const start = new Date(`${isoDate}T00:00:00.000Z`).getTime()
  return { start, end: start + 86_400_000 - 1 }
}

/**
 * Sum totalAmount for bills whose paidAt falls within [windowStart, windowEnd].
 * Bills without paidAt (unpaid) are skipped.
 */
export function sumCollectionsForWindow(
  bills: ReadonlyArray<{ paidAt?: number; totalAmount: number }>,
  windowStart: number,
  windowEnd: number,
): number {
  return bills
    .filter((b) => {
      const paidAt = b.paidAt
      return paidAt !== undefined && paidAt >= windowStart && paidAt <= windowEnd
    })
    .reduce((sum, b) => sum + b.totalAmount, 0)
}

/**
 * Collection rate as a decimal 0–1.
 * Returns 0 when total is 0 to avoid division by zero.
 */
export function calculateCollectionRate(paid: number, total: number): number {
  if (total === 0) return 0
  return paid / total
}

/**
 * Group bill items by service name and sum their lineTotal.
 * Returns sorted descending by totalRevenue.
 */
export function groupItemsByService(
  items: ReadonlyArray<{ name: string; lineTotal: number }>,
): Array<{ serviceName: string; totalRevenue: number }> {
  const map = new Map<string, number>()
  for (const item of items) {
    map.set(item.name, (map.get(item.name) ?? 0) + item.lineTotal)
  }
  return [...map.entries()]
    .map(([serviceName, totalRevenue]) => ({ serviceName, totalRevenue }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

/**
 * Number of full days elapsed between createdAt and now.
 */
export function daysOutstanding(createdAt: number, now: number): number {
  return Math.floor((now - createdAt) / 86_400_000)
}

/**
 * Build a stable, deterministic sessionStorage alert ID for an overdue claim batch.
 */
export function buildClaimBatchAlertId(batchId: string): string {
  return `claim-batch-overdue-${batchId}`
}

/**
 * Format an ISO date string (YYYY-MM-DD) as a short weekday name: "Mon", "Tue", etc.
 * Uses noon UTC to avoid timezone boundary edge cases.
 */
export function isoDateToWeekday(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`)
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
}
