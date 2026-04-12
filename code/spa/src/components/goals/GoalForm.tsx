import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import type { Account, Goal } from "@/types";

const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.coerce.number().positive("Target amount must be positive"),
  targetDate: z.string().optional(),
  notes: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface GoalFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  goal?: Goal | null;
}

export function GoalForm({ open, onClose, onSubmit, goal }: GoalFormProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: goal ? {
      name: goal.name,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate?.split('T')[0] || '',
      notes: goal.notes || '',
    } : {
      name: '',
      targetAmount: 0,
      targetDate: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      api.getAccounts()
        .then(res => setAccounts(res.data))
        .catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    if (goal) {
      reset({
        name: goal.name,
        targetAmount: goal.targetAmount,
        targetDate: goal.targetDate?.split('T')[0] || '',
        notes: goal.notes || '',
      });
      setSelectedAccountIds(goal.accounts.map(a => a.id));
    } else {
      reset({ name: '', targetAmount: 0, targetDate: '', notes: '' });
      setSelectedAccountIds([]);
    }
  }, [goal, reset]);

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
    );
  };

  const handleFormSubmit = async (values: GoalFormValues) => {
    await onSubmit({
      ...values,
      targetDate: values.targetDate ? new Date(values.targetDate).toISOString() : undefined,
      accountIds: selectedAccountIds,
    });
    reset();
    setSelectedAccountIds([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); setSelectedAccountIds([]); onClose(); } }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Create Goal'}</DialogTitle>
          <DialogDescription>
            {goal ? 'Update your savings goal.' : 'Set a savings target and link accounts to track progress.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name</Label>
            <Input id="name" placeholder="e.g. Emergency Fund" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Target Amount ($)</Label>
              <Input id="targetAmount" type="number" step="0.01" {...register("targetAmount")} />
              {errors.targetAmount && <p className="text-xs text-red-500">{errors.targetAmount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date</Label>
              <Input id="targetDate" type="date" {...register("targetDate")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" placeholder="Optional description" {...register("notes")} />
          </div>

          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label>Link Accounts</Label>
              <p className="text-xs text-muted-foreground">Progress is tracked from linked account balances.</p>
              <div className="space-y-2 max-h-[160px] overflow-y-auto border rounded-md p-3">
                {accounts.map(account => (
                  <div key={account.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`account-${account.id}`}
                      checked={selectedAccountIds.includes(account.id)}
                      onCheckedChange={() => toggleAccount(account.id)}
                    />
                    <label htmlFor={`account-${account.id}`} className="text-sm cursor-pointer flex-1">
                      {account.name}
                      {account.institution && <span className="text-muted-foreground ml-1">({account.institution})</span>}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); setSelectedAccountIds([]); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (goal ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
