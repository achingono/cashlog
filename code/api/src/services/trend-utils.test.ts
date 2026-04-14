import { Decimal } from '@prisma/client/runtime/library';
import { describe, expect, it } from 'vitest';
import {
  buildCumulativeMonthlyPoints,
  deriveMonthCount,
  mapSnapshotsToTrendPoints,
  shouldUseSnapshots,
} from './trend-utils';

describe('deriveMonthCount', () => {
  it('uses explicit months when provided', () => {
    const now = new Date('2026-04-01T00:00:00.000Z');
    expect(deriveMonthCount(6, undefined, now)).toBe(6);
  });

  it('returns 0 when first transaction is missing', () => {
    const now = new Date('2026-04-01T00:00:00.000Z');
    expect(deriveMonthCount(undefined, undefined, now)).toBe(0);
  });

  it('derives month span from first transaction', () => {
    const now = new Date(2026, 3, 1);
    const firstTx = new Date(2025, 11, 20);
    expect(deriveMonthCount(undefined, firstTx, now)).toBe(4);
  });
});

describe('shouldUseSnapshots', () => {
  it('requires month span + 1 snapshot points', () => {
    expect(shouldUseSnapshots(6, 6, 6)).toBe(false);
    expect(shouldUseSnapshots(7, 6, 6)).toBe(true);
  });

  it('falls back to inferred monthCount when months is not provided', () => {
    expect(shouldUseSnapshots(3, undefined, 3)).toBe(false);
    expect(shouldUseSnapshots(4, undefined, 3)).toBe(true);
  });
});

describe('mapSnapshotsToTrendPoints', () => {
  it('maps snapshots to date/value points', () => {
    const points = mapSnapshotsToTrendPoints([
      { date: new Date('2026-01-01T00:00:00.000Z'), netWorth: new Decimal('100') },
      { date: new Date('2026-02-01T00:00:00.000Z'), netWorth: null },
    ]);

    expect(points).toEqual([
      { date: '2026-01-01', value: 100 },
      { date: '2026-02-01', value: 0 },
    ]);
  });
});

describe('buildCumulativeMonthlyPoints', () => {
  it('builds cumulative monthly points from sorted transactions', () => {
    const now = new Date(2026, 2, 15);
    const points = buildCumulativeMonthlyPoints(
      [
        { posted: new Date(2026, 0, 5), amount: new Decimal('100') },
        { posted: new Date(2026, 1, 7), amount: new Decimal('-40') },
        { posted: new Date(2026, 2, 1), amount: new Decimal('10') },
      ],
      2,
      now,
    );

    expect(points).toEqual([
      { date: '2026-01-01', value: 100 },
      { date: '2026-02-01', value: 60 },
      { date: '2026-03-01', value: 70 },
    ]);
  });
});
