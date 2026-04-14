import { Router } from 'express';
import { z, ZodError } from 'zod';
import { getAllAccounts, getAccountById, updateAccountBalance } from '../services/account.service';
import { AppError } from '../middleware/error-handler';

const router = Router();

const balanceUpdateSchema = z.object({
  balance: z.number().finite(),
  availableBalance: z.number().finite().nullable().optional(),
  balanceDate: z.string().datetime().optional(),
});

router.get('/', async (_req, res, next) => {
  try {
    const accounts = await getAllAccounts();
    res.json({ data: accounts });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const account = await getAccountById(req.params.id);
    if (!account) {
      throw new AppError(404, 'Account not found', 'NOT_FOUND');
    }
    res.json({ data: account });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/balance', async (req, res, next) => {
  try {
    const body = balanceUpdateSchema.parse(req.body);
    const account = await updateAccountBalance(req.params.id, {
      balance: body.balance,
      availableBalance: body.availableBalance,
      balanceDate: body.balanceDate ? new Date(body.balanceDate) : undefined,
    });

    if (!account) {
      throw new AppError(404, 'Account not found', 'NOT_FOUND');
    }

    res.json({ data: account });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: err.errors,
        },
      });
      return;
    }

    next(err);
  }
});

export default router;
