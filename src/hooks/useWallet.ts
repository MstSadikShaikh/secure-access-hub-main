import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useWallet() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: balance = 0, isLoading, error, refetch } = useQuery({
        queryKey: ['wallet-balance', user?.id],
        queryFn: async () => {
            if (!user) return 0;
            const { data, error } = await supabase
                .from('profiles')
                .select('wallet_balance')
                .eq('user_id', user.id)
                .single();

            if (error) {
                console.error('Error fetching wallet balance:', error);
                throw error;
            }
            return data.wallet_balance || 0;
        },
        enabled: !!user,
    });

    return {
        balance,
        isLoading,
        error,
        refetch,
    };
}
