import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { Asset } from '../types';

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(() => {
    setLoading(true);
    api.getAssets()
      .then(res => setAssets(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const createAsset = async (data: {
    name: string;
    type?: string;
    purchasePrice: number;
    currentValue: number;
    purchaseDate?: string;
    address?: string;
    metadata?: Record<string, any>;
  }) => {
    const res = await api.createAsset(data);
    setAssets(prev => [...prev, res.data]);
    return res.data;
  };

  const updateAsset = async (id: string, data: any) => {
    const res = await api.updateAsset(id, data);
    setAssets(prev => prev.map(a => a.id === id ? res.data : a));
    return res.data;
  };

  const deleteAsset = async (id: string) => {
    await api.deleteAsset(id);
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const addValuation = async (id: string, data: { value: number; source?: string }) => {
    const res = await api.addAssetValuation(id, data);
    // Refresh assets to get updated currentValue
    fetchAssets();
    return res.data;
  };

  return { assets, loading, error, createAsset, updateAsset, deleteAsset, addValuation, refetch: fetchAssets };
}
