import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { Budget } from '../types';

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(() => {
    setLoading(true);
    api.getBudgets()
      .then(res => setBudgets(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const createBudget = async (data: { categoryId: string; amount: number; period: string; startDate: string; endDate?: string }) => {
    await api.createBudget(data);
    fetchBudgets();
  };

  const updateBudget = async (id: string, data: any) => {
    await api.updateBudget(id, data);
    fetchBudgets();
  };

  const deleteBudget = async (id: string) => {
    await api.deleteBudget(id);
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  return { budgets, loading, error, createBudget, updateBudget, deleteBudget, refetch: fetchBudgets };
}
