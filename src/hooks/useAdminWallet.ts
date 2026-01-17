import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAdminWallet() {
    const [balance, setBalance] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchBalance = async () => {
        try {
            const { data, error } = await supabase
                .from('admin_wallets')
                .select('balance')
                .single();

            if (error) {
                // If table doesn't exist or is empty (shouldn't happen with migration), handle gracefully
                console.error('Error fetching admin wallet:', error);
                return;
            }

            if (data) {
                setBalance(data.balance);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const distributeFunds = async (userId: string, amount: number) => {
        try {
            if (amount <= 0) throw new Error("Amount must be positive");
            if (amount > balance) throw new Error("Insufficient funds");

            const { error } = await supabase.rpc('distribute_funds', {
                target_user_id: userId,
                amount: amount
            });

            if (error) throw error;

            toast({
                title: "Funds Sent Successfully",
                description: `₹${amount} has been transferred to the user.`
            });

            // Refetch balance after transfer
            fetchBalance();
            return true;
        } catch (err: any) {
            toast({
                title: "Transfer Failed",
                description: err.message || "An error occurred while sending funds",
                variant: "destructive"
            });
            return false;
        }
    };

    const addFundsToMasterWallet = async (amount: number) => {
        try {
            if (amount <= 0) throw new Error("Amount must be positive");

            const { error } = await supabase
                .from('admin_wallets')
                .update({
                    balance: balance + amount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', '00000000-0000-0000-0000-000000000000');

            if (error) throw error;

            toast({
                title: "Master Wallet Updated",
                description: `₹${amount} has been added successfully.`
            });

            fetchBalance(); // Refresh the UI balance
            return true;
        } catch (err: any) {
            toast({
                title: "Top-up Failed",
                description: err.message || "Failed to add funds",
                variant: "destructive"
            });
            return false;
        }
    };

    useEffect(() => {
        fetchBalance();

        // Subscribe to changes
        const channel = supabase
            .channel('admin_wallet_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'admin_wallets'
                },
                (payload) => {
                    console.log('Wallet update:', payload);
                    fetchBalance();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return {
        balance,
        isLoading,
        distributeFunds,
        addFundsToMasterWallet
    };
}
