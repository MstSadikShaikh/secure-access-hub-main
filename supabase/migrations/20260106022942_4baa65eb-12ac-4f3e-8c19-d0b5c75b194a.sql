-- Add behavior tracking columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS transaction_hour integer,
ADD COLUMN IF NOT EXISTS day_of_week integer,
ADD COLUMN IF NOT EXISTS device_fingerprint text;

-- Create user behavior profiles table for ML-like pattern learning
CREATE TABLE public.user_behavior_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  avg_transaction_amount NUMERIC DEFAULT 0,
  max_transaction_amount NUMERIC DEFAULT 0,
  std_dev_amount NUMERIC DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  typical_transaction_hours INTEGER[] DEFAULT '{}',
  trusted_device_ids TEXT[] DEFAULT '{}',
  common_locations JSONB DEFAULT '[]',
  transaction_frequency JSONB DEFAULT '{"hourly_avg": 0, "daily_avg": 0}',
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_behavior_profiles
ALTER TABLE public.user_behavior_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own profile
CREATE POLICY "Users can view their own behavior profile"
ON public.user_behavior_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all profiles (for edge function updates)
CREATE POLICY "Service role can manage all profiles"
ON public.user_behavior_profiles
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for auto-updating updated_at
CREATE TRIGGER update_user_behavior_profiles_updated_at
BEFORE UPDATE ON public.user_behavior_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_behavior_profiles_user_id ON public.user_behavior_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_device_fingerprint ON public.transactions(device_fingerprint);