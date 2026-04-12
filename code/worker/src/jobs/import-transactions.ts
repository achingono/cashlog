import prisma from '../lib/prisma';
import { fetchAccounts, fetchTransactions, SFAccount } from '../lib/simplefin';

function inferAccountType(account: SFAccount): string {
  const name = account.name.toLowerCase();
  const balance = Number.parseFloat(account.balance);

  if (name.includes('credit') || name.includes('visa') || name.includes('mastercard')) return 'CREDIT_CARD';
  if (name.includes('saving')) return 'SAVINGS';
  if (name.includes('invest') || name.includes('brokerage') || name.includes('rrsp') || name.includes('tfsa')) return 'INVESTMENT';
  if (name.includes('mortgage')) return 'MORTGAGE';
  if (name.includes('loan') || name.includes('loc') || name.includes('line of credit')) return 'LOAN';
  if (name.includes('checking') || name.includes('chequing')) return 'CHECKING';
  if (balance < 0) return 'CREDIT_CARD';

  return 'CHECKING';
}

export async function importTransactions(): Promise<{ accountCount: number; transactionCount: number }> {
  console.log('[Import] Starting transaction import...');

  // Get the last successful sync to determine start date
  const lastSync = await prisma.syncLog.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
  });
  const existingTransactionCount = await prisma.transaction.count();

  const defaultBackfillStart = new Date();
  defaultBackfillStart.setUTCDate(defaultBackfillStart.getUTCDate() - 90);

  const shouldBackfill = !lastSync || existingTransactionCount === 0;
  const startDate = shouldBackfill
    ? defaultBackfillStart.toISOString().split('T')[0] // SimpleFin caps to 90 days anyway
    : new Date(lastSync.startedAt.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 day overlap

  const syncLog = await prisma.syncLog.create({
    data: { status: 'RUNNING' },
  });

  try {
    const accountResult = fetchAccounts();
    if (!accountResult.ok || !accountResult.accounts) {
      throw new Error(accountResult.error?.message || 'Failed to fetch accounts');
    }

    const transactionResult = fetchTransactions(startDate);
    if (!transactionResult.ok || !transactionResult.transactions) {
      throw new Error(transactionResult.error?.message || 'Failed to fetch transactions');
    }
    if (transactionResult.errors?.length) {
      console.warn(`[Import] SimpleFin returned warnings: ${transactionResult.errors.join(' | ')}`);
    }

    const accountExternalIds = new Set(accountResult.accounts.map((account) => account.id));

    for (const sfAccount of accountResult.accounts) {
      await prisma.account.upsert({
        where: { externalId: sfAccount.id },
        update: {
          name: sfAccount.name,
          balance: Number.parseFloat(sfAccount.balance),
          availableBalance: sfAccount['available-balance'] ? Number.parseFloat(sfAccount['available-balance']) : null,
          balanceDate: new Date(sfAccount['balance-date'] * 1000),
          institution: sfAccount.org?.name || null,
          institutionDomain: sfAccount.org?.domain || null,
        },
        create: {
          externalId: sfAccount.id,
          name: sfAccount.name,
          currency: sfAccount.currency,
          type: inferAccountType(sfAccount) as any,
          balance: Number.parseFloat(sfAccount.balance),
          availableBalance: sfAccount['available-balance'] ? Number.parseFloat(sfAccount['available-balance']) : null,
          balanceDate: new Date(sfAccount['balance-date'] * 1000),
          institution: sfAccount.org?.name || null,
          institutionDomain: sfAccount.org?.domain || null,
        },
      });
    }

    let totalTransactions = 0;

    for (const sfTx of transactionResult.transactions) {
      if (!accountExternalIds.has(sfTx.accountId)) {
        console.warn(`[Import] Skipping transaction ${sfTx.id}: account ${sfTx.accountId} not found`);
        continue;
      }

      const account = await prisma.account.findUnique({
        where: { externalId: sfTx.accountId },
        select: { id: true },
      });
      if (!account) {
        console.warn(`[Import] Skipping transaction ${sfTx.id}: account ${sfTx.accountId} not available locally`);
        continue;
      }

      await prisma.transaction.upsert({
        where: { externalId: sfTx.id },
        update: {
          amount: Number.parseFloat(sfTx.amount),
          description: sfTx.description,
          payee: sfTx.payee || null,
          memo: sfTx.memo || null,
        },
        create: {
          externalId: sfTx.id,
          accountId: account.id,
          posted: new Date(sfTx.posted * 1000),
          amount: Number.parseFloat(sfTx.amount),
          description: sfTx.description,
          payee: sfTx.payee || null,
          memo: sfTx.memo || null,
        },
      });
      totalTransactions++;
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'SUCCESS',
        accountCount: accountResult.accounts.length,
        transactionCount: totalTransactions,
        completedAt: new Date(),
      },
    });

    console.log(`[Import] Imported ${accountResult.accounts.length} accounts, ${totalTransactions} transactions`);
    return { accountCount: accountResult.accounts.length, transactionCount: totalTransactions };
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'FAILED',
        errorMessage: String(err),
        completedAt: new Date(),
      },
    });
    console.error('[Import] Failed:', err);
    throw err;
  }
}
