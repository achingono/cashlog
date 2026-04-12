import { Decimal } from '@prisma/client/runtime/library';
import { TrendDataPoint, decimalToNumber } from '../lib/types';

type SnapshotLike = {
  date: Date;
  netWorth: Decimal | null | undefined;
};

type TransactionLike = {
  posted: Date;
  amount: Decimal | null | undefined;
};

export function deriveMonthCount(months: number | undefined, firstTxDate: Date | undefined, now: Date): number {
  // Returns month span (difference), not point count.
  // Example: Jan -> Feb returns 1 span, which intentionally yields 2 points when callers iterate 0..span.
  if (months && months > 0) return months;
  if (!firstTxDate) return 0;

  const start = new Date(firstTxDate.getFullYear(), firstTxDate.getMonth(), 1);
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
}

export function shouldUseSnapshots(snapshotCount: number, months: number | undefined, monthCount: number): boolean {
  const resolvedMonthCount = months && months > 0 ? months : monthCount;
  // A span of N months needs N+1 data points so both boundaries are represented
  // (for example, Jan->Feb is 1 month span but needs 2 monthly points).
  const requiredSnapshotCount = resolvedMonthCount > 0 ? resolvedMonthCount + 1 : 1;

  return snapshotCount >= requiredSnapshotCount;
}

export function mapSnapshotsToTrendPoints(snapshots: SnapshotLike[]): TrendDataPoint[] {
  return snapshots.map((s) => ({
    date: s.date.toISOString().split('T')[0],
    value: decimalToNumber(s.netWorth),
  }));
}

export function buildCumulativeMonthlyPoints(
  transactions: TransactionLike[],
  monthCount: number,
  now: Date,
): TrendDataPoint[] {
  const points: TrendDataPoint[] = [];
  let txIndex = 0;
  let runningTotal = 0;

  for (let i = monthCount; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthExclusiveEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    while (txIndex < transactions.length && transactions[txIndex].posted < monthExclusiveEnd) {
      runningTotal += decimalToNumber(transactions[txIndex].amount);
      txIndex++;
    }

    points.push({
      date: date.toISOString().split('T')[0],
      value: runningTotal,
    });
  }

  return points;
}
