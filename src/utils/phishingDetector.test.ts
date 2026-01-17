
import { analyzeUrlLocally } from './phishingDetector';

const testCases = [
    // 🟢 Legitimate URLs (Must be HTTPS)
    { url: 'https://google.com', expectedStart: 'safe' },
    { url: 'https://www.amazon.com/products', expectedStart: 'safe' },
    { url: 'https://sbi.co.in', expectedStart: 'safe' },

    // 🔴 Validation: Insecure Protocol (HTTP)
    { url: 'http://google.com', expectedStart: 'suspicious' }, // 0.5 impact

    // 🔴 Validation: Malformed / Invalid Characters
    { url: 'https://paytm--secure@@login.in', expectedStart: 'critical' }, // @, --
    { url: 'https://gpay_secure.com', expectedStart: 'critical' },        // _ in host
    { url: 'https://bank!login.com', expectedStart: 'critical' },         // !
    { url: 'ww.amazon.in', expectedStart: 'critical' },                   // Malformed start

    // 🔴 URL Shorteners
    { url: 'https://bit.ly/3xyz', expectedStart: 'block' }, // Block or Dangerous/Critical
    { url: 'https://tinyurl.com/free-money', expectedStart: 'block' },

    // 🔴 Brand Impersonation (Strong)
    { url: 'https://paytm-kyc-update.com', expectedStart: 'critical' }, // Brand in non-trusted domain
    { url: 'https://secure-login-hdfc.net', expectedStart: 'critical' },
    { url: 'https://google.verify-account.com', expectedStart: 'critical' }, // Brand in subdomain

    // 🔴 Suspicious Keywords in Domain (No Brand)
    { url: 'https://secure-login-update.com', expectedStart: 'critical' },

    // 🔴 Typosquatting
    { url: 'https://g0ogle.com', expectedStart: 'critical' },
    { url: 'https://gitnub.com', expectedStart: 'critical' },

    // 🔴 High Risk TLDs
    { url: 'https://free-money.xyz', expectedStart: 'dangerous' },
];

export function runPhishingTests() {
    console.group('🛡️ Phishing Detector Test Suite (Enhanced)');
    let passed = 0;

    const results = testCases.map(tc => {
        const analysis = analyzeUrlLocally(tc.url);
        let isPass = false;

        // Simplify pass logic: expectedStart maps to risk category or recommendation
        if (tc.expectedStart === 'safe') {
            isPass = !analysis.is_phishing && analysis.risk_category === 'safe';
        } else if (tc.expectedStart === 'critical') {
            isPass = analysis.risk_category === 'critical' || analysis.risk_score >= 0.8;
        } else if (tc.expectedStart === 'block') {
            // Expect block or high risk
            isPass = analysis.recommendation === 'block' || analysis.risk_category === 'critical' || analysis.risk_category === 'dangerous';
        } else if (tc.expectedStart === 'dangerous') {
            isPass = analysis.risk_category === 'dangerous' || analysis.risk_category === 'critical';
        } else if (tc.expectedStart === 'suspicious') {
            isPass = analysis.risk_category === 'suspicious' || analysis.risk_category === 'dangerous';
        }

        if (isPass) passed++;

        return {
            URL: tc.url,
            Expected: tc.expectedStart,
            Actual: analysis.risk_category,
            Score: analysis.risk_score.toFixed(2),
            Result: isPass ? '✅ PASS' : '❌ FAIL',
            Reason: analysis.explanation.slice(0, 80) + '...'
        };
    });

    console.table(results);
    console.log(`Test Summary: ${passed}/${testCases.length} Passed`);

    if (passed < testCases.length) {
        console.log('\n❌ FAILED TESTS Details:');
        results.filter(r => r.Result.includes('FAIL')).forEach(r => {
            console.log(`[${r.URL}] Expected: ${r.Expected}, Got: ${r.Actual} (Score: ${r.Score}). Reason: ${r.Reason}`);
        });
    }

    console.groupEnd();
}
