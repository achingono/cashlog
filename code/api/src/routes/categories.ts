import { Router } from 'express';
import { z } from 'zod';
import { getCategories, createCategory, updateCategory } from '../services/category.service';
import { validate } from '../middleware/validation';
import { AppError } from '../middleware/error-handler';

const router = Router();

const categorySchema = z.object({
  name: z.string().trim().min(1),
  icon: z.string().trim().optional(),
  color: z.string().trim().optional(),
  parentId: z.string().trim().min(1).optional(),
});

const updateCategorySchema = z.object({
  name: z.string().trim().min(1).optional(),
  icon: z.string().trim().nullable().optional(),
  color: z.string().trim().nullable().optional(),
  parentId: z.string().trim().min(1).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required',
});

router.get('/', async (_req, res, next) => {
  try {
    const categories = await getCategories();
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(categorySchema), async (req, res, next) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({ data: category });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(updateCategorySchema), async (req, res, next) => {
  try {
    const category = await updateCategory(req.params.id as string, req.body);
    if (!category) {
      throw new AppError(404, 'Category not found', 'NOT_FOUND');
    }
    res.json({ data: category });
  } catch (err) {
    next(err);
  }
});

export default router;
