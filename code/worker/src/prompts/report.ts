export function buildMonthlyReportPrompt(data: {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  topCategories: { name: string; amount: number }[];
  accountSummaries: { name: string; balance: number; type: string }[];
  transactionCount: number;
}): string {
  return `You are a personal finance analyst. Generate an insightful monthly financial report.

Period: ${data.period}
Total Income: $${data.totalIncome.toFixed(2)}
Total Expenses: $${data.totalExpenses.toFixed(2)}
Net Savings: $${data.netSavings.toFixed(2)}
Transaction Count: ${data.transactionCount}

Top Spending Categories:
${data.topCategories.map(c => `- ${c.name}: $${c.amount.toFixed(2)}`).join('\n')}

Account Balances:
${data.accountSummaries.map(a => `- ${a.name} (${a.type}): $${a.balance.toFixed(2)}`).join('\n')}

Generate a JSON response with this structure:
{
  "title": "Monthly Financial Report - ${data.period}",
  "highlights": ["key insight 1", "key insight 2", "key insight 3"],
  "incomeAnalysis": "Brief analysis of income trends",
  "expenseAnalysis": "Brief analysis of spending patterns",
  "savingsAnalysis": "Brief analysis of savings rate and recommendations",
  "topExpenseInsights": ["insight about top spending category", "insight 2"],
  "recommendations": ["actionable recommendation 1", "recommendation 2"],
  "overallScore": "A letter grade A-F for financial health this month",
  "scoreExplanation": "Why this grade was given"
}

Only output valid JSON.`;
}
