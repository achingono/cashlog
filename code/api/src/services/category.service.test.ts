import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    category: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

import { createCategory, getCategories } from './category.service';

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
});
