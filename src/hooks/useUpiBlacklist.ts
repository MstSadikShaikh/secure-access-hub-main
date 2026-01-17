import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface BlacklistedUpi {
  id: string;
  upi_id: string;
  reason: string | null;
  reported_count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useUpiBlacklist() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: blacklist = [], isLoading, error } = useQuery({
    queryKey: ['upi-blacklist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upi_blacklist')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BlacklistedUpi[];
    },
  });

  const checkUpiBlacklist = async (upiId: string): Promise<BlacklistedUpi | null> => {
    const { data, error } = await supabase
      .from('upi_blacklist')
      .select('*')
      .eq('upi_id', upiId.toLowerCase())
      .maybeSingle();
    
    if (error) {
      console.error('Error checking blacklist:', error);
      return null;
    }
    return data as BlacklistedUpi | null;
  };

  const addToBlacklistMutation = useMutation({
    mutationFn: async ({ 
      upiId, 
      reason, 
      severity = 'medium' 
    }: { 
      upiId: string; 
      reason: string; 
      severity?: 'low' | 'medium' | 'high' | 'critical';
    }) => {
      // Check if already exists
      const { data: existing } = await supabase
        .from('upi_blacklist')
        .select('id, reported_count')
        .eq('upi_id', upiId.toLowerCase())
        .maybeSingle();

      if (existing) {
        // Increment reported count
        const { error } = await supabase
          .from('upi_blacklist')
          .update({ 
            reported_count: existing.reported_count + 1,
            severity: existing.reported_count >= 3 ? 'critical' : severity,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert new entry
        const { error } = await supabase
          .from('upi_blacklist')
          .insert({
            upi_id: upiId.toLowerCase(),
            reason,
            severity,
            source: 'user_report',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upi-blacklist'] });
      toast({
        title: 'UPI Added to Blacklist',
        description: 'The UPI ID has been flagged and will be blocked in future transactions.',
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

  const removeFromBlacklistMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('upi_blacklist')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upi-blacklist'] });
      toast({
        title: 'UPI Removed',
        description: 'The UPI ID has been removed from the blacklist.',
      });
    },
  });

  return {
    blacklist,
    isLoading,
    error,
    checkUpiBlacklist,
    addToBlacklist: addToBlacklistMutation.mutate,
    removeFromBlacklist: removeFromBlacklistMutation.mutate,
    isAdding: addToBlacklistMutation.isPending,
  };
}
