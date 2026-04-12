import { Router } from 'express';
import { getHoldings, getHoldingsHistory } from '../services/holding.service';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const holdings = await getHoldings();
    res.json({ data: holdings });
  } catch (err) {
    next(err);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const periodParam = req.query.period as string | undefined;
    const months = periodParam && periodParam !== 'all' ? parseInt(periodParam) || 12 : undefined;
    const history = await getHoldingsHistory(months);
    res.json({ data: history });
  } catch (err) {
    next(err);
  }
});

export default router;
