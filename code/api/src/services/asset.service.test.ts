import { Decimal } from '@prisma/client/runtime/library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    asset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    assetValuation: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

import {
  addValuation,
  createAsset,
  deleteAsset,
  getAssetById,
  getAssets,
  getTotalAssetValue,
  updateAsset,
} from './asset.service';

describe('asset.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps list and detail assets', async () => {
    prismaMock.asset.findMany.mockResolvedValue([
      {
        id: 'a1',
        name: 'Home',
        type: 'REAL_ESTATE',
        purchasePrice: new Decimal('200000'),
        currentValue: new Decimal('250000'),
        purchaseDate: null,
        address: null,
        metadata: null,
        lastValuationDate: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    prismaMock.asset.findUnique.mockResolvedValue({
      id: 'a1',
      name: 'Home',
      type: 'REAL_ESTATE',
      purchasePrice: new Decimal('200000'),
      currentValue: new Decimal('250000'),
      purchaseDate: null,
      address: null,
      metadata: null,
      lastValuationDate: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      valuations: [
        { id: 'v1', value: new Decimal('250000'), source: 'MANUAL', valuedAt: new Date('2026-01-01T00:00:00.000Z') },
      ],
    });

    const list = await getAssets();
    const detail = await getAssetById('a1');

    expect(list[0]).toEqual(expect.objectContaining({ id: 'a1', currentValue: 250000 }));
    expect(detail?.valuations[0]).toEqual(expect.objectContaining({ id: 'v1', value: 250000 }));
  });

  it('creates, updates and deletes assets', async () => {
    prismaMock.asset.create.mockResolvedValue({
      id: 'a2',
      name: 'Stock',
      type: 'STOCK',
      purchasePrice: new Decimal('1000'),
      currentValue: new Decimal('1200'),
      purchaseDate: null,
      address: null,
      metadata: null,
      lastValuationDate: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    prismaMock.asset.update.mockResolvedValue({
      id: 'a2',
      name: 'Stock',
      type: 'STOCK',
      purchasePrice: new Decimal('1000'),
      currentValue: new Decimal('1300'),
      purchaseDate: null,
      address: null,
      metadata: null,
      lastValuationDate: new Date('2026-01-02T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    prismaMock.asset.delete.mockResolvedValue({ id: 'a2' });

    const created = await createAsset({ name: 'Stock', purchasePrice: 1000, currentValue: 1200, type: 'STOCK' });
    const updated = await updateAsset('a2', { currentValue: 1300 });
    await deleteAsset('a2');

    expect(created.currentValue).toBe(1200);
    expect(updated.currentValue).toBe(1300);
    expect(prismaMock.asset.delete).toHaveBeenCalledWith({ where: { id: 'a2' } });
  });

  it('adds valuation and computes aggregate value', async () => {
    prismaMock.$transaction.mockImplementation(async (steps: any[]) => Promise.all(steps));
    prismaMock.assetValuation.create.mockResolvedValue({
      id: 'v2',
      value: new Decimal('300000'),
      source: 'AI',
      valuedAt: new Date('2026-01-03T00:00:00.000Z'),
    });
    prismaMock.asset.update.mockResolvedValue({ id: 'a1' });
    prismaMock.asset.aggregate.mockResolvedValue({ _sum: { currentValue: new Decimal('345000') } });

    const valuation = await addValuation('a1', { value: 300000, source: 'AI' });
    const total = await getTotalAssetValue();

    expect(valuation).toEqual(expect.objectContaining({ id: 'v2', value: 300000, source: 'AI' }));
    expect(total).toBe(345000);
  });
});
