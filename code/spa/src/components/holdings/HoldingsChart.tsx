import { Pie, PieChart, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/formatters";
import type { Account } from "@/types";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/types";

interface HoldingsChartProps {
  accounts: Account[];
}

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(220, 70%, 60%)",
];

export function HoldingsChart({ accounts }: HoldingsChartProps) {
  const byType = new Map<string, number>();
  accounts.forEach(a => {
    const label = ACCOUNT_TYPE_LABELS[a.type as AccountType] || a.type;
    byType.set(label, (byType.get(label) || 0) + Math.abs(a.balance));
  });

  const chartData = Array.from(byType.entries())
    .map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }))
    .sort((a, b) => b.value - a.value);

  const chartConfig: ChartConfig = {};
  chartData.forEach(d => {
    chartConfig[d.name] = { label: d.name, color: d.fill };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocation</CardTitle>
        <CardDescription>By account type</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[250px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />} />
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 space-y-2">
          {chartData.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span>{item.name}</span>
              </div>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
