export function buildCategorizationPrompt(
  categories: { name: string; id: string }[],
  transactions: { id: string; description: string; amount: string; payee?: string }[]
): string {
  const escapeJson = (value: string) => JSON.stringify(value);
  const categoryList = categories.map(c => `- "${c.name}" (id: ${c.id})`).join('\n');
  const transactionList = transactions
    .map((t) => {
      const payeePart = t.payee ? `, "payee": ${escapeJson(t.payee)}` : '';
      return `{ "id": ${escapeJson(t.id)}, "description": ${escapeJson(t.description)}, "amount": ${escapeJson(t.amount)}${payeePart} }`;
    })
    .join('\n');

  return `You are a financial transaction categorizer. Analyze each transaction and assign the most appropriate category.

Available categories:
${categoryList}

Transactions to categorize:
${transactionList}

Respond with a JSON object that has an "assignments" array.
Each item must include:
- "transactionId" (required)
- either "categoryId" OR "categoryName" (required)

Example:
{
  "assignments": [
    { "transactionId": "abc123", "categoryId": "cat456" },
    { "transactionId": "def789", "categoryName": "Groceries" }
  ]
}

Only output valid JSON. No explanations.`;
}
