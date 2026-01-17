-- Migration to fix transaction visibility for receivers and record admin transfers
-- 1. Add sender_upi_id to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_upi_id TEXT;

-- 2. Populate existing sender_upi_id
UPDATE public.transactions t
SET sender_upi_id = p.upi_id
FROM public.profiles p
WHERE t.user_id = p.user_id;

-- 3. Modify p2p_transfer to include sender_upi_id
CREATE OR REPLACE FUNCTION p2p_transfer(
    sender_id UUID,
    receiver_upi TEXT,
    amount DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    receiver_id UUID;
    tx_id UUID;
    sender_balance DECIMAL;
    sender_upi_val TEXT;
BEGIN
    -- 1. Get receiver user_id from UPI ID
    SELECT user_id INTO receiver_id FROM public.profiles WHERE LOWER(upi_id) = LOWER(receiver_upi);
    
    IF receiver_id IS NULL THEN
        RAISE EXCEPTION 'Receiver UPI ID not found';
    END IF;

    IF receiver_id = sender_id THEN
        RAISE EXCEPTION 'Cannot send money to yourself';
    END IF;

    -- Get sender UPI
    SELECT upi_id INTO sender_upi_val FROM public.profiles WHERE user_id = sender_id;

    -- 2. Check sender balance
    SELECT wallet_balance INTO sender_balance FROM public.profiles WHERE user_id = sender_id FOR UPDATE;
    
    IF sender_balance < amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- 3. Deduct from sender
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance - amount, updated_at = now()
    WHERE user_id = sender_id;

    -- 4. Add to receiver
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance + amount, updated_at = now()
    WHERE user_id = receiver_id;

    -- 5. Record the transaction
    INSERT INTO public.transactions (user_id, amount, receiver_upi_id, sender_upi_id, status, created_at)
    VALUES (sender_id, amount, receiver_upi, sender_upi_val, 'completed', now())
    RETURNING id INTO tx_id;

    RETURN tx_id;
END;
$$;

-- 4. Update distribute_funds to record transactions
CREATE OR REPLACE FUNCTION distribute_funds(target_user_id UUID, amount DECIMAL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_admin_balance DECIMAL;
    target_upi TEXT;
    admin_upi TEXT;
    admin_id UUID;
BEGIN
    -- Get admin ID (caller)
    admin_id := auth.uid();
    
    -- Check admin balance
    SELECT balance INTO current_admin_balance FROM public.admin_wallets WHERE id = '00000000-0000-0000-0000-000000000000';
    
    IF current_admin_balance < amount THEN
        RAISE EXCEPTION 'Insufficient admin funds';
    END IF;

    -- Get UPIs
    SELECT upi_id INTO target_upi FROM public.profiles WHERE user_id = target_user_id;
    SELECT upi_id INTO admin_upi FROM public.profiles WHERE user_id = admin_id;

    -- Deduct from admin
    UPDATE public.admin_wallets 
    SET balance = balance - amount, updated_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000000';

    -- Add to user
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + amount, updated_at = now()
    WHERE user_id = target_user_id;

    -- Record the transaction
    INSERT INTO public.transactions (user_id, amount, receiver_upi_id, sender_upi_id, status, created_at)
    VALUES (admin_id, amount, target_upi, COALESCE(admin_upi, 'admin@fraudguard'), 'completed', now());
END;
$$;

-- 5. Update RLS Policy to allow receivers to see transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;

CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() 
        AND p.upi_id = receiver_upi_id
    )
);
