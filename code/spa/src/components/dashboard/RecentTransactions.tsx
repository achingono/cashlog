import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatShortDate } from "@/lib/formatters";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import type { Transaction } from "@/types";

interface RecentTransactionsProps {
  accountId?: string;
}

const LOADING_ROW_KEYS = ['recent-loading-1', 'recent-loading-2', 'recent-loading-3', 'recent-loading-4', 'recent-loading-5'] as const;

export function RecentTransactions({ accountId }: Readonly<RecentTransactionsProps>) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getTransactions({ limit: 8, accountId })
      .then(res => setTransactions(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [accountId]);

  let content: JSX.Element;
  if (loading) {
    content = (
      <div className="space-y-3">
        {LOADING_ROW_KEYS.map((key) => (
          <div key={key} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  } else if (transactions.length === 0) {
    content = (
      <p className="text-sm text-muted-foreground text-center py-8">
        No transactions yet. Sync your accounts to get started.
      </p>
    );
  } else {
    content = (
      <div className="space-y-3">
        {transactions.map((t) => (
          <div key={t.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                t.amount >= 0 ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-red-100 dark:bg-red-900'
              }`}>
                {t.amount >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium leading-none">{t.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.account.name} · {formatShortDate(t.posted)}
                </p>
              </div>
            </div>
            <span className={`text-sm font-medium ${t.amount >= 0 ? 'text-emerald-600' : ''}`}>
              {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>{accountId ? 'Latest activity for selected account' : 'Latest activity across all accounts'}</CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
