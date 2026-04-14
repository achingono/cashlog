interface PFSPromptData {
  balanceSheet: {
    assets: Array<{ category: string; value: number; percentOfTotal: number }>;
    liabilities: Array<{ category: string; value: number; percentOfTotal: number }>;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  };
  ratios: {
    dtiRatio: number;
    liquidityRatio: number;
    savingsRate: number;
    debtToAssetRatio: number;
  };
  assetAllocation: Array<{ category: string; value: number; percentage: number }>;
  historicalSnapshots: Array<{
    date: string;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  }>;
  liabilityDetails: Array<{
    name: string;
    balance: number;
    type: string;
  }>;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export function buildPFSPrompt(data: PFSPromptData): string {
  const snapshotLines = data.historicalSnapshots.length > 0
    ? data.historicalSnapshots
        .map(s => `  ${s.date}: Assets $${s.totalAssets.toFixed(2)}, Liabilities $${s.totalLiabilities.toFixed(2)}, Net Worth $${s.netWorth.toFixed(2)}`)
        .join('\n')
    : '  No historical data available.';

  const liabilityLines = data.liabilityDetails.length > 0
    ? data.liabilityDetails
        .map(l => `  - ${l.type}: $${l.balance.toFixed(2)}`)
        .join('\n')
    : '  No liabilities.';

  const allocationLines = data.assetAllocation
    .map(a => `  - ${a.category}: $${a.value.toFixed(2)} (${a.percentage}%)`)
    .join('\n');

  return `You are a Certified Public Accountant (CPA) analyst reviewing a client's Personal Financial Statement. Based on the pre-calculated financial data below, provide expert narrative analysis and strategic recommendations.

IMPORTANT: All numerical calculations have already been performed. Do NOT recalculate any figures. Your role is to INTERPRET the data and provide professional financial advice.

=== BALANCE SHEET ===
Total Assets: $${data.balanceSheet.totalAssets.toFixed(2)}
Total Liabilities: $${data.balanceSheet.totalLiabilities.toFixed(2)}
Net Worth: $${data.balanceSheet.netWorth.toFixed(2)}

Asset Allocation:
${allocationLines}

=== FINANCIAL RATIOS ===
Debt-to-Income (DTI) Ratio: ${data.ratios.dtiRatio}
Liquidity Ratio (months of expenses covered): ${data.ratios.liquidityRatio}
Savings Rate: ${(data.ratios.savingsRate * 100).toFixed(1)}%
Debt-to-Asset Ratio: ${data.ratios.debtToAssetRatio}

=== MONTHLY CASH FLOW ===
Monthly Income: $${data.monthlyIncome.toFixed(2)}
Monthly Expenses: $${data.monthlyExpenses.toFixed(2)}
Monthly Net: $${(data.monthlyIncome - data.monthlyExpenses).toFixed(2)}

=== HISTORICAL NET WORTH (Last 6 Months) ===
${snapshotLines}

=== LIABILITY DETAILS ===
${liabilityLines}

Generate a JSON response with this exact structure:
{
  "trendAnalysis": "A 2-3 sentence analysis of net worth trends over the past 6 months, identifying anomalies in spending or income patterns.",
  "taxSensitivityAnalysis": "A 2-3 sentence analysis of the ratio of taxable vs tax-advantaged accounts, with suggestions for tax optimization based on the asset allocation.",
  "solvencyAnalysis": "A 2-3 sentence interpretation of the DTI ratio, liquidity ratio, and debt-to-asset ratio compared to recommended benchmarks (DTI < 0.36, Liquidity 3-6 months, Debt-to-Asset < 0.5).",
  "debtStrategy": {
    "method": "avalanche or snowball - recommend the most appropriate method",
    "analysis": "A 2-3 sentence explanation of why this method is recommended based on the liability profile.",
    "priorityOrder": [{"name": "Liability type", "balance": 0, "rate": 0}]
  },
  "assetRebalancing": {
    "warnings": ["Any concentration risk warnings where a single category exceeds 20% of total assets"],
    "suggestions": ["Specific, actionable suggestions for rebalancing the portfolio"]
  },
  "overallInsight": "A comprehensive 3-4 sentence CPA-style insight summarizing the client's overall financial health, key strengths, and the single most important action they should take."
}

Only output valid JSON.`;
}
