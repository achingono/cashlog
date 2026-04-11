export function buildCategorizationPrompt(
  categories: { name: string; id: string }[],
  transactions: { id: string; description: string; amount: string; payee?: string }[]
): string {
  const categoryList = categories.map(c => `- "${c.name}" (id: ${c.id})`).join('\n');
  const transactionList = transactions.map(t =>
    `{ "id": "${t.id}", "description": "${t.description}", "amount": "${t.amount}"${t.payee ? `, "payee": "${t.payee}"` : ''} }`
  ).join('\n');

  return `You are a financial transaction categorizer. Analyze each transaction and assign the most appropriate category.

Available categories:
${categoryList}

Transactions to categorize:
${transactionList}

Respond with a JSON array of objects, each with "transactionId" and "categoryId" fields. Example:
[
  { "transactionId": "abc123", "categoryId": "cat456" }
]

Only output valid JSON. No explanations.`;
}
