import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Account, Category } from "@/types";

interface TransactionFiltersProps {
  accounts: Account[];
  categories: Category[];
  filters: {
    accountId?: string;
    categoryId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  };
  onFilterChange: (updates: Record<string, string | undefined>) => void;
}

export function TransactionFilters({ accounts, categories, filters, onFilterChange }: TransactionFiltersProps) {
  const hasFilters = filters.accountId || filters.categoryId || filters.search || filters.startDate;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          className="pl-9"
          value={filters.search || ''}
          onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
        />
      </div>

      <Select value={filters.accountId || 'all'} onValueChange={(v) => onFilterChange({ accountId: v === 'all' ? undefined : v })}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Accounts</SelectItem>
          {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.categoryId || 'all'} onValueChange={(v) => onFilterChange({ categoryId: v === 'all' ? undefined : v })}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="w-[150px]"
        value={filters.startDate || ''}
        onChange={(e) => onFilterChange({ startDate: e.target.value || undefined })}
        placeholder="Start date"
      />

      <Input
        type="date"
        className="w-[150px]"
        value={filters.endDate || ''}
        onChange={(e) => onFilterChange({ endDate: e.target.value || undefined })}
        placeholder="End date"
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => onFilterChange({ accountId: undefined, categoryId: undefined, search: undefined, startDate: undefined, endDate: undefined })}>
          <X className="h-4 w-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}
