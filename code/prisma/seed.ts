import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  // Income
  { name: 'Income', icon: 'DollarSign', color: 'emerald', children: [
    { name: 'Salary', icon: 'Briefcase', color: 'emerald' },
    { name: 'Freelance', icon: 'Laptop', color: 'emerald' },
    { name: 'Investments', icon: 'TrendingUp', color: 'emerald' },
    { name: 'Refunds', icon: 'RotateCcw', color: 'emerald' },
    { name: 'Other Income', icon: 'Plus', color: 'emerald' },
  ]},
  // Housing
  { name: 'Housing', icon: 'Home', color: 'blue', children: [
    { name: 'Rent/Mortgage', icon: 'Home', color: 'blue' },
    { name: 'Utilities', icon: 'Zap', color: 'blue' },
    { name: 'Insurance', icon: 'Shield', color: 'blue' },
    { name: 'Maintenance', icon: 'Wrench', color: 'blue' },
  ]},
  // Transportation
  { name: 'Transportation', icon: 'Car', color: 'violet', children: [
    { name: 'Gas', icon: 'Fuel', color: 'violet' },
    { name: 'Public Transit', icon: 'Bus', color: 'violet' },
    { name: 'Parking', icon: 'ParkingSquare', color: 'violet' },
    { name: 'Car Maintenance', icon: 'Wrench', color: 'violet' },
    { name: 'Ride Share', icon: 'Car', color: 'violet' },
  ]},
  // Food & Dining
  { name: 'Food & Dining', icon: 'UtensilsCrossed', color: 'orange', children: [
    { name: 'Groceries', icon: 'ShoppingCart', color: 'orange' },
    { name: 'Restaurants', icon: 'UtensilsCrossed', color: 'orange' },
    { name: 'Coffee Shops', icon: 'Coffee', color: 'orange' },
    { name: 'Delivery', icon: 'Truck', color: 'orange' },
  ]},
  // Shopping
  { name: 'Shopping', icon: 'ShoppingBag', color: 'pink', children: [
    { name: 'Clothing', icon: 'Shirt', color: 'pink' },
    { name: 'Electronics', icon: 'Smartphone', color: 'pink' },
    { name: 'Home Goods', icon: 'Sofa', color: 'pink' },
    { name: 'Online Shopping', icon: 'Globe', color: 'pink' },
  ]},
  // Entertainment
  { name: 'Entertainment', icon: 'Film', color: 'amber', children: [
    { name: 'Streaming', icon: 'Tv', color: 'amber' },
    { name: 'Movies & Events', icon: 'Ticket', color: 'amber' },
    { name: 'Games', icon: 'Gamepad2', color: 'amber' },
    { name: 'Hobbies', icon: 'Palette', color: 'amber' },
  ]},
  // Health & Fitness
  { name: 'Health & Fitness', icon: 'Heart', color: 'red', children: [
    { name: 'Medical', icon: 'Stethoscope', color: 'red' },
    { name: 'Pharmacy', icon: 'Pill', color: 'red' },
    { name: 'Gym', icon: 'Dumbbell', color: 'red' },
    { name: 'Personal Care', icon: 'Sparkles', color: 'red' },
  ]},
  // Education
  { name: 'Education', icon: 'GraduationCap', color: 'indigo', children: [
    { name: 'Tuition', icon: 'School', color: 'indigo' },
    { name: 'Books & Supplies', icon: 'BookOpen', color: 'indigo' },
    { name: 'Courses', icon: 'MonitorPlay', color: 'indigo' },
  ]},
  // Financial
  { name: 'Financial', icon: 'Landmark', color: 'slate', children: [
    { name: 'Bank Fees', icon: 'Landmark', color: 'slate' },
    { name: 'Interest', icon: 'Percent', color: 'slate' },
    { name: 'Taxes', icon: 'Receipt', color: 'slate' },
    { name: 'Transfers', icon: 'ArrowRightLeft', color: 'slate' },
  ]},
  // Travel
  { name: 'Travel', icon: 'Plane', color: 'cyan', children: [
    { name: 'Flights', icon: 'Plane', color: 'cyan' },
    { name: 'Hotels', icon: 'Hotel', color: 'cyan' },
    { name: 'Activities', icon: 'MapPin', color: 'cyan' },
  ]},
  // Uncategorized
  { name: 'Uncategorized', icon: 'HelpCircle', color: 'gray', children: [] },
];

async function main() {
  console.log('Seeding categories...');
  
  for (const cat of defaultCategories) {
    const parent = await prisma.category.upsert({
      where: { name: cat.name },
      update: { icon: cat.icon, color: cat.color },
      create: { name: cat.name, icon: cat.icon, color: cat.color },
    });

    for (const child of cat.children) {
      await prisma.category.upsert({
        where: { name: child.name },
        update: { icon: child.icon, color: child.color, parentId: parent.id },
        create: {
          name: child.name,
          icon: child.icon,
          color: child.color,
          parentId: parent.id,
        },
      });
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
