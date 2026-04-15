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

  it('submits transaction imports as multipart form data', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({ data: { importedCount: 1 } }),
    });

    const file = new File(['Date,Amount,Description\n2026-01-01,10,Deposit\n'], 'import.csv', { type: 'text/csv' });

    await api.importTransactions({
      file,
      accountId: 'acc-1',
      format: 'csv',
    });

    const [path, options] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/transactions/import');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.headers as Headers).get('Content-Type')).toBeNull();
    expect((options.body as FormData).get('file')).toBe(file);
    expect((options.body as FormData).get('accountId')).toBe('acc-1');
    expect((options.body as FormData).get('format')).toBe('csv');
  });

  it('patches account balances as JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          id: 'acc-1',
          balance: 1250.55,
          availableBalance: 1200.1,
          balanceDate: '2026-04-13T00:00:00.000Z',
        },
      }),
    });

    await api.updateAccountBalance('acc-1', {
      balance: 1250.55,
      availableBalance: 1200.1,
      balanceDate: '2026-04-13',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/accounts/acc-1/balance',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          balance: 1250.55,
          availableBalance: 1200.1,
          balanceDate: '2026-04-13',
        }),
      }),
    );
  });

  it('patches imported account institution as JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          id: 'acc-1',
          institution: 'Excel Import',
        },
      }),
    });

    await api.updateAccountInstitution('acc-1', {
      institution: 'Excel Import',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/accounts/acc-1/institution',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          institution: 'Excel Import',
        }),
      }),
    );
  });

  it('posts expense analysis report generation', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({ data: { id: 'r-exp', type: 'SPENDING_ANALYSIS' } }),
    });

    await api.generateExpenseAnalysis();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reports/expense-analysis',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
