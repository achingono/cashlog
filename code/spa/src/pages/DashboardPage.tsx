import { useState } from "react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useAccounts } from "@/hooks/use-accounts";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { TrendLineChart } from "@/components/dashboard/TrendLineChart";
import { SpendingByCategory } from "@/components/dashboard/SpendingByCategory";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPage() {
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [period, setPeriod] = useState("all");
  const accountId = selectedAccount === "all" ? undefined : selectedAccount;
  const { summary, trends, spending, budgets, goals, loading, error } = useDashboard(accountId, period);
  const { accounts } = useAccounts();

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Failed to load dashboard: {error}</p>
      </div>
    );
  }

  if (loading || !summary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-7">
          <Skeleton className="h-[350px] rounded-xl lg:col-span-4" />
          <Skeleton className="h-[350px] rounded-xl lg:col-span-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <DateRangeFilter
          accounts={accounts}
          selectedAccountId={selectedAccount}
          onAccountChange={setSelectedAccount}
          period={period}
          onPeriodChange={setPeriod}
        />
      </div>

      <NetWorthCard summary={summary} />

      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <TrendLineChart data={trends} />
        </div>
        <div className="lg:col-span-3">
          <SpendingByCategory data={spending} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <RecentTransactions accountId={accountId} />
        </div>
        <div className="lg:col-span-3">
          <BudgetProgress budgets={budgets} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <GoalProgress goals={goals} />
        </div>
      </div>
    </div>
  );
}
