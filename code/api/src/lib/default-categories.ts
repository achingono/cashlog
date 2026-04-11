export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  children: { name: string; icon: string; color: string }[];
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Income', icon: 'DollarSign', color: 'emerald', children: [
    { name: 'Salary', icon: 'Briefcase', color: 'emerald' },
    { name: 'Freelance', icon: 'Laptop', color: 'emerald' },
    { name: 'Investments', icon: 'TrendingUp', color: 'emerald' },
    { name: 'Refunds', icon: 'RotateCcw', color: 'emerald' },
    { name: 'Other Income', icon: 'Plus', color: 'emerald' },
  ]},
  { name: 'Housing', icon: 'Home', color: 'blue', children: [
    { name: 'Rent/Mortgage', icon: 'Home', color: 'blue' },
    { name: 'Utilities', icon: 'Zap', color: 'blue' },
    { name: 'Insurance', icon: 'Shield', color: 'blue' },
    { name: 'Maintenance', icon: 'Wrench', color: 'blue' },
  ]},
  { name: 'Transportation', icon: 'Car', color: 'violet', children: [
    { name: 'Gas', icon: 'Fuel', color: 'violet' },
    { name: 'Public Transit', icon: 'Bus', color: 'violet' },
    { name: 'Parking', icon: 'ParkingSquare', color: 'violet' },
    { name: 'Car Maintenance', icon: 'Wrench', color: 'violet' },
    { name: 'Ride Share', icon: 'Car', color: 'violet' },
  ]},
  { name: 'Food & Dining', icon: 'UtensilsCrossed', color: 'orange', children: [
    { name: 'Groceries', icon: 'ShoppingCart', color: 'orange' },
    { name: 'Restaurants', icon: 'UtensilsCrossed', color: 'orange' },
    { name: 'Coffee Shops', icon: 'Coffee', color: 'orange' },
    { name: 'Delivery', icon: 'Truck', color: 'orange' },
  ]},
  { name: 'Shopping', icon: 'ShoppingBag', color: 'pink', children: [
    { name: 'Clothing', icon: 'Shirt', color: 'pink' },
    { name: 'Electronics', icon: 'Smartphone', color: 'pink' },
    { name: 'Home Goods', icon: 'Sofa', color: 'pink' },
    { name: 'Online Shopping', icon: 'Globe', color: 'pink' },
  ]},
  { name: 'Entertainment', icon: 'Film', color: 'amber', children: [
    { name: 'Streaming', icon: 'Tv', color: 'amber' },
    { name: 'Movies & Events', icon: 'Ticket', color: 'amber' },
    { name: 'Games', icon: 'Gamepad2', color: 'amber' },
    { name: 'Hobbies', icon: 'Palette', color: 'amber' },
  ]},
  { name: 'Health & Fitness', icon: 'Heart', color: 'red', children: [
    { name: 'Medical', icon: 'Stethoscope', color: 'red' },
    { name: 'Pharmacy', icon: 'Pill', color: 'red' },
    { name: 'Gym', icon: 'Dumbbell', color: 'red' },
    { name: 'Personal Care', icon: 'Sparkles', color: 'red' },
  ]},
  { name: 'Education', icon: 'GraduationCap', color: 'indigo', children: [
    { name: 'Tuition', icon: 'School', color: 'indigo' },
    { name: 'Books & Supplies', icon: 'BookOpen', color: 'indigo' },
    { name: 'Courses', icon: 'MonitorPlay', color: 'indigo' },
  ]},
  { name: 'Financial', icon: 'Landmark', color: 'slate', children: [
    { name: 'Bank Fees', icon: 'Landmark', color: 'slate' },
    { name: 'Interest', icon: 'Percent', color: 'slate' },
    { name: 'Taxes', icon: 'Receipt', color: 'slate' },
    { name: 'Transfers', icon: 'ArrowRightLeft', color: 'slate' },
  ]},
  { name: 'Travel', icon: 'Plane', color: 'cyan', children: [
    { name: 'Flights', icon: 'Plane', color: 'cyan' },
    { name: 'Hotels', icon: 'Hotel', color: 'cyan' },
    { name: 'Activities', icon: 'MapPin', color: 'cyan' },
  ]},
  { name: 'Uncategorized', icon: 'HelpCircle', color: 'gray', children: [] },
];
