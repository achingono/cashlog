import { prisma } from '../lib/prisma';
import { DashboardSummary, TrendDataPoint, decimalToNumber } from '../lib/types';
import { getTotalAssetValue } from './asset.service';

const ASSET_TYPES = ['CHECKING', 'SAVINGS', 'INVESTMENT', 'OTHER'];
const LIABILITY_TYPES = ['CREDIT_CARD', 'LOAN', 'MORTGAGE'];

export async function getDashboardSummary(accountId?: string): Promise<DashboardSummary> {
  const [accounts, manualAssetValue] = await Promise.all([
    prisma.account.findMany({ where: { isActive: true, ...(accountId ? { id: accountId } : {}) } }),
    accountId ? Promise.resolve(0) : getTotalAssetValue(),
  ]);

  let totalAssets = manualAssetValue;
  let totalLiabilities = 0;

  for (const a of accounts) {
    const bal = decimalToNumber(a.balance);
    if (ASSET_TYPES.includes(a.type)) {
      totalAssets += bal;
    } else if (LIABILITY_TYPES.includes(a.type)) {
      totalLiabilities += Math.abs(bal);
    }
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthlyTransactions = await prisma.transaction.findMany({
    where: { posted: { gte: startOfMonth }, ...(accountId ? { accountId } : {}) },
  });

  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  for (const t of monthlyTransactions) {
    const amt = decimalToNumber(t.amount);
    if (amt > 0) monthlyIncome += amt;
    else monthlyExpenses += Math.abs(amt);
  }

  return {
    netWorth: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    monthlyIncome,
    monthlyExpenses,
    monthlyNet: monthlyIncome - monthlyExpenses,
  };
}

export async function getTrends(months?: number, accountId?: string): Promise<TrendDataPoint[]> {
  const snapshotWhere = months && months > 0
    ? { date: { gte: new Date(new Date().setMonth(new Date().getMonth() - months)) } }
    : undefined;

  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: snapshotWhere,
    orderBy: { date: 'asc' },
  });

  if (snapshots.length > 0) {
    return snapshots.map((s) => ({
      date: s.date.toISOString().split('T')[0],
      value: decimalToNumber(s.netWorth),
    }));
  }

  // Fallback: generate from transaction history
  const points: TrendDataPoint[] = [];
  const now = new Date();
  let monthCount = months && months > 0 ? months : 0;

  if (!monthCount) {
    const firstTx = await prisma.transaction.findFirst({
      where: accountId ? { accountId } : undefined,
      orderBy: { posted: 'asc' },
      select: { posted: true },
    });

    if (!firstTx) return [];

    const start = new Date(firstTx.posted.getFullYear(), firstTx.posted.getMonth(), 1);
    monthCount = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  }

  for (let i = monthCount; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const where: any = {
      posted: { lte: endDate },
    };
    if (accountId) where.accountId = accountId;

    const result = await prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
    });

    points.push({
      date: date.toISOString().split('T')[0],
      value: decimalToNumber(result._sum.amount),
    });
  }

  return points;
}

export async function getSpendingByCategory(startDate?: Date, endDate?: Date, accountId?: string) {
  const where: any = {
    amount: { lt: 0 },
  };

  if (accountId) {
    where.accountId = accountId;
  }

  if (startDate || endDate) {
    where.posted = {};
    if (startDate) where.posted.gte = startDate;
    if (endDate) where.posted.lte = endDate;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: { select: { id: true, name: true, icon: true, color: true } } },
  });

  const byCategory = new Map<string, { category: any; total: number }>();

  for (const t of transactions) {
    const catName = t.category?.name || 'Uncategorized';
    const existing = byCategory.get(catName) || {
      category: t.category || { id: null, name: 'Uncategorized', icon: 'HelpCircle', color: 'gray' },
      total: 0,
    };
    existing.total += Math.abs(decimalToNumber(t.amount));
    byCategory.set(catName, existing);
  }

  return Array.from(byCategory.values())
    .sort((a, b) => b.total - a.total);
}
