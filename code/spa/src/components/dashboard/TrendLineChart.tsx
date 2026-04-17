import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { TrendDataPoint } from "@/types";

interface TrendLineChartProps {
  data: TrendDataPoint[];
  title?: string;
  description?: string;
  className?: string;
  onPointSelect?: (date: string) => void;
}

const chartConfig = {
  value: {
    label: "Net Worth",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type TrendChartClickState = {
  activePayload?: Array<{
    payload?: TrendDataPoint;
  }>;
};

export function TrendLineChart({
  data,
  title = "Net Worth Trend",
  description = "Your net worth over time",
  className,
  onPointSelect,
}: Readonly<TrendLineChartProps>) {
  const handleChartClick = (state: TrendChartClickState) => {
    const date = state.activePayload?.[0]?.payload?.date;
    if (date && onPointSelect) {
      onPointSelect(date);
    }
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description}
          {onPointSelect ? " • Tap a point to view related transactions" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <ChartContainer
          config={chartConfig}
          className={cn(
            "h-[240px] w-full sm:h-[280px]",
            onPointSelect && "[&_.recharts-surface]:cursor-pointer"
          )}
        >
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} onClick={handleChartClick}>
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short' });
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, "Net Worth"]}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              fill="url(#fillValue)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
