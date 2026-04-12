import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { Pencil, Trash2 } from "lucide-react";
import type { Budget } from "@/types";

interface BudgetCardProps {
  budget: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}

const PERIOD_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const isOver = budget.percentUsed > 100;
  const isWarning = budget.percentUsed > 80 && budget.percentUsed <= 100;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold">{budget.categoryName}</h3>
            <p className="text-xs text-muted-foreground">{PERIOD_LABELS[budget.period] || budget.period}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(budget)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(budget.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={isOver ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
              {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)}
            </span>
          </div>
          <Progress
            value={Math.min(budget.percentUsed, 100)}
            className={`h-2.5 ${isOver ? '[&>div]:bg-red-500' : isWarning ? '[&>div]:bg-yellow-500' : ''}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatPercent(budget.percentUsed)} used</span>
            <span className={isOver ? 'text-red-600 font-medium' : ''}>
              {isOver ? `${formatCurrency(Math.abs(budget.remaining))} over` : `${formatCurrency(budget.remaining)} left`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
