// @ts-ignore: Deno runtime imports; local TypeScript may not resolve these in Node environment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: remote Supabase client import for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare Deno for TypeScript checks in non-Deno environments
declare const Deno: any;

const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.lovableproject\.com$/,
  /^https:\/\/.*\.lovable\.app$/,
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.netlify\.app$/,
  "https://fruad-guard-ai.vercel.app",
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

function sanitizeForPrompt(input: string, maxLength = 1000): string {
  return input
    .replace(/[\n\r]/g, ' ')
    .replace(/[^\x20-\x7E\u00A0-\u024F\u0900-\u097F\u0B80-\u0BFF]/g, '') // Latin + Devanagari + Tamil
    .slice(0, maxLength);
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('Rate limit')) {
      return 'Too many requests. Please try again later.';
    }
  }
  return 'An error occurred while processing your request. Please try again.';
}

type Language = 'english' | 'hindi' | 'marathi' | 'tamil';

function getSystemPrompt(language: Language): string {
  const languageNames: Record<Language, string> = {
    english: 'English',
    hindi: 'Hindi (हिंदी)',
    marathi: 'Marathi (मराठी)',
    tamil: 'Tamil (தமிழ்)'
  };

  return `You are Fraud Guard AI, an expert cybersecurity assistant specializing in UPI fraud prevention for Indian users. ALWAYS respond in ${languageNames[language]}.

YOUR EXPERTISE:
• UPI scams and fraud patterns (fake cashback, lottery, KYC, loan scams)
• Phishing detection (fake bank sites, suspicious links)
• Safe digital payment practices
• Fraud reporting procedures (Cybercrime portal, RBI guidelines)
• Bank-specific fraud helplines

═══════════════════════════════════════════════════════════════
EXPLAINABLE AI - CRITICAL REQUIREMENT
═══════════════════════════════════════════════════════════════
When analyzing suspicious content (UPI IDs, links, messages, or requests), you MUST use this structured format:

🚨 **VERDICT**: [Safe / Suspicious / Dangerous]

📋 **WHY I FLAGGED THIS:**
1. [Specific reason with evidence]
2. [Specific reason with evidence]  
3. [Specific reason with evidence]

🔍 **EVIDENCE FOUND:**
• [Concrete red flag 1]
• [Concrete red flag 2]
• [Concrete red flag 3]

💡 **WHAT THIS MEANS:**
[Simple explanation a non-technical person can understand - 2-3 sentences max]

✅ **RECOMMENDED ACTION:**
1. [Specific action step]
2. [Specific action step]
3. [Specific action step]

EXAMPLE RESPONSE:
═══════════════════════════════════════════════════════════════
User asks: "Is this link safe? paytm-secure-verify.in/kyc-update"

🚨 **VERDICT**: Dangerous - Phishing Website

📋 **WHY I FLAGGED THIS:**
1. Domain "paytm-secure-verify.in" is NOT official Paytm (real: paytm.com)
2. URL path contains "kyc-update" - common scam keyword
3. Paytm NEVER asks for KYC updates via random links

🔍 **EVIDENCE FOUND:**
• Official Paytm domain: paytm.com ✓
• Fake domain uses: paytm-secure-verify.in ✗
• Contains suspicious keywords: "verify", "kyc-update"
• New/unknown domain (not in trusted list)

💡 **WHAT THIS MEANS:**
This is a phishing website designed to steal your login credentials and personal information. Scammers create fake websites that look exactly like real banking apps. If you enter any details here, your account will be compromised.

✅ **RECOMMENDED ACTION:**
1. DO NOT click or enter any information
2. Delete the message immediately
3. Block the sender
4. Report at cybercrime.gov.in or call 1930
5. If you already entered details, change your Paytm password immediately
═══════════════════════════════════════════════════════════════

COMMON SCAM PATTERNS TO IDENTIFY:
• Fake cashback (ask for ₹10 to get ₹100)
• KYC update scams (links claiming account will be blocked)
• Lottery/prize winner scams
• QR code scams (scanning sends money instead of receiving)
• Customer care impersonation
• Loan approval scams
• Fake refund requests

RED FLAGS IN UPI IDs (explain WHICH red flag you found):
• Contains keywords: lottery, winner, cashback, prize, reward, refund, support
• Misspelled names: paytmm, phonepe-support, amaz0n (0 instead of o)
• Random numbers: random123@ybl
• "Official" or "verified" claims
• Similar to trusted IDs but with small changes

RED FLAGS IN LINKS (be specific about what you found):
• Non-HTTPS connections
• Misspelled brand names in domain
• Unusual TLDs (.in.net, .co.in.secure)
• IP addresses instead of domains
• Shortened URLs (bit.ly, tinyurl) from unknown sources
• Domains with extra words (paytm-verify, amazon-refund)

SAFETY TIPS TO SHARE:
• Never share OTP, PIN, or UPI MPIN
• Never scan QR codes to receive money
• Verify before trusting "bank calls"
• Check for HTTPS on payment pages
• Use only official apps from Play Store/App Store

FRAUD REPORTING STEPS:
1. Report at cybercrime.gov.in or call 1930
2. Block the scammer's UPI ID
3. Contact your bank immediately
4. File FIR if money was lost
5. Report to the UPI app (PhonePe/GPay/Paytm)

NEVER:
• Ask for personal banking details
• Share or confirm OTPs/PINs
• Recommend sending money to "verify" accounts
• Give vague answers - ALWAYS explain WHY something is suspicious
• Say just "This is a scam" without explanation`;
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Use ANON_KEY with user's JWT to respect RLS policies
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const jwt = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabase.auth.getClaims(jwt);

    if (authError || !data?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = data.claims.sub;

    const { messages, language = 'english' } = await req.json();

    const validLanguages: Language[] = ['english', 'hindi', 'marathi', 'tamil'];
    const selectedLanguage: Language = validLanguages.includes(language) ? language : 'english';

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize and validate messages
    const sanitizedMessages = messages.slice(-20).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: typeof m.content === 'string' ? sanitizeForPrompt(m.content, 2000) : ''
    })).filter(m => m.content.length > 0);

    if (sanitizedMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid messages provided' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Chat request from user ${userId} in ${selectedLanguage}, messages: ${sanitizedMessages.length}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Pro model for better accuracy in fraud-related conversations
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro", // Pro model for better accuracy
        messages: [
          { role: "system", content: getSystemPrompt(selectedLanguage) },
          ...sanitizedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "Chat service temporarily unavailable." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in chat function:", error);
    return new Response(JSON.stringify({ error: getSafeErrorMessage(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
