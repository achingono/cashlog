import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/error-handler';
import accountRoutes from './accounts';
import assetRoutes from './assets';
import budgetRoutes from './budgets';
import categoryRoutes from './categories';
import dashboardRoutes from './dashboard';
import goalRoutes from './goals';
import holdingRoutes from './holdings';
import reportRoutes from './reports';
import syncRoutes from './sync';
import transactionRoutes from './transactions';

const { accountServiceMock } = vi.hoisted(() => ({
  accountServiceMock: {
    getAllAccounts: vi.fn(),
    getAccountById: vi.fn(),
  },
}));
const { transactionServiceMock } = vi.hoisted(() => ({
  transactionServiceMock: {
    getTransactions: vi.fn(),
    getTransactionFilterCategories: vi.fn(),
    updateTransactionCategory: vi.fn(),
  },
}));
const { importServiceMock } = vi.hoisted(() => ({
  importServiceMock: {
    importTransactionsFromFile: vi.fn(),
  },
}));
const { dashboardServiceMock } = vi.hoisted(() => ({
  dashboardServiceMock: {
    getDashboardSummary: vi.fn(),
    getTrends: vi.fn(),
    getSpendingByCategory: vi.fn(),
  },
}));
const { holdingsServiceMock } = vi.hoisted(() => ({
  holdingsServiceMock: {
    getHoldings: vi.fn(),
    getHoldingsHistory: vi.fn(),
  },
}));
const { budgetServiceMock } = vi.hoisted(() => ({
  budgetServiceMock: {
    getBudgets: vi.fn(),
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
  },
}));
const { categoryServiceMock } = vi.hoisted(() => ({
  categoryServiceMock: {
    getCategories: vi.fn(),
    createCategory: vi.fn(),
  },
}));
const { reportServiceMock } = vi.hoisted(() => ({
  reportServiceMock: {
    getReports: vi.fn(),
    getReportById: vi.fn(),
  },
}));
const { pfsServiceMock } = vi.hoisted(() => ({
  pfsServiceMock: {
    generatePFS: vi.fn(),
  },
}));
const { syncServiceMock } = vi.hoisted(() => ({
  syncServiceMock: {
    getLatestSync: vi.fn(),
    getSyncHistory: vi.fn(),
  },
}));
const { assetServiceMock } = vi.hoisted(() => ({
  assetServiceMock: {
    getAssets: vi.fn(),
    getAssetById: vi.fn(),
    createAsset: vi.fn(),
    updateAsset: vi.fn(),
    deleteAsset: vi.fn(),
    addValuation: vi.fn(),
  },
}));
const { goalServiceMock } = vi.hoisted(() => ({
  goalServiceMock: {
    getGoals: vi.fn(),
    getGoalById: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    updateGoalStatus: vi.fn(),
    deleteGoal: vi.fn(),
  },
}));

vi.mock('../services/account.service', () => accountServiceMock);
vi.mock('../services/transaction.service', () => transactionServiceMock);
vi.mock('../services/transaction-import.service', () => importServiceMock);
vi.mock('../services/dashboard.service', () => dashboardServiceMock);
vi.mock('../services/holding.service', () => holdingsServiceMock);
vi.mock('../services/budget.service', () => budgetServiceMock);
vi.mock('../services/category.service', () => categoryServiceMock);
vi.mock('../services/report.service', () => reportServiceMock);
vi.mock('../services/pfs.service', () => pfsServiceMock);
vi.mock('../services/sync.service', () => syncServiceMock);
vi.mock('../services/asset.service', () => assetServiceMock);
vi.mock('../services/goal.service', () => goalServiceMock);

const app = express();
app.use(express.json());
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/holdings', holdingRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/goals', goalRoutes);
app.use(errorHandler);

describe('API route integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles account routes including not found', async () => {
    accountServiceMock.getAllAccounts.mockResolvedValue([{ id: 'a1' }]);
    accountServiceMock.getAccountById.mockResolvedValueOnce({ id: 'a1' }).mockResolvedValueOnce(null);

    await request(app).get('/api/accounts').expect(200).expect({ data: [{ id: 'a1' }] });
    await request(app).get('/api/accounts/a1').expect(200).expect({ data: { id: 'a1' } });
    await request(app).get('/api/accounts/missing').expect(404);
  });

  it('handles transaction routes with filters and patch validation', async () => {
    transactionServiceMock.getTransactions.mockResolvedValue({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });
    transactionServiceMock.getTransactionFilterCategories.mockResolvedValue([{ id: 'c1' }]);
    transactionServiceMock.updateTransactionCategory.mockResolvedValue({ id: 't1', categoryId: 'c1' });
    importServiceMock.importTransactionsFromFile.mockResolvedValue({
      format: 'csv',
      parsedCount: 2,
      importedCount: 1,
      skippedCount: 1,
      account: { id: 'a1', name: 'Imported', created: true },
      accounts: [{ id: 'a1', name: 'Imported', created: true }],
      categorizationTriggered: true,
    });

    await request(app).get('/api/transactions?search=coffee&page=1&limit=25').expect(200);
    await request(app).get('/api/transactions/filter-categories?search=coffee').expect(200).expect({ data: [{ id: 'c1' }] });
    await request(app).patch('/api/transactions/t1').send({ categoryId: 'c1' }).expect(200);
    await request(app).patch('/api/transactions/t1').send({}).expect(400);

    await request(app)
      .post('/api/transactions/import')
      .field('accountName', 'Imported Account')
      .attach('file', Buffer.from('Date,Amount,Description\n2026-01-01,10,Paycheck\n'), 'import.csv')
      .expect(201)
      .expect({
        data: {
          format: 'csv',
          parsedCount: 2,
          importedCount: 1,
          skippedCount: 1,
          account: { id: 'a1', name: 'Imported', created: true },
          accounts: [{ id: 'a1', name: 'Imported', created: true }],
          categorizationTriggered: true,
        },
      });
    expect(importServiceMock.importTransactionsFromFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'import.csv',
        accountId: undefined,
        newAccount: expect.objectContaining({
          name: 'Imported Account',
        }),
      }),
    );

    await request(app)
      .post('/api/transactions/import')
      .field('accountId', 'a1')
      .field('format', 'CSV')
      .attach('file', Buffer.from('Date,Amount,Description\n2026-01-01,10,Paycheck\n'), 'import.csv')
      .expect(201);
    expect(importServiceMock.importTransactionsFromFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'import.csv',
        accountId: 'a1',
        format: 'csv',
        newAccount: undefined,
      }),
    );

    await request(app)
      .post('/api/transactions/import')
      .expect(400);

    importServiceMock.importTransactionsFromFile.mockResolvedValueOnce({
      format: 'xlsx',
      parsedCount: 3,
      importedCount: 3,
      skippedCount: 0,
      account: undefined,
      accounts: [
        { id: 'a2', name: 'RRSP 52516897 USD', created: true },
        { id: 'a3', name: 'RESP 52600518 CAD', created: false },
      ],
      categorizationTriggered: true,
    });

    await request(app)
      .post('/api/transactions/import')
      .field('format', 'xlsx')
      .attach('file', Buffer.from('xlsx-binary'), 'activities.xlsx')
      .expect(201)
      .expect({
        data: {
          format: 'xlsx',
          parsedCount: 3,
          importedCount: 3,
          skippedCount: 0,
          account: undefined,
          accounts: [
            { id: 'a2', name: 'RRSP 52516897 USD', created: true },
            { id: 'a3', name: 'RESP 52600518 CAD', created: false },
          ],
          categorizationTriggered: true,
        },
      });
    expect(importServiceMock.importTransactionsFromFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'activities.xlsx',
        format: 'xlsx',
        accountId: undefined,
        newAccount: undefined,
      }),
    );

    await request(app)
      .post('/api/transactions/import')
      .field('accountName', 'Imported Account')
      .attach('file', Buffer.alloc(15 * 1024 * 1024 + 1, 1), 'too-large.csv')
      .expect(400);
  });

  it('handles dashboard and holdings routes', async () => {
    dashboardServiceMock.getDashboardSummary.mockResolvedValue({ netWorth: 1 });
    dashboardServiceMock.getTrends.mockResolvedValue([{ date: '2026-01-01', value: 10 }]);
    dashboardServiceMock.getSpendingByCategory.mockResolvedValue([{ total: 40 }]);
    holdingsServiceMock.getHoldings.mockResolvedValue({ netWorth: 5 });
    holdingsServiceMock.getHoldingsHistory.mockResolvedValue([{ date: '2026-01-01', value: 5 }]);

    await request(app).get('/api/dashboard/summary').expect(200).expect({ data: { netWorth: 1 } });
    await request(app).get('/api/dashboard/trends?period=6').expect(200);
    await request(app).get('/api/dashboard/spending-by-category').expect(200);
    await request(app).get('/api/holdings').expect(200).expect({ data: { netWorth: 5 } });
    await request(app).get('/api/holdings/history?period=12').expect(200);
  });

  it('handles budget, category, report and sync routes', async () => {
    budgetServiceMock.getBudgets.mockResolvedValue([{ id: 'b1' }]);
    budgetServiceMock.createBudget.mockResolvedValue({ id: 'b1' });
    budgetServiceMock.updateBudget.mockResolvedValue({ id: 'b1' });
    budgetServiceMock.deleteBudget.mockResolvedValue(undefined);
    categoryServiceMock.getCategories.mockResolvedValue([{ id: 'c1' }]);
    categoryServiceMock.createCategory.mockResolvedValue({ id: 'c2' });
    reportServiceMock.getReports.mockResolvedValue({ data: [{ id: 'r1' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } });
    reportServiceMock.getReportById.mockResolvedValueOnce({ id: 'r1' }).mockResolvedValueOnce(null);
    pfsServiceMock.generatePFS.mockResolvedValue({ id: 'pfs1', type: 'PERSONAL_FINANCIAL_STATEMENT' });
    syncServiceMock.getLatestSync.mockResolvedValue({ id: 's1' });
    syncServiceMock.getSyncHistory.mockResolvedValue([{ id: 's1' }]);

    await request(app).get('/api/budgets').expect(200);
    await request(app)
      .post('/api/budgets')
      .send({ categoryId: 'c1', amount: 100, period: 'MONTHLY', startDate: '2026-01-01' })
      .expect(201);
    await request(app).post('/api/budgets').send({ amount: -5 }).expect(400);
    await request(app).put('/api/budgets/b1').send({ amount: 120 }).expect(200);
    await request(app).delete('/api/budgets/b1').expect(204);

    await request(app).get('/api/categories').expect(200).expect({ data: [{ id: 'c1' }] });
    await request(app).post('/api/categories').send({ name: 'Travel' }).expect(201);

    await request(app).get('/api/reports?page=1&limit=10').expect(200);
    await request(app).get('/api/reports/r1').expect(200);
    await request(app).get('/api/reports/missing').expect(404);
    await request(app).post('/api/reports').expect(201).expect({ data: { id: 'pfs1', type: 'PERSONAL_FINANCIAL_STATEMENT' } });

    await request(app).get('/api/sync/status').expect(200).expect({ data: { id: 's1' } });
    await request(app).get('/api/sync/history?limit=5').expect(200).expect({ data: [{ id: 's1' }] });
    await request(app).post('/api/sync/trigger').expect(200);
  });

  it('handles assets and goals routes with validation and not found handling', async () => {
    assetServiceMock.getAssets.mockResolvedValue([{ id: 'asset1' }]);
    assetServiceMock.getAssetById.mockResolvedValueOnce({ id: 'asset1' }).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'asset1' });
    assetServiceMock.createAsset.mockResolvedValue({ id: 'asset1' });
    assetServiceMock.updateAsset.mockResolvedValue({ id: 'asset1' });
    assetServiceMock.deleteAsset.mockResolvedValue(undefined);
    assetServiceMock.addValuation.mockResolvedValue({ id: 'v1' });

    goalServiceMock.getGoals.mockResolvedValue([{ id: 'goal1' }]);
    goalServiceMock.getGoalById.mockResolvedValueOnce({ id: 'goal1' }).mockResolvedValueOnce(null);
    goalServiceMock.createGoal.mockResolvedValue({ id: 'goal1' });
    goalServiceMock.updateGoal.mockResolvedValue({ id: 'goal1' });
    goalServiceMock.updateGoalStatus.mockResolvedValue({ id: 'goal1', status: 'PAUSED' });
    goalServiceMock.deleteGoal.mockResolvedValue(undefined);

    await request(app).get('/api/assets').expect(200);
    await request(app).get('/api/assets/asset1').expect(200);
    await request(app).get('/api/assets/missing').expect(404);
    await request(app)
      .post('/api/assets')
      .send({ name: 'House', purchasePrice: 200000, currentValue: 250000, purchaseDate: '2026-01-01T00:00:00.000Z' })
      .expect(201);
    await request(app).put('/api/assets/asset1').send({ currentValue: 260000 }).expect(200);
    await request(app).delete('/api/assets/asset1').expect(204);
    await request(app).post('/api/assets/asset1/valuations').send({ value: 255000 }).expect(201);

    await request(app).get('/api/goals').expect(200);
    await request(app).get('/api/goals/goal1').expect(200);
    await request(app).get('/api/goals/missing').expect(404);
    await request(app)
      .post('/api/goals')
      .send({ name: 'Emergency', targetAmount: 1000, targetDate: '2026-06-01T00:00:00.000Z' })
      .expect(201);
    await request(app).post('/api/goals').send({ name: '', targetAmount: -1 }).expect(400);
    await request(app).put('/api/goals/goal1').send({ name: 'Emergency Fund' }).expect(200);
    await request(app).patch('/api/goals/goal1/status').send({ status: 'PAUSED' }).expect(200);
    await request(app).delete('/api/goals/goal1').expect(204);
  });
});
