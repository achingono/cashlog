import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PFSExecutiveSummary } from './PFSExecutiveSummary';
import { PFSFinancialCondition } from './PFSFinancialCondition';
import { PFSNarrative } from './PFSNarrative';
import type { PFSContent } from '@/types';

const mockContent: PFSContent = {
  reportDate: '2026-04-13',
  periodCovered: '2026-04',
  netWorth: 267400,
  netWorthChange: { amount: 10800, percentage: 4.2, comparedTo: '2026-01-01' },
  totalAssets: 304500,
  totalLiabilities: 37100,
  assetAllocation: [
    { category: 'Cash & Equivalents', value: 24500, percentage: 8 },
    { category: 'Marketable Securities', value: 145000, percentage: 48 },
    { category: 'Real Estate (Equity)', value: 85000, percentage: 28 },
    { category: 'Other Assets', value: 50000, percentage: 16 },
  ],
  assets: [
    { category: 'Cash & Equivalents', value: 24500, percentOfTotal: 8 },
    { category: 'Marketable Securities', value: 145000, percentOfTotal: 48 },
    { category: 'Real Estate (Equity)', value: 85000, percentOfTotal: 28 },
    { category: 'Other Assets', value: 50000, percentOfTotal: 16 },
  ],
  liabilities: [
    { category: 'Short-Term Liabilities', value: 2100, percentOfTotal: 5.7 },
    { category: 'Long-Term Liabilities', value: 35000, percentOfTotal: 94.3 },
  ],
  trendAnalysis: 'Your net worth increased by 4.2% this quarter.',
  taxSensitivityAnalysis: 'Consider moving funds to tax-advantaged accounts.',
  solvencyBenchmarking: {
    dtiRatio: 0.15,
    liquidityRatio: 2.5,
    savingsRate: 0.22,
    debtToAssetRatio: 0.12,
    analysis: 'Your liquidity ratio is below the recommended 3-6 months.',
  },
  debtStrategy: {
    method: 'avalanche',
    analysis: 'Pay off high-interest credit card debt first.',
    priorityOrder: [
      { name: 'Credit Card', balance: 2100, rate: 22.99 },
      { name: 'Student Loans', balance: 35000, rate: 5.5 },
    ],
  },
  assetRebalancing: {
    warnings: ['Marketable Securities represent 48% of total assets - concentration risk.'],
    suggestions: ['Consider diversifying into bonds or real estate.'],
  },
  overallInsight: 'Your financial position is strong with growing net worth. Focus on building your emergency fund.',
};

describe('PFSExecutiveSummary', () => {
  it('renders net worth and key figures', () => {
    render(<PFSExecutiveSummary content={mockContent} />);
    expect(screen.getByText('$267,400.00')).toBeInTheDocument();
    expect(screen.getByText('$304,500.00')).toBeInTheDocument();
    expect(screen.getByText('$37,100.00')).toBeInTheDocument();
  });

  it('shows asset allocation categories', () => {
    render(<PFSExecutiveSummary content={mockContent} />);
    expect(screen.getByText('Cash & Equivalents')).toBeInTheDocument();
    expect(screen.getByText('Marketable Securities')).toBeInTheDocument();
  });

  it('shows net worth change indicator', () => {
    render(<PFSExecutiveSummary content={mockContent} />);
    expect(screen.getByText(/\+4\.2%/)).toBeInTheDocument();
  });
});

describe('PFSFinancialCondition', () => {
  it('renders balance sheet table', () => {
    render(<PFSFinancialCondition content={mockContent} />);
    expect(screen.getByText('ASSETS')).toBeInTheDocument();
    expect(screen.getByText('LIABILITIES')).toBeInTheDocument();
    expect(screen.getByText('NET WORTH')).toBeInTheDocument();
  });

  it('shows asset and liability categories', () => {
    render(<PFSFinancialCondition content={mockContent} />);
    expect(screen.getByText('Cash & Equivalents')).toBeInTheDocument();
    expect(screen.getByText('Short-Term Liabilities')).toBeInTheDocument();
    expect(screen.getByText('Long-Term Liabilities')).toBeInTheDocument();
  });
});

describe('PFSNarrative', () => {
  it('renders overall CPA insight', () => {
    render(<PFSNarrative content={mockContent} />);
    expect(screen.getByText(mockContent.overallInsight)).toBeInTheDocument();
  });

  it('renders trend analysis', () => {
    render(<PFSNarrative content={mockContent} />);
    expect(screen.getByText(mockContent.trendAnalysis)).toBeInTheDocument();
  });

  it('renders solvency ratios', () => {
    render(<PFSNarrative content={mockContent} />);
    expect(screen.getByText('Debt-to-Income Ratio')).toBeInTheDocument();
    expect(screen.getByText('Liquidity Ratio')).toBeInTheDocument();
  });

  it('renders debt strategy', () => {
    render(<PFSNarrative content={mockContent} />);
    expect(screen.getByText('avalanche')).toBeInTheDocument();
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
  });

  it('renders rebalancing warnings', () => {
    render(<PFSNarrative content={mockContent} />);
    expect(screen.getByText(/concentration risk/i)).toBeInTheDocument();
  });
});
