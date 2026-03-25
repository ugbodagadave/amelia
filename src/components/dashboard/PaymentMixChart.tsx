import { Bar, BarChart, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/formatting"

interface PaymentMixData {
  channel: string
  count: number
  totalAmount: number
}

interface PaymentMixChartProps {
  data: PaymentMixData[] | undefined
}

const CHANNEL_LABELS: Record<string, string> = {
  card: "Card",
  opay: "OPay",
  other: "Other",
}

const chartConfig = {
  totalAmount: {
    label: "Total Collected",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function PaymentMixChart({ data }: PaymentMixChartProps) {
  if (data === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3.5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Payment Mix
          </CardTitle>
          <CardDescription>Breakdown by payment channel</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="font-mono text-xs text-muted-foreground">No payments recorded yet</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    channel: CHANNEL_LABELS[d.channel] ?? d.channel,
    totalAmount: d.totalAmount,
    count: d.count,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Payment Mix
        </CardTitle>
        <CardDescription>Breakdown by payment channel</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: -8, right: 16 }}
          >
            <XAxis type="number" dataKey="totalAmount" hide />
            <YAxis
              dataKey="channel"
              type="category"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              className="font-mono text-xs"
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => [
                    formatCurrency(Number(value)),
                    `${item.payload.count} payment${Number(item.payload.count) === 1 ? "" : "s"}`,
                  ]}
                />
              }
            />
            <Bar dataKey="totalAmount" fill="var(--color-totalAmount)" radius={2} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
