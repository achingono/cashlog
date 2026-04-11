import { prisma } from '../lib/prisma';

export async function getCategories() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return categories;
}

export async function createCategory(data: { name: string; icon?: string; color?: string; parentId?: string }) {
  return prisma.category.create({ data });
}
