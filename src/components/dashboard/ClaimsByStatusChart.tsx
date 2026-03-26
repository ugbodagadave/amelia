import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts"
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

interface ClaimStatusData {
  status: string
  count: number
}

interface ClaimsByStatusChartProps {
  data: ClaimStatusData[] | undefined
}

const STATUS_ORDER = ["draft", "submitted", "paid", "overdue"] as const

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  paid: "Paid",
  overdue: "Overdue",
}

const chartConfig = {
  count: {
    label: "Claims",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ClaimsByStatusChart({ data }: ClaimsByStatusChartProps) {
  if (data === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3.5 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((sum, d) => sum + d.count, 0)

  const chartData = STATUS_ORDER.map((s) => {
    const found = data.find((d) => d.status === s)
    return {
      status: STATUS_LABELS[s] ?? s,
      count: found?.count ?? 0,
      fill: `var(--chart-${s === "overdue" ? "destructive" : s === "draft" ? "3" : s === "submitted" ? "2" : "1"})`,
    }
  })

  // Map overdue to destructive, others to chart variables
  const coloredData = chartData.map((d, i) => {
    const fills = [
      "var(--chart-3)", // draft
      "var(--chart-2)", // submitted
      "var(--chart-1)", // paid
      "var(--destructive)", // overdue
    ]
    return { ...d, fill: fills[i] }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Claims by Status
        </CardTitle>
        <CardDescription>
          {total} claim batch{total === 1 ? "" : "es"} total
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart accessibilityLayer data={coloredData} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="status"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              className="font-mono text-xs"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" radius={4} isAnimationActive={false}>
              <LabelList
                position="top"
                offset={8}
                className="fill-muted-foreground font-mono text-xs"
                formatter={(value) =>
                  typeof value === "number" && value === 0 ? "" : value
                }
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
