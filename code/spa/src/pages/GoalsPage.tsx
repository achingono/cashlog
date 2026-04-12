import { useState } from "react";
import { useGoals } from "@/hooks/use-goals";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalForm } from "@/components/goals/GoalForm";
import { GoalDetail } from "@/components/goals/GoalDetail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import type { Goal } from "@/types";
import { Target, Plus } from "lucide-react";
import { toast } from "sonner";

const LOADING_SUMMARY_KEYS = ['goal-loading-1', 'goal-loading-2', 'goal-loading-3'] as const;

export function GoalsPage() {
  const { goals, loading, error, createGoal, updateGoal, updateStatus, deleteGoal } = useGoals();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (error) {
    return <div className="flex items-center justify-center h-[50vh]"><p className="text-muted-foreground">Failed to load: {error}</p></div>;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Goals</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {LOADING_SUMMARY_KEYS.map((key) => <Skeleton key={key} className="h-[120px] rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  const activeGoals = goals.filter(g => g.status === 'ACTIVE');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);

  const handleCreate = async (data: any) => {
    try {
      await createGoal(data);
      toast.success('Goal created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create goal');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingGoal) return;
    try {
      await updateGoal(editingGoal.id, data);
      setEditingGoal(null);
      toast.success('Goal updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update goal');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus(id, status);
      setSelectedGoal(prev => prev?.id === id ? { ...prev, status: status as any } : prev);
      toast.success(`Goal ${status.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGoal(id);
      toast.success('Goal deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete goal');
    }
  };

  const handleCardClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Goals</h2>
        <Button onClick={() => { setEditingGoal(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Goal
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Goals</CardDescription>
            <CardTitle className="text-lg">{activeGoals.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{completedGoals.length} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Target</CardDescription>
            <CardTitle className="text-lg">{formatCurrency(totalTarget)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Across active goals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Saved</CardDescription>
            <CardTitle className="text-lg">{formatCurrency(totalSaved)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}% of target</p>
          </CardContent>
        </Card>
      </div>

      {goals.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
          <p className="text-muted-foreground mb-4">Create a savings goal to start tracking your progress.</p>
          <Button onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Goal</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} onClick={handleCardClick} />
          ))}
        </div>
      )}

      <GoalForm
        open={formOpen || !!editingGoal}
        onClose={() => { setFormOpen(false); setEditingGoal(null); }}
        onSubmit={editingGoal ? handleUpdate : handleCreate}
        goal={editingGoal}
      />

      <GoalDetail
        goal={selectedGoal}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />
    </div>
  );
}
