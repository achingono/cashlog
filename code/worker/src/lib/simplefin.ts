import { execSync } from 'node:child_process';

export interface SFAccount {
  id: string;
  name: string;
  currency: string;
  balance: string;
  'available-balance'?: string;
  'balance-date': number;
  org: {
    domain?: string;
    name?: string;
    url?: string;
    sfin_url?: string;
  };
}

export interface SFTransaction {
  id: string;
  accountId: string;
  accountName: string;
  currency: string;
  posted: number;
  amount: string;
  description: string;
  payee?: string;
  memo?: string;
}

interface SFError {
  code: string;
  message: string;
}

export interface SFAccountsResult {
  ok: boolean;
  accounts?: SFAccount[];
  errors?: string[];
  error?: SFError;
}

export interface SFTransactionsResult {
  ok: boolean;
  transactions?: SFTransaction[];
  errors?: string[];
  error?: SFError;
}

export function fetchAccounts(): SFAccountsResult {
  try {
    const cmd = 'simplefin-cli accounts';
    const result = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 60000,
      env: { ...process.env },
    });
    return JSON.parse(result);
  } catch (err) {
    console.error('[SimpleFin] Failed to fetch accounts:', err);
    return { ok: false, error: { code: 'FETCH_ERROR', message: String(err) } };
  }
}

export function fetchTransactions(startDate?: string, endDate?: string): SFTransactionsResult {
  try {
    let cmd = 'simplefin-cli transactions';
    if (startDate) cmd += ` --start-date ${startDate}`;
    if (endDate) cmd += ` --end-date ${endDate}`;

    const result = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 120000,
      env: { ...process.env },
    });
    return JSON.parse(result);
  } catch (err) {
    console.error('[SimpleFin] Failed to fetch transactions:', err);
    return { ok: false, error: { code: 'FETCH_ERROR', message: String(err) } };
  }
}

export function fetchTransactionsForAccount(accountId: string, startDate?: string, endDate?: string): SFTransactionsResult {
  try {
    let cmd = `simplefin-cli transactions --account-id ${accountId}`;
    if (startDate) cmd += ` --start-date ${startDate}`;
    if (endDate) cmd += ` --end-date ${endDate}`;

    const result = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 120000,
      env: { ...process.env },
    });
    return JSON.parse(result);
  } catch (err) {
    console.error('[SimpleFin] Failed to fetch account transactions:', err);
    return { ok: false, error: { code: 'FETCH_ERROR', message: String(err) } };
  }
}
