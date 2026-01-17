import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DeviceInfo } from '@/lib/device-fingerprint';
import { LocationInfo } from '@/lib/geolocation';

export interface BehaviorFlags {
  newContact: boolean;
  timeAnomaly: boolean;
  suspiciousUpi: boolean;
  suspiciousKeywords: boolean;
  isBlacklisted: boolean;
}

export interface ProfileStats {
  avg_amount: number;
  max_amount: number;
  transaction_count: number;
  known_devices: number;
}

export interface PreAnalysisResult {
  risk_score: number;
  risk_level: 'safe' | 'warning' | 'danger' | 'critical';
  recommendation: 'proceed' | 'caution' | 'avoid' | 'block';
  reasons: string[];
  impersonation_warning: boolean;
  similar_contacts: string[];
  amount_anomaly: boolean;
  contact_status: 'trusted' | 'new' | 'flagged';
  contact_name: string | null;
  behavior_flags: BehaviorFlags;
  profile_stats: ProfileStats | null;
}

export interface AnalyzeTransactionParams {
  amount: number;
  receiverUpi: string;
  deviceInfo?: DeviceInfo | null;
  location?: LocationInfo | null;
  localHour: number;
}

export function usePreTransactionAnalysis() {
  const { user } = useAuth();

  const analyzeTransaction = useMutation({
    mutationFn: async ({
      amount,
      receiverUpi,
      deviceInfo,
      location,
      localHour,
    }: AnalyzeTransactionParams): Promise<PreAnalysisResult> => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('pre-analyze-transaction', {
        body: {
          amount,
          receiverUpi,
          userId: user.id,
          deviceInfo: deviceInfo || null,
          location: location || null,
          localHour,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data as PreAnalysisResult;
    },
  });

  return {
    analyzeTransaction,
    isAnalyzing: analyzeTransaction.isPending,
    analysisResult: analyzeTransaction.data,
    analysisError: analyzeTransaction.error,
    reset: analyzeTransaction.reset,
  };
}
