import { Decimal } from '@prisma/client/runtime/library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    goal: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    goalAccount: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

import {
  createGoal,
  deleteGoal,
  getGoalById,
  getGoals,
  updateAllGoalProgress,
  updateGoal,
  updateGoalStatus,
} from './goal.service';

const baseGoal = {
  id: 'g1',
  name: 'Emergency fund',
  targetAmount: new Decimal('1000'),
  currentAmount: new Decimal('200'),
  targetDate: null,
  status: 'ACTIVE',
  icon: null,
  color: null,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('goal.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps goal list and single goal', async () => {
    prismaMock.goal.findMany.mockResolvedValue([
      {
        ...baseGoal,
        accounts: [{ account: { id: 'a1', name: 'Checking', institution: 'Bank', type: 'CHECKING', balance: new Decimal('200') } }],
      },
    ]);
    prismaMock.goal.findUnique.mockResolvedValue({
      ...baseGoal,
      accounts: [{ account: { id: 'a1', name: 'Checking', institution: 'Bank', type: 'CHECKING', balance: new Decimal('200') } }],
    });

    const list = await getGoals('ACTIVE');
    const one = await getGoalById('g1');

    expect(list[0]).toEqual(expect.objectContaining({ id: 'g1', percentComplete: 20 }));
    expect(one).toEqual(expect.objectContaining({ id: 'g1', currentAmount: 200 }));
  });

  it('creates goal and calculates initial currentAmount from linked accounts', async () => {
    prismaMock.goal.create.mockResolvedValue({
      ...baseGoal,
      currentAmount: new Decimal('0'),
      accounts: [
        { account: { id: 'a1', name: 'Checking', institution: null, type: 'CHECKING', balance: new Decimal('300') } },
        { account: { id: 'a2', name: 'Savings', institution: null, type: 'SAVINGS', balance: new Decimal('250') } },
      ],
    });
    prismaMock.goal.update.mockResolvedValue({ ...baseGoal, currentAmount: new Decimal('550') });

    const created = await createGoal({
      name: 'Emergency fund',
      targetAmount: 1000,
      accountIds: ['a1', 'a2'],
    });

    expect(created.currentAmount).toBe(550);
    expect(prismaMock.goal.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'g1' }, data: { currentAmount: 550 } }),
    );
  });

  it('updates goal links and recalculates current amount', async () => {
    prismaMock.goal.update.mockResolvedValue({
      ...baseGoal,
      accounts: [{ account: { id: 'a3', name: 'Brokerage', institution: null, type: 'INVESTMENT', balance: new Decimal('900') } }],
    });

    const result = await updateGoal('g1', { accountIds: ['a3'], targetAmount: 2000 });

    expect(prismaMock.goalAccount.deleteMany).toHaveBeenCalledWith({ where: { goalId: 'g1' } });
    expect(prismaMock.goalAccount.createMany).toHaveBeenCalledWith({
      data: [{ goalId: 'g1', accountId: 'a3' }],
    });
    expect(result.currentAmount).toBe(900);
  });

  it('updates status, deletes goal and updates progress for active goals', async () => {
    prismaMock.goal.update.mockResolvedValue({
      ...baseGoal,
      status: 'PAUSED',
      accounts: [],
    });
    prismaMock.goal.delete.mockResolvedValue({ id: 'g1' });
    prismaMock.goal.findMany.mockResolvedValue([
      {
        ...baseGoal,
        targetAmount: new Decimal('500'),
        accounts: [{ account: { balance: new Decimal('600') } }],
      },
    ]);

    const statusResult = await updateGoalStatus('g1', 'PAUSED');
    await deleteGoal('g1');
    await updateAllGoalProgress();

    expect(statusResult.status).toBe('PAUSED');
    expect(prismaMock.goal.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
    expect(prismaMock.goal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'g1' },
        data: { currentAmount: 600, status: 'COMPLETED' },
      }),
    );
  });
});
