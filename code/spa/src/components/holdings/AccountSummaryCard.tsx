import { Wallet, PiggyBank, CreditCard, TrendingUp, Home, HandCoins, Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

const icons: Record<string, any> = {
  Wallet, PiggyBank, CreditCard, TrendingUp, Home, HandCoins, Landmark,
};

interface AccountSummaryCardProps {
  title: string;
  amount: number;
  icon?: string;
  description?: string;
  className?: string;
}

export function AccountSummaryCard({ title, amount, icon = "Landmark", description, className }: AccountSummaryCardProps) {
  const Icon = icons[icon] || Landmark;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}
