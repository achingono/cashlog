import { Decimal } from '@prisma/client/runtime/library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    budget: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    transaction: {
      aggregate: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

import { createBudget, deleteBudget, getBudgets, updateBudget } from './budget.service';

describe('budget.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes budget progress values', async () => {
    prismaMock.budget.findMany.mockResolvedValue([
      {
        id: 'b1',
        categoryId: 'c1',
        category: { name: 'Food', icon: 'Utensils', color: 'blue' },
        amount: new Decimal('500'),
        period: 'MONTHLY',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: null,
      },
    ]);
    prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: new Decimal('-125.50') } });

    const result = await getBudgets();

    expect(result).toEqual([
      expect.objectContaining({
        id: 'b1',
        amount: 500,
        spent: 125.5,
        remaining: 374.5,
        percentUsed: 25.1,
      }),
    ]);
  });

  it('delegates create/update/delete to prisma', async () => {
    prismaMock.budget.create.mockResolvedValue({ id: 'b1' });
    prismaMock.budget.update.mockResolvedValue({ id: 'b1', amount: new Decimal('600') });
    prismaMock.budget.delete.mockResolvedValue({ id: 'b1' });

    await createBudget({
      categoryId: 'c1',
      amount: 500,
      period: 'MONTHLY',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
    });
    await updateBudget('b1', { amount: 600 });
    await deleteBudget('b1');

    expect(prismaMock.budget.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ categoryId: 'c1', amount: 500 }) }),
    );
    expect(prismaMock.budget.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'b1' }, data: { amount: 600 } }),
    );
    expect(prismaMock.budget.delete).toHaveBeenCalledWith({ where: { id: 'b1' } });
  });
});
