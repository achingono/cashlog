import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    category: {
      count: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('./prisma', () => ({ prisma: prismaMock }));

import { seedDefaultCategoriesOnStartup } from './seed-categories';

describe('seedDefaultCategoriesOnStartup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.category.upsert.mockResolvedValue({ id: 'cat-parent' });
  });

  it('skips seeding when categories already exist', async () => {
    prismaMock.category.count.mockResolvedValue(3);

    await seedDefaultCategoriesOnStartup();

    expect(prismaMock.category.upsert).not.toHaveBeenCalled();
  });

  it('seeds defaults when category table is empty', async () => {
    prismaMock.category.count.mockResolvedValue(0);

    await seedDefaultCategoriesOnStartup();

    expect(prismaMock.category.upsert).toHaveBeenCalled();
  });
});
