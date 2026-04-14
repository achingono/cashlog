import { Decimal } from '@prisma/client/runtime/library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    goal: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({ default: prismaMock }));

import { updateGoalProgress } from './update-goal-progress';

describe('updateGoalProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exits when there are no active goals', async () => {
    prismaMock.goal.findMany.mockResolvedValue([]);

    await updateGoalProgress();

    expect(prismaMock.goal.update).not.toHaveBeenCalled();
  });

  it('updates current amount and marks completed goals', async () => {
    prismaMock.goal.findMany.mockResolvedValue([
      {
        id: 'g1',
        name: 'Emergency',
        targetAmount: new Decimal('500'),
        accounts: [
          { account: { balance: new Decimal('300') } },
          { account: { balance: new Decimal('250') } },
        ],
      },
      {
        id: 'g2',
        name: 'Vacation',
        targetAmount: new Decimal('1000'),
        accounts: [{ account: { balance: new Decimal('150') } }],
      },
    ]);

    await updateGoalProgress();

    expect(prismaMock.goal.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'g1' },
        data: { currentAmount: 550, status: 'COMPLETED' },
      }),
    );
    expect(prismaMock.goal.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'g2' },
        data: { currentAmount: 150, status: 'ACTIVE' },
      }),
    );
  });
});
