-- Create enum for transaction status
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed');

-- Create enum for contact status
CREATE TYPE public.contact_status AS ENUM ('trusted', 'new', 'flagged');

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    receiver_upi_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status transaction_status NOT NULL DEFAULT 'pending',
    risk_score NUMERIC(5, 2) DEFAULT NULL
);

-- Create trusted_contacts table
CREATE TABLE public.trusted_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    upi_id TEXT NOT NULL,
    contact_name TEXT,
    status contact_status NOT NULL DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, upi_id)
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on trusted_contacts
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions table
-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert their own transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions
CREATE POLICY "Users can update their own transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for trusted_contacts table
-- Users can view their own contacts
CREATE POLICY "Users can view their own contacts"
ON public.trusted_contacts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own contacts
CREATE POLICY "Users can insert their own contacts"
ON public.trusted_contacts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own contacts
CREATE POLICY "Users can update their own contacts"
ON public.trusted_contacts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own contacts
CREATE POLICY "Users can delete their own contacts"
ON public.trusted_contacts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all contacts (for transaction context)
CREATE POLICY "Admins can view all contacts"
ON public.trusted_contacts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at on trusted_contacts
CREATE TRIGGER update_trusted_contacts_updated_at
    BEFORE UPDATE ON public.trusted_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_receiver_upi ON public.transactions(receiver_upi_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_trusted_contacts_user_id ON public.trusted_contacts(user_id);
CREATE INDEX idx_trusted_contacts_upi_id ON public.trusted_contacts(upi_id);