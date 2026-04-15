import { prisma } from '../lib/prisma';
import { decimalToNumber, AccountWithStats } from '../lib/types';
import { AppError } from '../middleware/error-handler';

interface UpdateAccountBalanceInput {
  balance: number;
  availableBalance?: number | null;
  balanceDate?: Date;
}

interface UpdateImportedAccountInstitutionInput {
  institution: string;
}

function isImportedAccount(externalId: string): boolean {
  return externalId.startsWith('manual-import:') || externalId.startsWith('excel-import:');
}

export async function getAllAccounts(): Promise<AccountWithStats[]> {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { transactions: true } },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    institution: a.institution,
    type: a.type,
    currency: a.currency,
    balance: decimalToNumber(a.balance),
    availableBalance: a.availableBalance ? decimalToNumber(a.availableBalance) : null,
    balanceDate: a.balanceDate,
    transactionCount: a._count.transactions,
  }));
}

export async function getAccountById(id: string) {
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { posted: 'desc' },
        take: 20,
        include: { category: true },
      },
      _count: { select: { transactions: true } },
    },
  });

  if (!account) return null;

  return {
    id: account.id,
    externalId: account.externalId,
    name: account.name,
    institution: account.institution,
    institutionDomain: account.institutionDomain,
    type: account.type,
    currency: account.currency,
    balance: decimalToNumber(account.balance),
    availableBalance: account.availableBalance ? decimalToNumber(account.availableBalance) : null,
    balanceDate: account.balanceDate,
    isActive: account.isActive,
    transactionCount: account._count.transactions,
    recentTransactions: account.transactions.map((t) => ({
      id: t.id,
      posted: t.posted,
      amount: decimalToNumber(t.amount),
      description: t.description,
      payee: t.payee,
      category: t.category ? { id: t.category.id, name: t.category.name, icon: t.category.icon, color: t.category.color } : null,
    })),
  };
}

export async function updateAccountBalance(id: string, input: UpdateAccountBalanceInput) {
  const existing = await prisma.account.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) return null;

  await prisma.account.update({
    where: { id },
    data: {
      balance: input.balance,
      availableBalance: input.availableBalance === undefined ? undefined : input.availableBalance,
      balanceDate: input.balanceDate ?? new Date(),
    },
  });

  return getAccountById(id);
}

export async function updateImportedAccountInstitution(id: string, input: UpdateImportedAccountInstitutionInput) {
  const existing = await prisma.account.findUnique({
    where: { id },
    select: { id: true, externalId: true },
  });

  if (!existing) return null;
  if (!isImportedAccount(existing.externalId)) {
    throw new AppError(400, 'Only imported accounts can update institution name', 'VALIDATION_ERROR');
  }

  await prisma.account.update({
    where: { id },
    data: {
      institution: input.institution.trim(),
    },
  });

  return getAccountById(id);
}
