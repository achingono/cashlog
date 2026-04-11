import { prisma } from './prisma';
import { DEFAULT_CATEGORIES } from './default-categories';

export async function seedDefaultCategoriesOnStartup(): Promise<void> {
  const existingCount = await prisma.category.count();
  if (existingCount > 0) return;

  console.log('[Startup] No categories found, seeding defaults...');

  for (const category of DEFAULT_CATEGORIES) {
    const parent = await prisma.category.upsert({
      where: { name: category.name },
      update: { icon: category.icon, color: category.color },
      create: {
        name: category.name,
        icon: category.icon,
        color: category.color,
      },
    });

    for (const child of category.children) {
      await prisma.category.upsert({
        where: { name: child.name },
        update: {
          icon: child.icon,
          color: child.color,
          parentId: parent.id,
        },
        create: {
          name: child.name,
          icon: child.icon,
          color: child.color,
          parentId: parent.id,
        },
      });
    }
  }

  console.log('[Startup] Default categories seeded');
}
