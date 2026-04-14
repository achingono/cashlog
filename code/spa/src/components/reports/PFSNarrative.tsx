import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, TrendingUp, Shield, Scale, PieChart, AlertTriangle } from "lucide-react";
import type { PFSContent } from "@/types";

interface PFSNarrativeProps {
  content: PFSContent;
}

function RatioBadge({ label, value, benchmark, unit = '' }: { label: string; value: number; benchmark: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">Benchmark: {benchmark}</p>
      </div>
      <Badge variant="outline" className="text-lg font-semibold px-3 py-1">
        {typeof value === 'number' ? value.toFixed(2) : value}{unit}
      </Badge>
    </div>
  );
}

export function PFSNarrative({ content }: Readonly<PFSNarrativeProps>) {
  const { trendAnalysis, taxSensitivityAnalysis, solvencyBenchmarking, debtStrategy, assetRebalancing, overallInsight } = content;

  return (
    <div className="space-y-4">
      {/* Overall CPA Insight */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> CPA Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <blockquote className="border-l-4 border-primary pl-4 italic text-sm leading-relaxed">
            {overallInsight}
          </blockquote>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Trend Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Trend Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{trendAnalysis}</p>
          </CardContent>
        </Card>

        {/* Tax Sensitivity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" /> Tax Sensitivity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{taxSensitivityAnalysis}</p>
          </CardContent>
        </Card>
      </div>

      {/* Solvency Benchmarking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" /> Solvency Benchmarking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <RatioBadge label="Debt-to-Income Ratio" value={solvencyBenchmarking.dtiRatio} benchmark="< 0.36" />
            <RatioBadge label="Liquidity Ratio" value={solvencyBenchmarking.liquidityRatio} benchmark="3-6 months" unit=" mo" />
            <RatioBadge label="Savings Rate" value={solvencyBenchmarking.savingsRate * 100} benchmark="> 20%" unit="%" />
            <RatioBadge label="Debt-to-Asset Ratio" value={solvencyBenchmarking.debtToAssetRatio} benchmark="< 0.5" />
          </div>
          <Separator />
          <p className="text-sm leading-relaxed">{solvencyBenchmarking.analysis}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Debt Strategy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4" /> Debt Strategy
              <Badge variant="secondary" className="ml-auto capitalize">{debtStrategy.method}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed">{debtStrategy.analysis}</p>
            {debtStrategy.priorityOrder.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Repayment Priority</p>
                  {debtStrategy.priorityOrder.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                        <span>{item.name}</span>
                      </div>
                      <span className="text-muted-foreground">${item.balance.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Asset Rebalancing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" /> Asset Rebalancing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assetRebalancing.warnings.length > 0 && (
              <div className="space-y-2">
                {assetRebalancing.warnings.map((warning) => (
                  <Alert key={warning} variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">{warning}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
            {assetRebalancing.suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Suggestions</p>
                <ul className="space-y-1">
                  {assetRebalancing.suggestions.map((suggestion) => (
                    <li key={suggestion} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {assetRebalancing.warnings.length === 0 && assetRebalancing.suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No rebalancing recommendations at this time.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
