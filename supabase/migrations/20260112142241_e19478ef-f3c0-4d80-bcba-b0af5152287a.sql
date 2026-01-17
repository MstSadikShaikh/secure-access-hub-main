-- ============================================
-- PHASE 1: DATABASE MIGRATION
-- Tables: emergency_contacts, sos_alerts, otp_verifications
-- Update: profiles table with SOS settings
-- ============================================

-- 1. Add SOS settings columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sos_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS shake_detection_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS alarm_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Create emergency_contacts table
CREATE TABLE public.emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on emergency_contacts
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emergency_contacts
CREATE POLICY "Users can view their own emergency contacts"
ON public.emergency_contacts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emergency contacts"
ON public.emergency_contacts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emergency contacts"
ON public.emergency_contacts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emergency contacts"
ON public.emergency_contacts FOR DELETE
USING (auth.uid() = user_id);

-- 3. Create sos_alerts table
CREATE TABLE public.sos_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  trigger_method TEXT NOT NULL CHECK (trigger_method IN ('button', 'shake')),
  status TEXT NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'sent', 'acknowledged', 'resolved')),
  contacts_notified INTEGER DEFAULT 0,
  location_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sos_alerts
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sos_alerts
CREATE POLICY "Users can view their own SOS alerts"
ON public.sos_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SOS alerts"
ON public.sos_alerts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all SOS alerts"
ON public.sos_alerts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for SOS alerts (admin monitoring)
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;

-- 4. Create otp_verifications table for email OTP
CREATE TABLE public.otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on otp_verifications
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for otp_verifications (public access needed for signup flow)
CREATE POLICY "Anyone can create OTP verifications"
ON public.otp_verifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view their OTP by email"
ON public.otp_verifications FOR SELECT
USING (true);

CREATE POLICY "Anyone can update OTP verification status"
ON public.otp_verifications FOR UPDATE
USING (true);

-- 5. Create indexes for better performance
CREATE INDEX idx_emergency_contacts_user_id ON public.emergency_contacts(user_id);
CREATE INDEX idx_sos_alerts_user_id ON public.sos_alerts(user_id);
CREATE INDEX idx_sos_alerts_created_at ON public.sos_alerts(created_at DESC);
CREATE INDEX idx_otp_verifications_email ON public.otp_verifications(email);
CREATE INDEX idx_otp_verifications_expires ON public.otp_verifications(expires_at);

-- 6. Add trigger for updated_at on emergency_contacts
CREATE TRIGGER update_emergency_contacts_updated_at
BEFORE UPDATE ON public.emergency_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();