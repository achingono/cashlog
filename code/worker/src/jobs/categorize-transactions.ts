import prisma from '../lib/prisma';
import openai, { getMissingAzureOpenAIConfig } from '../lib/openai';
import { buildCategorizationPrompt } from '../prompts/categorize';

const BATCH_SIZE = 30;

export async function categorizeTransactions(): Promise<number> {
  console.log('[Categorize] Starting transaction categorization...');
  const missingConfig = getMissingAzureOpenAIConfig();
  if (missingConfig.length > 0) {
    console.warn(`[Categorize] Skipping: missing Azure OpenAI config (${missingConfig.join(', ')})`);
    return 0;
  }

  const categories = await prisma.category.findMany({
    where: { children: { none: {} } }, // Leaf categories: includes top-level categories with no children
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
  const validCategoryIds = new Set(categories.map(c => c.id));
  const categoryIdByName = new Map(
    categories.map(c => [c.name.trim().toLowerCase(), c.id] as const)
  );

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
        model: process.env.AZURE_OPENAI_DEPLOYMENT!,
        messages: [{ role: 'user', content: prompt }],
        temperature: process.env.AZURE_OPENAI_TEMPERATURE ? Number(process.env.AZURE_OPENAI_TEMPERATURE) : 1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      type Assignment = { transactionId?: string; categoryId?: string; categoryName?: string };
      let assignments: Assignment[] = [];
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        assignments = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.assignments)) assignments = parsed.assignments;
        else if (Array.isArray(parsed.results)) assignments = parsed.results;
        else if (parsed.transactionId && (parsed.categoryId || parsed.categoryName)) assignments = [parsed];
      }

      for (const assignment of assignments) {
        if (!assignment.transactionId) continue;

        let resolvedCategoryId: string | undefined;
        if (assignment.categoryId && validCategoryIds.has(assignment.categoryId)) {
          resolvedCategoryId = assignment.categoryId;
        } else if (assignment.categoryName) {
          resolvedCategoryId = categoryIdByName.get(assignment.categoryName.trim().toLowerCase());
        }

        if (!resolvedCategoryId) continue;

        await prisma.transaction.update({
          where: { id: assignment.transactionId },
          data: { categoryId: resolvedCategoryId },
        }).catch(() => {
          // Skip if transaction not found
        });
        categorized++;
      }

      console.log(`[Categorize] Batch ${Math.floor(i / BATCH_SIZE) + 1}: categorized ${assignments.length} transactions`);
    } catch (err) {
      if ((err as { code?: string }).code === 'DeploymentNotFound') {
        console.error(
          `[Categorize] Azure deployment not found: "${process.env.AZURE_OPENAI_DEPLOYMENT}". ` +
          'Set AZURE_OPENAI_DEPLOYMENT to your exact Azure deployment name.'
        );
      }
      console.error(`[Categorize] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err);
    }
  }

  console.log(`[Categorize] Total categorized: ${categorized}`);
  return categorized;
}
