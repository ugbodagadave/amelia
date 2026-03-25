export function formatCurrency(value: number): string {
  return value.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  })
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) {
    return `₦${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `₦${Math.round(value / 1_000)}k`
  }
  return `₦${value.toFixed(0)}`
}

export function formatDateShort(epoch: number): string {
  return new Date(epoch).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
