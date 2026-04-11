import { Router } from 'express';
import { z } from 'zod';
import { getTransactions, updateTransactionCategory } from '../services/transaction.service';
import { validate } from '../middleware/validation';
import { AppError } from '../middleware/error-handler';

const router = Router();

const querySchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.string().default('1').transform(Number),
  limit: z.string().default('50').transform(Number),
});

router.get('/', validate(querySchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, startDate, endDate, ...rest } = req.query as any;
    const result = await getTransactions(
      {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      page,
      limit
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { categoryId } = req.body;
    if (!categoryId) {
      throw new AppError(400, 'categoryId is required', 'VALIDATION_ERROR');
    }
    const updated = await updateTransactionCategory(req.params.id, categoryId);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
