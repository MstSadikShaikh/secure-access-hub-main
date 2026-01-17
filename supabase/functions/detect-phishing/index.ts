// @ts-ignore: remote Supabase client import for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare Deno for TypeScript checks in non-Deno environments
declare const Deno: any;

// =============================================================================
// CORS & SECURITY HELPERS
// =============================================================================

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://lovable.dev",
  "https://gptengineer.app",
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return (
    ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed)) ||
    origin.includes("lovableproject.com") ||
    origin.includes("webcontainer.io")
  );
}

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin!,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function validateUrl(url: unknown): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > 2048) {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function sanitizeForPrompt(input: string, maxLength = 500): string {
  return input
    .replace(/[<>{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("network") || message.includes("fetch")) {
      return "Network error during analysis";
    }
    if (message.includes("timeout")) {
      return "Analysis timed out";
    }
    if (message.includes("rate") || message.includes("limit")) {
      return "Too many requests, please try again later";
    }
    return "Analysis failed";
  }
  return "An unexpected error occurred";
}

// =============================================================================
// KNOWN BRANDS & PATTERNS (India-focused)
// =============================================================================

const LEGITIMATE_BRANDS: Record<string, string[]> = {
  paytm: ["paytm.com", "paytmbank.com"],
  phonepe: ["phonepe.com"],
  gpay: ["pay.google.com", "google.com/pay"],
  googlepay: ["pay.google.com", "google.com/pay"],
  sbi: ["onlinesbi.com", "sbi.co.in"],
  hdfc: ["hdfcbank.com", "hdfc.com"],
  icici: ["icicibank.com"],
  axis: ["axisbank.com"],
  kotak: ["kotak.com", "kotakbank.com"],
  amazon: ["amazon.in", "amazon.com"],
  flipkart: ["flipkart.com"],
  razorpay: ["razorpay.com"],
  upi: ["npci.org.in"],
  bhim: ["bhimupi.org.in"],
};

const SUSPICIOUS_TLDS = [
  ".xyz", ".top", ".work", ".click", ".link", ".info", ".online", ".site",
  ".club", ".buzz", ".tk", ".ml", ".ga", ".cf", ".gq", ".pw", ".cc",
  ".ws", ".icu", ".vip", ".loan", ".win", ".download", ".stream",
];

const SCAM_KEYWORDS = [
  "secure-login", "verify-now", "update-kyc", "claim-refund", "lucky-winner",
  "free-gift", "prize-claim", "urgent-update", "account-blocked", "suspended",
  "lottery", "jackpot", "winner", "bonus", "cashback-offer", "kyc-update",
  "pan-link", "aadhar-link", "bank-update", "otp-verify", "password-reset",
  "confirm-identity", "unlock-account", "security-alert", "fraud-alert",
];

const URL_SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "rebrand.ly", "cutt.ly", "short.io", "tiny.cc", "rb.gy", "shorturl.at",
];

// =============================================================================
// ENHANCED DETERMINISTIC ANALYSIS
// =============================================================================

interface DeterministicAnalysis {
  riskScore: number;
  factors: Array<{
    name: string;
    impact: number;
    description: string;
    category: 'url_structure' | 'domain' | 'content' | 'technical' | 'blacklist';
  }>;
  isHttps: boolean;
  domain: string;
  suspectedBrand: string | null;
  threatType: string;
}

function calculateEntropy(str: string): number {
  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function performDeterministicAnalysis(
  urlStr: string,
  knownPhishingDomains: string[] = []
): DeterministicAnalysis {
  const factors: DeterministicAnalysis["factors"] = [];
  let riskScore = 0;
  let threatType = "safe";

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    return {
      riskScore: 0.9,
      factors: [{ name: "invalid_url", impact: 0.9, description: "Invalid URL format", category: "url_structure" }],
      isHttps: false,
      domain: urlStr,
      suspectedBrand: null,
      threatType: "malware",
    };
  }

  const domain = parsedUrl.hostname.toLowerCase();
  const isHttps = parsedUrl.protocol === "https:";

  // ==========================================================================
  // CHECK 1: Known Phishing Domains Blacklist (Immediate Block)
  // ==========================================================================
  const matchedBlacklist = knownPhishingDomains.find(
    (d) => domain.includes(d) || d.includes(domain)
  );
  if (matchedBlacklist) {
    factors.push({
      name: "blacklist_match",
      impact: 0.5,
      description: `Domain matches known phishing site: ${matchedBlacklist}`,
      category: "blacklist",
    });
    riskScore += 0.5;
    threatType = "phishing";
  }

  // ==========================================================================
  // CHECK 2: URL Length Analysis
  // ==========================================================================
  const urlLength = urlStr.length;
  if (urlLength > 200) {
    factors.push({
      name: "very_long_url",
      impact: 0.25,
      description: `Extremely long URL (${urlLength} chars) - often used to hide malicious content`,
      category: "url_structure",
    });
    riskScore += 0.25;
  } else if (urlLength > 100) {
    factors.push({
      name: "long_url",
      impact: 0.15,
      description: `Long URL (${urlLength} chars) - may hide suspicious parameters`,
      category: "url_structure",
    });
    riskScore += 0.15;
  }

  // ==========================================================================
  // CHECK 3: HTTPS Check
  // ==========================================================================
  if (!isHttps) {
    const isPaymentRelated = /pay|upi|bank|secure|login|account/i.test(urlStr);
    if (isPaymentRelated) {
      factors.push({
        name: "no_https_payment",
        impact: 0.3,
        description: "Payment/banking URL without HTTPS - extremely dangerous",
        category: "technical",
      });
      riskScore += 0.3;
      threatType = "phishing";
    } else {
      factors.push({
        name: "no_https",
        impact: 0.2,
        description: "Website not using HTTPS encryption",
        category: "technical",
      });
      riskScore += 0.2;
    }
  }

  // ==========================================================================
  // CHECK 4: Suspicious TLD
  // ==========================================================================
  const hasSuspiciousTld = SUSPICIOUS_TLDS.some((tld) => domain.endsWith(tld));
  if (hasSuspiciousTld) {
    factors.push({
      name: "suspicious_tld",
      impact: 0.2,
      description: "Uses a domain extension commonly associated with scams",
      category: "domain",
    });
    riskScore += 0.2;
  }

  // ==========================================================================
  // CHECK 5: Brand Impersonation / Typosquatting
  // ==========================================================================
  let suspectedBrand: string | null = null;
  for (const [brand, legitDomains] of Object.entries(LEGITIMATE_BRANDS)) {
    const brandPattern = new RegExp(brand, "i");
    if (brandPattern.test(domain)) {
      const isLegit = legitDomains.some(
        (legit) => domain === legit || domain.endsWith("." + legit)
      );
      if (!isLegit) {
        suspectedBrand = brand;
        factors.push({
          name: "brand_impersonation",
          impact: 0.35,
          description: `Possible impersonation of ${brand.toUpperCase()} - legitimate domains are: ${legitDomains.join(", ")}`,
          category: "domain",
        });
        riskScore += 0.35;
        threatType = "phishing";
        break;
      }
    }
  }

  // ==========================================================================
  // CHECK 6: Scam Keywords in URL
  // ==========================================================================
  const urlLower = urlStr.toLowerCase();
  const foundKeywords = SCAM_KEYWORDS.filter((kw) => urlLower.includes(kw));
  if (foundKeywords.length >= 2) {
    factors.push({
      name: "multiple_scam_keywords",
      impact: 0.3,
      description: `Multiple scam keywords found: ${foundKeywords.slice(0, 3).join(", ")}`,
      category: "content",
    });
    riskScore += 0.3;
    threatType = threatType === "safe" ? "scam" : threatType;
  } else if (foundKeywords.length === 1) {
    factors.push({
      name: "scam_keyword",
      impact: 0.15,
      description: `Scam keyword detected: ${foundKeywords[0]}`,
      category: "content",
    });
    riskScore += 0.15;
  }

  // ==========================================================================
  // CHECK 7: IP Address Instead of Domain
  // ==========================================================================
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(domain)) {
    factors.push({
      name: "ip_address_url",
      impact: 0.3,
      description: "URL uses IP address instead of domain name - often used to evade detection",
      category: "technical",
    });
    riskScore += 0.3;
    threatType = "malware";
  }

  // ==========================================================================
  // CHECK 8: URL Shortener Detection
  // ==========================================================================
  const isShortener = URL_SHORTENERS.some((s) => domain.includes(s));
  if (isShortener) {
    factors.push({
      name: "url_shortener",
      impact: 0.15,
      description: "URL shortener detected - destination may be hidden",
      category: "url_structure",
    });
    riskScore += 0.15;
  }

  // ==========================================================================
  // CHECK 9: Excessive Subdomains
  // ==========================================================================
  const subdomainCount = domain.split(".").length - 2;
  if (subdomainCount >= 4) {
    factors.push({
      name: "excessive_subdomains",
      impact: 0.25,
      description: `Excessive subdomains (${subdomainCount + 1}) - used to create fake trusted-looking URLs`,
      category: "domain",
    });
    riskScore += 0.25;
  } else if (subdomainCount >= 2) {
    factors.push({
      name: "multiple_subdomains",
      impact: 0.1,
      description: `Multiple subdomains detected (${subdomainCount + 1})`,
      category: "domain",
    });
    riskScore += 0.1;
  }

  // ==========================================================================
  // CHECK 10: Special Characters in Domain (@ symbol attack)
  // ==========================================================================
  if (domain.includes("@")) {
    factors.push({
      name: "at_symbol_attack",
      impact: 0.4,
      description: "@ symbol in URL - browser may ignore everything before it",
      category: "url_structure",
    });
    riskScore += 0.4;
    threatType = "phishing";
  }

  const specialCharsInDomain = (domain.match(/[-_]/g) || []).length;
  if (specialCharsInDomain > 3) {
    factors.push({
      name: "excessive_special_chars",
      impact: 0.2,
      description: `Excessive special characters in domain (${specialCharsInDomain}) - often used to confuse`,
      category: "domain",
    });
    riskScore += 0.2;
  }

  // ==========================================================================
  // CHECK 11: Encoded/Obfuscated Characters
  // ==========================================================================
  const encodedChars = (urlStr.match(/%[0-9A-Fa-f]{2}/g) || []).length;
  if (encodedChars > 5) {
    factors.push({
      name: "heavily_encoded",
      impact: 0.25,
      description: `Heavy URL encoding detected (${encodedChars} encoded chars) - may hide malicious content`,
      category: "url_structure",
    });
    riskScore += 0.25;
  } else if (encodedChars > 2) {
    factors.push({
      name: "encoded_chars",
      impact: 0.1,
      description: `URL encoding detected (${encodedChars} encoded chars)`,
      category: "url_structure",
    });
    riskScore += 0.1;
  }

  // ==========================================================================
  // CHECK 12: Non-Standard Port
  // ==========================================================================
  const port = parsedUrl.port;
  if (port && port !== "80" && port !== "443") {
    factors.push({
      name: "non_standard_port",
      impact: 0.25,
      description: `Non-standard port detected (:${port}) - may indicate malicious server`,
      category: "technical",
    });
    riskScore += 0.25;
  }

  // ==========================================================================
  // CHECK 13: Path Depth Analysis
  // ==========================================================================
  const pathDepth = (parsedUrl.pathname.match(/\//g) || []).length;
  if (pathDepth > 6) {
    factors.push({
      name: "deep_path",
      impact: 0.15,
      description: `Unusually deep URL path (${pathDepth} levels) - may hide destination`,
      category: "url_structure",
    });
    riskScore += 0.15;
  }

  // ==========================================================================
  // CHECK 14: Suspicious Query Parameters
  // ==========================================================================
  const queryParams = parsedUrl.searchParams;
  const suspiciousParams = ["redirect", "url", "goto", "next", "return", "target", "dest"];
  let foundSuspiciousParams = 0;
  for (const param of suspiciousParams) {
    if (queryParams.has(param)) {
      foundSuspiciousParams++;
    }
  }
  if (foundSuspiciousParams > 0) {
    factors.push({
      name: "redirect_params",
      impact: 0.15 * foundSuspiciousParams,
      description: `Redirect parameters detected (${foundSuspiciousParams}) - may lead to different destination`,
      category: "url_structure",
    });
    riskScore += 0.15 * foundSuspiciousParams;
  }

  // Check for base64 in query params
  const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
  let base64Params = 0;
  queryParams.forEach((value) => {
    if (value.length > 20 && base64Pattern.test(value)) {
      base64Params++;
    }
  });
  if (base64Params > 0) {
    factors.push({
      name: "base64_params",
      impact: 0.15,
      description: `Base64 encoded parameters detected - may hide malicious data`,
      category: "url_structure",
    });
    riskScore += 0.15;
  }

  // ==========================================================================
  // CHECK 15: Domain Entropy (Randomness)
  // ==========================================================================
  const domainWithoutTld = domain.split(".").slice(0, -1).join("");
  const entropy = calculateEntropy(domainWithoutTld);
  if (entropy > 4.5 && domainWithoutTld.length > 10) {
    factors.push({
      name: "high_entropy_domain",
      impact: 0.2,
      description: "Domain appears randomly generated - common in malware campaigns",
      category: "domain",
    });
    riskScore += 0.2;
    threatType = threatType === "safe" ? "malware" : threatType;
  }

  // ==========================================================================
  // CHECK 16: Repeated Characters Pattern
  // ==========================================================================
  const repeatedPattern = /(.)\1{3,}/;
  if (repeatedPattern.test(domain)) {
    factors.push({
      name: "repeated_chars",
      impact: 0.15,
      description: "Suspicious repeated character pattern in domain",
      category: "domain",
    });
    riskScore += 0.15;
  }

  // ==========================================================================
  // CHECK 17: Suspicious File Extensions
  // ==========================================================================
  const dangerousExtensions = [".exe", ".apk", ".zip", ".rar", ".scr", ".bat", ".cmd", ".msi"];
  const pathLower = parsedUrl.pathname.toLowerCase();
  const hasDangerousExt = dangerousExtensions.some((ext) => pathLower.endsWith(ext));
  if (hasDangerousExt) {
    factors.push({
      name: "dangerous_file",
      impact: 0.35,
      description: "URL links to potentially dangerous file download",
      category: "content",
    });
    riskScore += 0.35;
    threatType = "malware";
  }

  // ==========================================================================
  // CHECK 18: Homograph Attack Detection (Mixed Scripts)
  // ==========================================================================
  const cyrillicPattern = /[\u0400-\u04FF]/;
  const greekPattern = /[\u0370-\u03FF]/;
  if (cyrillicPattern.test(domain) || greekPattern.test(domain)) {
    factors.push({
      name: "homograph_attack",
      impact: 0.4,
      description: "Domain contains mixed character scripts - possible homograph attack",
      category: "domain",
    });
    riskScore += 0.4;
    threatType = "phishing";
  }

  // ==========================================================================
  // CHECK 19: UPI-Specific Patterns
  // ==========================================================================
  if (urlStr.includes("upi://")) {
    const upiMatch = urlStr.match(/pa=([^&]+)/);
    if (upiMatch) {
      const upiId = upiMatch[1].toLowerCase();
      // Check for suspicious UPI patterns
      if (/\d{6,}/.test(upiId)) {
        factors.push({
          name: "suspicious_upi",
          impact: 0.2,
          description: "UPI ID contains many numbers - may be auto-generated scam ID",
          category: "content",
        });
        riskScore += 0.2;
      }
    }
  }

  // ==========================================================================
  // CHECK 20: Recent/New Domain Patterns
  // ==========================================================================
  const datePattern = /20[2-3][0-9]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i;
  if (datePattern.test(domain)) {
    factors.push({
      name: "date_in_domain",
      impact: 0.15,
      description: "Domain contains date patterns - may be recently created for scam",
      category: "domain",
    });
    riskScore += 0.15;
  }

  // Cap risk score at 1.0
  riskScore = Math.min(riskScore, 1.0);

  return {
    riskScore,
    factors,
    isHttps,
    domain,
    suspectedBrand,
    threatType: riskScore >= 0.6 ? threatType : "safe",
  };
}

// =============================================================================
// MAIN SERVER
// =============================================================================

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Validate origin
    if (!isOriginAllowed(origin)) {
      console.log(`Blocked request from origin: ${origin}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized origin" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    let body: { url?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { url } = body;

    if (!validateUrl(url)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing URL" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const urlStr = url as string;
    console.log(`Analyzing URL for user ${user.id}: ${urlStr.slice(0, 100)}...`);

    // Fetch known phishing domains from database
    const { data: blacklistData } = await supabase
      .from("known_phishing_domains")
      .select("domain")
      .eq("is_active", true);

    const knownPhishingDomains = blacklistData?.map((d: any) => d.domain) || [];

    // Perform deterministic analysis with 20+ checks
    const deterministicResult = performDeterministicAnalysis(urlStr, knownPhishingDomains);

    console.log(
      `Deterministic analysis: score=${deterministicResult.riskScore}, factors=${deterministicResult.factors.length}`
    );

    // Determine risk category
    let recommendation: "safe" | "caution" | "block";
    let riskCategory: string;
    
    if (deterministicResult.riskScore >= 0.81) {
      recommendation = "block";
      riskCategory = "critical";
    } else if (deterministicResult.riskScore >= 0.61) {
      recommendation = "block";
      riskCategory = "dangerous";
    } else if (deterministicResult.riskScore >= 0.31) {
      recommendation = "caution";
      riskCategory = "suspicious";
    } else {
      recommendation = "safe";
      riskCategory = "safe";
    }

    // Build explanation
    let explanation = "";
    if (riskCategory === "critical") {
      explanation = "CRITICAL: This URL is extremely dangerous and should be blocked immediately.";
    } else if (riskCategory === "dangerous") {
      explanation = "DANGEROUS: This URL shows multiple signs of being a phishing/scam attempt.";
    } else if (riskCategory === "suspicious") {
      explanation = "SUSPICIOUS: This URL has some concerning characteristics. Proceed with caution.";
    } else {
      explanation = "This URL appears to be safe based on our analysis.";
    }

    if (deterministicResult.suspectedBrand) {
      explanation += ` May be impersonating ${deterministicResult.suspectedBrand.toUpperCase()}.`;
    }

    // If medium risk, use AI for additional context
    let aiAnalysis: string | null = null;
    if (deterministicResult.riskScore >= 0.4 && deterministicResult.riskScore < 0.9) {
      try {
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (lovableApiKey) {
          const aiPrompt = `Analyze this potentially suspicious URL for phishing indicators:
URL: ${sanitizeForPrompt(urlStr, 200)}
Domain: ${deterministicResult.domain}
Already detected issues: ${deterministicResult.factors.map((f) => f.name).join(", ")}

Provide a brief (2-3 sentences) explanation of why this might be dangerous for an Indian user, focusing on UPI/banking scams. Be specific and helpful.`;

          const aiResponse = await fetch("https://lovable.ai.gateway/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableApiKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "You are a cybersecurity expert helping protect Indian users from online scams. Be concise and specific." },
                { role: "user", content: aiPrompt },
              ],
              max_tokens: 150,
              temperature: 0.3,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            aiAnalysis = aiData.choices?.[0]?.message?.content;
            if (aiAnalysis) {
              explanation += " " + aiAnalysis;
            }
          }
        }
      } catch (aiError) {
        console.log("AI analysis skipped:", aiError);
      }
    }

    // Build the response
    const analysis = {
      is_phishing: deterministicResult.riskScore >= 0.6,
      risk_score: deterministicResult.riskScore,
      risk_category: riskCategory,
      threat_type: deterministicResult.threatType as
        | "phishing"
        | "scam"
        | "malware"
        | "fake_upi"
        | "typosquatting"
        | "safe"
        | "unknown",
      indicators: deterministicResult.factors.map((f) => f.name),
      factors: deterministicResult.factors,
      domain_analysis: {
        domain: deterministicResult.domain,
        legitimate_domain: deterministicResult.suspectedBrand
          ? LEGITIMATE_BRANDS[deterministicResult.suspectedBrand]?.[0] || null
          : null,
        is_suspicious_tld: deterministicResult.factors.some((f) => f.name === "suspicious_tld"),
        has_valid_ssl: deterministicResult.isHttps ? true : "unknown",
      },
      recommendation,
      explanation,
    };

    // Store in database
    try {
      await supabase.from("phishing_attempts").insert({
        user_id: user.id,
        url: urlStr.slice(0, 2048),
        risk_score: analysis.risk_score,
        is_phishing: analysis.is_phishing,
        analysis_result: analysis,
      });

      // Auto-add to blacklist if critical
      if (analysis.risk_score >= 0.85) {
        const domain = extractDomain(urlStr);
        const { error: upsertError } = await supabase
          .from("known_phishing_domains")
          .upsert(
            {
              domain,
              threat_type: analysis.threat_type,
              source: "auto_detection",
              reported_count: 1,
              last_reported_at: new Date().toISOString(),
            },
            { onConflict: "domain" }
          );
        
        if (!upsertError) {
          console.log(`Auto-added domain to blacklist: ${domain}`);
        }
      }

      // Create alert if dangerous
      if (analysis.is_phishing) {
        await supabase.from("alerts").insert({
          user_id: user.id,
          alert_type: "phishing_detected",
          title: "Phishing Link Detected",
          message: `A ${riskCategory} phishing attempt was blocked: ${urlStr.slice(0, 100)}...`,
          severity: riskCategory === "critical" ? "high" : "medium",
          metadata: { url: urlStr.slice(0, 500), risk_score: analysis.risk_score },
        });
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
    }

    console.log(`Analysis complete: risk=${analysis.risk_score}, phishing=${analysis.is_phishing}`);

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
