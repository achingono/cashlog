import { prisma } from '../lib/prisma';

export async function getReports(page: number = 1, limit: number = 10) {
  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      orderBy: { generatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.report.count(),
  ]);

  return {
    data: reports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getReportById(id: string) {
  return prisma.report.findUnique({ where: { id } });
}
