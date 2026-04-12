import prisma from '../lib/prisma';

function decimalToNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  return Number(val);
}

export async function updateGoalProgress(): Promise<void> {
  const activeGoals = await prisma.goal.findMany({
    where: { status: 'ACTIVE' },
    include: {
      accounts: { include: { account: true } },
    },
  });

  if (activeGoals.length === 0) {
    console.log('[Goals] No active goals to update');
    return;
  }

  console.log(`[Goals] Updating progress for ${activeGoals.length} active goal(s)`);

  for (const goal of activeGoals) {
    const currentAmount = goal.accounts.reduce(
      (sum, ga) => sum + decimalToNumber(ga.account.balance),
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

    const pct = targetAmount > 0 ? ((currentAmount / targetAmount) * 100).toFixed(1) : '0';
    console.log(`[Goals] "${goal.name}": $${currentAmount.toFixed(2)} / $${targetAmount.toFixed(2)} (${pct}%)`);

    if (newStatus === 'COMPLETED') {
      console.log(`[Goals] 🎉 Goal "${goal.name}" completed!`);
    }
  }
}
