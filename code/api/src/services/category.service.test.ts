import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    category: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

import { createCategory, getCategories, updateCategory } from './category.service';

describe('category.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns nested categories', async () => {
    prismaMock.category.findMany.mockResolvedValue([
      { id: 'p1', name: 'Food', children: [{ id: 'c1', name: 'Restaurants' }] },
    ]);
    await expect(getCategories()).resolves.toEqual([{ id: 'p1', name: 'Food', children: [{ id: 'c1', name: 'Restaurants' }] }]);
  });

  it('creates categories', async () => {
    prismaMock.category.create.mockResolvedValue({ id: 'c2', name: 'Travel' });
    await expect(createCategory({ name: 'Travel' })).resolves.toEqual({ id: 'c2', name: 'Travel' });
    expect(prismaMock.category.create).toHaveBeenCalledWith({ data: { name: 'Travel' } });
  });

  it('updates an existing category', async () => {
    prismaMock.category.findUnique.mockResolvedValue({ id: 'c1' });
    prismaMock.category.update.mockResolvedValue({ id: 'c1', name: 'Dining Out' });

    await expect(updateCategory('c1', { name: 'Dining Out' })).resolves.toEqual({ id: 'c1', name: 'Dining Out' });
    expect(prismaMock.category.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { name: 'Dining Out' },
    });
  });

  it('returns null when updating a missing category', async () => {
    prismaMock.category.findUnique.mockResolvedValue(null);
    await expect(updateCategory('missing', { name: 'Anything' })).resolves.toBeNull();
    expect(prismaMock.category.update).not.toHaveBeenCalled();
  });
});
