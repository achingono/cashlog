import { describe, expect, it } from 'vitest';
import { isAssetType, isLiabilityType } from './account-types';

describe('account type helpers', () => {
  it('classifies asset account types', () => {
    expect(isAssetType('CHECKING')).toBe(true);
    expect(isAssetType('SAVINGS')).toBe(true);
    expect(isAssetType('INVESTMENT')).toBe(true);
    expect(isAssetType('OTHER')).toBe(true);
    expect(isAssetType('LOAN')).toBe(false);
  });

  it('classifies liability account types', () => {
    expect(isLiabilityType('CREDIT_CARD')).toBe(true);
    expect(isLiabilityType('LOAN')).toBe(true);
    expect(isLiabilityType('MORTGAGE')).toBe(true);
    expect(isLiabilityType('CHECKING')).toBe(false);
  });
});
