import { Badge } from "@/components/ui/badge"
import { BILL_STATUS, formatBillStatusLabel, type BillStatus } from "@/lib/billing"

export function BillStatusBadge({ status }: { status: BillStatus }) {
  const variant =
    status === BILL_STATUS.PAID
      ? "default"
      : status === BILL_STATUS.OVERDUE
        ? "destructive"
        : "secondary"

  return <Badge variant={variant}>{formatBillStatusLabel(status)}</Badge>
}
