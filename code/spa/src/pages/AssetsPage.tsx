import { useState } from "react";
import { useAssets } from "@/hooks/use-assets";
import { AssetForm } from "@/components/assets/AssetForm";
import { AssetDetail } from "@/components/assets/AssetDetail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ASSET_TYPE_LABELS, type AssetType } from "@/types";
import { Building, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function AssetsPage() {
  const { assets, loading, error, createAsset, deleteAsset } = useAssets();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  if (error) {
    return <div className="flex items-center justify-center h-[50vh]"><p className="text-muted-foreground">Failed to load: {error}</p></div>;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Assets</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalPurchasePrice = assets.reduce((sum, a) => sum + a.purchasePrice, 0);
  const totalGain = totalValue - totalPurchasePrice;

  const handleCreate = async (data: any) => {
    try {
      await createAsset(data);
      toast.success('Asset created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create asset');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteAsset(id);
      toast.success('Asset deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete asset');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Assets</h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Asset
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost Basis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPurchasePrice)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
            </div>
          </CardContent>
        </Card>
      </div>

      {assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No assets yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your first real estate, automobile, or stock asset to start tracking value.</p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tracked Assets</CardTitle>
            <CardDescription>{assets.length} asset{assets.length !== 1 ? 's' : ''} tracked</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                  <TableHead className="text-right">Gain/Loss</TableHead>
                  <TableHead>Last Valued</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map(asset => {
                  const gain = asset.currentValue - asset.purchasePrice;
                  return (
                    <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAssetId(asset.id)}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell><Badge variant="outline">{ASSET_TYPE_LABELS[asset.type as AssetType]}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{asset.address || '—'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(asset.currentValue)}</TableCell>
                      <TableCell className={`text-right font-medium ${gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {gain >= 0 ? '+' : ''}{formatCurrency(gain)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {asset.lastValuationDate ? formatDate(asset.lastValuationDate) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleDelete(e, asset.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AssetForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleCreate} />
      <AssetDetail assetId={selectedAssetId} open={selectedAssetId !== null} onClose={() => setSelectedAssetId(null)} />
    </div>
  );
}
