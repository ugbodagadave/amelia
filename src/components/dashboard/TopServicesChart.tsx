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

interface ServiceData {
  serviceName: string
  totalRevenue: number
}

interface TopServicesChartProps {
  data: ServiceData[] | undefined
}

const chartConfig = {
  totalRevenue: {
    label: "Revenue",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

const MAX_LABEL_LENGTH = 18

function truncateLabel(name: string): string {
  return name.length > MAX_LABEL_LENGTH ? `${name.slice(0, MAX_LABEL_LENGTH - 1)}…` : name
}

export function TopServicesChart({ data }: TopServicesChartProps) {
  if (data === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
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
            Top Services
          </CardTitle>
          <CardDescription>By revenue (all time)</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="font-mono text-xs text-muted-foreground">No service data yet</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    service: truncateLabel(d.serviceName),
    fullName: d.serviceName,
    totalRevenue: d.totalRevenue,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Top Services
        </CardTitle>
        <CardDescription>By revenue (all time)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: -8, right: 16 }}
          >
            <XAxis type="number" dataKey="totalRevenue" hide />
            <YAxis
              dataKey="service"
              type="category"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              width={120}
              className="font-mono text-[11px]"
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => [
                    formatCurrency(Number(value)),
                    item.payload.fullName as string,
                  ]}
                />
              }
            />
            <Bar
              dataKey="totalRevenue"
              fill="var(--color-totalRevenue)"
              radius={2}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
