-- Add wallet_balance to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'wallet_balance') THEN
        ALTER TABLE public.profiles ADD COLUMN wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
    END IF;
END $$;

-- Create admin_wallets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    balance DECIMAL(15, 2) NOT NULL DEFAULT 10000.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Initialize admin wallet with specific ID for singleton access
INSERT INTO public.admin_wallets (id, balance)
VALUES ('00000000-0000-0000-0000-000000000000', 10000.00)
ON CONFLICT (id) DO NOTHING;

-- Function to distribute funds atomically
CREATE OR REPLACE FUNCTION distribute_funds(target_user_id UUID, amount DECIMAL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_admin_balance DECIMAL;
BEGIN
    -- Check admin balance
    SELECT balance INTO current_admin_balance FROM public.admin_wallets WHERE id = '00000000-0000-0000-0000-000000000000';
    
    IF current_admin_balance < amount THEN
        RAISE EXCEPTION 'Insufficient admin funds';
    END IF;

    -- Deduct from admin
    UPDATE public.admin_wallets 
    SET balance = balance - amount, updated_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000000';

    -- Add to user
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + amount, updated_at = now()
    WHERE user_id = target_user_id;
END;
$$;
