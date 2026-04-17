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
import dashboardHero from "@/assets/doughray-hero.png";
import { BRAND } from "@/lib/brand";

const LOADING_CARD_KEYS = ['dashboard-loading-1', 'dashboard-loading-2', 'dashboard-loading-3', 'dashboard-loading-4'] as const;

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
          <h2 className="text-2xl font-bold tracking-tight">{BRAND.name} Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {LOADING_CARD_KEYS.map((key) => (
            <Skeleton key={key} className="h-[120px] rounded-xl" />
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
      <div className="relative overflow-hidden rounded-2xl border border-border/70">
        <img
          src={dashboardHero}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/60" />
        <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{BRAND.name} command deck</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h2>
            <p className="mt-1 text-sm text-muted-foreground">{BRAND.tagline}</p>
          </div>
          <DateRangeFilter
            accounts={accounts}
            selectedAccountId={selectedAccount}
            onAccountChange={setSelectedAccount}
            period={period}
            onPeriodChange={setPeriod}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">Snapshot</h3>
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
