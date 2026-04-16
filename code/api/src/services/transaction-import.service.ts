import { createHash, randomUUID } from 'node:crypto';
import { AppError } from '../middleware/error-handler';
import { prisma } from '../lib/prisma';
import { triggerTransactionCategorization } from './categorization.service';
import { applyCategoryRulesToTransactions } from './category-rule.service';
import {
  ImportFormat,
  ImportedAccountReference,
  ImportedAccountType,
  ImportedTransactionRecord,
  parseTransactionImportFile,
} from './transaction-import/parsers';

type SupportedAccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'LOAN' | 'MORTGAGE' | 'OTHER';

export interface ImportTransactionsInput {
  fileBuffer: Buffer;
  fileName: string;
  format?: ImportFormat;
  accountId?: string;
  newAccount?: {
    name: string;
    institution?: string;
    currency?: string;
    type?: SupportedAccountType;
    balance?: number;
  };
}

export interface ImportTransactionsResult {
  format: ImportFormat;
  parsedCount: number;
  importedCount: number;
  skippedCount: number;
  account?: {
    id: string;
    name: string;
    created: boolean;
  };
  accounts: Array<{
    id: string;
    name: string;
    created: boolean;
  }>;
  categorizationTriggered: boolean;
}

type ResolvedAccount = {
  id: string;
  name: string;
  created: boolean;
};

type PreparedImportRecord = ImportedTransactionRecord & {
  fingerprint: string;
  externalId: string;
};

type ParsedImportResult = ReturnType<typeof parseTransactionImportFile>;

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replaceAll(/\s+/g, ' ');
}

function normalizeAmount(value: number): number {
  return Number(value.toFixed(2));
}

function transactionFingerprint(transaction: ImportedTransactionRecord): string {
  return [
    transaction.posted.toISOString().slice(0, 10),
    normalizeAmount(transaction.amount).toFixed(2),
    normalizeText(transaction.description),
    normalizeText(transaction.payee),
    normalizeText(transaction.memo),
  ].join('|');
}

function hash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function buildImportExternalId(accountId: string, format: ImportFormat, transaction: ImportedTransactionRecord, fingerprint: string): string {
  const sourceKey = transaction.sourceId ? `src:${transaction.sourceId.trim()}` : `fp:${fingerprint}`;
  return `import:${accountId}:${format}:${hash(sourceKey)}`;
}

function normalizeCurrency(value: string | undefined): string {
  const candidate = value?.trim().toUpperCase();
  return candidate && /^[A-Z]{3}$/.test(candidate) ? candidate : 'USD';
}

function mapImportedAccountType(value: ImportedAccountType | undefined): SupportedAccountType | undefined {
  return value;
}

function mostRecentTransactionDate(transactions: ImportedTransactionRecord[]): Date {
  return transactions.reduce<Date>(
    (latest, transaction) => new Date(Math.max(latest.getTime(), transaction.posted.getTime())),
    new Date(0),
  );
}

function computedBalanceForTransactions(transactions: ImportedTransactionRecord[]): number {
  return normalizeAmount(transactions.reduce((sum, transaction) => sum + transaction.amount, 0));
}

async function resolveAccount(input: ImportTransactionsInput, parsedTransactions: ImportedTransactionRecord[], parsedMeta: {
  accountName?: string;
  institution?: string;
  currency?: string;
  accountType?: ImportedAccountType;
  endingBalance?: number;
}): Promise<ResolvedAccount> {
  if (input.accountId) {
    const account = await prisma.account.findUnique({
      where: { id: input.accountId },
      select: { id: true, name: true },
    });
    if (!account) {
      throw new AppError(404, 'Account not found', 'NOT_FOUND');
    }
    return {
      id: account.id,
      name: account.name,
      created: false,
    };
  }

  if (!input.newAccount?.name) {
    throw new AppError(400, 'Either accountId or newAccount.name is required', 'VALIDATION_ERROR');
  }

  const mostRecentPosted = mostRecentTransactionDate(parsedTransactions);
  const computedBalance = computedBalanceForTransactions(parsedTransactions);
  const startingBalance = typeof input.newAccount.balance === 'number'
    ? normalizeAmount(input.newAccount.balance)
    : parsedMeta.endingBalance ?? computedBalance;

  const created = await prisma.account.create({
    data: {
      externalId: `manual-import:${Date.now()}:${randomUUID()}`,
      name: input.newAccount.name.trim() || parsedMeta.accountName || 'Imported Account',
      institution: input.newAccount.institution ?? parsedMeta.institution ?? null,
      currency: normalizeCurrency(input.newAccount.currency ?? parsedMeta.currency),
      type: input.newAccount.type ?? mapImportedAccountType(parsedMeta.accountType) ?? 'CHECKING',
      balance: startingBalance,
      availableBalance: null,
      balanceDate: mostRecentPosted.getTime() > 0 ? mostRecentPosted : new Date(),
      isActive: true,
    },
    select: { id: true, name: true },
  });

  return {
    id: created.id,
    name: created.name,
    created: true,
  };
}

async function resolveImportedSourceAccount(parsedAccount: ImportedAccountReference, transactions: ImportedTransactionRecord[]): Promise<ResolvedAccount> {
  const existing = await prisma.account.findUnique({
    where: { externalId: parsedAccount.externalId },
    select: { id: true, name: true },
  });

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      created: false,
    };
  }

  const mostRecentPosted = mostRecentTransactionDate(transactions);
  const startingBalance = parsedAccount.endingBalance ?? computedBalanceForTransactions(transactions);

  const created = await prisma.account.create({
    data: {
      externalId: parsedAccount.externalId,
      name: parsedAccount.name,
      institution: parsedAccount.institution ?? null,
      currency: normalizeCurrency(parsedAccount.currency),
      type: mapImportedAccountType(parsedAccount.accountType) ?? 'OTHER',
      balance: startingBalance,
      availableBalance: null,
      balanceDate: mostRecentPosted.getTime() > 0 ? mostRecentPosted : new Date(),
      isActive: true,
    },
    select: { id: true, name: true },
  });

  return {
    id: created.id,
    name: created.name,
    created: true,
  };
}

function prepareImportRecords(
  accountId: string,
  format: ImportFormat,
  transactions: ImportedTransactionRecord[],
): PreparedImportRecord[] {
  const uniqueByExternal = new Set<string>();
  const uniqueByFingerprint = new Set<string>();
  const prepared: PreparedImportRecord[] = [];

  for (const transaction of transactions) {
    const description = transaction.description.trim() || transaction.payee || transaction.memo || 'Imported transaction';
    const normalized: ImportedTransactionRecord = {
      posted: new Date(transaction.posted),
      amount: normalizeAmount(transaction.amount),
      description,
      payee: transaction.payee ?? null,
      memo: transaction.memo ?? null,
      sourceId: transaction.sourceId,
    };

    if (Number.isNaN(normalized.posted.getTime())) continue;
    if (!Number.isFinite(normalized.amount)) continue;

    const fingerprint = transactionFingerprint(normalized);
    const externalId = buildImportExternalId(accountId, format, normalized, fingerprint);
    if (uniqueByExternal.has(externalId) || uniqueByFingerprint.has(fingerprint)) continue;

    uniqueByExternal.add(externalId);
    uniqueByFingerprint.add(fingerprint);
    prepared.push({
      ...normalized,
      fingerprint,
      externalId,
    });
  }

  return prepared;
}

async function importPreparedTransactions(account: ResolvedAccount, format: ImportFormat, transactions: ImportedTransactionRecord[]) {
  const prepared = prepareImportRecords(account.id, format, transactions);

  if (prepared.length === 0) {
    return {
      importedCount: 0,
      importedTransactionIds: [] as string[],
    };
  }

  const candidateExternalIds = prepared.map((transaction) => transaction.externalId);
  const existingByExternalId = await prisma.transaction.findMany({
    where: { externalId: { in: candidateExternalIds } },
    select: { externalId: true },
  });
  const existingExternalIdSet = new Set(existingByExternalId.map((transaction) => transaction.externalId));

  const postedDates = prepared.map((transaction) => transaction.posted);
  const earliestPosted = new Date(Math.min(...postedDates.map((date) => date.getTime())));
  const latestPosted = new Date(Math.max(...postedDates.map((date) => date.getTime())));

  const existingAccountTransactions = await prisma.transaction.findMany({
    where: {
      accountId: account.id,
      posted: { gte: earliestPosted, lte: latestPosted },
    },
    select: {
      posted: true,
      amount: true,
      description: true,
      payee: true,
      memo: true,
    },
  });

  const existingFingerprintSet = new Set(
    existingAccountTransactions.map((transaction) =>
      transactionFingerprint({
        posted: transaction.posted,
        amount: Number(transaction.amount),
        description: transaction.description,
        payee: transaction.payee,
        memo: transaction.memo,
      })),
  );

  const toInsert = prepared.filter((transaction) => {
    if (existingExternalIdSet.has(transaction.externalId)) return false;
    if (existingFingerprintSet.has(transaction.fingerprint)) return false;
    existingFingerprintSet.add(transaction.fingerprint);
    return true;
  });

  if (toInsert.length === 0) {
    return {
      importedCount: 0,
      importedTransactionIds: [] as string[],
    };
  }

  const creation = await prisma.transaction.createMany({
    data: toInsert.map((transaction) => ({
      externalId: transaction.externalId,
      accountId: account.id,
      posted: transaction.posted,
      amount: transaction.amount,
      description: transaction.description,
      payee: transaction.payee,
      memo: transaction.memo,
      isReviewed: false,
    })),
    skipDuplicates: true,
  });

  const insertedRows = await prisma.transaction.findMany({
    where: { externalId: { in: toInsert.map((transaction) => transaction.externalId) } },
    select: { id: true },
  });

  return {
    importedCount: creation.count,
    importedTransactionIds: insertedRows.map((transaction) => transaction.id),
  };
}

function groupTransactionsBySourceAccount(
  parsed: ParsedImportResult,
  input: ImportTransactionsInput,
): Map<string, { meta: ImportedAccountReference; transactions: ImportedTransactionRecord[] }> {
  const accountGroups = new Map<string, { meta: ImportedAccountReference; transactions: ImportedTransactionRecord[] }>();
  if (input.accountId || input.newAccount?.name) return accountGroups;

  for (const transaction of parsed.transactions) {
    const accountMeta = transaction.account;
    if (!accountMeta?.externalId) {
      throw new AppError(
        400,
        'accountId is required for existing accounts, accountName is required to create a new account, or the file must contain account metadata for multi-account import',
        'VALIDATION_ERROR',
      );
    }

    const existingGroup = accountGroups.get(accountMeta.externalId);
    if (existingGroup) existingGroup.transactions.push(transaction);
    else accountGroups.set(accountMeta.externalId, { meta: accountMeta, transactions: [transaction] });
  }

  return accountGroups;
}

async function resolveImportTargets(
  parsed: ParsedImportResult,
  input: ImportTransactionsInput,
  accountGroups: Map<string, { meta: ImportedAccountReference; transactions: ImportedTransactionRecord[] }>,
): Promise<Array<{ account: ResolvedAccount; transactions: ImportedTransactionRecord[] }>> {
  if (accountGroups.size > 0) {
    return Promise.all(
      Array.from(accountGroups.values()).map(async (group) => ({
        account: await resolveImportedSourceAccount(group.meta, group.transactions),
        transactions: group.transactions,
      })),
    );
  }

  return [{
    account: await resolveAccount(input, parsed.transactions, parsed),
    transactions: parsed.transactions,
  }];
}

export async function importTransactionsFromFile(input: ImportTransactionsInput): Promise<ImportTransactionsResult> {
  if (!input.fileBuffer.length) {
    throw new AppError(400, 'Import file is empty', 'VALIDATION_ERROR');
  }

  let parsed: ReturnType<typeof parseTransactionImportFile>;
  try {
    parsed = parseTransactionImportFile(input.fileBuffer, input.fileName, input.format);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(400, err instanceof Error ? err.message : 'Invalid import file', 'VALIDATION_ERROR');
  }
  const accountGroups = groupTransactionsBySourceAccount(parsed, input);
  const targets = await resolveImportTargets(parsed, input, accountGroups);

  let importedCount = 0;
  const importedTransactionIds: string[] = [];

  for (const target of targets) {
    const result = await importPreparedTransactions(target.account, parsed.format, target.transactions);
    importedCount += result.importedCount;
    importedTransactionIds.push(...result.importedTransactionIds);
  }

  await applyCategoryRulesToTransactions(importedTransactionIds);
  triggerTransactionCategorization(importedTransactionIds);

  const accounts = targets.map((target) => target.account);

  return {
    format: parsed.format,
    parsedCount: parsed.transactions.length,
    importedCount,
    skippedCount: parsed.transactions.length - importedCount,
    account: accounts.length === 1 ? accounts[0] : undefined,
    accounts,
    categorizationTriggered: true,
  };
}
