import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    syncLog: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

import { getLatestSync, getSyncHistory } from './sync.service';

describe('sync.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches latest sync', async () => {
    prismaMock.syncLog.findFirst.mockResolvedValue({ id: 's1', status: 'SUCCESS' });
    await expect(getLatestSync()).resolves.toEqual({ id: 's1', status: 'SUCCESS' });
  });

  it('fetches sync history with limit', async () => {
    prismaMock.syncLog.findMany.mockResolvedValue([{ id: 's2' }]);
    await expect(getSyncHistory(5)).resolves.toEqual([{ id: 's2' }]);
    expect(prismaMock.syncLog.findMany).toHaveBeenCalledWith({
      orderBy: { startedAt: 'desc' },
      take: 5,
    });
  });
});
