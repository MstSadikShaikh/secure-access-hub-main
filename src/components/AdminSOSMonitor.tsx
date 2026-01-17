import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, MapPin, Phone, Clock, User, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SOSAlert {
  id: string;
  user_id: string;
  latitude: number | null;
  longitude: number | null;
  trigger_method: string;
  status: string;
  contacts_notified: number;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export function AdminSOSMonitor() {
  const { data: sosAlerts = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-sos-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(alert => ({
        ...alert,
        profiles: profileMap.get(alert.user_id) || null
      })) as SOSAlert[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'triggered':
        return 'destructive';
      case 'acknowledged':
        return 'default';
      case 'resolved':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const activeAlerts = sosAlerts.filter(a => a.status === 'triggered');
  const recentAlerts = sosAlerts.filter(a => a.status !== 'triggered').slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      <Card className={activeAlerts.length > 0 ? 'border-destructive' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className={`h-5 w-5 ${activeAlerts.length > 0 ? 'text-destructive animate-pulse' : 'text-primary'}`} />
              <CardTitle>Active SOS Alerts</CardTitle>
              {activeAlerts.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {activeAlerts.length} Active
                </Badge>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Real-time emergency alerts from users (auto-refreshes every 10s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No active SOS alerts</p>
              <p className="text-sm mt-1">System is monitoring for emergencies</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive/50 animate-pulse"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        <span className="font-semibold">
                          {alert.profiles?.full_name || alert.profiles?.email || 'Unknown User'}
                        </span>
                        <Badge variant="destructive">ACTIVE</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{alert.profiles?.phone || 'No phone'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Trigger: <strong className="text-foreground">{alert.trigger_method}</strong></span>
                        <span>Contacts notified: <strong className="text-foreground">{alert.contacts_notified}</strong></span>
                      </div>
                    </div>

                    {alert.latitude && alert.longitude && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInMaps(alert.latitude!, alert.longitude!)}
                        className="flex-shrink-0"
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        View Location
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Alerts History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent Alert History
          </CardTitle>
          <CardDescription>
            Past SOS alerts and their resolution status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentAlerts.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No alert history</p>
          ) : (
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {alert.profiles?.full_name || alert.profiles?.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })} via {alert.trigger_method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.latitude && alert.longitude && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openInMaps(alert.latitude!, alert.longitude!)}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    )}
                    <Badge variant={getStatusColor(alert.status)}>
                      {alert.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
