import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS, type AccountDetail as AccountDetailType } from "@/types";
import { api } from "@/lib/api";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

interface AccountDetailProps {
  accountId: string | null;
  open: boolean;
  onClose: () => void;
  onBalanceAdjusted?: () => Promise<void> | void;
}

const LOADING_ROW_KEYS = ['account-detail-loading-1', 'account-detail-loading-2', 'account-detail-loading-3', 'account-detail-loading-4', 'account-detail-loading-5'] as const;

export function AccountDetail({ accountId, open, onClose, onBalanceAdjusted }: Readonly<AccountDetailProps>) {
  const [account, setAccount] = useState<AccountDetailType | null>(null);
  const [loading, setLoading] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [balance, setBalance] = useState('');
  const [availableBalance, setAvailableBalance] = useState('');
  const [balanceDate, setBalanceDate] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAccount = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const response = await api.getAccount(accountId);
      setAccount(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accountId || !open) return;
    loadAccount();
  }, [accountId, open]);

  useEffect(() => {
    if (!adjustOpen || !account) return;
    setBalance(String(account.balance));
    setAvailableBalance(account.availableBalance === null ? '' : String(account.availableBalance));
    setBalanceDate(account.balanceDate.split('T')[0] || '');
    setAdjustError(null);
  }, [adjustOpen, account]);

  const handleAdjustSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedBalance = Number(balance);
    if (!Number.isFinite(parsedBalance)) {
      setAdjustError('Enter a valid balance.');
      return;
    }

    if (availableBalance.trim() && !Number.isFinite(Number(availableBalance))) {
      setAdjustError('Enter a valid available balance or leave it blank.');
      return;
    }

    setAdjustError(null);
    setIsSubmitting(true);
    try {
      if (!account) return;
      const response = await api.updateAccountBalance(account.id, {
        balance: parsedBalance,
        availableBalance: availableBalance.trim() ? Number(availableBalance) : null,
        balanceDate: balanceDate ? new Date(`${balanceDate}T00:00:00.000Z`).toISOString() : undefined,
      });
      setAccount(response.data);
      setAdjustOpen(false);
      await onBalanceAdjusted?.();
      toast.success('Balance adjusted');
    } catch (err: any) {
      setAdjustError(err.message || 'Failed to update balance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{account?.name || 'Account Details'}</SheetTitle>
          <SheetDescription>{account?.institution || 'Loading...'}</SheetDescription>
        </SheetHeader>

        {loading || !account ? (
          <div className="space-y-4 mt-6">
            {LOADING_ROW_KEYS.map((key) => <div key={key} className="h-8 bg-muted animate-pulse rounded" />)}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-xl font-bold">{formatCurrency(account.balance)}</p>
                <p className="text-xs text-muted-foreground mt-1">As of {formatDate(account.balanceDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant="outline">{ACCOUNT_TYPE_LABELS[account.type]}</Badge>
              </div>
              {account.availableBalance !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="text-lg font-semibold">{formatCurrency(account.availableBalance)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-lg font-semibold">{account.transactionCount}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setAdjustOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Adjust Balance
              </Button>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3">Recent Transactions</h4>
              {account.recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions yet.</p>
              ) : (
                <div className="space-y-2">
                  {account.recentTransactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-1.5">
                      <div>
                        <p className="text-sm">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.posted)}</p>
                      </div>
                      <span className={`text-sm font-medium ${t.amount >= 0 ? 'text-emerald-600' : ''}`}>
                        {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
    <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Adjust Account Balance</DialogTitle>
          <DialogDescription>
            Overwrite the stored account balance to match current institution data without changing historical transactions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-balance">Current Balance</Label>
            <Input id="account-balance" type="number" step="0.01" value={balance} onChange={(event) => setBalance(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-available-balance">Available Balance</Label>
            <Input id="account-available-balance" type="number" step="0.01" value={availableBalance} onChange={(event) => setAvailableBalance(event.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-balance-date">Balance Date</Label>
            <Input id="account-balance-date" type="date" value={balanceDate} onChange={(event) => setBalanceDate(event.target.value)} />
          </div>
          {adjustError && <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{adjustError}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAdjustOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Balance'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
