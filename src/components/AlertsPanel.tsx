import React from 'react';
import { useAlerts, Alert } from '@/hooks/useAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Shield, Check, X, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const severityStyles = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-destructive/80 text-destructive-foreground',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-info text-info-foreground',
};

const alertTypeIcons = {
  fraud_detected: AlertTriangle,
  phishing_attempt: Shield,
  suspicious_transaction: AlertTriangle,
  new_contact_warning: Bell,
  high_risk_pattern: AlertTriangle,
};

export function AlertsPanel() {
  const { alerts, isLoading, markAsRead, dismissAlert, unreadCount } = useAlerts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alerts
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No alerts at this time</p>
            <p className="text-sm">Your transactions are secure</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onMarkRead={() => markAsRead(alert.id)}
                  onDismiss={() => dismissAlert(alert.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function AlertItem({
  alert,
  onMarkRead,
  onDismiss,
}: {
  alert: Alert;
  onMarkRead: () => void;
  onDismiss: () => void;
}) {
  const Icon = alertTypeIcons[alert.alert_type] || Bell;
  const isUnread = alert.status === 'unread';

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        isUnread ? 'bg-card border-primary/30' : 'bg-secondary/30 border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${severityStyles[alert.severity]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{alert.title}</h4>
            <Badge variant="outline" className="text-xs">
              {alert.severity}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{alert.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      {isUnread && (
        <div className="flex gap-2 mt-3 justify-end">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <X className="h-3 w-3 mr-1" />
            Dismiss
          </Button>
          <Button variant="outline" size="sm" onClick={onMarkRead}>
            <Check className="h-3 w-3 mr-1" />
            Mark Read
          </Button>
        </div>
      )}
    </div>
  );
}
