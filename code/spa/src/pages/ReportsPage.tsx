import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Star, TrendingUp, Lightbulb } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import type { Report } from "@/types";

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    api.getReports()
      .then(res => setReports(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <div className="grid gap-4 md:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[200px] rounded-xl" />)}</div>
      </div>
    );
  }

  if (selectedReport) {
    const c = selectedReport.content;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">{c.title}</h2>
          <button onClick={() => setSelectedReport(null)} className="text-sm text-muted-foreground hover:text-foreground">← Back to Reports</button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-amber-500" /> Highlights</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">{c.highlights.map((h, i) => <li key={i} className="flex items-start gap-2 text-sm"><span className="text-primary mt-1">•</span>{h}</li>)}</ul>
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
            <ul className="space-y-2">{c.recommendations.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm"><Badge variant="outline" className="mt-0.5 shrink-0">{i + 1}</Badge>{r}</li>)}</ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
      {reports.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No reports generated yet. Reports are automatically created monthly.</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map(report => (
            <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedReport(report)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{report.content.title || report.title}</CardTitle>
                  <Badge>{report.content.overallScore}</Badge>
                </div>
                <CardDescription>{formatDate(report.generatedAt)} · {report.period}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">{report.content.highlights.slice(0, 3).map((h, i) => <li key={i} className="text-sm text-muted-foreground">• {h}</li>)}</ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
