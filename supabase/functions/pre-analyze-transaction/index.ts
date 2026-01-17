// @ts-ignore: URL import used in Deno runtime; local TS may not resolve it
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Input validation helpers
function validateUpiId(upi: unknown): boolean {
  if (typeof upi !== 'string') return false;
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(upi) && upi.length <= 256;
}

function validateAmount(amount: unknown): boolean {
  return typeof amount === 'number' && amount > 0 && amount <= 10000000 && Number.isFinite(amount);
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('Rate limit')) {
      return 'Too many requests. Please try again later.';
    }
    return error.message;
  }
  return 'An error occurred while processing your request. Please try again.';
}

// String similarity for detecting impersonation (Levenshtein)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

interface UserBehaviorProfile {
  avg_transaction_amount: number;
  max_transaction_amount: number;
  std_dev_amount: number;
  transaction_count: number;
  typical_transaction_hours: number[];
  last_transaction_at: string | null;
}

interface Transaction {
  amount: number;
  receiver_upi_id: string;
  created_at: string;
  risk_score: number | null;
  transaction_hour: number | null;
}

interface SimplifiedAnalysisResult {
  riskScore: number;
  reasons: string[];
  amountAnomaly: boolean;
  behaviorFlags: {
    newContact: boolean;
    timeAnomaly: boolean;
    suspiciousUpi: boolean;
    suspiciousKeywords: boolean;
    isBlacklisted: boolean;
  };
}

// Simplified behavior analysis - essential checks
function performSimplifiedAnalysis(
  amount: number,
  receiverUpi: string,
  hour: number,
  recentTransactions: Transaction[],
  userProfile: UserBehaviorProfile | null
): SimplifiedAnalysisResult {
  let riskScore = 0;
  const reasons: string[] = [];
  let amountAnomaly = false;
  const behaviorFlags = {
    newContact: false,
    timeAnomaly: false,
    suspiciousUpi: false,
    suspiciousKeywords: false,
    isBlacklisted: false,
  };

  // ===== CHECK 1: Time Pattern (Smart Check) =====
  // Default "risky" hours are 0-5 AM, but we check history first
  const isLateNight = hour >= 0 && hour <= 5;
  const hasHistoryInHour = userProfile?.typical_transaction_hours?.includes(hour);

  if (isLateNight) {
    if (hasHistoryInHour) {
      // User does this normally - no penalty
    } else {
      // Unusual time for this user
      riskScore += 0.10; // Reduced from 0.15
      reasons.push(`Unusual time: Late night transaction (${hour}:00) outside your typical pattern`);
      behaviorFlags.timeAnomaly = true;
    }
  } else if (userProfile && userProfile.typical_transaction_hours && userProfile.typical_transaction_hours.length > 5) {
    // If we have enough history (>5 data points) and this hour is new
    if (!hasHistoryInHour) {
      riskScore += 0.05; // Small penalty for just "new time" if not late night
      reasons.push(`New transaction time (${hour}:00)`);
      behaviorFlags.timeAnomaly = true;
    }
  }

  // ===== CHECK 2: New Contact (first-time transaction) =====
  const previousToRecipient = recentTransactions.filter(
    t => t.receiver_upi_id && t.receiver_upi_id.toLowerCase() === receiverUpi.toLowerCase()
  );

  if (previousToRecipient.length === 0) {
    if (amount > 5000) {
      riskScore += 0.20;
      reasons.push(`Large first-time transaction (₹${amount.toLocaleString()}) to new recipient`);
    } else if (amount > 2000) {
      riskScore += 0.10;
      reasons.push('First transaction to this recipient');
    } else {
      riskScore += 0.05;
      reasons.push('New recipient - no prior transaction history');
    }
    behaviorFlags.newContact = true;
  }

  // ===== CHECK 3: Suspicious UPI ID Patterns =====
  const upiLower = receiverUpi.toLowerCase();
  const domain = upiLower.split('@')[1] || '';
  const localPart = upiLower.split('@')[0] || '';

  // Check for repeated characters in domain
  if (/(.)\1{2,}/.test(domain)) {
    riskScore += 0.20;
    reasons.push(`Suspicious UPI pattern: '${domain}' contains repeated characters`);
    behaviorFlags.suspiciousUpi = true;
  }

  // Check for excessive numbers (potential fake UPI)
  const hasExcessiveNumbers = (localPart.match(/\d/g) || []).length > localPart.length * 0.5;
  if (hasExcessiveNumbers && localPart.length > 8) {
    riskScore += 0.15;
    reasons.push('UPI ID contains unusual pattern of numbers - potential fake account');
    behaviorFlags.suspiciousUpi = true;
  }

  // ===== CHECK 4: Suspicious Keywords =====
  const suspiciousKeywords = ['cashback', 'lottery', 'winner', 'prize', 'reward', 'lucky', 'free', 'offer', 'bonus', 'refund', 'claim', 'urgent', 'verify'];
  const hasSuspiciousKeyword = suspiciousKeywords.some(kw => upiLower.includes(kw));
  if (hasSuspiciousKeyword) {
    riskScore += 0.35;
    reasons.push('⚠️ UPI ID contains suspicious keywords commonly used in scams');
    behaviorFlags.suspiciousKeywords = true;
  }

  // ===== CHECK 5: Amount-based Risk Escalation =====
  if (amount >= 50000) {
    riskScore += 0.25;
    amountAnomaly = true;
    reasons.push(`🚨 Very high amount (₹${amount.toLocaleString()}) - requires extra verification`);
  } else if (amount >= 25000) {
    riskScore += 0.15;
    amountAnomaly = true;
    reasons.push(`⚠️ High amount (₹${amount.toLocaleString()}) - above typical threshold`);
  } else if (amount >= 10000) {
    riskScore += 0.08;
    reasons.push(`Elevated amount (₹${amount.toLocaleString()})`);
  }

  // Check against user history if profile exists
  if (userProfile && userProfile.max_transaction_amount > 0) {
    if (amount > userProfile.max_transaction_amount * 2) {
      riskScore += 0.20;
      amountAnomaly = true;
      reasons.push(`Transaction amount is more than double your previous maximum (₹${userProfile.max_transaction_amount.toLocaleString()})`);
    }
  }

  // ===== CHECK 6: Combined Risk Multiplier =====
  if (behaviorFlags.suspiciousKeywords && behaviorFlags.newContact && amount > 5000) {
    riskScore += 0.20;
    reasons.push('🚨 Multiple risk factors: suspicious UPI + new contact + high amount');
  }

  return { riskScore, reasons, behaviorFlags, amountAnomaly };
}

// Update user behavior profile after transaction
async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  hour: number
): Promise<void> {
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('user_behavior_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching user profile:', fetchError);
      return;
    }

    if (profile) {
      const newCount = (profile.transaction_count || 0) + 1;
      const oldAvg = profile.avg_transaction_amount || 0;
      const oldCount = profile.transaction_count || 0;
      const newAvg = oldCount > 0 ? ((oldAvg * oldCount) + amount) / newCount : amount;
      const newMax = Math.max(profile.max_transaction_amount || 0, amount);

      let typicalHours: number[] = profile.typical_transaction_hours || [];
      if (!typicalHours.includes(hour)) {
        typicalHours = [...typicalHours, hour].slice(-10);
      }

      const { error: updateError } = await supabase
        .from('user_behavior_profiles')
        .update({
          avg_transaction_amount: newAvg,
          max_transaction_amount: newMax,
          transaction_count: newCount,
          typical_transaction_hours: typicalHours,
          last_transaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) console.error('Error updating profile:', updateError);
    } else {
      const { error: insertError } = await supabase
        .from('user_behavior_profiles')
        .insert({
          user_id: userId,
          avg_transaction_amount: amount,
          max_transaction_amount: amount,
          transaction_count: 1,
          typical_transaction_hours: [hour],
          transaction_frequency: { hourly_avg: 1, daily_avg: 1 },
          last_transaction_at: new Date().toISOString(),
        });

      if (insertError) console.error('Error inserting profile:', insertError);
    }
  } catch (error) {
    console.error('Unexpected error in updateUserProfile:', error);
  }
}

interface TrustedContact {
  upi_id: string;
  contact_name: string | null;
  status: 'trusted' | 'new' | 'flagged';
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isOriginAllowed(origin) && Deno.env.get('ENVIRONMENT') === 'production') {
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authenticatedUserId = authUser.id;
    const body = await req.json().catch(() => ({}));
    const { amount, receiverUpi, userId: requestUserId, localHour } = body;

    console.log(`Analyzing transaction for user ${authenticatedUserId}: ₹${amount} to ${receiverUpi}`);

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

    if (requestUserId && requestUserId !== authenticatedUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actualUserId = authenticatedUserId;
    const timestamp = new Date();
    const hour = (typeof localHour === 'number' && localHour >= 0 && localHour <= 23)
      ? localHour
      : timestamp.getHours();

    // Check Blacklist
    const { data: blacklisted } = await supabase
      .from('upi_blacklist')
      .select('*')
      .eq('upi_id', receiverUpi.toLowerCase())
      .maybeSingle();

    if (blacklisted) {
      return new Response(JSON.stringify({
        risk_score: 1.0,
        risk_level: 'critical',
        recommendation: 'block',
        reasons: [
          `⚠️ BLOCKED: This UPI ID has been reported as fraudulent`,
          `${blacklisted.reported_count || 1} fraud reports received`,
          blacklisted.reason || 'Known fraudulent account'
        ],
        impersonation_warning: false,
        similar_contacts: [],
        contact_status: 'flagged',
        contact_name: null,
        is_blacklisted: true,
        amount_anomaly: true,
        behavior_flags: {
          newContact: false,
          timeAnomaly: false,
          suspiciousUpi: false,
          suspiciousKeywords: false,
          isBlacklisted: true,
        },
        profile_stats: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parallel fetching for performance
    const [recentTransactionsRes, userProfileRes, trustedContactsRes] = await Promise.all([
      supabase.from('transactions').select('amount, receiver_upi_id, created_at, risk_score, transaction_hour').eq('user_id', actualUserId).order('created_at', { ascending: false }).limit(50),
      supabase.from('user_behavior_profiles').select('*').eq('user_id', actualUserId).maybeSingle(),
      supabase.from('trusted_contacts').select('upi_id, contact_name, status').eq('user_id', actualUserId)
    ]);

    const recentTransactions = recentTransactionsRes.data || [];
    const userProfile = userProfileRes.data;
    const trustedContacts = (trustedContactsRes.data || []) as TrustedContact[];

    const matchingContact = trustedContacts.find((c: TrustedContact) => c.upi_id.toLowerCase() === receiverUpi.toLowerCase());
    const similarContacts = trustedContacts.filter((c: TrustedContact) => {
      const similarity = calculateSimilarity(c.upi_id, receiverUpi);
      return similarity > 0.7 && similarity < 1;
    });

    const analysis = performSimplifiedAnalysis(
      amount,
      receiverUpi,
      hour,
      recentTransactions as Transaction[],
      userProfile as UserBehaviorProfile | null
    );

    let riskScore = analysis.riskScore;
    const reasons: string[] = [...analysis.reasons];

    if (matchingContact) {
      if (matchingContact.status === 'trusted') {
        riskScore -= 0.30;
        reasons.unshift('✓ Recipient is a trusted contact');
      } else if (matchingContact.status === 'flagged') {
        riskScore += 0.40;
        reasons.push('⚠️ Recipient has been flagged previously');
      }
    }

    if (similarContacts.length > 0) {
      riskScore += 0.25;
      reasons.push(`⚠️ UPI ID is similar to trusted contact: ${similarContacts[0].contact_name || similarContacts[0].upi_id}`);
    }

    riskScore = Math.max(0, Math.min(1, riskScore));

    let riskLevel: 'safe' | 'warning' | 'danger' | 'critical';
    let recommendation: 'proceed' | 'caution' | 'avoid' | 'block';

    if (riskScore < 0.30) {
      riskLevel = 'safe';
      recommendation = 'proceed';
    } else if (riskScore < 0.60) {
      riskLevel = 'warning';
      recommendation = 'caution';
    } else if (riskScore < 0.80) {
      riskLevel = 'danger';
      recommendation = 'avoid';
    } else {
      riskLevel = 'critical';
      recommendation = 'block';
    }

    if (riskLevel === 'safe' && reasons.length === 0) {
      reasons.push('Standard transaction - all checks passed');
    }

    // Await profile update to ensure it completes
    await updateUserProfile(supabase, actualUserId, amount, hour);

    const result = {
      risk_score: riskScore,
      risk_level: riskLevel,
      recommendation: recommendation,
      reasons: reasons,
      impersonation_warning: similarContacts.length > 0,
      similar_contacts: similarContacts.map((c: TrustedContact) => c.upi_id),
      contact_status: matchingContact?.status || 'new',
      contact_name: matchingContact?.contact_name || null,
      is_blacklisted: false,
      behavior_flags: analysis.behaviorFlags,
      amount_anomaly: analysis.amountAnomaly,
      profile_stats: userProfile ? {
        avg_amount: userProfile.avg_transaction_amount || 0,
        max_amount: userProfile.max_transaction_amount || 0,
        transaction_count: userProfile.transaction_count || 0,
        known_devices: (userProfile.trusted_device_ids || []).length,
      } : null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in pre-analyze-transaction:", error);
    return new Response(JSON.stringify({ error: getSafeErrorMessage(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


