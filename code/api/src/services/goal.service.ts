import { prisma } from '../lib/prisma';
import { decimalToNumber } from '../lib/types';

export interface GoalWithProgress {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  percentComplete: number;
  targetDate: Date | null;
  status: string;
  icon: string | null;
  color: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  accounts: {
    id: string;
    name: string;
    institution: string | null;
    type: string;
    balance: number;
  }[];
}

function mapGoal(g: any): GoalWithProgress {
  const target = decimalToNumber(g.targetAmount);
  const current = decimalToNumber(g.currentAmount);
  return {
    id: g.id,
    name: g.name,
    targetAmount: target,
    currentAmount: current,
    percentComplete: target > 0 ? (current / target) * 100 : 0,
    targetDate: g.targetDate,
    status: g.status,
    icon: g.icon,
    color: g.color,
    notes: g.notes,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    accounts: g.accounts
      ? g.accounts.map((ga: any) => ({
          id: ga.account.id,
          name: ga.account.name,
          institution: ga.account.institution,
          type: ga.account.type,
          balance: decimalToNumber(ga.account.balance),
        }))
      : [],
  };
}

export async function getGoals(status?: string): Promise<GoalWithProgress[]> {
  const where: any = {};
  if (status) where.status = status;

  const goals = await prisma.goal.findMany({
    where,
    include: {
      accounts: {
        include: { account: true },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  return goals.map(mapGoal);
}

export async function getGoalById(id: string): Promise<GoalWithProgress | null> {
  const goal = await prisma.goal.findUnique({
    where: { id },
    include: {
      accounts: {
        include: { account: true },
      },
    },
  });

  if (!goal) return null;
  return mapGoal(goal);
}

export async function createGoal(data: {
  name: string;
  targetAmount: number;
  targetDate?: Date;
  icon?: string;
  color?: string;
  notes?: string;
  accountIds?: string[];
}) {
  const goal = await prisma.goal.create({
    data: {
      name: data.name,
      targetAmount: data.targetAmount,
      targetDate: data.targetDate,
      icon: data.icon,
      color: data.color,
      notes: data.notes,
      accounts: data.accountIds?.length
        ? { create: data.accountIds.map((accountId) => ({ accountId })) }
        : undefined,
    },
    include: {
      accounts: { include: { account: true } },
    },
  });

  // Compute initial currentAmount from linked accounts
  if (data.accountIds?.length) {
    const currentAmount = goal.accounts.reduce(
      (sum: number, ga: any) => sum + decimalToNumber(ga.account.balance),
      0
    );
    await prisma.goal.update({
      where: { id: goal.id },
      data: { currentAmount },
    });
    goal.currentAmount = currentAmount as any;
  }

  return mapGoal(goal);
}

export async function updateGoal(id: string, data: {
  name?: string;
  targetAmount?: number;
  targetDate?: Date;
  icon?: string;
  color?: string;
  notes?: string;
  accountIds?: string[];
}) {
  const { accountIds, ...goalData } = data;

  if (accountIds !== undefined) {
    await prisma.goalAccount.deleteMany({ where: { goalId: id } });
    if (accountIds.length > 0) {
      await prisma.goalAccount.createMany({
        data: accountIds.map((accountId) => ({ goalId: id, accountId })),
      });
    }
  }

  const goal = await prisma.goal.update({
    where: { id },
    data: goalData,
    include: {
      accounts: { include: { account: true } },
    },
  });

  // Recalculate currentAmount from linked accounts
  const currentAmount = goal.accounts.reduce(
    (sum: number, ga: any) => sum + decimalToNumber(ga.account.balance),
    0
  );
  await prisma.goal.update({
    where: { id },
    data: { currentAmount },
  });
  goal.currentAmount = currentAmount as any;

  return mapGoal(goal);
}

export async function updateGoalStatus(id: string, status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED') {
  const goal = await prisma.goal.update({
    where: { id },
    data: { status },
    include: {
      accounts: { include: { account: true } },
    },
  });

  return mapGoal(goal);
}

export async function deleteGoal(id: string) {
  return prisma.goal.delete({ where: { id } });
}

export async function updateAllGoalProgress(): Promise<void> {
  const activeGoals = await prisma.goal.findMany({
    where: { status: 'ACTIVE' },
    include: {
      accounts: { include: { account: true } },
    },
  });

  for (const goal of activeGoals) {
    const currentAmount = goal.accounts.reduce(
      (sum: number, ga: any) => sum + decimalToNumber(ga.account.balance),
      0
    );

    const targetAmount = decimalToNumber(goal.targetAmount);
    const newStatus = currentAmount >= targetAmount ? 'COMPLETED' : 'ACTIVE';

    await prisma.goal.update({
      where: { id: goal.id },
      data: {
        currentAmount,
        status: newStatus,
      },
    });

    if (newStatus === 'COMPLETED') {
      console.log(`[Goals] Goal "${goal.name}" completed! ($${currentAmount.toFixed(2)} / $${targetAmount.toFixed(2)})`);
    }
  }
}
