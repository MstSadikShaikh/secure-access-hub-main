// @ts-ignore: Deno runtime imports; local TypeScript may not resolve these in Node environment
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore: remote Supabase client import for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare Deno for TypeScript checks in non-Deno environments
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  otp: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, otp } = await req.json() as VerifyOTPRequest;

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Email and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailLower = email.toLowerCase();
    const now = new Date().toISOString();

    // Find matching OTP
    const { data: otpRecords, error: fetchError } = await supabase
      .from("otp_verifications")
      .select("id, otp_code, expires_at, verified")
      .eq("email", emailLower)
      .eq("otp_code", otp)
      .eq("verified", false)
      .gt("expires_at", now)
      .limit(1);

    if (fetchError) {
      console.error("Error fetching OTP:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to verify OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!otpRecords || otpRecords.length === 0) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid or expired OTP" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from("otp_verifications")
      .update({ verified: true })
      .eq("id", otpRecords[0].id);

    if (updateError) {
      console.error("Error marking OTP as verified:", updateError);
    }

    return new Response(
      JSON.stringify({ valid: true, message: "OTP verified successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in verify-otp:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to verify OTP";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
