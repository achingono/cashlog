import { Router } from 'express';
import { z } from 'zod';
import { getGoals, getGoalById, createGoal, updateGoal, updateGoalStatus, deleteGoal } from '../services/goal.service';
import { validate } from '../middleware/validation';
import { AppError } from '../middleware/error-handler';

const router = Router();

const createGoalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  icon: z.string().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
  accountIds: z.array(z.string()).optional(),
});

const updateGoalSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().datetime().nullable().optional().transform((v) => v ? new Date(v) : undefined),
  icon: z.string().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
  accountIds: z.array(z.string()).optional(),
});

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']),
});

router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const goals = await getGoals(status);
    res.json({ data: goals });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const goal = await getGoalById(id);
    if (!goal) throw new AppError(404, 'Goal not found', 'NOT_FOUND');
    res.json({ data: goal });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createGoalSchema, 'body'), async (req, res, next) => {
  try {
    const goal = await createGoal(req.body);
    res.status(201).json({ data: goal });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', validate(updateGoalSchema, 'body'), async (req, res, next) => {
  try {
    const goal = await updateGoal(req.params.id as string, req.body);
    res.json({ data: goal });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', validate(statusSchema, 'body'), async (req, res, next) => {
  try {
    const goal = await updateGoalStatus(req.params.id as string, req.body.status);
    res.json({ data: goal });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteGoal(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
