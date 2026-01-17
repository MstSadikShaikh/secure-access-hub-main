-- Allow authenticated users to insert into upi_blacklist (for fraud reporting)
CREATE POLICY "Users can add to blacklist" 
ON public.upi_blacklist 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);