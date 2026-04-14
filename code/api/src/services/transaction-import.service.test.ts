import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    account: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

const { parserMock } = vi.hoisted(() => ({
  parserMock: {
    parseTransactionImportFile: vi.fn(),
  },
}));

const { categorizationMock } = vi.hoisted(() => ({
  categorizationMock: {
    triggerTransactionCategorization: vi.fn(),
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('./transaction-import/parsers', () => ({ parseTransactionImportFile: parserMock.parseTransactionImportFile }));
vi.mock('./categorization.service', () => ({ triggerTransactionCategorization: categorizationMock.triggerTransactionCategorization }));

import { AppError } from '../middleware/error-handler';
import { importTransactionsFromFile } from './transaction-import.service';

describe('transaction-import.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws validation error for empty files', async () => {
    await expect(
      importTransactionsFromFile({
        fileBuffer: Buffer.alloc(0),
        fileName: 'import.csv',
        accountId: 'a1',
      }),
    ).rejects.toBeInstanceOf(AppError);

    expect(parserMock.parseTransactionImportFile).not.toHaveBeenCalled();
  });

  it('maps parser failures to validation errors', async () => {
    parserMock.parseTransactionImportFile.mockImplementation(() => {
      throw new Error('Unsupported file extension ".txt".');
    });

    await expect(
      importTransactionsFromFile({
        fileBuffer: Buffer.from('bad', 'utf8'),
        fileName: 'import.txt',
        accountId: 'a1',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Unsupported file extension ".txt".',
    });
  });

  it('imports into a new account with in-file and existing dedupe', async () => {
    parserMock.parseTransactionImportFile.mockReturnValue({
      format: 'csv',
      transactions: [
        {
          posted: new Date('2026-01-10T00:00:00.000Z'),
          amount: -30.1,
          description: 'Coffee Store',
          payee: 'Cafe',
          memo: null,
          sourceId: 'fit-1',
        },
        {
          posted: new Date('2026-01-10T00:00:00.000Z'),
          amount: -30.1,
          description: 'Coffee Store',
          payee: 'Cafe',
          memo: null,
          sourceId: 'fit-duplicate',
        },
        {
          posted: new Date('2026-01-11T00:00:00.000Z'),
          amount: 1200,
          description: 'Paycheck',
          payee: 'Employer',
          memo: null,
          sourceId: 'fit-2',
        },
      ],
      accountName: 'Checking',
      institution: 'MyBank',
      currency: 'USD',
      accountType: 'CHECKING',
      endingBalance: 5000,
    });

    prismaMock.account.create.mockResolvedValue({ id: 'acc-new', name: 'Imported Checking' });
    prismaMock.transaction.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          posted: new Date('2026-01-10T00:00:00.000Z'),
          amount: -30.1,
          description: 'Coffee Store',
          payee: 'Cafe',
          memo: null,
        },
      ])
      .mockResolvedValueOnce([{ id: 'tx-new' }]);
    prismaMock.transaction.createMany.mockResolvedValue({ count: 1 });

    const result = await importTransactionsFromFile({
      fileBuffer: Buffer.from('csv-content', 'utf8'),
      fileName: 'import.csv',
      newAccount: { name: 'Imported Checking' },
    });

    expect(result).toEqual({
      format: 'csv',
      parsedCount: 3,
      importedCount: 1,
      skippedCount: 2,
      account: { id: 'acc-new', name: 'Imported Checking', created: true },
      accounts: [{ id: 'acc-new', name: 'Imported Checking', created: true }],
      categorizationTriggered: true,
    });
    expect(prismaMock.account.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.transaction.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            accountId: 'acc-new',
            description: 'Paycheck',
            amount: 1200,
          }),
        ],
        skipDuplicates: true,
      }),
    );
    expect(categorizationMock.triggerTransactionCategorization).toHaveBeenCalledWith(['tx-new']);
  });

  it('imports into an existing account and does not create a new account', async () => {
    parserMock.parseTransactionImportFile.mockReturnValue({
      format: 'ofx',
      transactions: [
        {
          posted: new Date('2026-02-01T00:00:00.000Z'),
          amount: -100,
          description: 'Utilities',
          payee: 'Power Co',
          memo: null,
          sourceId: 'fit-10',
        },
      ],
    });

    prismaMock.account.findUnique.mockResolvedValue({ id: 'acc-existing', name: 'Main Checking' });
    prismaMock.transaction.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'tx-10' }]);
    prismaMock.transaction.createMany.mockResolvedValue({ count: 1 });

    const result = await importTransactionsFromFile({
      fileBuffer: Buffer.from('ofx-content', 'utf8'),
      fileName: 'statement.ofx',
      accountId: 'acc-existing',
    });

    expect(result.account).toEqual({ id: 'acc-existing', name: 'Main Checking', created: false });
    expect(result.accounts).toEqual([{ id: 'acc-existing', name: 'Main Checking', created: false }]);
    expect(prismaMock.account.create).not.toHaveBeenCalled();
    expect(prismaMock.account.findUnique).toHaveBeenCalledWith({
      where: { id: 'acc-existing' },
      select: { id: true, name: true },
    });
  });

  it('skips records that already exist on re-import', async () => {
    parserMock.parseTransactionImportFile.mockReturnValue({
      format: 'ofx',
      transactions: [
        {
          posted: new Date('2026-02-01T00:00:00.000Z'),
          amount: -100,
          description: 'Utilities',
          payee: 'Power Co',
          memo: null,
          sourceId: 'fit-10',
        },
      ],
    });

    prismaMock.account.findUnique.mockResolvedValue({ id: 'acc-existing', name: 'Main Checking' });
    prismaMock.transaction.findMany
      .mockImplementationOnce(async (args: { where: { externalId: { in: string[] } } }) =>
        args.where.externalId.in.map((externalId) => ({ externalId })),
      )
      .mockResolvedValueOnce([]);

    const result = await importTransactionsFromFile({
      fileBuffer: Buffer.from('ofx-content', 'utf8'),
      fileName: 'statement.ofx',
      accountId: 'acc-existing',
    });

    expect(result.importedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.accounts).toEqual([{ id: 'acc-existing', name: 'Main Checking', created: false }]);
    expect(prismaMock.transaction.createMany).not.toHaveBeenCalled();
    expect(categorizationMock.triggerTransactionCategorization).toHaveBeenCalledWith([]);
  });

  it('imports XLSX rows across multiple accounts discovered from the file', async () => {
    parserMock.parseTransactionImportFile.mockReturnValue({
      format: 'xlsx',
      transactions: [
        {
          posted: new Date('2026-04-01T00:00:00.000Z'),
          amount: 44.93,
          description: 'Dividend payment',
          payee: 'VFV',
          memo: 'Dividends - DIV',
          sourceId: 'row-1',
          account: {
            externalId: 'excel-import:52600518:CAD',
            name: 'Individual family RESP 52600518 CAD',
            institution: 'Excel Import',
            currency: 'CAD',
            accountType: 'INVESTMENT',
          },
        },
        {
          posted: new Date('2026-04-02T00:00:00.000Z'),
          amount: -104.95,
          description: 'Share purchase',
          payee: 'NVDA',
          memo: 'Trades - Buy',
          sourceId: 'row-2',
          account: {
            externalId: 'excel-import:52516897:USD',
            name: 'Individual RRSP 52516897 USD',
            institution: 'Excel Import',
            currency: 'USD',
            accountType: 'INVESTMENT',
          },
        },
      ],
    });

    prismaMock.account.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaMock.account.create
      .mockResolvedValueOnce({ id: 'acc-resp', name: 'Individual family RESP 52600518 CAD' })
      .mockResolvedValueOnce({ id: 'acc-rrsp', name: 'Individual RRSP 52516897 USD' });
    prismaMock.transaction.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'tx-resp' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'tx-rrsp' }]);
    prismaMock.transaction.createMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    const result = await importTransactionsFromFile({
      fileBuffer: Buffer.from('xlsx-content', 'utf8'),
      fileName: 'activities.xlsx',
    });

    expect(result).toEqual({
      format: 'xlsx',
      parsedCount: 2,
      importedCount: 2,
      skippedCount: 0,
      account: undefined,
      accounts: [
        { id: 'acc-resp', name: 'Individual family RESP 52600518 CAD', created: true },
        { id: 'acc-rrsp', name: 'Individual RRSP 52516897 USD', created: true },
      ],
      categorizationTriggered: true,
    });
    expect(prismaMock.account.findUnique).toHaveBeenNthCalledWith(1, {
      where: { externalId: 'excel-import:52600518:CAD' },
      select: { id: true, name: true },
    });
    expect(prismaMock.account.findUnique).toHaveBeenNthCalledWith(2, {
      where: { externalId: 'excel-import:52516897:USD' },
      select: { id: true, name: true },
    });
    expect(categorizationMock.triggerTransactionCategorization).toHaveBeenCalledWith(['tx-resp', 'tx-rrsp']);
  });

  it('throws validation error when no destination is provided and the file has no account metadata', async () => {
    parserMock.parseTransactionImportFile.mockReturnValue({
      format: 'csv',
      transactions: [
        {
          posted: new Date('2026-01-10T00:00:00.000Z'),
          amount: 20,
          description: 'Deposit',
          payee: null,
          memo: null,
        },
      ],
    });

    await expect(
      importTransactionsFromFile({
        fileBuffer: Buffer.from('content', 'utf8'),
        fileName: 'import.csv',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws not found when importing into an unknown existing account', async () => {
    parserMock.parseTransactionImportFile.mockReturnValue({
      format: 'csv',
      transactions: [
        {
          posted: new Date('2026-01-10T00:00:00.000Z'),
          amount: 5,
          description: 'Refund',
          payee: null,
          memo: null,
        },
      ],
    });
    prismaMock.account.findUnique.mockResolvedValue(null);

    await expect(
      importTransactionsFromFile({
        fileBuffer: Buffer.from('content', 'utf8'),
        fileName: 'import.csv',
        accountId: 'missing',
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});
