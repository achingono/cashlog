import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ValuationHistory } from "./ValuationHistory";
import { ASSET_TYPE_LABELS } from "@/types";
import type { Asset, AssetType } from "@/types";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";

interface AssetDetailProps {
  assetId: string | null;
  open: boolean;
  onClose: () => void;
}

export function AssetDetail({ assetId, open, onClose }: AssetDetailProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assetId || !open) return;
    setLoading(true);
    api.getAsset(assetId)
      .then(res => setAsset(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assetId, open]);

  const metadata = asset?.metadata as Record<string, any> | null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{asset?.name || 'Asset Details'}</SheetTitle>
          <SheetDescription>{asset?.address || ASSET_TYPE_LABELS[(asset?.type as AssetType) || 'REAL_ESTATE']}</SheetDescription>
        </SheetHeader>

        {loading || !asset ? (
          <div className="space-y-4 mt-6">
            {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Value</p>
                <p className="text-xl font-bold">{formatCurrency(asset.currentValue)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant="outline">{ASSET_TYPE_LABELS[asset.type as AssetType]}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Purchase Price</p>
                <p className="text-lg font-semibold">{formatCurrency(asset.purchasePrice)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {asset.currentValue >= asset.purchasePrice ? 'Gain' : 'Loss'}
                </p>
                <p className={`text-lg font-semibold ${asset.currentValue >= asset.purchasePrice ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(asset.currentValue - asset.purchasePrice))}
                </p>
              </div>
              {asset.purchaseDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Purchased</p>
                  <p className="text-sm">{formatDate(asset.purchaseDate)}</p>
                </div>
              )}
              {asset.lastValuationDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Last Valued</p>
                  <p className="text-sm">{formatDate(asset.lastValuationDate)}</p>
                </div>
              )}
            </div>

            {metadata && Object.keys(metadata).length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Asset Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(metadata).map(([key, value]) => {
                      if (value === null || value === undefined || value === '') return null;
                      const label = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (s) => s.toUpperCase());
                      return (
                        <div key={key}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-medium">{String(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <ValuationHistory valuations={asset.valuations} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
