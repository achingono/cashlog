import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatPercent, formatDate } from "@/lib/formatters";
import type { Goal } from "@/types";
import { GOAL_STATUS_LABELS } from "@/types";

interface GoalDetailProps {
  goal: Goal | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

export function GoalDetail({ goal, open, onClose, onStatusChange, onDelete }: Readonly<GoalDetailProps>) {
  if (!goal) return null;

  const isComplete = goal.percentComplete >= 100;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{goal.name}</SheetTitle>
          <SheetDescription>
            {goal.notes || `Target: ${formatCurrency(goal.targetAmount)}`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progress</span>
              <Badge variant="secondary">{GOAL_STATUS_LABELS[goal.status]}</Badge>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{formatPercent(goal.percentComplete)}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
              </p>
            </div>
            <Progress
              value={Math.min(goal.percentComplete, 100)}
              className={`h-3 ${isComplete ? '[&>div]:bg-emerald-500' : ''}`}
            />
            {!isComplete && (
              <p className="text-xs text-center text-muted-foreground">
                {formatCurrency(goal.targetAmount - goal.currentAmount)} remaining
              </p>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            {goal.targetDate && (
              <div>
                <p className="text-sm text-muted-foreground">Target Date</p>
                <p className="text-sm font-medium">{formatDate(goal.targetDate)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm font-medium">{formatDate(goal.createdAt)}</p>
            </div>
          </div>

          {goal.accounts.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">Linked Accounts</h4>
                <div className="space-y-2">
                  {goal.accounts.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-1.5">
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.institution || a.type}</p>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(a.balance)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            {goal.status === 'ACTIVE' && (
              <>
                <Button variant="outline" size="sm" onClick={() => onStatusChange(goal.id, 'PAUSED')}>
                  Pause
                </Button>
                <Button variant="outline" size="sm" onClick={() => onStatusChange(goal.id, 'COMPLETED')}>
                  Mark Complete
                </Button>
              </>
            )}
            {goal.status === 'PAUSED' && (
              <Button variant="outline" size="sm" onClick={() => onStatusChange(goal.id, 'ACTIVE')}>
                Resume
              </Button>
            )}
            {goal.status !== 'CANCELLED' && (
              <Button variant="outline" size="sm" onClick={() => onStatusChange(goal.id, 'CANCELLED')}>
                Cancel
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => { onDelete(goal.id); onClose(); }}>
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
