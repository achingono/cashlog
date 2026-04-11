import { Router } from 'express';
import { getAllAccounts, getAccountById } from '../services/account.service';
import { AppError } from '../middleware/error-handler';

const router = Router();

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

export default router;
