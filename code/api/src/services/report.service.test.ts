import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    report: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

import { getReportById, getReports } from './report.service';

describe('report.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated reports', async () => {
    prismaMock.report.findMany.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
    prismaMock.report.count.mockResolvedValue(12);

    const result = await getReports(2, 5);

    expect(result).toEqual({
      data: [{ id: 'r1' }, { id: 'r2' }],
      pagination: { page: 2, limit: 5, total: 12, totalPages: 3 },
    });
  });

  it('returns report by id', async () => {
    prismaMock.report.findUnique.mockResolvedValue({ id: 'r1', title: 'Jan report' });
    await expect(getReportById('r1')).resolves.toEqual({ id: 'r1', title: 'Jan report' });
  });
});
