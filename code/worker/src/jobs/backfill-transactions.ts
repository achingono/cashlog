import prisma from '../lib/prisma';
import { fetchTransactionsForAccount } from '../lib/simplefin';

const WINDOW_DAYS = 90;

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function shiftDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export async function backfillTransactions(): Promise<void> {
  console.log('[Backfill] Starting account backfill run...');

  const accounts = await prisma.account.findMany({
    where: { isActive: true, backfillComplete: false },
    select: {
      id: true,
      externalId: true,
      name: true,
      backfillCursor: true,
    },
  });

  if (accounts.length === 0) {
    console.log('[Backfill] No accounts pending backfill');
    return;
  }

  for (const account of accounts) {
    const windowEnd = account.backfillCursor ?? new Date();
    const windowStart = shiftDays(windowEnd, -(WINDOW_DAYS - 1));
    const startDate = toIsoDate(windowStart);
    const endDate = toIsoDate(windowEnd);

    console.log(`[Backfill] ${account.name}: ${startDate} -> ${endDate}`);
    const result = fetchTransactionsForAccount(account.externalId, startDate, endDate);

    if (!result.ok || !result.transactions) {
      throw new Error(result.error?.message || `Failed to backfill account ${account.name}`);
    }
    if (result.errors?.length) {
      console.warn(`[Backfill] ${account.name} warnings: ${result.errors.join(' | ')}`);
    }

    const accountTransactions = result.transactions.filter((tx) => tx.accountId === account.externalId);

    for (const tx of accountTransactions) {
      await prisma.transaction.upsert({
        where: { externalId: tx.id },
        update: {
          amount: Number.parseFloat(tx.amount),
          description: tx.description,
          payee: tx.payee || null,
          memo: tx.memo || null,
        },
        create: {
          externalId: tx.id,
          accountId: account.id,
          posted: new Date(tx.posted * 1000),
          amount: Number.parseFloat(tx.amount),
          description: tx.description,
          payee: tx.payee || null,
          memo: tx.memo || null,
        },
      });
    }

    const nextCursor = shiftDays(windowStart, -1);
    const isExhausted = accountTransactions.length === 0 || nextCursor.getUTCFullYear() < 1970;

    await prisma.account.update({
      where: { id: account.id },
      data: {
        backfillCursor: isExhausted ? null : nextCursor,
        backfillComplete: isExhausted,
        backfillUpdatedAt: new Date(),
      },
    });

    if (isExhausted) {
      console.log(`[Backfill] ${account.name}: complete`);
    } else {
      console.log(
        `[Backfill] ${account.name}: imported ${accountTransactions.length}, next window ends ${toIsoDate(nextCursor)}`,
      );
    }
  }

  console.log('[Backfill] Account backfill run complete');
}
