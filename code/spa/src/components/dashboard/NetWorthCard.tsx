import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import type { DashboardSummary } from "@/types";

interface NetWorthCardProps {
  summary: DashboardSummary;
}

export function NetWorthCard({ summary }: Readonly<NetWorthCardProps>) {
  const isPositiveNet = summary.monthlyNet >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="col-span-full lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(summary.netWorth)}</div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-muted-foreground">
              Assets: <span className="text-foreground font-medium">{formatCurrency(summary.totalAssets)}</span>
            </span>
            <span className="text-muted-foreground">
              Liabilities: <span className="text-foreground font-medium">{formatCurrency(summary.totalLiabilities)}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(summary.monthlyIncome)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.monthlyExpenses)}
          </div>
          <div className={`flex items-center gap-1 text-xs mt-1 ${isPositiveNet ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositiveNet ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{formatCurrency(Math.abs(summary.monthlyNet))} net</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
