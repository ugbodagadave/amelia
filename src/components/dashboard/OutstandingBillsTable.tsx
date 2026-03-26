import { useState } from "react"
import { ReceiptIcon, WhatsappLogoIcon } from "@phosphor-icons/react"
import type { Id } from "../../../convex/_generated/dataModel"
import type { BillStatus } from "@/lib/billing"
import { formatCurrency } from "@/lib/formatting"
import { BillStatusBadge } from "@/components/billing/BillStatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface OutstandingBill {
  _id: Id<"bills">
  patientName: string
  hmoName: string | null
  totalAmount: number
  status: BillStatus
  daysOutstanding: number
  paymentLink: string | null
}

interface OutstandingBillsTableProps {
  bills: OutstandingBill[] | undefined
  onResendWhatsApp: (billId: Id<"bills">) => Promise<void>
}

export function OutstandingBillsTable({ bills, onResendWhatsApp }: OutstandingBillsTableProps) {
  const [resendingId, setResendingId] = useState<Id<"bills"> | null>(null)

  async function handleResend(billId: Id<"bills">) {
    setResendingId(billId)
    try {
      await onResendWhatsApp(billId)
    } finally {
      setResendingId(null)
    }
  }

  if (bills === undefined) {
    return <Skeleton className="h-48 w-full" />
  }

  if (bills.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <Empty className="border-border bg-muted/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptIcon />
              </EmptyMedia>
              <EmptyTitle>No outstanding bills</EmptyTitle>
              <EmptyDescription>
                Collections are balanced right now. Any unpaid bills will appear here for follow-up.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">Patient</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">HMO</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-right">Amount</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">Days Out</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">Status</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => (
              <TableRow key={bill._id}>
                <TableCell className="font-medium">{bill.patientName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {bill.hmoName ?? "Self-Pay"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(bill.totalAmount)}
                </TableCell>
                <TableCell>
                  <span
                    className={[
                      "font-mono text-sm font-medium",
                      bill.daysOutstanding > 7 ? "text-destructive" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {bill.daysOutstanding}d
                  </span>
                </TableCell>
                <TableCell>
                  <BillStatusBadge status={bill.status} />
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 font-mono text-xs"
                    disabled={!bill.paymentLink || resendingId === bill._id}
                    onClick={() => handleResend(bill._id)}
                  >
                    <WhatsappLogoIcon className="size-3" />
                    {resendingId === bill._id ? "Sending…" : "WhatsApp"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
