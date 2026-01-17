-- Fix overly permissive otp_verifications policies
-- OTP verification is used during signup BEFORE authentication, so we need to be careful
-- We'll keep SELECT public for email verification lookup but restrict INSERT/UPDATE

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can create OTP verifications" ON public.otp_verifications;
DROP POLICY IF EXISTS "Anyone can update OTP verification status" ON public.otp_verifications;

-- Create more restrictive policies
-- INSERT: Allow only from edge functions (we'll validate in the function)
-- Since OTP is sent via edge function with service role, and verified before auth,
-- we need a policy that allows the operation but with some constraints
CREATE POLICY "Allow OTP creation with valid email"
ON public.otp_verifications
FOR INSERT
WITH CHECK (
  email IS NOT NULL 
  AND length(email) > 0 
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- UPDATE: Only allow updating unverified OTPs to verified (within expiry window)
CREATE POLICY "Allow OTP verification update"
ON public.otp_verifications
FOR UPDATE
USING (
  verified = false 
  AND expires_at > now()
)
WITH CHECK (verified = true);

-- DELETE: Allow cleanup of expired OTPs (optional, for edge function cleanup)
CREATE POLICY "Allow expired OTP deletion"
ON public.otp_verifications
FOR DELETE
USING (expires_at < now());