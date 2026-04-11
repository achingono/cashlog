import { Router } from 'express';
import { getCategories, createCategory } from '../services/category.service';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const categories = await getCategories();
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({ data: category });
  } catch (err) {
    next(err);
  }
});

export default router;
