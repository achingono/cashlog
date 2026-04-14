import { Decimal } from '@prisma/client/runtime/library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    account: { findMany: vi.fn() },
    netWorthSnapshot: { findMany: vi.fn() },
    transaction: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

const { assetServiceMock } = vi.hoisted(() => ({
  assetServiceMock: {
    getTotalAssetValue: vi.fn(),
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('./asset.service', () => assetServiceMock);

import { getHoldings, getHoldingsHistory } from './holding.service';

describe('holding.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns holdings totals and account list', async () => {
    prismaMock.account.findMany.mockResolvedValue([
      {
        id: 'a1',
        name: 'Checking',
        institution: 'Bank',
        type: 'CHECKING',
        currency: 'USD',
        balance: new Decimal('1000'),
        availableBalance: null,
        balanceDate: new Date('2026-01-01T00:00:00.000Z'),
        _count: { transactions: 2 },
      },
      {
        id: 'a2',
        name: 'Credit Card',
        institution: 'Bank',
        type: 'CREDIT_CARD',
        currency: 'USD',
        balance: new Decimal('-120'),
        availableBalance: null,
        balanceDate: new Date('2026-01-01T00:00:00.000Z'),
        _count: { transactions: 4 },
      },
    ]);
    assetServiceMock.getTotalAssetValue.mockResolvedValue(500);

    const result = await getHoldings();

    expect(result.totalAssets).toBe(1500);
    expect(result.totalLiabilities).toBe(120);
    expect(result.netWorth).toBe(1380);
    expect(result.accounts).toHaveLength(2);
  });

  it('returns holdings history from snapshots when available', async () => {
    prismaMock.netWorthSnapshot.findMany.mockResolvedValue([
      { date: new Date('2026-01-01T00:00:00.000Z'), netWorth: new Decimal('100') },
      { date: new Date('2026-02-01T00:00:00.000Z'), netWorth: new Decimal('110') },
      { date: new Date('2026-03-01T00:00:00.000Z'), netWorth: new Decimal('120') },
    ]);
    prismaMock.transaction.findFirst.mockResolvedValue({ posted: new Date('2026-01-01T00:00:00.000Z') });

    const history = await getHoldingsHistory(2);

    expect(history).toEqual([
      { date: '2026-01-01', value: 100 },
      { date: '2026-02-01', value: 110 },
      { date: '2026-03-01', value: 120 },
    ]);
  });
});
