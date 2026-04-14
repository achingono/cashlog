import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionImportDialog } from './TransactionImportDialog';
import type { TransactionImportResult } from '@/types';

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    importTransactions: vi.fn(),
  },
}));

vi.mock('@/lib/api', () => ({ api: apiMock }));

const importResult: TransactionImportResult = {
  format: 'csv',
  parsedCount: 3,
  importedCount: 2,
  skippedCount: 1,
  account: {
    id: 'acc-1',
    name: 'Checking',
    created: false,
  },
  accounts: [{
    id: 'acc-1',
    name: 'Checking',
    created: false,
  }],
  categorizationTriggered: true,
};

describe('TransactionImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.importTransactions.mockResolvedValue({ data: importResult });
  });

  it('submits an import to an existing account', async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();

    render(
      <TransactionImportDialog
        open
        accounts={[{ id: 'acc-1', name: 'Checking', institution: 'Bank', type: 'CHECKING', currency: 'USD', balance: 0, availableBalance: null, balanceDate: '2026-01-01T00:00:00.000Z', transactionCount: 0 }]}
        onClose={vi.fn()}
        onImported={onImported}
      />,
    );

    await user.upload(
      screen.getByLabelText(/statement file/i),
      new File(['Date,Amount,Description\n2026-01-01,12.30,Coffee\n'], 'statement.csv', { type: 'text/csv' }),
    );

    await user.click(screen.getByRole('combobox', { name: /account/i }));
    await user.click(await screen.findByText('Checking (Bank)'));
    await user.click(screen.getByRole('button', { name: /import file/i }));

    await waitFor(() => expect(apiMock.importTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'acc-1',
        format: undefined,
      }),
    ));
    await waitFor(() => expect(onImported).toHaveBeenCalledWith(importResult));
  });

  it('submits a new-account import with account details', async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();

    render(
      <TransactionImportDialog
        open
        accounts={[]}
        onClose={vi.fn()}
        onImported={onImported}
      />,
    );

    await user.upload(
      screen.getByLabelText(/statement file/i),
      new File(['<OFX></OFX>'], 'statement.ofx', { type: 'application/octet-stream' }),
    );
    await user.type(screen.getByLabelText(/account name/i), 'Imported Checking');
    await user.type(screen.getByLabelText(/institution/i), 'Bank');
    await user.clear(screen.getByLabelText(/currency/i));
    await user.type(screen.getByLabelText(/currency/i), 'eur');
    await user.type(screen.getByLabelText(/starting balance/i), '1500.45');
    await user.click(screen.getByRole('button', { name: /import file/i }));

    await waitFor(() => expect(apiMock.importTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        accountName: 'Imported Checking',
        institution: 'Bank',
        currency: 'EUR',
        accountType: 'CHECKING',
        accountBalance: 1500.45,
      }),
    ));
    await waitFor(() => expect(onImported).toHaveBeenCalledWith(importResult));
  });

  it('submits an Excel import using accounts discovered from the file', async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();

    render(
      <TransactionImportDialog
        open
        accounts={[{ id: 'acc-1', name: 'Checking', institution: 'Bank', type: 'CHECKING', currency: 'USD', balance: 0, availableBalance: null, balanceDate: '2026-01-01T00:00:00.000Z', transactionCount: 0 }]}
        onClose={vi.fn()}
        onImported={onImported}
      />,
    );

    await user.upload(
      screen.getByLabelText(/statement file/i),
      new File(['excel-content'], 'activities.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    );
    await user.click(screen.getByRole('button', { name: /from file/i }));
    await user.click(screen.getByRole('button', { name: /import file/i }));

    await waitFor(() => expect(apiMock.importTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: undefined,
        accountName: undefined,
        format: undefined,
      }),
    ));
    await waitFor(() => expect(onImported).toHaveBeenCalledWith(importResult));
  });
});