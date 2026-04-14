import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { ClipboardList } from "lucide-react";
import type { PFSContent } from "@/types";

interface PFSFinancialConditionProps {
  content: PFSContent;
}

export function PFSFinancialCondition({ content }: Readonly<PFSFinancialConditionProps>) {
  const { assets, liabilities, totalAssets, totalLiabilities, netWorth } = content;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" /> Statement of Financial Condition
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Category</TableHead>
              <TableHead className="text-right">Current Value</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Assets Section */}
            <TableRow className="bg-muted/50">
              <TableCell className="font-bold" colSpan={3}>ASSETS</TableCell>
            </TableRow>
            {assets.map((asset) => (
              <TableRow key={asset.category}>
                <TableCell className="pl-6">{asset.category}</TableCell>
                <TableCell className="text-right">{formatCurrency(asset.value)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatPercent(asset.percentOfTotal)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2">
              <TableCell className="font-bold">TOTAL ASSETS</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(totalAssets)}</TableCell>
              <TableCell className="text-right font-bold">100%</TableCell>
            </TableRow>

            {/* Spacer */}
            <TableRow>
              <TableCell colSpan={3} className="h-2 p-0" />
            </TableRow>

            {/* Liabilities Section */}
            <TableRow className="bg-muted/50">
              <TableCell className="font-bold" colSpan={3}>LIABILITIES</TableCell>
            </TableRow>
            {liabilities.length > 0 ? (
              liabilities.map((liability) => (
                <TableRow key={liability.category}>
                  <TableCell className="pl-6">{liability.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(liability.value)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatPercent(liability.percentOfTotal)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="pl-6 text-muted-foreground italic">No liabilities</TableCell>
              </TableRow>
            )}
            <TableRow className="border-t-2">
              <TableCell className="font-bold">TOTAL LIABILITIES</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(totalLiabilities)}</TableCell>
              <TableCell />
            </TableRow>

            {/* Spacer */}
            <TableRow>
              <TableCell colSpan={3} className="h-2 p-0" />
            </TableRow>

            {/* Net Worth */}
            <TableRow className="bg-primary/5 border-t-2 border-b-2">
              <TableCell className="font-bold text-lg">NET WORTH</TableCell>
              <TableCell className="text-right font-bold text-lg">{formatCurrency(netWorth)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
