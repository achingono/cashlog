import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Controller } from "react-hook-form";
import type { Asset, AssetType } from "@/types";

const assetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(['REAL_ESTATE', 'AUTOMOBILE', 'STOCK']),
  purchasePrice: z.coerce.number().min(0, "Must be positive"),
  currentValue: z.coerce.number().min(0, "Must be positive"),
  purchaseDate: z.string().optional(),
  address: z.string().optional(),
  symbol: z.string().optional(),
  shares: z.coerce.number().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().optional(),
  vin: z.string().optional(),
  mileage: z.coerce.number().optional(),
  sqft: z.coerce.number().optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  yearBuilt: z.coerce.number().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface AssetFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  asset?: Asset | null;
}

export function AssetForm({ open, onClose, onSubmit, asset }: AssetFormProps) {
  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: asset ? {
      name: asset.name,
      type: asset.type,
      purchasePrice: asset.purchasePrice,
      currentValue: asset.currentValue,
      purchaseDate: asset.purchaseDate?.split('T')[0] || '',
      address: asset.address || '',
      symbol: (asset.metadata as any)?.symbol || '',
      shares: (asset.metadata as any)?.shares || undefined,
      make: (asset.metadata as any)?.make || '',
      model: (asset.metadata as any)?.model || '',
      year: (asset.metadata as any)?.year || undefined,
      vin: (asset.metadata as any)?.vin || '',
      mileage: (asset.metadata as any)?.mileage || undefined,
      sqft: (asset.metadata as any)?.sqft || undefined,
      bedrooms: (asset.metadata as any)?.bedrooms || undefined,
      bathrooms: (asset.metadata as any)?.bathrooms || undefined,
      yearBuilt: (asset.metadata as any)?.yearBuilt || undefined,
    } : {
      name: '',
      type: 'REAL_ESTATE',
      purchasePrice: 0,
      currentValue: 0,
    },
  });

  const selectedType = watch('type') as AssetType;

  const handleFormSubmit = async (values: AssetFormValues) => {
    const {
      sqft,
      bedrooms,
      bathrooms,
      yearBuilt,
      symbol,
      shares,
      make,
      model,
      year,
      vin,
      mileage,
      purchaseDate,
      ...rest
    } = values;
    const metadata: Record<string, any> = {};
    if (sqft) metadata.sqft = sqft;
    if (bedrooms) metadata.bedrooms = bedrooms;
    if (bathrooms) metadata.bathrooms = bathrooms;
    if (yearBuilt) metadata.yearBuilt = yearBuilt;
    if (symbol) metadata.symbol = symbol;
    if (shares) metadata.shares = shares;
    if (make) metadata.make = make;
    if (model) metadata.model = model;
    if (year) metadata.year = year;
    if (vin) metadata.vin = vin;
    if (mileage) metadata.mileage = mileage;

    await onSubmit({
      ...rest,
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
          <DialogDescription>
            {asset ? 'Update the asset details.' : 'Add an asset to track its value over time.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Asset Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
                    <SelectItem value="AUTOMOBILE">Automobile</SelectItem>
                    <SelectItem value="STOCK">Stock</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Asset Name</Label>
            <Input id="name" placeholder="e.g. Primary Residence, Tesla Model 3, Apple Inc." {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {selectedType === 'REAL_ESTATE' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123 Main St, City, State ZIP" {...register("address")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sqft">Square Footage</Label>
                  <Input id="sqft" type="number" {...register("sqft")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearBuilt">Year Built</Label>
                  <Input id="yearBuilt" type="number" {...register("yearBuilt")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input id="bedrooms" type="number" {...register("bedrooms")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input id="bathrooms" type="number" step="0.5" {...register("bathrooms")} />
                </div>
              </div>
            </>
          )}

          {selectedType === 'AUTOMOBILE' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input id="make" placeholder="e.g. Toyota" {...register("make")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" placeholder="e.g. Camry" {...register("model")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input id="year" type="number" {...register("year")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mileage">Mileage</Label>
                <Input id="mileage" type="number" {...register("mileage")} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="vin">VIN (optional)</Label>
                <Input id="vin" placeholder="Vehicle identification number" {...register("vin")} />
              </div>
            </div>
          )}

          {selectedType === 'STOCK' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Ticker Symbol</Label>
                <Input id="symbol" placeholder="e.g. AAPL" {...register("symbol")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shares">Shares</Label>
                <Input id="shares" type="number" step="0.0001" {...register("shares")} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
              <Input id="purchasePrice" type="number" step="0.01" {...register("purchasePrice")} />
              {errors.purchasePrice && <p className="text-xs text-red-500">{errors.purchasePrice.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentValue">Current Value ($)</Label>
              <Input id="currentValue" type="number" step="0.01" {...register("currentValue")} />
              {errors.currentValue && <p className="text-xs text-red-500">{errors.currentValue.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (asset ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
