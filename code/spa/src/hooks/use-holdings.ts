import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { HoldingsSummary, TrendDataPoint } from '../types';

export function useHoldings() {
  const [holdings, setHoldings] = useState<HoldingsSummary | null>(null);
  const [history, setHistory] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getHoldings(),
      api.getHoldingsHistory(),
    ])
      .then(([holdingsRes, historyRes]) => {
        setHoldings(holdingsRes.data);
        setHistory(historyRes.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { holdings, history, loading, error };
}
