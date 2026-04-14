import { describe, expect, it } from 'vitest';
import {
  formatChange,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatPercent,
  formatShortDate,
  getAccountTypeIcon,
  getCategoryColor,
} from './formatters';

describe('formatters', () => {
  it('formats currency and compact currency', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCompactCurrency(1500)).toBe('$1.5K');
    expect(formatCompactCurrency(2_500_000)).toBe('$2.5M');
  });

  it('formats date and short date', () => {
    const date = '2026-01-15T00:00:00.000Z';
    expect(formatDate(date)).toContain('2026');
    expect(formatShortDate(date)).toContain('Jan');
  });

  it('formats percent and change values', () => {
    expect(formatPercent(49.6)).toBe('50%');
    expect(formatChange(120, 100)).toEqual({
      value: '$20.00',
      isPositive: true,
      percent: '+20.0%',
    });
    expect(formatChange(80, 100)).toEqual({
      value: '$20.00',
      isPositive: false,
      percent: '-20.0%',
    });
  });

  it('returns account icons and category color classes', () => {
    expect(getAccountTypeIcon('CHECKING')).toBe('Wallet');
    expect(getAccountTypeIcon('MORTGAGE')).toBe('Home');
    expect(getAccountTypeIcon('UNKNOWN')).toBe('Landmark');

    expect(getCategoryColor('blue')).toContain('bg-blue-100');
    expect(getCategoryColor('unknown')).toContain('bg-gray-100');
  });
});
