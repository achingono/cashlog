import { useState } from "react";
import { useHoldings } from "@/hooks/use-holdings";
import { AccountSummaryCard } from "@/components/holdings/AccountSummaryCard";
import { HoldingsChart } from "@/components/holdings/HoldingsChart";
import { AccountDetail } from "@/components/holdings/AccountDetail";
import { TrendLineChart } from "@/components/dashboard/TrendLineChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS, ASSET_TYPES, LIABILITY_TYPES, type AccountType } from "@/types";

export function HoldingsPage() {
  const { holdings, history, loading, error } = useHoldings();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  if (error) {
    return <div className="flex items-center justify-center h-[50vh]"><p className="text-muted-foreground">Failed to load: {error}</p></div>;
  }

  if (loading || !holdings) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Holdings</h2>
        <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)}</div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  const assets = holdings.accounts.filter(a => ASSET_TYPES.includes(a.type as AccountType));
  const liabilities = holdings.accounts.filter(a => LIABILITY_TYPES.includes(a.type as AccountType));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Holdings</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <AccountSummaryCard title="Total Assets" amount={holdings.totalAssets} icon="TrendingUp" />
        <AccountSummaryCard title="Total Liabilities" amount={holdings.totalLiabilities} icon="CreditCard" />
        <AccountSummaryCard title="Net Worth" amount={holdings.netWorth} icon="Wallet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <TrendLineChart data={history} title="Net Worth History" description="Historical net worth over time" />
        </div>
        <div className="lg:col-span-3">
          <HoldingsChart accounts={holdings.accounts} />
        </div>
      </div>

      {assets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
            <CardDescription>{assets.length} accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map(a => (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAccountId(a.id)}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.institution || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{ACCOUNT_TYPE_LABELS[a.type as AccountType]}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(a.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {liabilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Liabilities</CardTitle>
            <CardDescription>{liabilities.length} accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liabilities.map(a => (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAccountId(a.id)}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.institution || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{ACCOUNT_TYPE_LABELS[a.type as AccountType]}</Badge></TableCell>
                    <TableCell className="text-right font-medium text-red-600">{formatCurrency(Math.abs(a.balance))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AccountDetail
        accountId={selectedAccountId}
        open={selectedAccountId !== null}
        onClose={() => setSelectedAccountId(null)}
      />
    </div>
  );
}
