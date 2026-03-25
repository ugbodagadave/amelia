import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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

const chartConfig = {
  draft: {
    label: "Draft",
    color: "var(--chart-3)",
  },
  submitted: {
    label: "Submitted",
    color: "var(--chart-2)",
  },
  paid: {
    label: "Paid",
    color: "var(--chart-1)",
  },
  overdue: {
    label: "Overdue",
    color: "var(--destructive)",
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

  // Pivot [{status, count}] into a single stacked-bar row
  const chartData = [
    Object.fromEntries([
      ["period", "Claims"],
      ...data.map((d) => [d.status, d.count]),
    ]),
  ]

  const total = data.reduce((sum, d) => sum + d.count, 0)

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
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="period"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              className="font-mono text-xs"
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="draft" stackId="a" fill="var(--color-draft)" radius={[0, 0, 2, 2]} />
            <Bar dataKey="submitted" stackId="a" fill="var(--color-submitted)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="paid" stackId="a" fill="var(--color-paid)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="overdue" stackId="a" fill="var(--color-overdue)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
