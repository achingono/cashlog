import { prisma } from '../lib/prisma';
import { decimalToNumber } from '../lib/types';

export interface AssetWithValuations {
  id: string;
  name: string;
  type: string;
  purchasePrice: number;
  currentValue: number;
  purchaseDate: Date | null;
  address: string | null;
  metadata: any;
  lastValuationDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  valuations: {
    id: string;
    value: number;
    source: string;
    valuedAt: Date;
  }[];
}

function mapAsset(a: any, includeValuations = false): AssetWithValuations {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    purchasePrice: decimalToNumber(a.purchasePrice),
    currentValue: decimalToNumber(a.currentValue),
    purchaseDate: a.purchaseDate,
    address: a.address,
    metadata: a.metadata,
    lastValuationDate: a.lastValuationDate,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    valuations: includeValuations && a.valuations
      ? a.valuations.map((v: any) => ({
          id: v.id,
          value: decimalToNumber(v.value),
          source: v.source,
          valuedAt: v.valuedAt,
        }))
      : [],
  };
}

export async function getAssets(): Promise<AssetWithValuations[]> {
  const assets = await prisma.asset.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  return assets.map((a) => mapAsset(a));
}

export async function getAssetById(id: string): Promise<AssetWithValuations | null> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      valuations: {
        orderBy: { valuedAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!asset) return null;
  return mapAsset(asset, true);
}

export async function createAsset(data: {
  name: string;
  type?: 'REAL_ESTATE' | 'AUTOMOBILE' | 'STOCK';
  purchasePrice: number;
  currentValue: number;
  purchaseDate?: Date;
  address?: string;
  metadata?: any;
}) {
  const asset = await prisma.asset.create({
    data: {
      name: data.name,
      type: data.type || 'REAL_ESTATE',
      purchasePrice: data.purchasePrice,
      currentValue: data.currentValue,
      purchaseDate: data.purchaseDate,
      address: data.address,
      metadata: data.metadata,
      lastValuationDate: new Date(),
      valuations: {
        create: {
          value: data.currentValue,
          source: 'MANUAL',
          valuedAt: new Date(),
        },
      },
    },
  });

  return mapAsset(asset);
}

export async function updateAsset(id: string, data: {
  name?: string;
  type?: 'REAL_ESTATE' | 'AUTOMOBILE' | 'STOCK';
  purchasePrice?: number;
  currentValue?: number;
  purchaseDate?: Date;
  address?: string;
  metadata?: any;
}) {
  const asset = await prisma.asset.update({
    where: { id },
    data,
  });

  return mapAsset(asset);
}

export async function deleteAsset(id: string) {
  return prisma.asset.delete({ where: { id } });
}

export async function addValuation(assetId: string, data: {
  value: number;
  source?: string;
}) {
  const [valuation] = await prisma.$transaction([
    prisma.assetValuation.create({
      data: {
        assetId,
        value: data.value,
        source: data.source || 'MANUAL',
        valuedAt: new Date(),
      },
    }),
    prisma.asset.update({
      where: { id: assetId },
      data: {
        currentValue: data.value,
        lastValuationDate: new Date(),
      },
    }),
  ]);

  return {
    id: valuation.id,
    value: decimalToNumber(valuation.value),
    source: valuation.source,
    valuedAt: valuation.valuedAt,
  };
}

export async function getTotalAssetValue(): Promise<number> {
  const result = await prisma.asset.aggregate({
    _sum: { currentValue: true },
  });
  return decimalToNumber(result._sum.currentValue);
}
