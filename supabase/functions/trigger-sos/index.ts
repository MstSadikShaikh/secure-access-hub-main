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

interface SOSRequest {
  latitude?: number;
  longitude?: number;
  triggerMethod: 'button' | 'shake';
  locationAddress?: string;
}

const ADMIN_EMAIL = "fraudguardai.alerts@gmail.com";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");

    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error("SMTP credentials not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Use ANON_KEY with user's JWT to respect RLS policies
    const authHeaderValue = req.headers.get("authorization");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeaderValue || ""
        }
      }
    });

    // Get user from JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getClaims(token);

    if (authError || !data?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = data.claims.sub;

    const { latitude, longitude, triggerMethod, locationAddress } = await req.json() as SOSRequest;

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", userId)
      .single();

    // Get emergency contacts
    const { data: contacts, error: contactsError } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", userId);

    if (contactsError) {
      console.error("Error fetching contacts:", contactsError);
    }

    const userEmail = data.claims.email || 'Unknown';
    const userName = profile?.full_name || userEmail.split('@')[0] || 'User';
    const userPhone = profile?.phone || 'Not provided';

    const mapsLink = latitude && longitude
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : null;

    // Log the SOS alert
    const { data: sosAlert, error: sosError } = await supabase
      .from("sos_alerts")
      .insert({
        user_id: userId,
        latitude,
        longitude,
        trigger_method: triggerMethod,
        status: 'triggered',
        location_address: locationAddress,
        contacts_notified: contacts?.length || 0,
      })
      .select()
      .single();

    if (sosError) {
      console.error("Error logging SOS alert:", sosError);
    }

    const contactEmails = contacts?.filter((c: any) => c.email) || [];
    let emailsSent = 0;

    const emergencyEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #1a0a0a; color: #f0f4f8; margin: 0; padding: 40px 20px; }
            .container { max-width: 520px; margin: 0 auto; background: linear-gradient(145deg, #2d1010, #1a0a0a); border-radius: 16px; padding: 40px; border: 2px solid #dc2626; }
            .alert-header { text-align: center; margin-bottom: 30px; }
            .alert-header h1 { color: #dc2626; margin: 0; font-size: 32px; }
            .alert-header p { color: #fca5a5; font-size: 18px; margin-top: 8px; }
            .info-box { background: rgba(220, 38, 38, 0.1); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #dc2626; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(220, 38, 38, 0.3); }
            .info-row:last-child { border-bottom: none; }
            .info-label { color: #fca5a5; font-weight: 500; }
            .info-value { color: #fff; font-weight: bold; }
            .location-btn { display: block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; text-align: center; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 20px 0; }
            .emergency-numbers { background: #0a1628; padding: 20px; border-radius: 12px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="alert-header">
              <h1>🚨 EMERGENCY SOS ALERT</h1>
              <p>Immediate assistance may be required</p>
            </div>
            
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Person in need:</span>
                <span class="info-value">${userName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${userEmail}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${userPhone}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Trigger method:</span>
                <span class="info-value">${triggerMethod === 'shake' ? '📱 Shake Detection' : '🔴 SOS Button'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Time:</span>
                <span class="info-value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
              ${locationAddress ? `
              <div class="info-row">
                <span class="info-label">Location:</span>
                <span class="info-value">${locationAddress}</span>
              </div>
              ` : ''}
            </div>
            
            ${mapsLink ? `
            <a href="${mapsLink}" class="location-btn" target="_blank">
              📍 View Location on Google Maps
            </a>
            ` : `
            <div style="text-align: center; padding: 16px; background: rgba(245, 158, 11, 0.1); border-radius: 12px; border: 1px solid #f59e0b;">
              <p style="color: #f59e0b; margin: 0;">⚠️ Location not available</p>
            </div>
            `}
            
            <div class="emergency-numbers">
              <h3>Emergency Numbers (India)</h3>
              <p>🚔 Police: <strong>100</strong></p>
              <p>🚑 Ambulance: <strong>102</strong></p>
            </div>
            
            <div class="footer">
              <p>This is an automated emergency alert from Fraud Guard AI</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Initialize transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    // Send to each contact
    for (const contact of contactEmails) {
      try {
        await transporter.sendMail({
          from: `"Fraud Guard AI SOS" <${SMTP_USER}>`,
          to: contact.email,
          subject: `🚨 EMERGENCY: ${userName} needs help!`,
          html: emergencyEmailHtml,
        });
        emailsSent++;
      } catch (err) {
        console.error(`Error sending to ${contact.email}:`, err);
      }
    }

    // Send to admin
    try {
      await transporter.sendMail({
        from: `"Fraud Guard AI SOS" <${SMTP_USER}>`,
        to: ADMIN_EMAIL,
        subject: `🚨 SOS ALERT: User ${userName} triggered emergency`,
        html: emergencyEmailHtml,
      });
    } catch (err) {
      console.error("Error sending admin notification:", err);
    }

    // Update SOS alert status
    if (sosAlert) {
      await supabase
        .from("sos_alerts")
        .update({ status: 'sent', contacts_notified: emailsSent })
        .eq("id", sosAlert.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `SOS alerts sent to ${emailsSent} contacts`,
        alertId: sosAlert?.id,
        contactsNotified: emailsSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in trigger-sos:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to trigger SOS";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
