// @ts-ignore: Deno runtime imports
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore: remote Supabase client import for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore: npm import for Deno
import nodemailer from "npm:nodemailer@6.9.13";

// Declare Deno for TypeScript checks
declare const Deno: any;

const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.lovableproject\.com$/,
  /^https:\/\/.*\.lovable\.app$/,
  /^http:\/\/localhost:\d+$/,
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed =>
    typeof allowed === 'string'
      ? allowed === origin
      : allowed.test(origin)
  );
}

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": isOriginAllowed(origin) ? origin! : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

const ADMIN_EMAIL = "sadikss2122@gmail.com";

interface EmailRequest {
  type: 'fraud_report' | 'user_alert';
  recipientEmail?: string;
  subject: string;
  content: {
    title: string;
    message: string;
    details?: Record<string, string>;
  };
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");

    if (!SMTP_USER || !SMTP_PASS) {
      console.error("SMTP credentials not configured");
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, recipientEmail, subject, content }: EmailRequest = await req.json();

    // Build details HTML if provided
    const detailsHtml = content.details
      ? Object.entries(content.details)
        .map(([key, value]) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${key}:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${value}</td></tr>`)
        .join('')
      : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${content.title}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 12px; background: linear-gradient(135deg, #06b6d4, #0891b2); border-radius: 12px;">
              <span style="color: white; font-size: 24px;">🛡️</span>
            </div>
            <h1 style="color: #1f2937; margin: 16px 0 8px; font-size: 24px;">${content.title}</h1>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">${content.message}</p>
          
          ${detailsHtml ? `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f9fafb; border-radius: 8px; overflow: hidden;">
              ${detailsHtml}
            </table>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This is an automated message from Fraud Guard AI.
            <br>Do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const results = [];

    // For fraud reports, always send to admin
    if (type === 'fraud_report') {
      try {
        const info = await transporter.sendMail({
          from: `"Fraud Guard AI" <${SMTP_USER}>`,
          to: ADMIN_EMAIL,
          subject: `[FRAUD REPORT] ${subject}`,
          html: emailHtml,
        });
        results.push({ recipient: 'admin', result: info.messageId });
        console.log("Fraud report sent to admin:", info.messageId);
      } catch (err) {
        console.error("Error sending to admin:", err);
      }
    }

    // For user alerts, send to the user's email
    if (type === 'user_alert' && recipientEmail) {
      try {
        const info = await transporter.sendMail({
          from: `"Fraud Guard AI" <${SMTP_USER}>`,
          to: recipientEmail,
          subject: subject,
          html: emailHtml,
        });
        results.push({ recipient: 'user', result: info.messageId });
        console.log("Alert sent to user:", info.messageId);
      } catch (err) {
        console.error("Error sending to user:", err);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in send-email-notification:", error);
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
