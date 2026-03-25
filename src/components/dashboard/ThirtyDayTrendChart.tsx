import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
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

interface TrendData {
  date: string
  revenue: number
}

interface ThirtyDayTrendChartProps {
  data: TrendData[] | undefined
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

function formatXAxisDate(value: string): string {
  const d = new Date(`${value}T12:00:00.000Z`)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function ThirtyDayTrendChart({ data }: ThirtyDayTrendChartProps) {
  if (data === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3.5 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4">
          <CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            30-Day Revenue Trend
          </CardTitle>
          <CardDescription>Daily collections over the past 30 days</CardDescription>
        </div>
        <div className="flex items-center border-t px-6 py-4 sm:border-t-0 sm:border-l">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              30-Day Total
            </span>
            <span className="font-mono text-2xl font-bold leading-none">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:p-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={formatXAxisDate}
              className="font-mono text-[11px]"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[180px]"
                  nameKey="revenue"
                  labelFormatter={(value: string) =>
                    new Date(`${value}T12:00:00.000Z`).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })
                  }
                  formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                />
              }
            />
            <Line
              dataKey="revenue"
              type="monotone"
              stroke="var(--color-revenue)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
