// @ts-ignore: Deno runtime imports
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore: remote Supabase client import for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore: npm import for Deno
import nodemailer from "npm:nodemailer@6.9.13";

// Declare Deno for TypeScript checks
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  email: string;
  name?: string;
  type?: 'signup' | 'verify';
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");
    const SHOW_OTP_IN_RESPONSE = Deno.env.get("SHOW_OTP_IN_RESPONSE") === 'true';

    // Strictly require SMTP credentials
    if (!SMTP_USER || !SMTP_PASS) {
      console.error("SMTP credentials missing");
      return new Response(
        JSON.stringify({ error: "Email configuration missing (SMTP)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SKIP_DB = Deno.env.get("SKIP_DB") === 'true';
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || '';
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || '';
    const supabase = SKIP_DB ? null : createClient(supabaseUrl, supabaseServiceKey);

    const { email, name, type = 'signup' } = await req.json() as OTPRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending OTP to ${email} for ${type}`);

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Database operations
    if (!SKIP_DB && supabase) {
      await supabase
        .from("otp_verifications")
        .delete()
        .eq("email", email.toLowerCase());

      const { error: insertError } = await supabase
        .from("otp_verifications")
        .insert({
          email: email.toLowerCase(),
          otp_code: otpCode, // Consider hashing this in production!
          expires_at: expiresAt.toISOString(),
          verified: false,
        });

      if (insertError) {
        console.error("Error storing OTP:", insertError);
        throw new Error("Failed to generate OTP");
      }
    } else {
      console.warn("SKIP_DB=true - not storing OTP (dev mode)");
    }

    // Email Layout
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0a0f1a; color: #f0f4f8; margin: 0; padding: 40px 20px; }
            .container { max-width: 480px; margin: 0 auto; background: linear-gradient(145deg, #111827, #0d1424); border-radius: 16px; padding: 40px; border: 1px solid #1e3a5f; }
            .logo { text-align: center; margin-bottom: 30px; }
            .logo h1 { color: #14b8a6; margin: 0; font-size: 28px; }
            .otp-box { background: linear-gradient(135deg, #14b8a6, #0ea5e9); padding: 24px; border-radius: 12px; text-align: center; margin: 30px 0; }
            .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0a0f1a; margin: 0; }
            .message { color: #94a3b8; font-size: 14px; line-height: 1.6; text-align: center; }
            .warning { color: #f59e0b; font-size: 12px; margin-top: 20px; text-align: center; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <h1>🛡️ Fraud Guard AI</h1>
            </div>
            <p class="message">Your verification code for ${type === 'signup' ? 'registration' : 'verification'} is:</p>
            <div class="otp-box">
              <p class="otp-code">${otpCode}</p>
            </div>
            <p class="message">This code will expire in <strong>5 minutes</strong>.</p>
            <p class="warning">⚠️ Never share this code with anyone.</p>
            <div class="footer">
              <p>If you didn't request this code, please ignore this email.</p>
              <p>© 2024 Fraud Guard AI</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Attempt SMTP (Gmail)
    console.log("Using SMTP for email delivery");
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });

      await transporter.sendMail({
        from: `"Fraud Guard AI" <${SMTP_USER}>`,
        to: email,
        subject: `${otpCode} - Your Verification Code`,
        html: emailHtml,
      });

      console.log(`OTP sent via SMTP to ${email}`);
    } catch (smtpError: any) {
      console.error("SMTP Error:", smtpError);
      throw new Error(`Failed to send email via SMTP: ${smtpError.message}`);
    }

    const respBody: any = { success: true, message: "OTP sent successfully" };
    if (SHOW_OTP_IN_RESPONSE) respBody.otp = otpCode; // For dev debugging if needed

    return new Response(
      JSON.stringify(respBody),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-otp:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send OTP";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
