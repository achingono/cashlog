import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { Goal } from '../types';

export function useGoals(statusFilter?: string) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(() => {
    setLoading(true);
    api.getGoals(statusFilter)
      .then(res => setGoals(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const createGoal = async (data: {
    name: string;
    targetAmount: number;
    targetDate?: string;
    icon?: string;
    color?: string;
    notes?: string;
    accountIds?: string[];
  }) => {
    const res = await api.createGoal(data);
    setGoals(prev => [...prev, res.data]);
    return res.data;
  };

  const updateGoal = async (id: string, data: any) => {
    const res = await api.updateGoal(id, data);
    setGoals(prev => prev.map(g => g.id === id ? res.data : g));
    return res.data;
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await api.updateGoalStatus(id, status);
    setGoals(prev => prev.map(g => g.id === id ? res.data : g));
    return res.data;
  };

  const deleteGoal = async (id: string) => {
    await api.deleteGoal(id);
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  return { goals, loading, error, createGoal, updateGoal, updateStatus, deleteGoal, refetch: fetchGoals };
}
