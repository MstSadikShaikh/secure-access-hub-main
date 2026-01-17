import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  UserCheck,
  Clock,
  Search
} from 'lucide-react';
import { usePreTransactionAnalysis } from '@/hooks/usePreTransactionAnalysis';
import { useUpiBlacklist } from '@/hooks/useUpiBlacklist';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface VerificationCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  explanation: string;
  details?: string;
}

// Helper function to find character differences between two strings
function findCharacterDifferences(str1: string, str2: string): { index: number; char1: string; char2: string }[] {
  const differences: { index: number; char1: string; char2: string }[] = [];
  const maxLen = Math.max(str1.length, str2.length);

  for (let i = 0; i < maxLen; i++) {
    const c1 = str1[i] || '';
    const c2 = str2[i] || '';
    if (c1.toLowerCase() !== c2.toLowerCase()) {
      differences.push({ index: i, char1: c1, char2: c2 });
    }
  }
  return differences;
}

// Detect suspicious patterns in UPI ID
function detectSuspiciousPatterns(upiId: string): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const lowerUpi = upiId.toLowerCase();

  // Common scam keywords
  const scamKeywords = ['lottery', 'winner', 'cashback', 'prize', 'reward', 'lucky', 'refund', 'support', 'helpdesk', 'customer'];
  for (const keyword of scamKeywords) {
    if (lowerUpi.includes(keyword)) {
      reasons.push(`Contains suspicious keyword: "${keyword}"`);
    }
  }

  // Number substitution for letters (common spoofing technique)
  const substitutions: [RegExp, string][] = [
    [/0/, 'Uses "0" which could replace "o"'],
    [/1/, 'Uses "1" which could replace "i" or "l"'],
    [/3/, 'Uses "3" which could replace "e"'],
    [/4/, 'Uses "4" which could replace "a"'],
    [/5/, 'Uses "5" which could replace "s"'],
    [/8/, 'Uses "8" which could replace "b"'],
  ];

  for (const [pattern, reason] of substitutions) {
    if (pattern.test(upiId.split('@')[0])) {
      reasons.push(reason);
    }
  }

  // Misspelled common payment providers
  const providers = ['paytm', 'phonepe', 'googlepay', 'amazon', 'flipkart', 'ybl', 'oksbi', 'okaxis'];
  const upiHandle = upiId.split('@')[0];
  for (const provider of providers) {
    // Check if it's similar but not exact
    if (upiHandle.includes(provider.substring(0, 4)) && !lowerUpi.includes(provider)) {
      reasons.push(`Possibly impersonating "${provider}"`);
    }
  }

  return { suspicious: reasons.length > 0, reasons };
}

// Highlight differences in UPI ID visually
function SpoofingVisualization({ original, fake }: { original: string; fake: string }) {
  const differences = findCharacterDifferences(original, fake);

  if (differences.length === 0) return null;

  return (
    <div className="mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
      <div className="flex items-center gap-2 mb-2">
        <Eye className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">Spoofing Detection</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-16">Fake:</span>
          <span className="font-mono">
            {fake.split('').map((char, i) => {
              const isDiff = differences.some(d => d.index === i);
              return (
                <span key={i} className={isDiff ? 'bg-destructive/30 text-destructive font-bold px-0.5 rounded' : ''}>
                  {char}
                </span>
              );
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-16">Real:</span>
          <span className="font-mono">
            {original.split('').map((char, i) => {
              const isDiff = differences.some(d => d.index === i);
              return (
                <span key={i} className={isDiff ? 'bg-green-500/30 text-green-700 font-bold px-0.5 rounded' : ''}>
                  {char}
                </span>
              );
            })}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Character differences highlighted above. Scammers often use similar-looking characters.
      </p>
    </div>
  );
}

function VerificationCheckItem({ check }: { check: VerificationCheck }) {
  const statusConfig = {
    pass: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500/10' },
    fail: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
    pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
  };

  const config = statusConfig[check.status];
  const Icon = config.icon;

  return (
    <div className={`p-3 rounded-lg ${config.bg} border border-border`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{check.name}</span>
            <Badge variant={check.status === 'pass' ? 'default' : check.status === 'fail' ? 'destructive' : 'secondary'}>
              {check.status === 'pass' ? 'PASS' : check.status === 'fail' ? 'FAIL' : check.status === 'warning' ? 'WARN' : 'PENDING'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{check.explanation}</p>
          {check.details && (
            <p className="text-xs text-muted-foreground mt-1 italic">{check.details}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TrustScoreChecker() {
  const [upiId, setUpiId] = useState('');
  const { analyzeTransaction, isAnalyzing, analysisResult, reset } = usePreTransactionAnalysis();
  const { checkUpiBlacklist } = useUpiBlacklist();
  const { user } = useAuth();
  const [blacklistInfo, setBlacklistInfo] = useState<{
    isBlacklisted: boolean;
    reportCount: number;
    severity?: string;
    reason?: string;
  } | null>(null);

  const handleVerify = async () => {
    if (!upiId.trim()) return;

    // Reset previous results
    reset();
    setBlacklistInfo(null);

    // Check blacklist
    const blacklistResult = await checkUpiBlacklist(upiId.trim());
    setBlacklistInfo({
      isBlacklisted: !!blacklistResult,
      reportCount: blacklistResult?.reported_count || 0,
      severity: blacklistResult?.severity,
      reason: blacklistResult?.reason,
    });

    // Analyze transaction (using a small amount for verification purposes)


    // Create alert if high risk
    analyzeTransaction.mutate({
      amount: 100,
      receiverUpi: upiId.trim(),
      localHour: new Date().getHours(),
    }, {
      onSuccess: (result) => {
        if ((result.risk_score > 0.6 || blacklistResult) && user) {
          supabase.from('alerts').insert({
            user_id: user.id,
            alert_type: 'fraud_detected',
            title: 'High Risk UPI Checked',
            message: `You checked a UPI ID with ${Math.round(result.risk_score * 100)}% risk score: ${upiId.trim()}`,
            severity: result.risk_score > 0.8 || blacklistResult ? 'critical' : 'high',
            status: 'unread'
          }).then(({ error }) => {
            if (error) console.error('Failed to create alert:', error);
          });
        }
      }
    });
  };

  // Calculate trust score (inverse of risk score)
  const calculateTrustScore = () => {
    if (blacklistInfo?.isBlacklisted) return 0;
    if (!analysisResult) return null;
    return Math.round((1 - analysisResult.risk_score) * 100);
  };

  const trustScore = calculateTrustScore();
  const patternAnalysis = upiId ? detectSuspiciousPatterns(upiId) : null;

  const getTrustLevel = (score: number) => {
    if (score >= 80) return { label: 'Safe', color: 'bg-green-500', textColor: 'text-green-600', icon: ShieldCheck };
    if (score >= 50) return { label: 'Caution', color: 'bg-yellow-500', textColor: 'text-yellow-600', icon: ShieldAlert };
    return { label: 'Avoid', color: 'bg-red-500', textColor: 'text-red-600', icon: ShieldX };
  };

  // Build verification checks
  const buildVerificationChecks = (): VerificationCheck[] => {
    const checks: VerificationCheck[] = [];

    // Contact List Check
    if (analysisResult) {
      checks.push({
        id: 'contact',
        name: 'Contact List Check',
        status: analysisResult.contact_status === 'trusted' ? 'pass' :
          analysisResult.contact_status === 'flagged' ? 'fail' : 'warning',
        explanation: analysisResult.contact_status === 'trusted'
          ? `Found in your trusted contacts${analysisResult.contact_name ? ` as "${analysisResult.contact_name}"` : ''}`
          : analysisResult.contact_status === 'flagged'
            ? 'This contact has been flagged previously'
            : 'Not in your contact list - first-time recipient',
        details: analysisResult.contact_status !== 'trusted' ? 'Consider adding to contacts after verifying identity' : undefined,
      });
    }

    // Spoofing/Impersonation Check
    if (analysisResult) {
      const hasSimilar = analysisResult.similar_contacts.length > 0;
      const hasImpersonation = analysisResult.impersonation_warning;

      checks.push({
        id: 'spoofing',
        name: 'Spoofing Detection',
        status: hasImpersonation ? 'fail' : hasSimilar ? 'warning' : 'pass',
        explanation: hasImpersonation
          ? 'Possible impersonation detected - UPI ID looks similar to a known entity'
          : hasSimilar
            ? `Similar to existing contacts: ${analysisResult.similar_contacts.join(', ')}`
            : 'No spoofing patterns detected',
        details: hasImpersonation ? 'Scammers often create IDs that look similar to trusted ones' : undefined,
      });
    }

    // Pattern Analysis Check
    if (patternAnalysis) {
      checks.push({
        id: 'pattern',
        name: 'Pattern Analysis',
        status: patternAnalysis.suspicious ? 'fail' : 'pass',
        explanation: patternAnalysis.suspicious
          ? patternAnalysis.reasons[0]
          : 'No suspicious patterns found in UPI ID',
        details: patternAnalysis.suspicious && patternAnalysis.reasons.length > 1
          ? patternAnalysis.reasons.slice(1).join('. ')
          : undefined,
      });
    }

    // Blacklist Check
    if (blacklistInfo !== null) {
      checks.push({
        id: 'blacklist',
        name: 'Fraud Database Check',
        status: blacklistInfo.isBlacklisted ? 'fail' : 'pass',
        explanation: blacklistInfo.isBlacklisted
          ? `Found in fraud database - Reported ${blacklistInfo.reportCount} time(s)`
          : 'Not found in fraud database',
        details: blacklistInfo.isBlacklisted && blacklistInfo.reason
          ? `Reason: ${blacklistInfo.reason}`
          : undefined,
      });
    }

    return checks;
  };

  const verificationChecks = (analysisResult || blacklistInfo) ? buildVerificationChecks() : [];
  const hasResults = trustScore !== null || blacklistInfo !== null;

  // Find similar contact for spoofing visualization
  const similarContact = analysisResult?.similar_contacts[0];

  // Generate explainable score breakdown
  const generateScoreExplanation = () => {
    if (!analysisResult && !blacklistInfo) return null;

    const factors: string[] = [];

    if (blacklistInfo?.isBlacklisted) {
      factors.push('This UPI ID is in our fraud database, which is the primary reason for the low trust score.');
    }

    if (analysisResult) {
      if (analysisResult.contact_status !== 'trusted') {
        factors.push('This is a new/unknown recipient not in your trusted contacts.');
      }
      if (analysisResult.impersonation_warning) {
        factors.push('The UPI ID appears to impersonate a known entity or contact.');
      }
      if (analysisResult.similar_contacts.length > 0) {
        factors.push(`It looks similar to "${analysisResult.similar_contacts[0]}" - verify carefully.`);
      }
    }

    if (patternAnalysis?.suspicious) {
      factors.push(`Suspicious patterns detected: ${patternAnalysis.reasons[0].toLowerCase()}.`);
    }

    return factors;
  };

  const scoreExplanation = generateScoreExplanation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Fake UPI ID & Receiver Trust Check
        </CardTitle>
        <CardDescription>
          AI-powered verification to detect fake, spoofed, or fraudulent UPI IDs before payment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter UPI ID (e.g., example@upi)"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            className="font-mono"
          />
          <Button onClick={handleVerify} disabled={isAnalyzing || !upiId.trim()}>
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Verify
              </>
            )}
          </Button>
        </div>

        {hasResults && (
          <div className="space-y-6 pt-4 border-t">
            {/* Trust Score Display */}
            {trustScore !== null && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Trust Score</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const level = getTrustLevel(trustScore);
                      const Icon = level.icon;
                      return (
                        <>
                          <Icon className={`h-6 w-6 ${level.textColor}`} />
                          <Badge
                            variant={trustScore >= 80 ? 'default' : trustScore >= 50 ? 'secondary' : 'destructive'}
                            className="text-sm px-3 py-1"
                          >
                            {level.label}
                          </Badge>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Progress
                    value={trustScore}
                    className="flex-1 h-3"
                  />
                  <span className="text-2xl font-bold w-16 text-right">{trustScore}%</span>
                </div>
              </div>
            )}

            {/* Verification Checks */}
            {verificationChecks.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Verification Checks
                </h4>
                <div className="space-y-2">
                  {verificationChecks.map(check => (
                    <VerificationCheckItem key={check.id} check={check} />
                  ))}
                </div>
              </div>
            )}

            {/* Spoofing Visualization */}
            {similarContact && analysisResult?.impersonation_warning && (
              <SpoofingVisualization original={similarContact} fake={upiId} />
            )}

            {/* WHY THIS SCORE - Explainable AI */}
            {scoreExplanation && scoreExplanation.length > 0 && (
              <div className="p-4 bg-muted rounded-lg border">
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Why This Score?
                </h4>
                <ul className="space-y-2">
                  {scoreExplanation.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>

                {/* Recommendation */}
                {analysisResult && (
                  <div className="mt-4 pt-3 border-t">
                    <div className={`flex items-center gap-2 font-medium ${analysisResult.recommendation === 'proceed' ? 'text-green-600' :
                      analysisResult.recommendation === 'caution' ? 'text-yellow-600' :
                        'text-destructive'
                      }`}>
                      {analysisResult.recommendation === 'proceed' ? (
                        <>
                          <ShieldCheck className="h-5 w-5" />
                          <span>Safe to proceed with this payment</span>
                        </>
                      ) : analysisResult.recommendation === 'caution' ? (
                        <>
                          <ShieldAlert className="h-5 w-5" />
                          <span>Proceed with caution - verify recipient identity first</span>
                        </>
                      ) : (
                        <>
                          <ShieldX className="h-5 w-5" />
                          <span>Avoid this transaction - high risk of fraud</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Blacklist Warning */}
            {blacklistInfo?.isBlacklisted && (
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
                  <ShieldX className="h-5 w-5" />
                  ⚠️ BLACKLISTED UPI ID
                </div>
                <p className="text-sm text-muted-foreground">
                  This UPI ID has been reported {blacklistInfo.reportCount} time(s) for fraudulent activity.
                  {blacklistInfo.severity && (
                    <span className="ml-2">
                      Severity: <Badge variant="destructive" className="ml-1">{blacklistInfo.severity}</Badge>
                    </span>
                  )}
                </p>
                {blacklistInfo.reason && (
                  <p className="text-sm mt-2">
                    <span className="font-medium">Reason:</span> {blacklistInfo.reason}
                  </p>
                )}
                <p className="text-xs text-destructive mt-3 font-medium">
                  DO NOT send money to this UPI ID. Report if you've been contacted.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
