import prisma from '../lib/prisma';
import { isAssetType, isLiabilityType } from '../lib/account-types';

function decimalToNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  return Number(val);
}

function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseBackfillDays(): number {
  const raw = Number(process.env.SNAPSHOT_BACKFILL_DAYS ?? '180');
  if (Number.isNaN(raw)) return 180;
  return Math.min(365, Math.max(90, Math.floor(raw)));
}

function normalizeDate(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function datesBetweenInclusive(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = normalizeDate(start);
  const final = normalizeDate(end);

  while (cursor <= final) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function backfillHistoricalSnapshots(): Promise<void> {
  const days = parseBackfillDays();
  const today = normalizeDate(new Date());
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);

  console.log(`[SnapshotBackfill] Ensuring daily snapshots for the last ${days} days (${toDateKey(startDate)} to ${toDateKey(today)})...`);

  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    select: { id: true, type: true, balance: true },
  });

  if (accounts.length === 0) {
    console.log('[SnapshotBackfill] No active accounts found, skipping');
    return;
  }

  const manualAssetTotal = await prisma.asset.aggregate({
    _sum: { currentValue: true },
  });
  const manualAssetsValue = decimalToNumber(manualAssetTotal._sum.currentValue);

  const dayList = datesBetweenInclusive(startDate, today);

  const txRows = await prisma.transaction.findMany({
    where: {
      accountId: { in: accounts.map((a) => a.id) },
      posted: { gte: startDate },
    },
    select: {
      accountId: true,
      posted: true,
      amount: true,
    },
  });

  const txSumsByAccountDay = new Map<string, number>();
  for (const tx of txRows) {
    const key = `${tx.accountId}:${toDateKey(tx.posted)}`;
    txSumsByAccountDay.set(key, (txSumsByAccountDay.get(key) ?? 0) + decimalToNumber(tx.amount));
  }

  const accountDailyBalances = new Map<string, Map<string, number>>();

  for (const account of accounts) {
    let futureSum = 0;
    const currentBalance = decimalToNumber(account.balance);
    const daily = new Map<string, number>();

    for (let idx = dayList.length - 1; idx >= 0; idx -= 1) {
      const day = dayList[idx];
      const dayKey = toDateKey(day);
      daily.set(dayKey, currentBalance - futureSum);
      futureSum += txSumsByAccountDay.get(`${account.id}:${dayKey}`) ?? 0;
    }

    accountDailyBalances.set(account.id, daily);
  }

  const accountSnapshotRows: Array<{
    accountId: string;
    date: Date;
    accountType: (typeof accounts)[number]['type'];
    balance: number;
    netWorth: number;
  }> = [];
  const netWorthSnapshotRows: Array<{
    date: Date;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  }> = [];

  for (const day of dayList) {
    const dayKey = toDateKey(day);

    let totalAssets = manualAssetsValue;
    let totalLiabilities = 0;

    for (const account of accounts) {
      const balance = accountDailyBalances.get(account.id)?.get(dayKey) ?? 0;
      if (isAssetType(account.type)) totalAssets += balance;
      else if (isLiabilityType(account.type)) totalLiabilities += Math.abs(balance);

      const netWorth = isAssetType(account.type) ? balance : -Math.abs(balance);

      accountSnapshotRows.push({
        accountId: account.id,
        date: day,
        accountType: account.type,
        balance,
        netWorth,
      });
    }

    netWorthSnapshotRows.push({
      date: day,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.accountNetWorthSnapshot.deleteMany({
      where: {
        accountId: { in: accounts.map((a) => a.id) },
        date: { gte: startDate, lte: today },
      },
    });

    await tx.netWorthSnapshot.deleteMany({
      where: {
        date: { gte: startDate, lte: today },
      },
    });

    // Keep batch sizes reasonable for DB parameter limits.
    for (const chunk of chunkArray(accountSnapshotRows, 1000)) {
      await tx.accountNetWorthSnapshot.createMany({ data: chunk });
    }

    for (const chunk of chunkArray(netWorthSnapshotRows, 500)) {
      await tx.netWorthSnapshot.createMany({ data: chunk });
    }
  });

  console.log(`[SnapshotBackfill] Snapshot backfill complete (${dayList.length} days).`);
}
