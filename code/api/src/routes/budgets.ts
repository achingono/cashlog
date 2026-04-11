import { Router } from 'express';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../services/budget.service';
import { AppError } from '../middleware/error-handler';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const budgets = await getBudgets();
    res.json({ data: budgets });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { categoryId, amount, period, startDate, endDate } = req.body;
    if (!categoryId || !amount) {
      throw new AppError(400, 'categoryId and amount are required', 'VALIDATION_ERROR');
    }
    const budget = await createBudget({
      categoryId,
      amount,
      period: period || 'MONTHLY',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
    });
    res.status(201).json({ data: budget });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const budget = await updateBudget(req.params.id, req.body);
    res.json({ data: budget });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteBudget(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
