// @ts-ignore: Deno runtime imports; local TypeScript may not resolve these in Node environment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: remote Supabase client import for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare Deno for TypeScript checks in non-Deno environments
declare const Deno: any;

// Allowed origins for CORS
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

function validateUpiId(upi: unknown): boolean {
  if (typeof upi !== 'string') return false;
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(upi) && upi.length <= 256;
}

function validateAmount(amount: unknown): boolean {
  return typeof amount === 'number' && amount > 0 && amount <= 10000000 && Number.isFinite(amount);
}

function validateUuid(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function sanitizeForPrompt(input: string, maxLength = 500): string {
  return input
    .replace(/[\n\r]/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
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

// ============= DETERMINISTIC TRANSACTION ANALYSIS =============
const SCAM_UPI_PATTERNS = [
  'cashback', 'lottery', 'winner', 'prize', 'reward', 'lucky', 'free', 'offer',
  'bonus', 'refund', 'govt', 'scheme', 'subsidy', 'official', 'verify'
];

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return 1 - dp[m][n] / Math.max(m, n);
}

interface DeterministicResult {
  riskScore: number;
  reasons: string[];
  fraudCategory: string | null;
  isAnomaly: boolean;
}

function performDeterministicAnalysis(
  amount: number,
  receiverUpi: string,
  userHistory: Array<{ amount: number; receiver_upi_id: string; created_at: string }>,
  trustedContacts: Array<{ upi_id: string; contact_name: string; status: string }>,
  isBlacklisted: boolean,
  blacklistInfo?: { reported_count: number; severity: string }
): DeterministicResult {
  let riskScore = 0;
  const reasons: string[] = [];
  let fraudCategory: string | null = null;
  let isAnomaly = false;

  const upiLower = receiverUpi.toLowerCase();
  const domain = upiLower.split('@')[1] || '';
  const localPart = upiLower.split('@')[0] || '';

  // Check 1: Blacklist (critical)
  if (isBlacklisted) {
    riskScore = 1.0;
    fraudCategory = 'known_fraud';
    reasons.push(`This UPI ID has been reported as fraudulent (${blacklistInfo?.reported_count || 1} reports, severity: ${blacklistInfo?.severity || 'high'})`);
    return { riskScore, reasons, fraudCategory, isAnomaly: true };
  }

  // Check 2: Trusted contact check
  const matchingContact = trustedContacts.find(c => c.upi_id.toLowerCase() === upiLower);
  if (matchingContact?.status === 'trusted') {
    riskScore -= 0.3;
    reasons.push(`Recipient "${matchingContact.contact_name}" is a trusted contact`);
  } else if (matchingContact?.status === 'flagged') {
    riskScore += 0.4;
    reasons.push(`Recipient "${matchingContact.contact_name}" was previously flagged`);
    fraudCategory = 'flagged_contact';
  }

  // Check 3: Impersonation detection
  const similarContacts = trustedContacts.filter(c => {
    const similarity = calculateSimilarity(c.upi_id, receiverUpi);
    return similarity > 0.7 && similarity < 1;
  });
  
  if (similarContacts.length > 0) {
    riskScore += 0.3;
    fraudCategory = 'impersonation';
    isAnomaly = true;
    reasons.push(`UPI ID is suspiciously similar to your trusted contact: ${similarContacts[0].contact_name || similarContacts[0].upi_id}`);
  }

  // Check 4: Scam keywords
  const hasScamKeyword = SCAM_UPI_PATTERNS.some(kw => upiLower.includes(kw));
  if (hasScamKeyword) {
    riskScore += 0.25;
    fraudCategory = fraudCategory || 'social_engineering';
    reasons.push('UPI ID contains suspicious keywords commonly used in scams');
  }

  // Check 5: Repeated characters in domain (fake bank)
  if (/(.)\1{2,}/.test(domain)) {
    riskScore += 0.2;
    fraudCategory = fraudCategory || 'impersonation';
    reasons.push(`Domain "${domain}" has unusual repeated characters - possible fake bank impersonation`);
  }

  // Check 6: Amount analysis
  if (userHistory.length > 0) {
    const amounts = userHistory.map(t => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxAmount = Math.max(...amounts);
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length);

    if (amount > maxAmount * 2) {
      riskScore += 0.2;
      isAnomaly = true;
      reasons.push(`Amount ₹${amount.toLocaleString()} is more than double your highest transaction (₹${maxAmount.toLocaleString()})`);
    } else if (amount > avgAmount + (3 * stdDev) && stdDev > 0) {
      riskScore += 0.15;
      isAnomaly = true;
      reasons.push(`Amount is unusually high compared to your typical transactions (avg: ₹${avgAmount.toFixed(0)})`);
    }

    // First transaction to this recipient
    const previousToSameRecipient = userHistory.filter(t => t.receiver_upi_id.toLowerCase() === upiLower);
    if (previousToSameRecipient.length === 0 && !matchingContact) {
      riskScore += 0.1;
      reasons.push('First transaction to this recipient - please verify their identity');
    }
  } else {
    // New user with no history
    riskScore += 0.15;
    reasons.push('Limited transaction history - exercise extra caution');
  }

  // Check 7: Very low amount (probe attack)
  if (amount < 10 && userHistory.length > 3) {
    const avgAmount = userHistory.reduce((sum, t) => sum + t.amount, 0) / userHistory.length;
    if (amount < avgAmount * 0.01) {
      riskScore += 0.05;
      reasons.push('Very small transaction amount - sometimes used as a test before larger fraud attempts');
    }
  }

  // Clamp score
  riskScore = Math.min(1, Math.max(0, riskScore));

  // Add positive message if low risk
  if (riskScore < 0.2 && reasons.length <= 1) {
    reasons.push('Transaction appears normal based on your history');
  }

  return { riskScore, reasons, fraudCategory, isAnomaly };
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

    const authenticatedUserId = data.claims.sub;

    const { transactionId, userId: requestUserId, amount, receiverUpi, userHistory } = await req.json();

    if (!validateUuid(transactionId)) {
      return new Response(JSON.stringify({ error: 'Invalid transaction ID format' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (requestUserId && !validateUuid(requestUserId)) {
      return new Response(JSON.stringify({ error: 'Invalid user ID format' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the authenticated user matches the requested user
    const userId = requestUserId || authenticatedUserId;
    if (userId !== authenticatedUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validateAmount(amount)) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validateUpiId(receiverUpi)) {
      return new Response(JSON.stringify({ error: 'Invalid UPI ID format' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Analyzing transaction ${transactionId} for user ${userId}`);

    // Fetch additional context
    const [blacklistResult, trustedContactsResult] = await Promise.all([
      supabase.from('upi_blacklist').select('*').eq('upi_id', receiverUpi.toLowerCase()).maybeSingle(),
      supabase.from('trusted_contacts').select('*').eq('user_id', userId)
    ]);

    const isBlacklisted = !!blacklistResult.data;
    const trustedContacts = trustedContactsResult.data || [];

    // Sanitize user history
    const sanitizedHistory = Array.isArray(userHistory) 
      ? userHistory.slice(0, 20).map(h => ({
          amount: typeof h.amount === 'number' ? h.amount : 0,
          receiver_upi_id: typeof h.receiver_upi_id === 'string' ? h.receiver_upi_id : '',
          created_at: typeof h.created_at === 'string' ? h.created_at : ''
        }))
      : [];

    // Perform deterministic analysis
    const deterministicResult = performDeterministicAnalysis(
      amount,
      receiverUpi,
      sanitizedHistory,
      trustedContacts,
      isBlacklisted,
      blacklistResult.data
    );

    console.log(`Deterministic analysis: score=${deterministicResult.riskScore}, category=${deterministicResult.fraudCategory}`);

    // Build final analysis result (deterministic - no AI variability)
    const analysis = {
      risk_score: deterministicResult.riskScore,
      is_anomaly: deterministicResult.isAnomaly,
      fraud_category: deterministicResult.fraudCategory,
      confidence: 0.95, // High confidence since it's rule-based
      reasons: deterministicResult.reasons,
      recommendation: deterministicResult.riskScore > 0.7 ? 'block' : deterministicResult.riskScore > 0.4 ? 'warn' : 'allow'
    };

    // Store analysis result
    const { error: insertError } = await supabase.from('transaction_analysis').insert({
      transaction_id: transactionId,
      user_id: userId,
      risk_score: analysis.risk_score,
      is_anomaly: analysis.is_anomaly,
      fraud_category: analysis.fraud_category,
      analysis_reasons: analysis.reasons,
      ai_confidence: analysis.confidence
    });

    if (insertError) {
      console.error("Error storing analysis:", insertError);
    }

    // Update transaction with risk info
    await supabase.from('transactions').update({
      risk_score: analysis.risk_score,
      fraud_category: analysis.fraud_category,
      is_flagged: analysis.risk_score > 0.5
    }).eq('id', transactionId);

    // Create alert if high risk
    if (analysis.risk_score > 0.4) {
      const severity = analysis.risk_score > 0.8 ? 'critical' : analysis.risk_score > 0.6 ? 'high' : 'medium';
      await supabase.from('alerts').insert({
        user_id: userId,
        transaction_id: transactionId,
        alert_type: 'suspicious_transaction',
        title: analysis.risk_score > 0.7 ? '🚨 High Risk Transaction!' : '⚠️ Transaction Warning',
        message: `Transaction of ₹${amount.toLocaleString()} to ${receiverUpi} flagged: ${analysis.reasons[0]}`,
        severity,
        metadata: analysis
      });
    }

    console.log(`Analysis complete for transaction ${transactionId}`);

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-transaction:", error);
    return new Response(JSON.stringify({ error: getSafeErrorMessage(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
