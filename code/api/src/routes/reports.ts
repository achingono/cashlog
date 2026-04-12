import { Router } from 'express';
import { getReports, getReportById } from '../services/report.service';
import { AppError } from '../middleware/error-handler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page as string, 10) || 1;
    const limit = Number.parseInt(req.query.limit as string, 10) || 10;
    const result = await getReports(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const report = await getReportById(req.params.id);
    if (!report) {
      throw new AppError(404, 'Report not found', 'NOT_FOUND');
    }
    res.json({ data: report });
  } catch (err) {
    next(err);
  }
});

export default router;
