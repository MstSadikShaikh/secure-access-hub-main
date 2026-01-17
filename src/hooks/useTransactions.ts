import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  receiver_upi_id: string;
  sender_upi_id?: string;
  created_at: string;
  status: TransactionStatus;
  risk_score: number | null;
  is_flagged?: boolean;
  fraud_category?: string | null;
  location?: string | null;
  type?: 'credit' | 'debit';
}

export interface TransactionWithContact extends Transaction {
  contact_status?: 'trusted' | 'new' | 'flagged';
  contact_name?: string;
  user_email?: string;
}

export function useTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async (): Promise<TransactionWithContact[]> => {
      if (!user) return [];

      // 1. Fetch own profile to get UPI ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('upi_id')
        .eq('user_id', user.id)
        .single();

      const myUpiId = profile?.upi_id;

      // 2. Fetch transactions where user is sender OR receiver
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .or(`user_id.eq.${user.id},receiver_upi_id.eq.${myUpiId}`)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      // 3. Fetch contacts to map status
      const { data: contacts, error: contactError } = await supabase
        .from('trusted_contacts')
        .select('upi_id, status, contact_name')
        .eq('user_id', user.id);

      if (contactError) throw contactError;

      const contactMap = new Map(
        contacts?.map(c => [c.upi_id.toLowerCase(), { status: c.status, name: c.contact_name }]) || []
      );

      // 4. Merge transactions with type and contact info
      return (txData || []).map(tx => {
        const isDebit = tx.user_id === user.id;
        const type = isDebit ? 'debit' as const : 'credit' as const;

        // For credit, we show the sender's UPI, for debit we show receiver's UPI
        const counterpartyUpi = isDebit ? tx.receiver_upi_id : (tx.sender_upi_id || 'Unknown');
        const contactInfo = contactMap.get(counterpartyUpi.toLowerCase());

        return {
          ...tx,
          type,
          receiver_upi_id: counterpartyUpi, // Override for display purposes in table
          contact_status: contactInfo?.status as 'trusted' | 'new' | 'flagged' | undefined,
          contact_name: contactInfo?.name,
        };
      });
    },
    enabled: !!user,
  });

  const createTransaction = useMutation({
    mutationFn: async (data: { amount: number; receiver_upi_id: string; status?: TransactionStatus }) => {
      if (!user) throw new Error('Not authenticated');

      // Use the RPC for atomic transfer
      const { data: txId, error } = await supabase.rpc('p2p_transfer', {
        sender_id: user.id,
        receiver_upi: data.receiver_upi_id,
        amount: data.amount
      });

      if (error) throw error;

      // Auto-create contact if doesn't exist
      const { error: contactError } = await supabase
        .from('trusted_contacts')
        .upsert({
          user_id: user.id,
          upi_id: data.receiver_upi_id,
          status: 'new',
        }, { onConflict: 'user_id,upi_id', ignoreDuplicates: true });

      if (contactError) console.error('Failed to create contact:', contactError);

      return txId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] }); // Invalidate profile to refresh balance if needed
      toast({ title: 'Transaction completed successfully' });
    },
    onError: (error) => {
      toast({ title: 'Transfer Failed', description: error.message, variant: 'destructive' });
    },
  });

  return {
    transactions: transactions || [],
    isLoading,
    error,
    createTransaction,
  };
}

// Hook for admin to view all transactions
export function useAllTransactions() {
  const { role } = useAuth();

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: async (): Promise<TransactionWithContact[]> => {
      // Fetch all transactions (admin only via RLS)
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      // Fetch all contacts for status mapping
      const { data: contacts, error: contactError } = await supabase
        .from('trusted_contacts')
        .select('user_id, upi_id, status');

      if (contactError) throw contactError;

      // Fetch profiles for user emails
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, email');

      if (profileError) throw profileError;

      // Create maps
      const contactMap = new Map(
        contacts?.map(c => [`${c.user_id}-${c.upi_id}`, c.status]) || []
      );
      const profileMap = new Map(
        profiles?.map(p => [p.user_id, p.email]) || []
      );

      return (txData || []).map(tx => ({
        ...tx,
        user_email: profileMap.get(tx.user_id),
        contact_status: contactMap.get(`${tx.user_id}-${tx.receiver_upi_id}`) as 'trusted' | 'new' | 'flagged' | undefined,
      }));
    },
    enabled: role === 'admin',
  });

  return {
    transactions: transactions || [],
    isLoading,
    error,
  };
}
