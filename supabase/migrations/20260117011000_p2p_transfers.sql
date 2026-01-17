-- Migration to add UPI ID to profiles and implement P2P transfers
-- This ensures every user has a unique UPI ID and can send/receive money in real-time

-- 1. Add upi_id column to profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'upi_id') THEN
        ALTER TABLE public.profiles ADD COLUMN upi_id TEXT UNIQUE;
    END IF;
END $$;

-- 2. Update existing profiles with a default upi_id if they don't have one
-- Format: email_prefix@fraudguard
UPDATE public.profiles 
SET upi_id = LOWER(SPLIT_PART(email, '@', 1)) || '@fraudguard'
WHERE upi_id IS NULL AND email IS NOT NULL;

-- 3. Update handle_new_user to generate upi_id automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    base_upi TEXT;
    final_upi TEXT;
    counter INTEGER := 0;
BEGIN
    -- Create base UPI from email prefix
    base_upi := LOWER(SPLIT_PART(NEW.email, '@', 1));
    final_upi := base_upi || '@fraudguard';
    
    -- Handle collisions by adding a suffix if needed
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE upi_id = final_upi) LOOP
        counter := counter + 1;
        final_upi := base_upi + counter::TEXT + '@fraudguard';
    END LOOP;

    -- Create profile
    INSERT INTO public.profiles (user_id, email, full_name, upi_id, wallet_balance)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        final_upi,
        0.00
    );
    
    -- Assign default 'user' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;

-- 4. Create P2P Transfer function
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
BEGIN
    -- 1. Get receiver user_id from UPI ID
    SELECT user_id INTO receiver_id FROM public.profiles WHERE LOWER(upi_id) = LOWER(receiver_upi);
    
    IF receiver_id IS NULL THEN
        RAISE EXCEPTION 'Receiver UPI ID not found';
    END IF;

    IF receiver_id = sender_id THEN
        RAISE EXCEPTION 'Cannot send money to yourself';
    END IF;

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
    INSERT INTO public.transactions (user_id, amount, receiver_upi_id, status, created_at)
    VALUES (sender_id, amount, receiver_upi, 'completed', now())
    RETURNING id INTO tx_id;

    RETURN tx_id;
END;
$$;
