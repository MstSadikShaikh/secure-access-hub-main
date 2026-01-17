
-- Create phishing_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.phishing_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    is_phishing BOOLEAN NOT NULL DEFAULT false,
    risk_score NUMERIC NOT NULL DEFAULT 0,
    risk_category TEXT NOT NULL CHECK (risk_category IN ('safe', 'suspicious', 'dangerous', 'critical')),
    threat_type TEXT DEFAULT 'unknown',
    analysis_result JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phishing_attempts ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_phishing_attempts_user_id ON public.phishing_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_phishing_attempts_created_at ON public.phishing_attempts(created_at DESC);

-- Policies

-- 1. Users can view their own history
CREATE POLICY "Users can view their own phishing scan history"
ON public.phishing_attempts
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Users can insert their own scans
CREATE POLICY "Users can insert their own phishing scans"
ON public.phishing_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Admins can view all scans (optional, but good for monitoring)
CREATE POLICY "Admins can view all phishing scans"
ON public.phishing_attempts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
