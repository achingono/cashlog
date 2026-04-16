import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation';
import { deleteCategoryRule, listCategoryRules } from '../services/category-rule.service';

const router = Router();

const querySchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('20').transform(Number),
});

router.get('/', validate(querySchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit } = req.query as unknown as z.infer<typeof querySchema>;
    const result = await listCategoryRules(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteCategoryRule(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
