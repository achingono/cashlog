import { describe, expect, it } from 'vitest';
import { buildPFSPrompt } from './pfs';

describe('buildPFSPrompt', () => {
  const baseData = {
    balanceSheet: {
      assets: [
        { category: 'Cash & Equivalents', value: 25000, percentOfTotal: 25 },
        { category: 'Marketable Securities', value: 75000, percentOfTotal: 75 },
      ],
      liabilities: [
        { category: 'Short-Term Liabilities', value: 5000, percentOfTotal: 100 },
      ],
      totalAssets: 100000,
      totalLiabilities: 5000,
      netWorth: 95000,
    },
    ratios: {
      dtiRatio: 0.15,
      liquidityRatio: 3.5,
      savingsRate: 0.25,
      debtToAssetRatio: 0.05,
    },
    assetAllocation: [
      { category: 'Cash & Equivalents', value: 25000, percentage: 25 },
      { category: 'Marketable Securities', value: 75000, percentage: 75 },
    ],
    historicalSnapshots: [
      { date: '2026-01-01', totalAssets: 90000, totalLiabilities: 6000, netWorth: 84000 },
      { date: '2026-02-01', totalAssets: 95000, totalLiabilities: 5500, netWorth: 89500 },
    ],
    liabilityDetails: [
      { name: 'Visa Card', balance: 5000, type: 'CREDIT_CARD' },
    ],
    monthlyIncome: 8000,
    monthlyExpenses: 6000,
  };

  it('includes balance sheet figures', () => {
    const prompt = buildPFSPrompt(baseData);
    expect(prompt).toContain('Total Assets: $100000.00');
    expect(prompt).toContain('Total Liabilities: $5000.00');
    expect(prompt).toContain('Net Worth: $95000.00');
  });

  it('includes financial ratios', () => {
    const prompt = buildPFSPrompt(baseData);
    expect(prompt).toContain('Debt-to-Income (DTI) Ratio: 0.15');
    expect(prompt).toContain('Liquidity Ratio');
    expect(prompt).toContain('Savings Rate: 25.0%');
  });

  it('includes historical snapshots', () => {
    const prompt = buildPFSPrompt(baseData);
    expect(prompt).toContain('2026-01-01');
    expect(prompt).toContain('2026-02-01');
  });

  it('includes liability details without PII', () => {
    const prompt = buildPFSPrompt(baseData);
    expect(prompt).toContain('CREDIT_CARD: $5000.00');
    // Should not contain account IDs or full names
    expect(prompt).not.toContain('Visa Card');
  });

  it('includes CPA role instruction', () => {
    const prompt = buildPFSPrompt(baseData);
    expect(prompt).toContain('Certified Public Accountant');
    expect(prompt).toContain('Do NOT recalculate');
  });

  it('requests structured JSON response', () => {
    const prompt = buildPFSPrompt(baseData);
    expect(prompt).toContain('"trendAnalysis"');
    expect(prompt).toContain('"taxSensitivityAnalysis"');
    expect(prompt).toContain('"solvencyAnalysis"');
    expect(prompt).toContain('"debtStrategy"');
    expect(prompt).toContain('"assetRebalancing"');
    expect(prompt).toContain('"overallInsight"');
    expect(prompt).toContain('Only output valid JSON');
  });

  it('handles empty historical snapshots', () => {
    const data = { ...baseData, historicalSnapshots: [] };
    const prompt = buildPFSPrompt(data);
    expect(prompt).toContain('No historical data available');
  });

  it('handles no liabilities', () => {
    const data = { ...baseData, liabilityDetails: [] };
    const prompt = buildPFSPrompt(data);
    expect(prompt).toContain('No liabilities');
  });
});
