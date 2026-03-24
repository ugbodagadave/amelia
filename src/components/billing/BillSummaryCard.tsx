import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  calculateBillSummary,
  type InvestigationFormItem,
  type MedicationFormItem,
} from "@/lib/billing"

function formatCurrency(value: number) {
  return value.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  })
}

export function BillSummaryCard({
  paymentType,
  investigations,
  medications,
}: {
  paymentType: "self_pay" | "hmo"
  investigations: InvestigationFormItem[]
  medications: MedicationFormItem[]
}) {
  const summary = calculateBillSummary({
    paymentType,
    investigations,
    medications,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-base">Bill summary</CardTitle>
        <CardDescription>Totals recalculate as line items change.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Investigations</span>
          <span className="font-mono">{formatCurrency(summary.investigationsTotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Medications</span>
          <span className="font-mono">{formatCurrency(summary.medicationsTotal)}</span>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="font-medium">Grand total</span>
          <span className="font-mono text-lg">{formatCurrency(summary.totalAmount)}</span>
        </div>
        {paymentType === "hmo" ? (
          <>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>HMO deduction (10%)</span>
              <span className="font-mono">{formatCurrency(summary.hmoDeduction)}</span>
            </div>
            <div className="flex items-center justify-between rounded-none border bg-muted/30 p-3">
              <span className="font-medium">Expected receivable</span>
              <span className="font-mono text-base">{formatCurrency(summary.expectedReceivable)}</span>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
