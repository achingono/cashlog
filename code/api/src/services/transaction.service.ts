import { prisma } from '../lib/prisma';
import { PaginatedResponse, TransactionFilters, decimalToNumber } from '../lib/types';

export interface TransactionListItem {
  id: string;
  posted: Date;
  amount: number;
  description: string;
  payee: string | null;
  memo: string | null;
  isReviewed: boolean;
  account: { id: string; name: string; institution: string | null };
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
}

export async function getTransactions(
  filters: TransactionFilters,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<TransactionListItem>> {
  const where: any = {};

  if (filters.accountId) where.accountId = filters.accountId;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.startDate || filters.endDate) {
    where.posted = {};
    if (filters.startDate) where.posted.gte = filters.startDate;
    if (filters.endDate) where.posted.lte = filters.endDate;
  }
  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: 'insensitive' } },
      { payee: { contains: filters.search, mode: 'insensitive' } },
      { memo: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, institution: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: { posted: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data: transactions.map((t) => ({
      id: t.id,
      posted: t.posted,
      amount: decimalToNumber(t.amount),
      description: t.description,
      payee: t.payee,
      memo: t.memo,
      isReviewed: t.isReviewed,
      account: t.account,
      category: t.category,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateTransactionCategory(id: string, categoryId: string) {
  return prisma.transaction.update({
    where: { id },
    data: { categoryId, isReviewed: true },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
  });
}
