import { useState, useEffect } from "react";
import { useTransactions } from "@/hooks/use-transactions";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Account, TransactionFilterCategory } from "@/types";

export function TransactionsPage() {
  const { transactions, pagination, loading, filters, updateFilters, setPage } = useTransactions();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<TransactionFilterCategory[]>([]);

  useEffect(() => {
    api.getAccounts()
      .then((a) => {
        setAccounts(a.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    api.getTransactionFilterCategories({
      accountId: filters.accountId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      search: filters.search,
    })
      .then((res) => {
        setCategories(res.data);

        if (filters.categoryId && !res.data.some((c) => c.id === filters.categoryId)) {
          updateFilters({ categoryId: undefined });
        }
      })
      .catch(console.error);
  }, [filters.accountId, filters.startDate, filters.endDate, filters.search, updateFilters]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>

      <TransactionFilters
        accounts={accounts}
        categories={categories}
        filters={filters}
        onFilterChange={updateFilters}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : (
            <TransactionTable
              transactions={transactions}
              pagination={pagination}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
