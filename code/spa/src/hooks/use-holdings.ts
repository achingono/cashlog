import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { HoldingsSummary, TrendDataPoint } from '../types';

export function useHoldings(period: string = 'all') {
  const [holdings, setHoldings] = useState<HoldingsSummary | null>(null);
  const [history, setHistory] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getHoldings(),
      api.getHoldingsHistory(period),
    ])
      .then(([holdingsRes, historyRes]) => {
        setHoldings(holdingsRes.data);
        setHistory(historyRes.data);

      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [period]);

  return { holdings, history, loading, error };
}
