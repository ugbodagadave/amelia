import { useDeferredValue, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "convex/react"
import { FunnelIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"
import { api } from "../../convex/_generated/api"
import { ROUTES } from "@/constants/routes"
import { BILL_FILTER_TABS, type BillStatus } from "@/lib/billing"
import { BillStatusBadge } from "@/components/billing/BillStatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function buildBillDetailPath(billId: string) {
  return ROUTES.BILL_DETAIL.replace(":billId", billId)
}

import { formatCurrency } from "@/lib/formatting"

export function BillsPage() {
  const bills = useQuery(api.bills.list)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | BillStatus>("all")
  const deferredSearch = useDeferredValue(searchTerm.trim().toLowerCase())
  const navigate = useNavigate()

  if (bills === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xl">Bills</CardTitle>
          <CardDescription>Loading the clinic billing pipeline.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-muted-foreground">
          <Spinner />
          <span>Fetching saved bills...</span>
        </CardContent>
      </Card>
    )
  }

  const filteredBills = bills.filter((bill) => {
    const matchesStatus = statusFilter === "all" ? true : bill.status === statusFilter
    const haystack = `${bill.patientName} ${bill.hmoName ?? ""} ${bill.diagnosis}`.toLowerCase()
    const matchesSearch = deferredSearch ? haystack.includes(deferredSearch) : true
    return matchesStatus && matchesSearch
  })

  const counts = Object.fromEntries(
    BILL_FILTER_TABS.map((tab) => [
      tab.value,
      tab.value === "all" ? bills.length : bills.filter((bill) => bill.status === tab.value).length,
    ]),
  ) as Record<"all" | BillStatus, number>

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-2">
          <CardTitle className="font-mono text-xl">Bills</CardTitle>
          <CardDescription>
            Track every patient bill, auth checkpoint, and payment-ready record in one queue.
          </CardDescription>
        </div>
        <CardAction className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="relative min-w-0 flex-1 sm:w-72">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by patient, HMO, or diagnosis"
              className="pl-10"
            />
          </div>
          <Button asChild>
            <Link to={ROUTES.BILLS_NEW}>
              <PlusIcon data-icon="inline-start" />
              New Bill
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | BillStatus)}>
          <TabsList variant="line" className="flex w-full flex-wrap justify-start">
            {BILL_FILTER_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                <span>{tab.label}</span>
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-muted px-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {counts[tab.value]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={statusFilter} className="mt-4">
            {filteredBills.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FunnelIcon />
                  </EmptyMedia>
                  <EmptyTitle>No bills in this view</EmptyTitle>
                  <EmptyDescription>
                    Create the first bill or switch filters to inspect another billing state.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild>
                    <Link to={ROUTES.BILLS_NEW}>
                      <PlusIcon data-icon="inline-start" />
                      Create bill
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="overflow-hidden border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Auth</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => (
                      <TableRow
                        key={bill._id}
                        className="cursor-pointer"
                        onClick={() => navigate(buildBillDetailPath(bill._id))}
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{bill.patientName}</span>
                            <span className="text-muted-foreground">
                              {bill.paymentType === "hmo" ? bill.hmoName ?? "HMO" : "Self-pay"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{bill.diagnosis}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(bill.totalAmount)}</TableCell>
                        <TableCell>
                          <BillStatusBadge status={bill.status} />
                        </TableCell>
                        <TableCell>
                          {bill.paymentType === "hmo" ? (
                            bill.authorizationCode ? (
                              <Badge variant="default">Confirmed</Badge>
                            ) : (
                              <Badge variant="destructive">Missing</Badge>
                            )
                          ) : (
                            <Badge variant="secondary">N/A</Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(bill.createdAt).toLocaleDateString("en-NG")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
