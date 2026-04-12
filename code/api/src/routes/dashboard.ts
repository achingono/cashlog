import { Router } from 'express';
import { getDashboardSummary, getTrends, getSpendingByCategory } from '../services/dashboard.service';

const router = Router();

router.get('/summary', async (req, res, next) => {
  try {
    const accountId = req.query.accountId as string | undefined;
    const summary = await getDashboardSummary(accountId);
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
});

router.get('/trends', async (req, res, next) => {
  try {
    const periodParam = req.query.period as string | undefined;
    const months = periodParam && periodParam !== 'all' ? Number.parseInt(periodParam, 10) || 6 : undefined;
    const accountId = req.query.accountId as string | undefined;
    const trends = await getTrends(months, accountId);
    res.json({ data: trends });
  } catch (err) {
    next(err);
  }
});

router.get('/spending-by-category', async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const accountId = req.query.accountId as string | undefined;
    const spending = await getSpendingByCategory(startDate, endDate, accountId);
    res.json({ data: spending });
  } catch (err) {
    next(err);
  }
});

export default router;
