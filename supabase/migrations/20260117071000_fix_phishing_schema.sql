
-- Migration to ensure phishing_attempts has the necessary columns
-- This fixes the PGRST204 error: "Could not find the 'risk_category' column"

DO $$ 
BEGIN
    -- Add risk_category if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'phishing_attempts' AND column_name = 'risk_category') THEN
        ALTER TABLE public.phishing_attempts ADD COLUMN risk_category TEXT NOT NULL DEFAULT 'safe' CHECK (risk_category IN ('safe', 'suspicious', 'dangerous', 'critical'));
    END IF;

    -- Add threat_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'phishing_attempts' AND column_name = 'threat_type') THEN
        ALTER TABLE public.phishing_attempts ADD COLUMN threat_type TEXT DEFAULT 'unknown';
    END IF;

    -- Update existing rows to have a valid risk_category if they were null (though they shouldn't be based on above)
    UPDATE public.phishing_attempts SET risk_category = 'safe' WHERE risk_category IS NULL;
END $$;
