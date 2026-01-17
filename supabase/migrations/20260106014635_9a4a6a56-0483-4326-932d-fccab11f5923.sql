-- Create known_phishing_domains table for local blacklist
CREATE TABLE public.known_phishing_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  threat_type TEXT NOT NULL DEFAULT 'phishing',
  source TEXT NOT NULL DEFAULT 'user_report',
  reported_count INTEGER NOT NULL DEFAULT 1,
  first_reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for fast domain lookups
CREATE INDEX idx_known_phishing_domains_domain ON public.known_phishing_domains(domain);
CREATE INDEX idx_known_phishing_domains_active ON public.known_phishing_domains(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.known_phishing_domains ENABLE ROW LEVEL SECURITY;

-- Anyone can read the blacklist (for scanning)
CREATE POLICY "Anyone can view phishing domains"
ON public.known_phishing_domains
FOR SELECT
USING (true);

-- Authenticated users can add domains (will be validated in edge function)
CREATE POLICY "Authenticated users can add phishing domains"
ON public.known_phishing_domains
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can update/delete
CREATE POLICY "Admins can manage phishing domains"
ON public.known_phishing_domains
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed with common known phishing patterns (India-focused)
INSERT INTO public.known_phishing_domains (domain, threat_type, source, reported_count) VALUES
('paytm-secure.net', 'phishing', 'seed_data', 100),
('phonepe-verify.com', 'phishing', 'seed_data', 100),
('gpay-refund.in', 'phishing', 'seed_data', 100),
('sbi-netbanking-secure.com', 'phishing', 'seed_data', 100),
('hdfc-update.net', 'phishing', 'seed_data', 100),
('icici-verify.in', 'phishing', 'seed_data', 100),
('axis-secure-banking.com', 'phishing', 'seed_data', 100),
('upi-refund-claim.com', 'phishing', 'seed_data', 100),
('kyc-update-now.in', 'phishing', 'seed_data', 100),
('pan-aadhar-link.com', 'phishing', 'seed_data', 100);