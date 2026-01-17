-- Create UPI blacklist table for storing known fraudulent UPI IDs
CREATE TABLE public.upi_blacklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upi_id TEXT NOT NULL UNIQUE,
  reason TEXT,
  reported_count INTEGER DEFAULT 1,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  source TEXT DEFAULT 'user_report',
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.upi_blacklist ENABLE ROW LEVEL SECURITY;

-- Everyone can read the blacklist to check UPI IDs
CREATE POLICY "Anyone can view blacklist"
ON public.upi_blacklist
FOR SELECT
USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage blacklist"
ON public.upi_blacklist
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add email column to profiles if not exists for notifications
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- Create index for faster lookups
CREATE INDEX idx_upi_blacklist_upi_id ON public.upi_blacklist(upi_id);

-- Trigger for updated_at
CREATE TRIGGER update_upi_blacklist_updated_at
BEFORE UPDATE ON public.upi_blacklist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();