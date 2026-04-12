import { prisma } from '../lib/prisma';
import { HoldingsSummary, decimalToNumber, TrendDataPoint } from '../lib/types';
import { getTotalAssetValue } from './asset.service';

const ASSET_TYPES = ['CHECKING', 'SAVINGS', 'INVESTMENT', 'OTHER'];
const LIABILITY_TYPES = ['CREDIT_CARD', 'LOAN', 'MORTGAGE'];

export async function getHoldings(): Promise<HoldingsSummary> {
  const [accounts, manualAssetValue] = await Promise.all([
    prisma.account.findMany({
      where: { isActive: true },
      include: { _count: { select: { transactions: true } } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    }),
    getTotalAssetValue(),
  ]);

  let totalAssets = manualAssetValue;
  let totalLiabilities = 0;

  const accountList = accounts.map((a) => {
    const bal = decimalToNumber(a.balance);
    if (ASSET_TYPES.includes(a.type)) totalAssets += bal;
    else if (LIABILITY_TYPES.includes(a.type)) totalLiabilities += Math.abs(bal);

    return {
      id: a.id,
      name: a.name,
      institution: a.institution,
      type: a.type,
      currency: a.currency,
      balance: bal,
      availableBalance: a.availableBalance ? decimalToNumber(a.availableBalance) : null,
      balanceDate: a.balanceDate,
      transactionCount: a._count.transactions,
    };
  });

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    accounts: accountList,
  };
}

export async function getHoldingsHistory(months: number = 12): Promise<TrendDataPoint[]> {
  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: {
      date: { gte: new Date(new Date().setMonth(new Date().getMonth() - months)) },
    },
    orderBy: { date: 'asc' },
  });

  return snapshots.map((s) => ({
    date: s.date.toISOString().split('T')[0],
    value: decimalToNumber(s.netWorth),
  }));
}
