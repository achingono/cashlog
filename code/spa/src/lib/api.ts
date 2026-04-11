const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(error.error?.message || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Dashboard
  getDashboardSummary: () => request<{ data: import('../types').DashboardSummary }>('/dashboard/summary'),
  getDashboardTrends: (period = 6, accountId?: string) => {
    const params = new URLSearchParams({ period: String(period) });
    if (accountId) params.set('accountId', accountId);
    return request<{ data: import('../types').TrendDataPoint[] }>(`/dashboard/trends?${params}`);
  },
  getSpendingByCategory: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return request<{ data: import('../types').SpendingByCategory[] }>(`/dashboard/spending-by-category?${params}`);
  },

  // Accounts
  getAccounts: () => request<{ data: import('../types').Account[] }>('/accounts'),
  getAccount: (id: string) => request<{ data: import('../types').AccountDetail }>(`/accounts/${id}`),

  // Transactions
  getTransactions: (params: {
    accountId?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) searchParams.set(k, String(v)); });
    return request<import('../types').PaginatedResponse<import('../types').Transaction>>(`/transactions?${searchParams}`);
  },
  updateTransactionCategory: (id: string, categoryId: string) =>
    request(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify({ categoryId }) }),

  // Holdings
  getHoldings: () => request<{ data: import('../types').HoldingsSummary }>('/holdings'),
  getHoldingsHistory: (period = 12) => request<{ data: import('../types').TrendDataPoint[] }>(`/holdings/history?period=${period}`),

  // Budgets
  getBudgets: () => request<{ data: import('../types').Budget[] }>('/budgets'),
  createBudget: (data: { categoryId: string; amount: number; period: string; startDate: string; endDate?: string }) =>
    request('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  updateBudget: (id: string, data: any) =>
    request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBudget: (id: string) =>
    request(`/budgets/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request<{ data: import('../types').Category[] }>('/categories'),
  createCategory: (data: { name: string; icon?: string; color?: string; parentId?: string }) =>
    request('/categories', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getReports: (page = 1, limit = 10) => request<import('../types').PaginatedResponse<import('../types').Report>>(`/reports?page=${page}&limit=${limit}`),
  getReport: (id: string) => request<{ data: import('../types').Report }>(`/reports/${id}`),

  // Sync
  getSyncStatus: () => request<{ data: import('../types').SyncStatus | null }>('/sync/status'),
  getSyncHistory: (limit = 10) => request<{ data: import('../types').SyncStatus[] }>(`/sync/history?limit=${limit}`),
  triggerSync: () => request('/sync/trigger', { method: 'POST' }),
};
