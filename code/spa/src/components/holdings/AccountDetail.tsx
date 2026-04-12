import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS, type AccountDetail as AccountDetailType } from "@/types";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";

interface AccountDetailProps {
  accountId: string | null;
  open: boolean;
  onClose: () => void;
}

const LOADING_ROW_KEYS = ['account-detail-loading-1', 'account-detail-loading-2', 'account-detail-loading-3', 'account-detail-loading-4', 'account-detail-loading-5'] as const;

export function AccountDetail({ accountId, open, onClose }: Readonly<AccountDetailProps>) {
  const [account, setAccount] = useState<AccountDetailType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountId || !open) return;
    setLoading(true);
    api.getAccount(accountId)
      .then(res => setAccount(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [accountId, open]);

  return (
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
  );
}
