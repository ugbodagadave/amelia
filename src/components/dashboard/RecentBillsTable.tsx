import { useNavigate } from "react-router-dom"
import type { Id } from "../../../convex/_generated/dataModel"
import type { BillStatus } from "@/lib/billing"
import { ROUTES } from "@/constants/routes"
import { formatCurrency, formatDateShort } from "@/lib/formatting"
import { BillStatusBadge } from "@/components/billing/BillStatusBadge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface RecentBill {
  _id: Id<"bills">
  patientName: string
  hmoName: string | null
  totalAmount: number
  status: BillStatus
  paymentChannel: "card" | "opay" | null
  createdAt: number
}

interface RecentBillsTableProps {
  bills: RecentBill[] | undefined
}

export function RecentBillsTable({ bills }: RecentBillsTableProps) {
  const navigate = useNavigate()

  if (bills === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3.5 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (bills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Recent Bills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-10 text-center font-mono text-xs text-muted-foreground">
            No bills yet — create your first bill to see activity here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Recent Bills
        </CardTitle>
        <CardDescription>Last {bills.length} — click to view detail</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">Patient</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">HMO</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-right">Amount</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">Status</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => (
              <TableRow
                key={bill._id}
                className="cursor-pointer"
                onClick={() => navigate(ROUTES.BILL_DETAIL.replace(":billId", bill._id))}
              >
                <TableCell className="font-medium">{bill.patientName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {bill.hmoName ?? "Self-Pay"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(bill.totalAmount)}
                </TableCell>
                <TableCell>
                  <BillStatusBadge status={bill.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateShort(bill.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
