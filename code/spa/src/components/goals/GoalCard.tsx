import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent, formatDate } from "@/lib/formatters";
import type { Goal, GoalStatus } from "@/types";

interface GoalCardProps {
  goal: Goal;
  onClick: (goal: Goal) => void;
}

const STATUS_COLORS: Record<GoalStatus, string> = {
  ACTIVE: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export function GoalCard({ goal, onClick }: Readonly<GoalCardProps>) {
  const isComplete = goal.percentComplete >= 100;

  return (
    <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onClick(goal)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold">{goal.name}</h3>
            {goal.targetDate && (
              <p className="text-xs text-muted-foreground">Target: {formatDate(goal.targetDate)}</p>
            )}
          </div>
          <Badge className={STATUS_COLORS[goal.status] || ''} variant="secondary">
            {goal.status}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
            </span>
          </div>
          <Progress
            value={Math.min(goal.percentComplete, 100)}
            className={`h-2.5 ${isComplete ? '[&>div]:bg-emerald-500' : ''}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatPercent(goal.percentComplete)} complete</span>
            <span>
              {isComplete
                ? 'Goal reached!'
                : `${formatCurrency(goal.targetAmount - goal.currentAmount)} to go`}
            </span>
          </div>
        </div>

        {goal.accounts.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">Linked accounts:</p>
            <div className="flex flex-wrap gap-1">
              {goal.accounts.map(a => (
                <Badge key={a.id} variant="outline" className="text-xs">
                  {a.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
