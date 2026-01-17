-- Migration to fix admin visibility of users and wallet
-- This ensures admins can see all user profiles to distribute funds

-- 1. Add admin policy for profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Admins can view all profiles'
    ) THEN
        CREATE POLICY "Admins can view all profiles"
        ON public.profiles
        FOR SELECT
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 2. Add admin policy for user_roles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_roles' AND policyname = 'Admins can view all user roles'
    ) THEN
        CREATE POLICY "Admins can view all user roles"
        ON public.user_roles
        FOR SELECT
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 3. Enable RLS on admin_wallets and add admin-only policy
ALTER TABLE public.admin_wallets ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_wallets' AND policyname = 'Admins can view master wallet'
    ) THEN
        CREATE POLICY "Admins can view master wallet"
        ON public.admin_wallets
        FOR SELECT
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;
