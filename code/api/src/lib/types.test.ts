import { Decimal } from '@prisma/client/runtime/library';
import { describe, expect, it } from 'vitest';
import { decimalToNumber } from './types';

describe('decimalToNumber', () => {
  it('returns 0 for nullish values', () => {
    expect(decimalToNumber(null)).toBe(0);
    expect(decimalToNumber(undefined)).toBe(0);
  });

  it('converts Decimal values to numbers', () => {
    expect(decimalToNumber(new Decimal('12.34'))).toBe(12.34);
    expect(decimalToNumber(new Decimal('-9.5'))).toBe(-9.5);
  });
});
