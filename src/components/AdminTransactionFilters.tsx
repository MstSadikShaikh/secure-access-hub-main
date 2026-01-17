import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminTransactionFiltersProps {
  filter: 'all' | 'new' | 'flagged';
  onFilterChange: (filter: 'all' | 'new' | 'flagged') => void;
  counts: {
    all: number;
    new: number;
    flagged: number;
  };
}

export function AdminTransactionFilters({ filter, onFilterChange, counts }: AdminTransactionFiltersProps) {
  const filters = [
    { key: 'all' as const, label: 'All Transactions', count: counts.all },
    { key: 'new' as const, label: 'New Contacts', count: counts.new },
    { key: 'flagged' as const, label: 'Flagged Contacts', count: counts.flagged },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <Button
          key={f.key}
          variant={filter === f.key ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'transition-all',
            filter === f.key
              ? 'gradient-bg text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
          )}
          onClick={() => onFilterChange(f.key)}
        >
          {f.label}
          <span className={cn(
            'ml-2 px-1.5 py-0.5 rounded text-xs',
            filter === f.key ? 'bg-primary-foreground/20' : 'bg-muted'
          )}>
            {f.count}
          </span>
        </Button>
      ))}
    </div>
  );
}
