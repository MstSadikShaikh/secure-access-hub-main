import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TransactionAnalysis {
  risk_score: number;
  is_anomaly: boolean;
  fraud_category: string | null;
  confidence: number;
  reasons: string[];
  recommendation: 'allow' | 'warn' | 'block';
}

export function useTransactionAnalysis() {
  const { user } = useAuth();

  const analyzeMutation = useMutation({
    mutationFn: async ({
      transactionId,
      amount,
      receiverUpi,
      userHistory,
    }: {
      transactionId: string;
      amount: number;
      receiverUpi: string;
      userHistory: unknown[];
    }): Promise<TransactionAnalysis> => {
      const { data, error } = await supabase.functions.invoke('analyze-transaction', {
        body: {
          transactionId,
          userId: user?.id,
          amount,
          receiverUpi,
          userHistory,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.analysis;
    },
  });

  return {
    analyzeTransaction: analyzeMutation.mutate,
    analyzeTransactionAsync: analyzeMutation.mutateAsync,
    isAnalyzing: analyzeMutation.isPending,
    analysis: analyzeMutation.data,
  };
}

// Hook to get analysis history
export function useAnalysisHistory() {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['transaction-analysis', user?.id, role],
    queryFn: async () => {
      const query = supabase
        .from('transaction_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // If not admin, filter by user
      if (role !== 'admin' && user) {
        query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
