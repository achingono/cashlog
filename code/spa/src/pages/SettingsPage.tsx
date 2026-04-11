import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import type { SyncStatus, Category } from "@/types";

export function SettingsPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getSyncStatus(), api.getSyncHistory(), api.getCategories()])
      .then(([s, h, c]) => {
        setSyncStatus(s.data);
        setSyncHistory(h.data);
        setCategories(c.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.triggerSync();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'FAILED': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'RUNNING': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Sync</CardTitle>
              <CardDescription>SimpleFin connection and sync status</CardDescription>
            </div>
            <Button onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {syncStatus ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {statusIcon(syncStatus.status)}
              <div>
                <p className="text-sm font-medium">Last sync: {formatDate(syncStatus.startedAt)}</p>
                <p className="text-xs text-muted-foreground">
                  {syncStatus.accountCount} accounts · {syncStatus.transactionCount} transactions
                  {syncStatus.errorMessage && <span className="text-red-500"> · {syncStatus.errorMessage}</span>}
                </p>
              </div>
              <Badge variant={syncStatus.status === 'SUCCESS' ? 'default' : syncStatus.status === 'FAILED' ? 'destructive' : 'secondary'} className="ml-auto">
                {syncStatus.status}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sync history. Configure SimpleFin and run your first sync.</p>
          )}

          {syncHistory.length > 1 && (
            <>
              <Separator className="my-4" />
              <h4 className="text-sm font-medium mb-2">Sync History</h4>
              <div className="space-y-2">
                {syncHistory.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    {statusIcon(s.status)}
                    <span className="text-muted-foreground">{formatDate(s.startedAt)}</span>
                    <span>{s.accountCount} accounts, {s.transactionCount} transactions</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Transaction categories used for classification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {categories.map(cat => (
              <div key={cat.id} className="p-3 border rounded-lg">
                <p className="font-medium text-sm">{cat.name}</p>
                {cat.children.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {cat.children.map(child => (
                      <Badge key={child.id} variant="secondary" className="text-xs">{child.name}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
