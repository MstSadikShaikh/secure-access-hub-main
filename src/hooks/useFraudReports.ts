import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type FraudCategory = 'phishing' | 'impersonation' | 'duplicate_id' | 'social_engineering' | 'fake_qr' | 'suspicious_pattern' | 'unknown';
export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export interface FraudReport {
  id: string;
  reporter_id: string;
  reported_upi_id: string;
  category: FraudCategory;
  description: string | null;
  evidence_url: string | null;
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export function useFraudReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading, error } = useQuery({
    queryKey: ['fraud-reports', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('fraud_reports')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FraudReport[];
    },
    enabled: !!user,
  });

  const createReportMutation = useMutation({
    mutationFn: async (report: {
      reported_upi_id: string;
      category: FraudCategory;
      description?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('fraud_reports')
        .insert({
          reporter_id: user.id,
          ...report,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fraud-reports'] });
      toast({
        title: 'Report Submitted',
        description: 'Thank you for reporting. We will investigate this case.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    reports,
    isLoading,
    error,
    createReport: createReportMutation.mutate,
    isCreating: createReportMutation.isPending,
  };
}

// Hook for admin to view all fraud reports
export function useAllFraudReports() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading, error } = useQuery({
    queryKey: ['all-fraud-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fraud_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FraudReport[];
    },
    enabled: role === 'admin',
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: ReportStatus; admin_notes?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (admin_notes) updateData.admin_notes = admin_notes;
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }
      
      const { error } = await supabase
        .from('fraud_reports')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-fraud-reports'] });
      toast({
        title: 'Report Updated',
        description: 'The report status has been updated.',
      });
    },
  });

  return {
    reports,
    isLoading,
    error,
    updateReport: updateReportMutation.mutate,
  };
}
