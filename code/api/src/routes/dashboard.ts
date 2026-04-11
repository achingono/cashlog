import { Router } from 'express';
import { getDashboardSummary, getTrends, getSpendingByCategory } from '../services/dashboard.service';

const router = Router();

router.get('/summary', async (_req, res, next) => {
  try {
    const summary = await getDashboardSummary();
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
});

router.get('/trends', async (req, res, next) => {
  try {
    const months = parseInt(req.query.period as string) || 6;
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
    const spending = await getSpendingByCategory(startDate, endDate);
    res.json({ data: spending });
  } catch (err) {
    next(err);
  }
});

export default router;
