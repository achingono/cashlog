import { Decimal } from '@prisma/client/runtime/library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    account: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

import { getAccountById, getAllAccounts } from './account.service';

describe('account.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps account rows for getAllAccounts', async () => {
    prismaMock.account.findMany.mockResolvedValue([
      {
        id: 'a1',
        name: 'Checking',
        institution: 'Bank',
        type: 'CHECKING',
        currency: 'USD',
        balance: new Decimal('100.25'),
        availableBalance: new Decimal('90.25'),
        balanceDate: new Date('2026-01-01T00:00:00.000Z'),
        _count: { transactions: 3 },
      },
    ]);

    const result = await getAllAccounts();

    expect(result).toEqual([
      expect.objectContaining({
        id: 'a1',
        balance: 100.25,
        availableBalance: 90.25,
        transactionCount: 3,
      }),
    ]);
  });

  it('returns null when getAccountById misses', async () => {
    prismaMock.account.findUnique.mockResolvedValue(null);
    await expect(getAccountById('missing')).resolves.toBeNull();
  });

  it('maps account detail with recent transactions', async () => {
    prismaMock.account.findUnique.mockResolvedValue({
      id: 'a1',
      externalId: 'ext-1',
      name: 'Checking',
      institution: 'Bank',
      institutionDomain: 'bank.test',
      type: 'CHECKING',
      currency: 'USD',
      balance: new Decimal('100'),
      availableBalance: null,
      balanceDate: new Date('2026-01-02T00:00:00.000Z'),
      isActive: true,
      _count: { transactions: 1 },
      transactions: [
        {
          id: 't1',
          posted: new Date('2026-01-02T00:00:00.000Z'),
          amount: new Decimal('-12.5'),
          description: 'Coffee',
          payee: 'Cafe',
          category: { id: 'c1', name: 'Food', icon: 'Utensils', color: 'blue' },
        },
      ],
    });

    const result = await getAccountById('a1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'a1',
        transactionCount: 1,
        recentTransactions: [
          expect.objectContaining({
            id: 't1',
            amount: -12.5,
          }),
        ],
      }),
    );
  });
});
