import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccounts } from './use-accounts';
import { useAssets } from './use-assets';
import { useBudgets } from './use-budgets';
import { useDashboard } from './use-dashboard';
import { useGoals } from './use-goals';
import { useHoldings } from './use-holdings';
import { useIsMobile } from './use-mobile';
import { useTransactions } from './use-transactions';

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    getAccounts: vi.fn(),
    getDashboardSummary: vi.fn(),
    getDashboardTrends: vi.fn(),
    getSpendingByCategory: vi.fn(),
    getBudgets: vi.fn(),
    getGoals: vi.fn(),
    getTransactions: vi.fn(),
    getAssets: vi.fn(),
    createAsset: vi.fn(),
    updateAsset: vi.fn(),
    deleteAsset: vi.fn(),
    addAssetValuation: vi.fn(),
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    updateGoalStatus: vi.fn(),
    deleteGoal: vi.fn(),
    getHoldings: vi.fn(),
    getHoldingsHistory: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({ api: apiMock }));

describe('SPA hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useAccounts loads accounts data', async () => {
    apiMock.getAccounts.mockResolvedValue({ data: [{ id: 'a1', name: 'Checking' }] });
    const { result } = renderHook(() => useAccounts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accounts).toEqual([{ id: 'a1', name: 'Checking' }]);
    expect(result.current.error).toBeNull();
  });

  it('useDashboard loads dashboard datasets', async () => {
    apiMock.getDashboardSummary.mockResolvedValue({ data: { netWorth: 1000 } });
    apiMock.getDashboardTrends.mockResolvedValue({ data: [{ date: '2026-01-01', value: 1000 }] });
    apiMock.getSpendingByCategory.mockResolvedValue({ data: [{ total: 200 }] });
    apiMock.getBudgets.mockResolvedValue({ data: [{ id: 'b1' }] });
    apiMock.getGoals.mockResolvedValue({ data: [{ id: 'g1' }] });

    const { result } = renderHook(() => useDashboard('a1', '6'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary).toEqual({ netWorth: 1000 });
    expect(result.current.trends).toEqual([{ date: '2026-01-01', value: 1000 }]);
    expect(apiMock.getSpendingByCategory).toHaveBeenCalledWith(expect.any(String), undefined, 'a1');
  });

  it('useTransactions supports updating filters and pagination', async () => {
    apiMock.getTransactions.mockResolvedValue({
      data: [{ id: 't1' }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useTransactions({ search: 'coffee' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.transactions).toEqual([{ id: 't1' }]);

    await act(async () => {
      result.current.updateFilters({ accountId: 'a1' });
    });
    expect(result.current.filters.accountId).toBe('a1');

    await act(async () => {
      result.current.setPage(2);
      await result.current.refresh();
    });
    expect(apiMock.getTransactions).toHaveBeenCalled();
  });

  it('useAssets supports CRUD operations', async () => {
    apiMock.getAssets.mockResolvedValue({ data: [{ id: 'asset1', name: 'House' }] });
    apiMock.createAsset.mockResolvedValue({ data: { id: 'asset2', name: 'Stock' } });
    apiMock.updateAsset.mockResolvedValue({ data: { id: 'asset2', name: 'Stock Updated' } });
    apiMock.deleteAsset.mockResolvedValue(undefined);
    apiMock.addAssetValuation.mockResolvedValue({ data: { id: 'val1', value: 123 } });

    const { result } = renderHook(() => useAssets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assets).toHaveLength(1);

    await act(async () => {
      await result.current.createAsset({ name: 'Stock', purchasePrice: 100, currentValue: 110 });
    });
    expect(result.current.assets).toHaveLength(2);

    await act(async () => {
      await result.current.updateAsset('asset2', { name: 'Stock Updated' });
    });
    expect(result.current.assets.find((a) => a.id === 'asset2')?.name).toBe('Stock Updated');

    await act(async () => {
      await result.current.deleteAsset('asset1');
    });
    expect(result.current.assets.find((a) => a.id === 'asset1')).toBeUndefined();

    await act(async () => {
      await result.current.addValuation('asset2', { value: 120 });
    });
    expect(apiMock.addAssetValuation).toHaveBeenCalledWith('asset2', { value: 120 });
  });

  it('useBudgets supports refresh and mutation actions', async () => {
    apiMock.getBudgets.mockResolvedValue({ data: [{ id: 'b1', amount: 100 }] });
    apiMock.createBudget.mockResolvedValue({});
    apiMock.updateBudget.mockResolvedValue({});
    apiMock.deleteBudget.mockResolvedValue({});

    const { result } = renderHook(() => useBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.budgets).toHaveLength(1);

    await act(async () => {
      await result.current.createBudget({ categoryId: 'c1', amount: 100, period: 'MONTHLY', startDate: '2026-01-01' });
      await result.current.updateBudget('b1', { amount: 120 });
      await result.current.deleteBudget('b1');
    });

    expect(apiMock.createBudget).toHaveBeenCalled();
    expect(apiMock.updateBudget).toHaveBeenCalledWith('b1', { amount: 120 });
    expect(result.current.budgets).toHaveLength(0);
  });

  it('useGoals supports CRUD and status updates', async () => {
    apiMock.getGoals.mockResolvedValue({ data: [{ id: 'g1', name: 'Goal 1' }] });
    apiMock.createGoal.mockResolvedValue({ data: { id: 'g2', name: 'Goal 2' } });
    apiMock.updateGoal.mockResolvedValue({ data: { id: 'g2', name: 'Goal 2 Updated' } });
    apiMock.updateGoalStatus.mockResolvedValue({ data: { id: 'g2', status: 'PAUSED' } });
    apiMock.deleteGoal.mockResolvedValue({});

    const { result } = renderHook(() => useGoals('ACTIVE'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createGoal({ name: 'Goal 2', targetAmount: 500 });
      await result.current.updateGoal('g2', { name: 'Goal 2 Updated' });
      await result.current.updateStatus('g2', 'PAUSED');
      await result.current.deleteGoal('g1');
    });

    expect(result.current.goals.find((g) => g.id === 'g1')).toBeUndefined();
    expect(result.current.goals.find((g) => g.id === 'g2')?.status).toBe('PAUSED');
  });

  it('useHoldings loads holdings and history', async () => {
    apiMock.getHoldings.mockResolvedValue({ data: { netWorth: 2000 } });
    apiMock.getHoldingsHistory.mockResolvedValue({ data: [{ date: '2026-01-01', value: 1800 }] });

    const { result } = renderHook(() => useHoldings('12'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.holdings).toEqual({ netWorth: 2000 });
    expect(result.current.history).toEqual([{ date: '2026-01-01', value: 1800 }]);
  });

  it('useHoldings refresh reloads holdings and history', async () => {
    apiMock.getHoldings
      .mockResolvedValueOnce({ data: { netWorth: 2000 } })
      .mockResolvedValueOnce({ data: { netWorth: 2450 } });
    apiMock.getHoldingsHistory
      .mockResolvedValueOnce({ data: [{ date: '2026-01-01', value: 1800 }] })
      .mockResolvedValueOnce({ data: [{ date: '2026-04-13', value: 2450 }] });

    const { result } = renderHook(() => useHoldings('12'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.holdings).toEqual({ netWorth: 2000 });

    await act(async () => {
      await result.current.refresh();
    });

    expect(apiMock.getHoldings).toHaveBeenCalledTimes(2);
    expect(apiMock.getHoldingsHistory).toHaveBeenCalledTimes(2);
    expect(result.current.holdings).toEqual({ netWorth: 2450 });
    expect(result.current.history).toEqual([{ date: '2026-04-13', value: 2450 }]);
  });

  it('useIsMobile responds to current viewport width', async () => {
    let listener: (() => void) | undefined;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: '(max-width: 767px)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event, cb: () => void) => {
        listener = cb;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const { result } = renderHook(() => useIsMobile());
    await waitFor(() => expect(result.current).toBe(true));

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
    act(() => listener?.());
    expect(result.current).toBe(false);
  });
});
