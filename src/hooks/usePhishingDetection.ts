
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import {
  analyzeUrlLocally,
  analyzeUrlWithOllama,
  PhishingAnalysis,
  PhishingFactor,
  ScanHistoryItem
} from '@/utils/phishingDetector';

export type { PhishingAnalysis, PhishingFactor, ScanHistoryItem };

export function usePhishingDetection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch scan history
  const { data: scanHistory, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['phishing-history', user?.id],
    queryFn: async (): Promise<ScanHistoryItem[]> => {
      if (!user?.id) {
        console.log('usePhishingDetection: No user ID, skipping history fetch');
        return [];
      }

      console.log('usePhishingDetection: Fetching history for user:', user.id);
      const { data, error } = await supabase
        .from('phishing_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('usePhishingDetection: History fetch error:', error);
        throw error;
      }

      console.log('usePhishingDetection: History fetched successfully, count:', data?.length || 0);

      return (data || []).map((item) => ({
        id: item.id,
        url: item.url,
        risk_score: Number(item.risk_score),
        is_phishing: item.is_phishing,
        created_at: item.created_at,
        analysis_result: item.analysis_result as unknown as PhishingAnalysis,
      }));
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  const detectMutation = useMutation({
    mutationFn: async (url: string): Promise<PhishingAnalysis> => {
      // 0. Check Blacklist first
      let hostname = url.trim();
      try {
        hostname = new URL(url).hostname.replace('www.', '');
      } catch (e) { }

      const { data: blacklistEntry } = await supabase
        .from('known_phishing_domains')
        .select('id')
        .eq('domain', hostname)
        .eq('is_active', true)
        .maybeSingle();

      const isBlacklisted = !!blacklistEntry;

      // 1. Run local analysis (Your "My Logic" system)
      const localResult = analyzeUrlLocally(url, isBlacklisted);

      // We are now using only localResult as per the "changed to my logic" request.
      // This eliminates dependencies on external AI or Edge functions that were causing CORS/timeout errors.
      return localResult;
    },

    onSuccess: async (analysis, url) => {
      // Save to history if user is logged in
      if (user?.id) {
        console.log('usePhishingDetection: Attempting to save scan to history for user:', user.id);
        const { error: saveError } = await supabase
          .from('phishing_attempts')
          .insert({
            user_id: user.id,
            url: url,
            is_phishing: analysis.is_phishing,
            risk_score: analysis.risk_score,
            risk_category: analysis.risk_category,
            threat_type: analysis.threat_type,
            analysis_result: analysis as any,
          });

        if (saveError) {
          console.error('usePhishingDetection: Failed to save scan to history:', saveError);
          toast({
            title: 'History Sync Failed',
            description: 'Your scan result could not be saved to your history.',
            variant: 'destructive',
          });
        } else {
          console.log('usePhishingDetection: Scan saved successfully');
          // Invalidate history to show new scan
          await queryClient.invalidateQueries({
            queryKey: ['phishing-history', user.id]
          });
          console.log('usePhishingDetection: History invalidated');
        }
      }

      // Create alert if risk score > 60%
      if (analysis.risk_score > 0.6 && user) {
        supabase.from('alerts').insert({
          user_id: user.id,
          alert_type: 'phishing_attempt',
          title: 'High Risk URI Detected',
          message: `You scanned a link with ${Math.round(analysis.risk_score * 100)}% risk score: ${url}`,
          severity: analysis.risk_score > 0.8 ? 'critical' : 'high',
          status: 'unread'
        }).then(({ error }) => {
          if (error) console.error('usePhishingDetection: Failed to create alert:', error);
        });
      }

      if (analysis.risk_category === 'critical') {
        toast({
          title: '🚨 CRITICAL THREAT DETECTED!',
          description: 'This link is extremely dangerous. DO NOT PROCEED.',
          variant: 'destructive',
        });
      } else if (analysis.is_phishing || analysis.recommendation === 'block') {
        toast({
          title: '⚠️ Phishing Detected!',
          description: analysis.explanation.slice(0, 100),
          variant: 'destructive',
        });
      } else if (analysis.recommendation === 'caution') {
        toast({
          title: '⚡ Proceed with Caution',
          description: analysis.explanation.slice(0, 100),
          variant: 'default',
        });
      } else {
        toast({
          title: '✓ Link appears safe',
          description: analysis.explanation.slice(0, 100),
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Analysis Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    detectPhishing: detectMutation.mutate,
    detectPhishingAsync: detectMutation.mutateAsync,
    isAnalyzing: detectMutation.isPending,
    analysis: detectMutation.data,
    scanHistory,
    isLoadingHistory,
    refetchHistory,
  };
}
