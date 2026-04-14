import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Star, TrendingUp, Lightbulb, Loader2, FileBarChart } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { PFSExecutiveSummary } from "@/components/reports/PFSExecutiveSummary";
import { PFSFinancialCondition } from "@/components/reports/PFSFinancialCondition";
import { PFSNarrative } from "@/components/reports/PFSNarrative";
import { PFSExportButton } from "@/components/reports/PFSExportButton";
import type { Report, PFSContent, ReportContent } from "@/types";

const LOADING_CARD_KEYS = ['report-loading-1', 'report-loading-2', 'report-loading-3', 'report-loading-4'] as const;

function isPFSContent(content: ReportContent | PFSContent): content is PFSContent {
  return 'netWorth' in content && 'assetAllocation' in content && 'solvencyBenchmarking' in content;
}

function PFSDetailView({ report, onBack }: { report: Report; onBack: () => void }) {
  const content = report.content as PFSContent;
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{report.title}</h2>
        <div className="flex items-center gap-2">
          <PFSExportButton targetRef={printRef} fileName={`pfs-${content.periodCovered}`} />
          <Button variant="ghost" size="sm" onClick={onBack}>← Back to Reports</Button>
        </div>
      </div>

      <div ref={printRef}>
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Executive Summary</TabsTrigger>
            <TabsTrigger value="details">Financial Condition</TabsTrigger>
            <TabsTrigger value="narrative">CPA Narrative</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="mt-4">
            <PFSExecutiveSummary content={content} />
          </TabsContent>
          <TabsContent value="details" className="mt-4">
            <PFSFinancialCondition content={content} />
          </TabsContent>
          <TabsContent value="narrative" className="mt-4">
            <PFSNarrative content={content} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MonthlyReportDetailView({ report, onBack }: { report: Report; onBack: () => void }) {
  const c = report.content as ReportContent;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{c.title}</h2>
        <Button variant="ghost" size="sm" onClick={onBack}>← Back to Reports</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-amber-500" /> Highlights</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">{c.highlights.map((h) => <li key={h} className="flex items-start gap-2 text-sm"><span className="text-primary mt-1">•</span>{h}</li>)}</ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Financial Grade</CardTitle></CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-primary">{c.overallScore}</div>
            <p className="text-sm text-muted-foreground mt-2">{c.scoreExplanation}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base"><TrendingUp className="h-4 w-4 inline mr-2" />Income</CardTitle></CardHeader><CardContent><p className="text-sm">{c.incomeAnalysis}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Expenses</CardTitle></CardHeader><CardContent><p className="text-sm">{c.expenseAnalysis}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Savings</CardTitle></CardHeader><CardContent><p className="text-sm">{c.savingsAnalysis}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> Recommendations</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">{c.recommendations.map((r, i) => <li key={r} className="flex items-start gap-2 text-sm"><Badge variant="outline" className="mt-0.5 shrink-0">{i + 1}</Badge>{r}</li>)}</ul>
        </CardContent>
      </Card>
    </div>
  );
}

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.getReports()
      .then(res => setReports(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleGeneratePFS = async () => {
    setGenerating(true);
    try {
      const res = await api.generatePFS();
      setReports(prev => [res.data, ...prev]);
      setSelectedReport(res.data);
    } catch (err) {
      console.error('Failed to generate PFS:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <div className="grid gap-4 md:grid-cols-2">{LOADING_CARD_KEYS.map((key) => <Skeleton key={key} className="h-[200px] rounded-xl" />)}</div>
        </div>
    );
  }

  if (selectedReport) {
    const isPFS = selectedReport.type === 'PERSONAL_FINANCIAL_STATEMENT' && isPFSContent(selectedReport.content);
    if (isPFS) {
      return <PFSDetailView report={selectedReport} onBack={() => setSelectedReport(null)} />;
    }
    return <MonthlyReportDetailView report={selectedReport} onBack={() => setSelectedReport(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <Button onClick={handleGeneratePFS} disabled={generating}>
          {generating ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
          ) : (
            <><FileBarChart className="h-4 w-4 mr-2" />Generate Financial Statement</>
          )}
        </Button>
      </div>
      {reports.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No reports generated yet. Click "Generate Financial Statement" to create your first Personal Financial Statement, or reports will be automatically created monthly.</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map(report => {
            const isPFS = report.type === 'PERSONAL_FINANCIAL_STATEMENT' && isPFSContent(report.content);
            if (isPFS) {
              const pfsContent = report.content as PFSContent;
              return (
                <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow border-primary/20" onClick={() => setSelectedReport(report)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <Badge variant="default">PFS</Badge>
                    </div>
                    <CardDescription>{formatDate(report.generatedAt)} · {report.period}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Net Worth</p>
                        <p className="text-sm font-semibold">${pfsContent.netWorth.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Assets</p>
                        <p className="text-sm font-semibold text-emerald-600">${pfsContent.totalAssets.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Liabilities</p>
                        <p className="text-sm font-semibold text-red-600">${pfsContent.totalLiabilities.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            const monthlyContent = report.content as ReportContent;
            return (
              <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedReport(report)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{monthlyContent.title || report.title}</CardTitle>
                    <Badge>{monthlyContent.overallScore}</Badge>
                  </div>
                  <CardDescription>{formatDate(report.generatedAt)} · {report.period}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">{monthlyContent.highlights.slice(0, 3).map((h) => <li key={h} className="text-sm text-muted-foreground">• {h}</li>)}</ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
