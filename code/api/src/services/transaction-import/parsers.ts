import path from 'path';
import { parse as parseCsvRecords } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export type ImportFormat = 'ofx' | 'qfx' | 'csv' | 'xlsx';
export type ImportedAccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'LOAN' | 'MORTGAGE' | 'OTHER';

export interface ImportedAccountReference {
  externalId: string;
  name: string;
  institution?: string;
  currency?: string;
  accountType?: ImportedAccountType;
  endingBalance?: number;
}

export interface ImportedTransactionRecord {
  posted: Date;
  amount: number;
  description: string;
  payee: string | null;
  memo: string | null;
  sourceId?: string;
  account?: ImportedAccountReference;
}

export interface ParsedTransactionFile {
  format: ImportFormat;
  accountName?: string;
  institution?: string;
  currency?: string;
  accountType?: ImportedAccountType;
  endingBalance?: number;
  accounts?: ImportedAccountReference[];
  transactions: ImportedTransactionRecord[];
}

interface TransactionFileParser {
  readonly format: ImportFormat;
  parse(content: Buffer): ParsedTransactionFile;
}

const ACCOUNT_TYPE_MAP: Record<string, ImportedAccountType> = {
  CHECKING: 'CHECKING',
  SAVINGS: 'SAVINGS',
  CREDITLINE: 'CREDIT_CARD',
  CREDITCARD: 'CREDIT_CARD',
  INVESTMENT: 'INVESTMENT',
  MONEYMRKT: 'SAVINGS',
  MORTGAGE: 'MORTGAGE',
  LOAN: 'LOAN',
  OTHER: 'OTHER',
};

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseFlexibleAmount(raw: string): number {
  const trimmed = raw.trim();
  const negativeByParens = /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed
    .replace(/[,$\s]/g, '')
    .replace(/[()]/g, '')
    .replace(/CR$/i, '')
    .replace(/DR$/i, '');
  const amount = Number(cleaned);
  if (Number.isNaN(amount)) {
    throw new Error(`Invalid amount value: "${raw}"`);
  }
  return negativeByParens ? -Math.abs(amount) : amount;
}

function parseFlexibleDate(raw: string): Date {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: "${raw}"`);
  }
  return parsed;
}

function normalizeCurrency(value: string | undefined): string | undefined {
  const candidate = value?.trim().toUpperCase();
  return candidate && /^[A-Z]{3}$/.test(candidate) ? candidate : undefined;
}

function parseOfxDate(raw: string): Date {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length < 8) {
    throw new Error(`Invalid OFX date value: "${raw}"`);
  }

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const hour = digits.length >= 10 ? Number(digits.slice(8, 10)) : 0;
  const minute = digits.length >= 12 ? Number(digits.slice(10, 12)) : 0;
  const second = digits.length >= 14 ? Number(digits.slice(12, 14)) : 0;

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

function tagValue(content: string, tagName: string): string | undefined {
  const match = content.match(new RegExp(`<${tagName}>([^<\\r\\n]+)`, 'i'));
  return nonEmpty(match?.[1]);
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function buildNormalizedRow(row: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeader(key)] = String(value ?? '').trim();
  }
  return normalized;
}

function rowValue(row: Record<string, string>, aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const value = nonEmpty(row[normalizeHeader(alias)]);
    if (value) return value;
  }
  return undefined;
}

function parseExcelDate(raw: unknown): Date {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw;
  }

  if (typeof raw === 'number') {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (!parsed) {
      throw new Error(`Invalid Excel date value: "${raw}"`);
    }
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H ?? 0, parsed.M ?? 0, parsed.S ?? 0));
  }

  return parseFlexibleDate(String(raw));
}

function mapExcelAccountType(raw: string | undefined): ImportedAccountType | undefined {
  const normalized = normalizeHeader(raw ?? '');
  if (!normalized) return undefined;
  if (normalized.includes('checking')) return 'CHECKING';
  if (normalized.includes('saving')) return 'SAVINGS';
  if (normalized.includes('credit')) return 'CREDIT_CARD';
  if (normalized.includes('mortgage')) return 'MORTGAGE';
  if (normalized.includes('loan')) return 'LOAN';
  if (normalized.includes('rrsp') || normalized.includes('resp') || normalized.includes('tfsa') || normalized.includes('investment') || normalized.includes('brokerage')) {
    return 'INVESTMENT';
  }
  return 'OTHER';
}

function buildExcelAccountReference(row: Record<string, string>): ImportedAccountReference | undefined {
  const accountNumber = rowValue(row, ['account #', 'account number', 'account']);
  if (!accountNumber) return undefined;

  const currency = normalizeCurrency(rowValue(row, ['currency'])) ?? 'USD';
  const accountTypeLabel = rowValue(row, ['account type']) ?? 'Investment Account';

  return {
    externalId: `excel-import:${accountNumber}:${currency}`,
    name: `${accountTypeLabel} ${accountNumber} ${currency}`,
    institution: 'Excel Import',
    currency,
    accountType: mapExcelAccountType(accountTypeLabel),
  };
}

function buildExcelSourceId(row: Record<string, string>, account: ImportedAccountReference | undefined): string {
  return [
    rowValue(row, ['transaction date', 'date']) ?? '',
    rowValue(row, ['settlement date']) ?? '',
    rowValue(row, ['action']) ?? '',
    rowValue(row, ['symbol']) ?? '',
    rowValue(row, ['description']) ?? '',
    rowValue(row, ['quantity']) ?? '',
    rowValue(row, ['price']) ?? '',
    rowValue(row, ['gross amount']) ?? '',
    rowValue(row, ['commission']) ?? '',
    rowValue(row, ['net amount']) ?? '',
    account?.externalId ?? '',
  ].join('|');
}

function parseCsvTransactionFile(content: Buffer): ParsedTransactionFile {
  const records = parseCsvRecords(content.toString('utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  }) as Array<Record<string, unknown>>;

  const transactions: ImportedTransactionRecord[] = [];

  for (const record of records) {
    const row = buildNormalizedRow(record);
    const dateValue = rowValue(row, ['date', 'posted', 'post date', 'posting date', 'transaction date']);
    if (!dateValue) continue;

    const amountValue = rowValue(row, ['amount', 'transaction amount', 'amt']);
    const debitValue = rowValue(row, ['debit', 'withdrawal', 'withdrawals']);
    const creditValue = rowValue(row, ['credit', 'deposit', 'deposits']);

    let amount: number;
    if (amountValue) {
      amount = parseFlexibleAmount(amountValue);
    } else {
      const debit = debitValue ? Math.abs(parseFlexibleAmount(debitValue)) : 0;
      const credit = creditValue ? Math.abs(parseFlexibleAmount(creditValue)) : 0;
      amount = credit - debit;
      if (amount === 0 && !debitValue && !creditValue) continue;
    }

    const payee = rowValue(row, ['payee', 'merchant']);
    const memo = rowValue(row, ['memo', 'notes', 'note']);
    const description = rowValue(row, ['description', 'narration', 'details', 'name']) ?? payee ?? memo ?? 'Imported transaction';
    const sourceId = rowValue(row, ['id', 'transaction id', 'transactionid', 'fitid', 'reference', 'check number']);

    transactions.push({
      posted: parseFlexibleDate(dateValue),
      amount,
      description,
      payee: payee ?? null,
      memo: memo ?? null,
      sourceId,
    });
  }

  return {
    format: 'csv',
    transactions,
  };
}

function parseExcelTransactionFile(content: Buffer): ParsedTransactionFile {
  const workbook = XLSX.read(content, {
    type: 'buffer',
    cellDates: true,
  });

  const transactions: ImportedTransactionRecord[] = [];
  const accounts = new Map<string, ImportedAccountReference>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });

    for (const record of records) {
      const row = buildNormalizedRow(record);
      const dateValue = rowValue(row, ['transaction date', 'settlement date', 'date']);
      if (!dateValue) continue;

      const amountValue = rowValue(row, ['net amount', 'amount', 'gross amount']);
      if (!amountValue) continue;

      const amount = parseFlexibleAmount(amountValue);
      if (amount === 0) continue;

      const account = buildExcelAccountReference(row);
      if (account) {
        accounts.set(account.externalId, account);
      }

      const symbol = rowValue(row, ['symbol']);
      const action = rowValue(row, ['action']);
      const activityType = rowValue(row, ['activity type']);
      const description = rowValue(row, ['description']) ?? symbol ?? activityType ?? action ?? 'Imported transaction';
      const memoParts = [activityType, action].filter(Boolean);

      transactions.push({
        posted: parseExcelDate(record['Transaction Date'] ?? record['Settlement Date'] ?? dateValue),
        amount,
        description,
        payee: symbol ?? null,
        memo: memoParts.length > 0 ? memoParts.join(' - ') : null,
        sourceId: buildExcelSourceId(row, account),
        account,
      });
    }
  }

  return {
    format: 'xlsx',
    accounts: Array.from(accounts.values()),
    transactions,
  };
}

function parseOfxLikeTransactionFile(content: Buffer, format: 'ofx' | 'qfx'): ParsedTransactionFile {
  const ofxContent = content.toString('utf8');
  const transactionBlocks = ofxContent.split(/<STMTTRN>/i).slice(1);
  const transactions: ImportedTransactionRecord[] = [];

  for (const rawBlock of transactionBlocks) {
    const block = rawBlock.split(/<\/STMTTRN>/i)[0] ?? rawBlock;
    const postedRaw = tagValue(block, 'DTPOSTED');
    const amountRaw = tagValue(block, 'TRNAMT');
    if (!postedRaw || !amountRaw) continue;

    const payee = tagValue(block, 'PAYEE');
    const memo = tagValue(block, 'MEMO');
    const description = tagValue(block, 'NAME') ?? memo ?? payee ?? tagValue(block, 'TRNTYPE') ?? 'Imported transaction';
    const sourceId = tagValue(block, 'FITID');

    transactions.push({
      posted: parseOfxDate(postedRaw),
      amount: parseFlexibleAmount(amountRaw),
      description,
      payee: payee ?? null,
      memo: memo ?? null,
      sourceId,
    });
  }

  const accountTypeRaw = tagValue(ofxContent, 'ACCTTYPE');
  const accountType = accountTypeRaw ? ACCOUNT_TYPE_MAP[accountTypeRaw.toUpperCase()] : undefined;
  const accountName = tagValue(ofxContent, 'ACCTID');
  const institution = tagValue(ofxContent, 'ORG');
  const currency = tagValue(ofxContent, 'CURDEF');

  const ledgerSection = ofxContent.match(/<LEDGERBAL>[\s\S]*?<\/LEDGERBAL>/i)?.[0] ?? ofxContent;
  const endingBalanceRaw = tagValue(ledgerSection, 'BALAMT');
  const endingBalance = endingBalanceRaw ? parseFlexibleAmount(endingBalanceRaw) : undefined;

  return {
    format,
    accountName,
    institution,
    currency,
    accountType,
    endingBalance,
    transactions,
  };
}

const csvParser: TransactionFileParser = {
  format: 'csv',
  parse: parseCsvTransactionFile,
};

const ofxParser: TransactionFileParser = {
  format: 'ofx',
  parse: (content) => parseOfxLikeTransactionFile(content, 'ofx'),
};

const qfxParser: TransactionFileParser = {
  format: 'qfx',
  parse: (content) => parseOfxLikeTransactionFile(content, 'qfx'),
};

const xlsxParser: TransactionFileParser = {
  format: 'xlsx',
  parse: parseExcelTransactionFile,
};

const parserByFormat: Record<ImportFormat, TransactionFileParser> = {
  csv: csvParser,
  ofx: ofxParser,
  qfx: qfxParser,
  xlsx: xlsxParser,
};

function detectFormat(fileName: string, requestedFormat?: ImportFormat): ImportFormat {
  if (requestedFormat) return requestedFormat;
  const extension = path.extname(fileName).toLowerCase();
  if (extension === '.csv') return 'csv';
  if (extension === '.ofx') return 'ofx';
  if (extension === '.qfx') return 'qfx';
  if (extension === '.xlsx' || extension === '.xls') return 'xlsx';
  throw new Error(`Unsupported file extension "${extension || 'unknown'}". Supported formats: OFX, QFX, CSV, XLSX.`);
}

export function parseTransactionImportFile(content: Buffer, fileName: string, requestedFormat?: ImportFormat): ParsedTransactionFile {
  const format = detectFormat(fileName, requestedFormat);
  const parser = parserByFormat[format];
  const parsed = parser.parse(content);

  if (parsed.transactions.length === 0) {
    throw new Error(`No transactions were found in the ${format.toUpperCase()} file.`);
  }

  return parsed;
}
