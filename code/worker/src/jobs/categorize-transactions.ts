import prisma from '../lib/prisma';
import openai, { getMissingAzureOpenAIConfig } from '../lib/openai';
import { buildCategorizationPrompt } from '../prompts/categorize';

const BATCH_SIZE = 30;

type Assignment = {
  transactionId?: string;
  categoryId?: string;
  categoryName?: string;
};

function parseAssignments(content: string): Assignment[] {
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!parsed || typeof parsed !== 'object') {
    return [];
  }

  if (Array.isArray(parsed.assignments)) {
    return parsed.assignments;
  }

  if (Array.isArray(parsed.results)) {
    return parsed.results;
  }

  if (parsed.transactionId && (parsed.categoryId || parsed.categoryName)) {
    return [parsed];
  }

  return [];
}

function resolveCategoryId(
  assignment: Assignment,
  validCategoryIds: Set<string>,
  categoryIdByName: Map<string, string>
): string | undefined {
  if (assignment.categoryId && validCategoryIds.has(assignment.categoryId)) {
    return assignment.categoryId;
  }

  if (!assignment.categoryName) {
    return undefined;
  }

  return categoryIdByName.get(assignment.categoryName.trim().toLowerCase());
}

function getTemperature(): number {
  if (!process.env.AZURE_OPENAI_TEMPERATURE) {
    return 1;
  }
  return Number(process.env.AZURE_OPENAI_TEMPERATURE);
}

async function categorizeBatch(
  assignments: Assignment[],
  validCategoryIds: Set<string>,
  categoryIdByName: Map<string, string>
): Promise<number> {
  let categorized = 0;
  for (const assignment of assignments) {
    if (!assignment.transactionId) continue;

    const resolvedCategoryId = resolveCategoryId(
      assignment,
      validCategoryIds,
      categoryIdByName
    );
    if (!resolvedCategoryId) continue;

    await prisma.transaction
      .update({
        where: { id: assignment.transactionId },
        data: { categoryId: resolvedCategoryId },
      })
      .catch(() => {
        // Skip if transaction not found
      });

    categorized++;
  }
  return categorized;
}

function logBatchError(err: unknown, batchNumber: number): void {
  if ((err as { code?: string }).code === 'DeploymentNotFound') {
    console.error(
      `[Categorize] Azure deployment not found: "${process.env.AZURE_OPENAI_DEPLOYMENT}". ` +
        'Set AZURE_OPENAI_DEPLOYMENT to your exact Azure deployment name.'
    );
  }
  console.error(`[Categorize] Batch ${batchNumber} failed:`, err);
}

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
        temperature: getTemperature(),
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      const assignments = parseAssignments(content);
      categorized += await categorizeBatch(assignments, validCategoryIds, categoryIdByName);

      console.log(`[Categorize] Batch ${Math.floor(i / BATCH_SIZE) + 1}: categorized ${assignments.length} transactions`);
    } catch (err) {
      logBatchError(err, Math.floor(i / BATCH_SIZE) + 1);
    }
  }

  console.log(`[Categorize] Total categorized: ${categorized}`);
  return categorized;
}
