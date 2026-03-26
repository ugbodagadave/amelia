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
import { isoDateToWeekday } from "@/lib/dashboardStats"
import { formatCurrency } from "@/lib/formatting"

interface SevenDayData {
  date: string
  collections: number
  claimsSubmitted: number
}

interface SevenDayRevenueChartProps {
  data: SevenDayData[] | undefined
}

const chartConfig = {
  collections: {
    label: "Collections",
    color: "var(--chart-1)",
  },
  claimsSubmitted: {
    label: "Claims Submitted",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function SevenDayRevenueChart({ data }: SevenDayRevenueChartProps) {
  if (data === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          7-Day Revenue Trend
        </CardTitle>
        <CardDescription>Daily collections vs. claims submitted</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12, top: 4 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => isoDateToWeekday(value)}
              className="font-mono text-[11px]"
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    if (name === "collections") {
                      return [formatCurrency(Number(value)), "Collections"]
                    }
                    return [`${value} batch${Number(value) === 1 ? "" : "es"}`, "Claims Submitted"]
                  }}
                />
              }
            />
            <Line
              dataKey="collections"
              type="monotone"
              stroke="var(--color-collections)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="claimsSubmitted"
              type="monotone"
              stroke="var(--color-claimsSubmitted)"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 3"
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
