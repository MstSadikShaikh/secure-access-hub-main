import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContactStatusBadgeProps {
  status: 'trusted' | 'new' | 'flagged' | undefined;
  showIcon?: boolean;
  size?: 'sm' | 'default';
}

export function ContactStatusBadge({ status, showIcon = true, size = 'default' }: ContactStatusBadgeProps) {
  const config = {
    trusted: {
      label: 'Trusted',
      icon: ShieldCheck,
      className: 'bg-success/20 text-success border-success/30 hover:bg-success/30',
    },
    new: {
      label: 'New',
      icon: UserPlus,
      className: 'bg-info/20 text-info border-info/30 hover:bg-info/30',
    },
    flagged: {
      label: 'Flagged',
      icon: AlertTriangle,
      className: 'bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30',
    },
    unknown: {
      label: 'Unknown',
      icon: UserPlus,
      className: 'bg-muted/50 text-muted-foreground border-muted hover:bg-muted',
    },
  };

  const currentConfig = status ? config[status] : config.unknown;
  const Icon = currentConfig.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border transition-colors',
        currentConfig.className,
        size === 'sm' && 'text-xs px-2 py-0.5'
      )}
    >
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      {currentConfig.label}
    </Badge>
  );
}
