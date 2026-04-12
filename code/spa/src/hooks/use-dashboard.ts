import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { DashboardSummary, TrendDataPoint, SpendingByCategory, Budget, Goal } from '../types';

export function useDashboard(accountId?: string) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [spending, setSpending] = useState<SpendingByCategory[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getDashboardSummary(),
      api.getDashboardTrends(6, accountId),
      api.getSpendingByCategory(),
      api.getBudgets(),
      api.getGoals('ACTIVE'),
    ])
      .then(([summaryRes, trendsRes, spendingRes, budgetsRes, goalsRes]) => {
        setSummary(summaryRes.data);
        setTrends(trendsRes.data);
        setSpending(spendingRes.data);
        setBudgets(budgetsRes.data);
        setGoals(goalsRes.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [accountId]);

  return { summary, trends, spending, budgets, goals, loading, error };
}
