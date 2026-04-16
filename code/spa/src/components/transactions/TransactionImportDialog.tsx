import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Upload, WandSparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { ACCOUNT_TYPE_LABELS, type Account, type AccountType, type TransactionImportResult } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ImportMode = 'existing' | 'new';
type ImportModeOption = ImportMode | 'file';
type ImportFormatOption = 'auto' | 'csv' | 'ofx' | 'qfx' | 'xlsx';

interface TransactionImportDialogProps {
  open: boolean;
  accounts: Account[];
  onClose: () => void;
  onImported: (result: TransactionImportResult) => Promise<void> | void;
}

const DEFAULT_CURRENCY = 'USD';
const SUPPORTED_ACCOUNT_TYPES: AccountType[] = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN', 'MORTGAGE', 'OTHER'];

function getDefaultMode(accounts: Account[]): ImportMode {
  return accounts.length > 0 ? 'existing' : 'new';
}

export function TransactionImportDialog({ open, accounts, onClose, onImported }: Readonly<TransactionImportDialogProps>) {
  const [importMode, setImportMode] = useState<ImportModeOption>(getDefaultMode(accounts));
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImportFormatOption>('auto');
  const [accountId, setAccountId] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [institution, setInstitution] = useState<string>('');
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [accountType, setAccountType] = useState<AccountType>('CHECKING');
  const [accountBalance, setAccountBalance] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supportsFileAccounts = format === 'xlsx' || (format === 'auto' && !!file?.name.match(/\.(xlsx|xls)$/i));

  const reset = () => {
    setImportMode(getDefaultMode(accounts));
    setFile(null);
    setFormat('auto');
    setAccountId('');
    setAccountName('');
    setInstitution('');
    setCurrency(DEFAULT_CURRENCY);
    setAccountType('CHECKING');
    setAccountBalance('');
    setError(null);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, accounts]);

  useEffect(() => {
    if (!supportsFileAccounts && importMode === 'file') {
      setImportMode(getDefaultMode(accounts));
    }
  }, [accounts, importMode, supportsFileAccounts]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError('Select a CSV, OFX, QFX, or XLSX file to import.');
      return;
    }

    if (importMode === 'existing' && !accountId) {
      setError('Choose an account to receive the imported transactions.');
      return;
    }

    if (importMode === 'new' && !accountName.trim()) {
      setError('Enter a name for the new account.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await api.importTransactions({
        file,
        format: format === 'auto' ? undefined : format,
        accountId: importMode === 'existing' ? accountId : undefined,
        accountName: importMode === 'new' ? accountName.trim() : undefined,
        institution: importMode === 'new' ? institution.trim() || undefined : undefined,
        currency: importMode === 'new' ? currency.trim().toUpperCase() || undefined : undefined,
        accountType: importMode === 'new' ? accountType : undefined,
        accountBalance: importMode === 'new' && accountBalance.trim() ? Number(accountBalance) : undefined,
      });

      await onImported(response.data);
      handleOpenChange(false);
    } catch (submitError: any) {
      setError(submitError.message || 'Import failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  let destinationContent: ReactNode;
  if (importMode === 'existing') {
    destinationContent = (
      <div className="space-y-2">
        <Label htmlFor="transaction-import-account">Account</Label>
        <Select value={accountId || undefined} onValueChange={setAccountId}>
          <SelectTrigger id="transaction-import-account">
            <SelectValue placeholder="Select an account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}{account.institution ? ` (${account.institution})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {accounts.length === 0 && (
          <p className="text-xs text-muted-foreground">No accounts are available yet, so this import will create one.</p>
        )}
      </div>
    );
  } else if (importMode === 'new') {
    destinationContent = (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="transaction-import-account-name">Account Name</Label>
          <Input
            id="transaction-import-account-name"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            placeholder="e.g. Imported Checking"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transaction-import-institution">Institution</Label>
          <Input
            id="transaction-import-institution"
            value={institution}
            onChange={(event) => setInstitution(event.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transaction-import-currency">Currency</Label>
          <Input
            id="transaction-import-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            maxLength={3}
            placeholder="USD"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transaction-import-account-type">Account Type</Label>
          <Select value={accountType} onValueChange={(value) => setAccountType(value as AccountType)}>
            <SelectTrigger id="transaction-import-account-type">
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_ACCOUNT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{ACCOUNT_TYPE_LABELS[type]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transaction-import-account-balance">Starting Balance</Label>
          <Input
            id="transaction-import-account-balance"
            type="number"
            step="0.01"
            value={accountBalance}
            onChange={(event) => setAccountBalance(event.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
    );
  } else {
    destinationContent = (
      <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
        Excel account and currency columns will be used to match or create separate destination accounts automatically.
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
          <DialogDescription>
            Upload a bank export and import it into an existing account, create a new one, or let Excel account metadata split the import automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="transaction-import-file">Statement File</Label>
            <Input
              id="transaction-import-file"
              type="file"
              accept=".csv,.ofx,.qfx,.xlsx,.xls"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">Supported formats: CSV, OFX, QFX, and Excel. Files are de-duplicated on re-import.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-import-format">Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ImportFormatOption)}>
              <SelectTrigger id="transaction-import-format">
                <SelectValue placeholder="Detect from file extension" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Detect from file extension</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="ofx">OFX</SelectItem>
                <SelectItem value="qfx">QFX</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">Destination</h3>
                <p className="text-xs text-muted-foreground">Choose an existing account or create one as part of the import.</p>
              </div>
              <div className={`grid gap-2 rounded-md bg-muted p-1 ${supportsFileAccounts ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <Button
                  type="button"
                  variant={importMode === 'existing' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setImportMode('existing')}
                  disabled={accounts.length === 0}
                >
                  Existing
                </Button>
                <Button
                  type="button"
                  variant={importMode === 'new' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setImportMode('new')}
                >
                  New Account
                </Button>
                {supportsFileAccounts && (
                  <Button
                    type="button"
                    variant={importMode === 'file' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setImportMode('file')}
                  >
                    From File
                  </Button>
                )}
              </div>
            </div>

            {destinationContent}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <WandSparkles className="mt-0.5 h-4 w-4" />
              <p>Newly imported transactions will be queued for categorization automatically after the upload completes.</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Upload className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Importing...' : 'Import File'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
