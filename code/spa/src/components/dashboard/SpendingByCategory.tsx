import { Pie, PieChart, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { SpendingByCategory as SpendingData } from "@/types";

interface SpendingByCategoryProps {
  data: SpendingData[];
  className?: string;
  onCategorySelect?: (categoryId: string) => void;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220, 70%, 60%)",
  "hsl(340, 75%, 55%)",
  "hsl(160, 60%, 45%)",
];

export function SpendingByCategory({ data, className, onCategorySelect }: Readonly<SpendingByCategoryProps>) {
  const top = data.slice(0, 8);
  const total = top.reduce((sum, item) => sum + item.total, 0);

  const chartConfig: ChartConfig = {};
  top.forEach((item, i) => {
    chartConfig[item.category.name] = {
      label: item.category.name,
      color: COLORS[i % COLORS.length],
    };
  });

  const chartData = top.map((item, i) => ({
    categoryId: item.category.id,
    name: item.category.name,
    value: item.total,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>
          Where your money goes
          {onCategorySelect ? " • Tap a segment to view transactions" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <ChartContainer config={chartConfig} className="mx-auto h-[220px] sm:h-[250px]">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value))}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              onClick={(_, index) => {
                if (typeof index !== "number") return;
                const categoryId = chartData[index]?.categoryId;
                if (categoryId && onCategorySelect) {
                  onCategorySelect(categoryId);
                }
              }}
              className={cn(onCategorySelect && "cursor-pointer")}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 space-y-2">
          {top.slice(0, 5).map((item, i) => (
            <button
              key={item.category.name}
              type="button"
              className={cn(
                "flex w-full items-center justify-between text-sm",
                onCategorySelect ? "cursor-pointer text-left hover:opacity-90" : "cursor-default"
              )}
              onClick={() => onCategorySelect?.(item.category.id)}
            >
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span>{item.category.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrency(item.total)}</span>
                <span className="text-muted-foreground text-xs">
                  {total > 0 ? `${((item.total / total) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
