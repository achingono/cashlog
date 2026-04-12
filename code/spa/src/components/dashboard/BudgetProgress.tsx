import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { Budget } from "@/types";

interface BudgetProgressProps {
  budgets: Budget[];
}

export function BudgetProgress({ budgets }: Readonly<BudgetProgressProps>) {
  if (budgets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Progress</CardTitle>
          <CardDescription>Track your spending limits</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No budgets set. Create one in Settings to track spending.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Progress</CardTitle>
        <CardDescription>This month's spending vs. limits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.map((budget) => {
          const isOver = budget.percentUsed > 100;
          return (
            <div key={budget.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{budget.categoryName}</span>
                <span className={`text-xs ${isOver ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                  {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                </span>
              </div>
              <Progress
                value={Math.min(budget.percentUsed, 100)}
                className={`h-2 ${isOver ? '[&>div]:bg-red-500' : ''}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatPercent(budget.percentUsed)} used</span>
                <span>{isOver ? `${formatCurrency(Math.abs(budget.remaining))} over` : `${formatCurrency(budget.remaining)} left`}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
