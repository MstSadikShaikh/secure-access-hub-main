import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useEffect } from 'react';

export type AlertType = 'fraud_detected' | 'phishing_attempt' | 'suspicious_transaction' | 'new_contact_warning' | 'high_risk_pattern';
export type AlertStatus = 'unread' | 'read' | 'dismissed' | 'actioned';

export interface Alert {
  id: string;
  user_id: string;
  transaction_id: string | null;
  alert_type: AlertType;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: AlertStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

export function useAlerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ['alerts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!user,
  });

  // Real-time subscription for alerts
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          const newAlert = payload.new as Alert;
          toast({
            title: newAlert.title,
            description: newAlert.message,
            variant: newAlert.severity === 'critical' || newAlert.severity === 'high' ? 'destructive' : 'default',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, toast]);

  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'dismissed' })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const unreadCount = alerts.filter(a => a.status === 'unread').length;

  return {
    alerts,
    isLoading,
    error,
    unreadCount,
    markAsRead: markAsReadMutation.mutate,
    dismissAlert: dismissAlertMutation.mutate,
  };
}

// Hook for admin to view all alerts
export function useAllAlerts() {
  const { role } = useAuth();

  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ['all-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as Alert[];
    },
    enabled: role === 'admin',
  });

  return { alerts, isLoading, error };
}
