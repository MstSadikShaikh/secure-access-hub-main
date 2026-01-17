import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionStatusBadgeProps {
  status: 'pending' | 'completed' | 'failed';
  size?: 'sm' | 'default';
}

export function TransactionStatusBadge({ status, size = 'default' }: TransactionStatusBadgeProps) {
  const config = {
    completed: {
      label: 'Completed',
      icon: CheckCircle,
      className: 'bg-success/20 text-success border-success/30',
    },
    pending: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-warning/20 text-warning border-warning/30',
    },
    failed: {
      label: 'Failed',
      icon: XCircle,
      className: 'bg-destructive/20 text-destructive border-destructive/30',
    },
  };

  const currentConfig = config[status];
  const Icon = currentConfig.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        currentConfig.className,
        size === 'sm' && 'text-xs px-2 py-0.5'
      )}
    >
      <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {currentConfig.label}
    </Badge>
  );
}
