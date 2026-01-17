-- Add missing INSERT policies for defense in depth

-- 1. Add INSERT policy for transaction_analysis table
CREATE POLICY "Users can insert their own analysis"
ON public.transaction_analysis
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2. Add INSERT policy for alerts table
CREATE POLICY "Users can create their own alerts"
ON public.alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Add INSERT policy for profiles table
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Add INSERT policy for sos_alerts table (for consistency)
-- Already has INSERT policy, but let's verify by checking existing

-- 5. Fix overly permissive user_behavior_profiles policy
-- Drop the overly permissive "Service role can manage all profiles" policy
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.user_behavior_profiles;

-- Add proper INSERT and UPDATE policies for user_behavior_profiles
CREATE POLICY "Users can insert their own behavior profile"
ON public.user_behavior_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own behavior profile"
ON public.user_behavior_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);