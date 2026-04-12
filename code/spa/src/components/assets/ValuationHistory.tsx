import { Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/formatters";
import type { AssetValuation } from "@/types";

interface ValuationHistoryProps {
  valuations: AssetValuation[];
}

const chartConfig: ChartConfig = {
  value: { label: "Value", color: "hsl(var(--chart-1))" },
};

export function ValuationHistory({ valuations }: ValuationHistoryProps) {
  if (valuations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Valuation History</CardTitle>
          <CardDescription>No valuation records yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const data = [...valuations]
    .reverse()
    .map(v => ({
      date: new Date(v.valuedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      value: v.value,
      source: v.source,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Valuation History</CardTitle>
        <CardDescription>{valuations.length} valuations recorded</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <LineChart data={data}>
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tickLine={false} axisLine={false} fontSize={12} width={60} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />} />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
