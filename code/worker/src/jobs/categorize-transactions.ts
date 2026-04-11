import prisma from '../lib/prisma';
import openai from '../lib/openai';
import { buildCategorizationPrompt } from '../prompts/categorize';

const BATCH_SIZE = 30;

export async function categorizeTransactions(): Promise<number> {
  console.log('[Categorize] Starting transaction categorization...');

  const categories = await prisma.category.findMany({
    where: { parentId: { not: null } }, // Only leaf categories
  });

  if (categories.length === 0) {
    console.log('[Categorize] No categories found, skipping');
    return 0;
  }

  const uncategorized = await prisma.transaction.findMany({
    where: {
      categoryId: null,
      isReviewed: false,
    },
    orderBy: { posted: 'desc' },
    take: BATCH_SIZE * 3, // Process up to 3 batches per run
  });

  if (uncategorized.length === 0) {
    console.log('[Categorize] No uncategorized transactions found');
    return 0;
  }

  let categorized = 0;

  for (let i = 0; i < uncategorized.length; i += BATCH_SIZE) {
    const batch = uncategorized.slice(i, i + BATCH_SIZE);
    const prompt = buildCategorizationPrompt(
      categories.map(c => ({ name: c.name, id: c.id })),
      batch.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount.toString(),
        payee: t.payee || undefined,
      }))
    );

    try {
      const response = await openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      // Parse response - handle both array and object wrapper
      let assignments: { transactionId: string; categoryId: string }[];
      const parsed = JSON.parse(content);
      assignments = Array.isArray(parsed) ? parsed : parsed.assignments || parsed.results || [];

      const validCategoryIds = new Set(categories.map(c => c.id));

      for (const assignment of assignments) {
        if (assignment.transactionId && assignment.categoryId && validCategoryIds.has(assignment.categoryId)) {
          await prisma.transaction.update({
            where: { id: assignment.transactionId },
            data: { categoryId: assignment.categoryId },
          }).catch(() => {
            // Skip if transaction not found
          });
          categorized++;
        }
      }

      console.log(`[Categorize] Batch ${Math.floor(i / BATCH_SIZE) + 1}: categorized ${assignments.length} transactions`);
    } catch (err) {
      console.error(`[Categorize] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err);
    }
  }

  console.log(`[Categorize] Total categorized: ${categorized}`);
  return categorized;
}
