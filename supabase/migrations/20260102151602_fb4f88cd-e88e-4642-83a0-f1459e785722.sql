-- Create fraud_category enum
CREATE TYPE public.fraud_category AS ENUM (
  'phishing',
  'impersonation', 
  'duplicate_id',
  'social_engineering',
  'fake_qr',
  'suspicious_pattern',
  'unknown'
);

-- Create alert_type enum
CREATE TYPE public.alert_type AS ENUM (
  'fraud_detected',
  'phishing_attempt',
  'suspicious_transaction',
  'new_contact_warning',
  'high_risk_pattern'
);

-- Create alert_status enum
CREATE TYPE public.alert_status AS ENUM (
  'unread',
  'read',
  'dismissed',
  'actioned'
);

-- Create report_status enum
CREATE TYPE public.report_status AS ENUM (
  'pending',
  'investigating',
  'resolved',
  'dismissed'
);

-- Alerts table for real-time notifications
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id),
  alert_type public.alert_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status public.alert_status NOT NULL DEFAULT 'unread',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for alerts
CREATE POLICY "Users can view their own alerts"
ON public.alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.alerts FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all alerts
CREATE POLICY "Admins can view all alerts"
ON public.alerts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Fraud reports table for user reporting
CREATE TABLE public.fraud_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_upi_id TEXT NOT NULL,
  category public.fraud_category NOT NULL DEFAULT 'unknown',
  description TEXT,
  evidence_url TEXT,
  status public.report_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.fraud_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for fraud reports
CREATE POLICY "Users can create fraud reports"
ON public.fraud_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
ON public.fraud_reports FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
ON public.fraud_reports FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
ON public.fraud_reports FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Phishing attempts table
CREATE TABLE public.phishing_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  is_phishing BOOLEAN NOT NULL DEFAULT false,
  risk_score DECIMAL(3,2) NOT NULL DEFAULT 0,
  analysis_result JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phishing_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own phishing attempts"
ON public.phishing_attempts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create phishing attempts"
ON public.phishing_attempts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all phishing attempts"
ON public.phishing_attempts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Transaction analysis table for AI results
CREATE TABLE public.transaction_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  risk_score DECIMAL(3,2) NOT NULL DEFAULT 0,
  is_anomaly BOOLEAN NOT NULL DEFAULT false,
  fraud_category public.fraud_category,
  analysis_reasons JSONB DEFAULT '[]',
  ai_confidence DECIMAL(3,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_analysis ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own analysis"
ON public.transaction_analysis FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analysis"
ON public.transaction_analysis FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Chat messages for AI chatbot
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own messages"
ON public.chat_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add risk_score and fraud_category to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS risk_score DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fraud_category public.fraud_category,
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}';

-- Create index for better query performance
CREATE INDEX idx_alerts_user_status ON public.alerts(user_id, status);
CREATE INDEX idx_fraud_reports_status ON public.fraud_reports(status);
CREATE INDEX idx_transactions_risk ON public.transactions(risk_score);
CREATE INDEX idx_transactions_flagged ON public.transactions(is_flagged);

-- Update trigger for fraud_reports
CREATE TRIGGER update_fraud_reports_updated_at
BEFORE UPDATE ON public.fraud_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;