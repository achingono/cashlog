import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { Category, RecategorizeScope, Transaction } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface RecategorizeDialogProps {
  open: boolean;
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onApplied: (result: { scope: RecategorizeScope; appliedPastCount: number; futureRuleCreated: boolean }) => Promise<void> | void;
}

const SCOPE_OPTIONS: Array<{ value: RecategorizeScope; label: string }> = [
  { value: 'single-instance', label: 'This transaction only' },
  { value: 'all-past', label: 'All past matching transactions' },
  { value: 'all-future', label: 'All future matching transactions' },
  { value: 'all-past-and-future', label: 'All past and future matching transactions' },
];

export function RecategorizeDialog({ open, transaction, categories, onClose, onApplied }: Readonly<RecategorizeDialogProps>) {
  const [categoryId, setCategoryId] = useState<string>('');
  const [scope, setScope] = useState<RecategorizeScope>('single-instance');
  const [matchingPastCount, setMatchingPastCount] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leafCategories = useMemo(() => {
    const flattened: Category[] = [];
    const walk = (node: Category) => {
      const children = Array.isArray(node.children) ? node.children : [];
      if (children.length === 0) {
        flattened.push(node);
        return;
      }
      children.forEach((child) => walk(child as Category));
    };
    categories.forEach(walk);
    return flattened.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  useEffect(() => {
    if (!open || !transaction) return;
    setCategoryId(transaction.category?.id ?? '');
    setScope('single-instance');
    setMatchingPastCount(0);
    setError(null);
  }, [open, transaction]);

  useEffect(() => {
    if (!open || !transaction || (scope !== 'all-past' && scope !== 'all-past-and-future')) {
      if (scope === 'single-instance' || scope === 'all-future') setMatchingPastCount(0);
      return;
    }

    setLoadingPreview(true);
    api.getRecategorizePreview(transaction.id, scope)
      .then((response) => {
        setMatchingPastCount(response.data.eligiblePastCount);
      })
      .catch((previewError: any) => {
        setError(previewError.message || 'Failed to preview matching transactions.');
      })
      .finally(() => {
        setLoadingPreview(false);
      });
  }, [open, transaction, scope]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!transaction) return;
    if (!categoryId) {
      setError('Select a category.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await api.recategorizeTransaction(transaction.id, categoryId, scope);
      await onApplied({
        scope,
        appliedPastCount: response.data.appliedPastCount,
        futureRuleCreated: Boolean(response.data.futureRule),
      });
      onClose();
    } catch (submitError: any) {
      setError(submitError.message || 'Failed to recategorize transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Recategorize Transaction</DialogTitle>
          <DialogDescription>
            {transaction
              ? `${transaction.description} • ${formatCurrency(transaction.amount)} • ${formatDate(transaction.posted)}`
              : 'Update category for this transaction and matching recurring instances.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="recategorize-category">New Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="recategorize-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {leafCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Apply To</Label>
            <RadioGroup value={scope} onValueChange={(value) => setScope(value as RecategorizeScope)}>
              {SCOPE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem id={`scope-${option.value}`} value={option.value} />
                  <Label htmlFor={`scope-${option.value}`} className="font-normal">
                    {option.label}
                    {(option.value === 'all-past' || option.value === 'all-past-and-future') && (
                      <span className="text-muted-foreground"> ({loadingPreview ? 'Checking…' : `${matchingPastCount} found`})</span>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {(scope === 'all-future' || scope === 'all-past-and-future') && (
            <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Future matching transactions will be auto-categorized and skipped by AI categorization.
            </p>
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Applying…' : 'Apply'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
