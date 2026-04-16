import { useCallback, useEffect, useState } from "react";
import { useTransactions } from "@/hooks/use-transactions";
import { TransactionImportDialog } from "@/components/transactions/TransactionImportDialog";
import { RecategorizeDialog } from "@/components/transactions/RecategorizeDialog";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Account, Category, Transaction, TransactionFilterCategory, TransactionImportResult } from "@/types";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const LOADING_ROW_KEYS = ['tx-loading-1', 'tx-loading-2', 'tx-loading-3', 'tx-loading-4', 'tx-loading-5', 'tx-loading-6', 'tx-loading-7', 'tx-loading-8'] as const;

export function TransactionsPage() {
  const { transactions, pagination, loading, filters, updateFilters, setPage, refresh } = useTransactions();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filterCategories, setFilterCategories] = useState<TransactionFilterCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [recategorizeOpen, setRecategorizeOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const loadAccounts = useCallback(async () => {
    const response = await api.getAccounts();
    setAccounts(response.data);
  }, []);

  const loadCategories = useCallback(async () => {
    const response = await api.getTransactionFilterCategories({
      accountId: filters.accountId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      search: filters.search,
    });

    setFilterCategories(response.data);

    if (filters.categoryId && !response.data.some((category) => category.id === filters.categoryId)) {
      updateFilters({ categoryId: undefined });
    }
  }, [filters.accountId, filters.categoryId, filters.endDate, filters.search, filters.startDate, updateFilters]);

  const loadAllCategories = useCallback(async () => {
    const response = await api.getCategories();
    setCategories(response.data);
  }, []);

  useEffect(() => {
    loadAccounts().catch(console.error);
  }, [loadAccounts]);

  useEffect(() => {
    loadCategories().catch(console.error);
  }, [loadCategories]);

  useEffect(() => {
    loadAllCategories().catch(console.error);
  }, [loadAllCategories]);

  const handleImported = async (result: TransactionImportResult) => {
    await Promise.all([refresh(), loadAccounts(), loadCategories()]);

    const createdCount = result.accounts.filter((account) => account.created).length;
    const destinationLabel = result.accounts.length > 1
      ? `${result.accounts.length} accounts updated${createdCount > 0 ? ` (${createdCount} created)` : ''}`
      : result.account
        ? `${result.account.name} ${result.account.created ? 'created' : 'updated'}`
        : 'Import completed';

    toast.success('Transactions imported', {
      description: `${result.importedCount} added, ${result.skippedCount} skipped from ${result.parsedCount} parsed. ${destinationLabel}.`,
    });
  };

  const handleRecategorizationApplied = async (result: { scope: string; appliedPastCount: number; futureRuleCreated: boolean }) => {
    await Promise.all([refresh(), loadCategories()]);
    const details = [
      result.scope === 'single-instance' ? 'Updated this transaction.' : `Updated ${result.appliedPastCount} past transactions.`,
      result.futureRuleCreated ? 'Future matches will auto-categorize.' : null,
    ].filter(Boolean).join(' ');
    toast.success('Category updated', { description: details });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
        <Button onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" /> Import File
        </Button>
      </div>

        <TransactionFilters
          accounts={accounts}
          categories={filterCategories}
          filters={filters}
          onFilterChange={updateFilters}
        />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {LOADING_ROW_KEYS.map((key) => <Skeleton key={key} className="h-12 rounded" />)}
            </div>
          ) : (
            <TransactionTable
              transactions={transactions}
              pagination={pagination}
              onPageChange={setPage}
              onCategoryClick={(transactionId) => {
                const selected = transactions.find((tx) => tx.id === transactionId) ?? null;
                setSelectedTransaction(selected);
                setRecategorizeOpen(Boolean(selected));
              }}
            />
          )}
        </CardContent>
      </Card>

      <TransactionImportDialog
        open={importOpen}
        accounts={accounts}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />
      <RecategorizeDialog
        open={recategorizeOpen}
        transaction={selectedTransaction}
        categories={categories}
        onClose={() => {
          setRecategorizeOpen(false);
          setSelectedTransaction(null);
        }}
        onApplied={handleRecategorizationApplied}
      />
    </div>
  );
}
