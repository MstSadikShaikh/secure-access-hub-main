
export interface PhishingFactor {
    name: string;
    impact: number;
    description: string;
    category: 'url_structure' | 'domain' | 'content' | 'technical' | 'blacklist';
}

export interface PhishingAnalysis {
    is_phishing: boolean;
    risk_score: number;
    risk_category: 'safe' | 'suspicious' | 'dangerous' | 'critical';
    threat_type: 'phishing' | 'scam' | 'malware' | 'fake_upi' | 'typosquatting' | 'safe' | 'unknown';
    indicators: string[];
    factors: PhishingFactor[];
    domain_analysis: {
        domain: string;
        legitimate_domain: string | null;
        is_suspicious_tld: boolean;
        has_valid_ssl: boolean | 'unknown';
    };
    recommendation: 'safe' | 'caution' | 'block';
    explanation: string;
}

export interface ScanHistoryItem {
    id: string;
    url: string;
    risk_score: number;
    is_phishing: boolean;
    created_at: string;
    analysis_result: PhishingAnalysis;
}


const SAFE_TLDS = new Set([
    '.com', '.in', '.co.in', '.org', '.net', '.edu', '.gov', '.mil', '.ac.in', '.gov.in', '.nic.in', '.res.in', '.int'
]);

// Expanded list of commonly targeted brands for impersonation checks
const TARGETED_BRANDS = [
    // Tech & Social
    'google', 'gmail', 'facebook', 'instagram', 'twitter', 'linkedin', 'github', 'microsoft', 'apple', 'amazon', 'netflix', 'whatsapp', 'telegram', 'discord', 'adobe', 'dropbox', 'paypal',
    // Banking & Finance (India + Global)
    'sbi', 'onlinesbi', 'hdfc', 'hdfcbank', 'icici', 'icicibank', 'axis', 'axisbank', 'kotak', 'pnb', 'bob', 'canara', 'paytm', 'phonepe', 'gpay', 'bhim', 'upi', 'razorpay', 'stripe', 'wise', 'binance', 'coinbase', 'blockchain',
    // Shopping
    'flipkart', 'myntra', 'ajio', 'meesho', 'snapdeal', 'ebay', 'walmart', 'target', 'bestbuy',
    // Services
    'irctc', 'zomato', 'swiggy', 'uber', 'ola', 'airbnb', 'booking',
];

// Common URL shorteners
const URL_SHORTENERS = new Set([
    'bit.ly', 'tinyurl.com', 'is.gd', 't.co', 'goo.gl', 'shorte.st', 'ow.ly', 'buff.ly', 'bl.ink', 'mcaf.ee', 'rb.gy', 'rebrand.ly', 'cutt.ly'
]);

const HOMOGLYPH_MAP: Record<string, string> = {
    '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '6': 'g', '8': 'b', '9': 'g',
    '@': 'a', '$': 's', '!': 'i',
    'а': 'a', 'с': 'c', 'е': 'e', 'о': 'o', 'р': 'p', 'х': 'x', 'у': 'y', // Cyrillic homoglyphs
};

// Levenshtein distance implementation for string similarity
function getLevenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    const firstRow = Array.from({ length: a.length + 1 }, (_, i) => i);
    matrix[0] = firstRow;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = b[i - 1] === a[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[b.length][a.length];
}

function normalizeHomoglyphs(str: string): string {
    return str.split('').map(char => HOMOGLYPH_MAP[char] || char).join('');
}

interface ValidationResult {
    isValid: boolean;
    normalizedDomain: string;
    cleanUrl: string;
    protocol: string;
    error?: string;
}

function validateAndNormalizeUrl(inputUrl: string): ValidationResult {
    const defaultRes: ValidationResult = { isValid: false, normalizedDomain: '', cleanUrl: '', protocol: '', error: '' };

    if (!inputUrl || !inputUrl.trim()) return { ...defaultRes, error: 'Empty URL provided.' };

    let url = inputUrl.trim();

    // 1. Strict Protocol Check
    // Reject malformed protocols like http:/, https//, or missing protocol
    if (!url.match(/^https?:\/\//i)) {
        return { ...defaultRes, error: 'Invalid or missing protocol. URL must start with http:// or https://' };
    }

    // 2. Illegal Character Check (Spaces)
    if (/\s/.test(url)) {
        return { ...defaultRes, error: 'URL contains illegal content (spaces).' };
    }

    let urlObj: URL;
    try {
        urlObj = new URL(url);
    } catch (e) {
        return { ...defaultRes, error: 'Malformed URL structure.' };
    }

    const { protocol, hostname } = urlObj;

    // 3. Strict Hostname Validation
    // Reject suspicious characters in hostname: @, %, !, _, etc
    // Note: underscores are debatable in some subdomains but standard DNS hostnames should not have them.
    // Double hyphens are fine if part of Punycode (xn--) but otherwise suspicious (paytm--secure)
    if (/[@%!_]/.test(hostname)) {
        return { ...defaultRes, error: 'Hostname contains illegal or suspicious characters (@, %, !, _).' };
    }

    if (hostname.includes('--') && !hostname.startsWith('xn--')) {
        return { ...defaultRes, error: 'Hostname contains suspicious pattern "--".' };
    }

    // 4. Subdomain & Hostname Validation
    const subdomains = hostname.split('.');

    // Check for malformed "www" variations at the start
    if (hostname.startsWith('ww.') && !hostname.startsWith('www.')) {
        return { ...defaultRes, error: 'Invalid subdomain prefix detected: ww' };
    }

    // Check specifically for w+ number patterns or single w if likely a typo
    if (subdomains.length > 2) {
        const prefix = subdomains[0];
        if ((/^w{1,2}$/.test(prefix)) || (/^w\d+w$/.test(prefix))) {
            return { ...defaultRes, error: `Invalid subdomain prefix detected: ${prefix}` };
        }
    }

    // 5. Normalization
    let normalizedDomain = hostname.toLowerCase();

    // Remove 'www.' prefix ONLY (strict check)
    if (normalizedDomain.startsWith('www.')) {
        normalizedDomain = normalizedDomain.slice(4);
    }

    return {
        isValid: true,
        normalizedDomain: normalizedDomain,
        cleanUrl: urlObj.href,
        protocol: protocol,
    };
}

export function analyzeUrlLocally(inputUrl: string, isBlacklisted: boolean = false): PhishingAnalysis {
    // Direct Blacklist Check
    if (isBlacklisted) {
        return {
            is_phishing: true,
            risk_score: 1.0,
            risk_category: 'critical',
            threat_type: 'phishing',
            indicators: ['Blacklisted Domain'],
            factors: [{
                name: 'Blacklisted Domain',
                impact: 1.0,
                description: 'This domain is in our database of known phishing sites.',
                category: 'blacklist'
            }],
            domain_analysis: {
                domain: inputUrl,
                legitimate_domain: null,
                is_suspicious_tld: true,
                has_valid_ssl: 'unknown',
            },
            recommendation: 'block',
            explanation: '🚨 CRITICAL: This URL is officially blacklisted as a phishing site.'
        };
    }

    // Phase 1: Strict Validation & Normalization
    const validation = validateAndNormalizeUrl(inputUrl);

    if (!validation.isValid) {
        return {
            is_phishing: true,
            risk_score: 1.0,
            risk_category: 'critical',
            threat_type: 'unknown',
            indicators: ['Invalid URL'],
            factors: [{
                name: 'Validation Failed',
                impact: 1.0,
                description: validation.error || 'URL failed strict validation checks.',
                category: 'technical'
            }],
            domain_analysis: {
                domain: inputUrl,
                legitimate_domain: null,
                is_suspicious_tld: false,
                has_valid_ssl: false,
            },
            recommendation: 'block',
            explanation: `Status: Invalid URL. Reason: ${validation.error}`
        };
    }

    const { normalizedDomain, protocol, cleanUrl } = validation;
    const factors: PhishingFactor[] = [];
    const domain = normalizedDomain;

    // Parameter Hit Counting
    let parameterHits = 0;

    // 1. Insecure Protocol Check
    if (protocol === 'http:') {
        parameterHits++;
        factors.push({
            name: 'Insecure Protocol',
            impact: 0.8,
            description: 'The website does not use HTTPS encryption, making stealable data vulnerable.',
            category: 'technical'
        });
    }

    // 2. TLD Check (Not common/safe TLD)
    const tld = '.' + domain.split('.').pop();
    if (!SAFE_TLDS.has(tld)) {
        parameterHits++;
        factors.push({
            name: 'Untrusted TLD',
            impact: 0.8,
            description: `The domain extension ${tld} is not a standard trusted TLD (.com, .in, etc).`,
            category: 'domain'
        });
    }

    // 3. Obfuscation Check (Cyrillic, Punycode, Homoglyphs)
    const hasPunycode = domain.startsWith('xn--');
    const hasNonAscii = /[^\u0000-\u007F]/.test(domain);
    const hasInternalHomoglyphs = Object.keys(HOMOGLYPH_MAP).some(key => domain.includes(key) && key.charCodeAt(0) > 127);

    if (hasPunycode || hasNonAscii || hasInternalHomoglyphs) {
        parameterHits++;
        factors.push({
            name: 'Visual Obfuscation',
            impact: 0.9,
            description: 'URL contains characters that look like English but are different (homoglyphs) or use Punycode encoding.',
            category: 'domain'
        });
    }

    // 4. Brand Impersonation Check (Typosquatting)
    let detectedTarget: string | null = null;
    const domainParts = domain.split('.');
    const sld = domainParts.length >= 2 ? domainParts[domainParts.length - 2] : domain;

    for (const brand of TARGETED_BRANDS) {
        // Skip exact matches on trusted TLDs
        const isTrustedBrandDomain = (domain === `${brand}.com` || domain === `${brand}.in` || domain.endsWith(`.${brand}.com`) || domain.endsWith(`.${brand}.in`));
        if (isTrustedBrandDomain) continue;

        // Typosquatting Check (amazona, flipkarta, Flpkart)
        const dist = getLevenshteinDistance(sld, brand);
        const containsBrand = sld.includes(brand) && sld !== brand;

        if (dist >= 1 && dist <= 2 && brand.length > 3) {
            detectedTarget = brand;
            parameterHits++;
            factors.push({
                name: 'Brand Typosquatting',
                impact: 0.95,
                description: `URL impersonates '${brand}' with a minor spelling variation (e.g., '${sld}').`,
                category: 'domain'
            });
            break;
        } else if (containsBrand) {
            detectedTarget = brand;
            parameterHits++;
            factors.push({
                name: 'Suspect Brand Usage',
                impact: 0.9,
                description: `URL contains the brand name '${brand}' but is not a verified official link.`,
                category: 'domain'
            });
            break;
        }
    }

    // 5. URL Shortener Check
    if (URL_SHORTENERS.has(domain)) {
        parameterHits++;
        factors.push({
            name: 'URL Shortener',
            impact: 0.7,
            description: 'Website uses a URL shortener which hides the final destination, a common tactic for scams.',
            category: 'url_structure'
        });
    }

    // Final Scoring based on user rules
    let riskScore = 0;
    let riskCategory: PhishingAnalysis['risk_category'] = 'safe';
    let recommendation: 'safe' | 'caution' | 'block' = 'safe';

    if (parameterHits >= 4) {
        riskScore = 0.9 + (parameterHits * 0.02);
        riskCategory = 'critical';
        recommendation = 'block';
    } else if (parameterHits === 3) {
        riskScore = 0.75;
        riskCategory = 'dangerous';
        recommendation = 'block';
    } else if (parameterHits === 2) {
        riskScore = 0.45;
        riskCategory = 'suspicious';
        recommendation = 'caution';
    } else {
        riskScore = 0.05;
        riskCategory = 'safe';
        recommendation = 'safe';
    }

    // Explanation construction
    const hitCountText = `${parameterHits} suspicious parameter${parameterHits !== 1 ? 's' : ''} detected.`;
    const explanation = `Analysis Result: ${riskCategory.toUpperCase()}. Hits: ${hitCountText} ${factors.map(f => f.name).join(', ')}`;

    return {
        is_phishing: parameterHits >= 2,
        risk_score: riskScore,
        risk_category: riskCategory,
        threat_type: detectedTarget ? 'phishing' : parameterHits >= 3 ? 'scam' : 'safe',
        indicators: factors.map(f => f.name),
        factors: factors,
        domain_analysis: {
            domain: normalizedDomain,
            legitimate_domain: detectedTarget,
            is_suspicious_tld: !SAFE_TLDS.has(tld),
            has_valid_ssl: protocol === 'https:',
        },
        recommendation: recommendation,
        explanation: explanation
    };
}

export async function analyzeUrlWithOllama(url: string): Promise<PhishingAnalysis> {
    const modelName = "kimi-k2:1t-cloud";
    const prompt = `
    You are a cybersecurity Link Scanner AI. Your task is to analyze the following URL for phishing, scam, or malware indicators.
    URL: "${url}"

    Analyze specific aspects:
    1. TLD (Top Level Domain) reputation.
    2. URL Structure (suspicious subdomains, misspelt brand names, excessive length).
    3. Obfuscation techniques (IP usage, hex encoding, punycode).
    4. Keyword analysis (security, login, verify, etc.).

    Return a valid JSON object matching this structure EXACTLY (do not wrap in markdown):
    {
        "is_phishing": boolean,
        "risk_score": number (0.0 to 1.0),
        "risk_category": "safe" | "suspicious" | "dangerous" | "critical",
        "threat_type": "phishing" | "scam" | "malware" | "fake_upi" | "safe" | "unknown",
        "indicators": string[] (list of quick tags),
        "factors": [
            {
                "name": string,
                "impact": number (0.0 to 1.0),
                "description": string,
                "category": "url_structure" | "domain" | "content" | "technical" | "blacklist"
            }
        ],
        "recommendation": "safe" | "caution" | "block",
        "explanation": string (concise summary suitable for a user alert)
    }
    `;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelName,
                prompt: prompt,
                stream: false,
                format: "json",
                options: {
                    temperature: 0.1
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        try {
            const analysis = JSON.parse(data.response);

            let domain = "";
            let hasSsl = false;
            try {
                const u = new URL(url);
                domain = u.hostname;
                hasSsl = u.protocol === 'https:';
            } catch (e) {
                domain = url;
            }

            return {
                is_phishing: analysis.is_phishing ?? false,
                risk_score: analysis.risk_score ?? 0,
                risk_category: analysis.risk_category || "unknown",
                threat_type: analysis.threat_type || "unknown",
                indicators: analysis.indicators || [],
                factors: analysis.factors || [],
                domain_analysis: {
                    domain: domain,
                    legitimate_domain: null,
                    is_suspicious_tld: false,
                    has_valid_ssl: hasSsl
                },
                recommendation: analysis.recommendation || "caution",
                explanation: analysis.explanation || "No explanation provided by AI."
            };
        } catch (parseError) {
            console.error("Failed to parse LLM response:", data.response);
            throw new Error("Invalid JSON response from AI model.");
        }

    } catch (error) {
        console.error("AI Analysis Failed:", error);
        throw error;
    }
}
