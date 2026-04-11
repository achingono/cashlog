import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { DashboardSummary, TrendDataPoint, SpendingByCategory, Budget } from '../types';

export function useDashboard(accountId?: string) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [spending, setSpending] = useState<SpendingByCategory[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getDashboardSummary(),
      api.getDashboardTrends(6, accountId),
      api.getSpendingByCategory(),
      api.getBudgets(),
    ])
      .then(([summaryRes, trendsRes, spendingRes, budgetsRes]) => {
        setSummary(summaryRes.data);
        setTrends(trendsRes.data);
        setSpending(spendingRes.data);
        setBudgets(budgetsRes.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [accountId]);

  return { summary, trends, spending, budgets, loading, error };
}
