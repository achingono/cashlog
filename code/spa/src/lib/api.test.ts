import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns JSON data for successful requests', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: [{ id: 'a1' }] }),
    });

    const result = await api.getAccounts();

    expect(fetchMock).toHaveBeenCalledWith('/api/accounts', expect.any(Object));
    expect(result).toEqual({ data: [{ id: 'a1' }] });
  });

  it('throws API error message for non-ok responses', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: vi.fn().mockResolvedValue({ error: { message: 'Validation error' } }),
    });

    await expect(api.getAccounts()).rejects.toThrow('Validation error');
  });

  it('returns undefined for 204 responses', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn(),
    });

    await expect(api.deleteAsset('asset-1')).resolves.toBeUndefined();
  });

  it('serializes query params for endpoint helpers', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: [] }),
    });

    await api.getDashboardSummary('acc-1');
    await api.getTransactions({ search: 'coffee', page: 2, limit: 10 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/dashboard/summary?accountId=acc-1',
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/transactions?search=coffee&page=2&limit=10',
      expect.any(Object),
    );
  });
});
