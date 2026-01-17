import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePhishingDetection, PhishingAnalysis, PhishingFactor, ScanHistoryItem } from '@/hooks/usePhishingDetection';
import { useAuth } from '@/hooks/useAuth';
import {
  Link as LinkIcon, History, ChevronDown, ChevronUp, ExternalLink,
  AlertOctagon, Info, Shield, Search, AlertTriangle, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function PhishingScanner() {
  const [url, setUrl] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const { user } = useAuth();
  const { detectPhishing, isAnalyzing, analysis, scanHistory, isLoadingHistory } = usePhishingDetection();

  const handleScan = () => {
    if (url.trim()) {
      detectPhishing(url.trim());
      setShowDetails(true);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Shield className="h-6 w-6 text-primary" />
          Phishing Link Scanner
        </CardTitle>
        <CardDescription>
          Enterprise-grade URL analysis with 20+ security checks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScan();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste URL, payment link, or UPI link to scan..."
              className="pl-10 h-12 text-base"
              disabled={isAnalyzing}
            />
          </div>
          <Button type="submit" disabled={isAnalyzing || !url.trim()} size="lg" className="h-12 px-6">
            {isAnalyzing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            <span className="ml-2 font-semibold">Scan</span>
          </Button>
        </form>

        {/* Results Tabs */}
        <Tabs defaultValue="result" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="result">Scan Result</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="result" className="mt-4">
            {analysis ? (
              <AnalysisResult analysis={analysis} showDetails={showDetails} setShowDetails={setShowDetails} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Enter a URL to scan</p>
                <p className="text-sm mt-1">We check against 20+ security parameters</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {!user ? (
              <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
                <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                <p className="font-medium">Authentication Required</p>
                <p className="text-sm text-muted-foreground mt-1">Please log in to track and view your scan history.</p>
              </div>
            ) : (
              <ScanHistory history={scanHistory || []} isLoading={isLoadingHistory} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RiskMeter({ score, category }: { score: number; category: string }) {
  const percentage = Math.round(score * 100);

  const getColor = () => {
    if (percentage >= 81) return 'bg-red-600';
    if (percentage >= 61) return 'bg-orange-500';
    if (percentage >= 31) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getLabel = () => {
    if (category === 'critical') return 'CRITICAL';
    if (category === 'dangerous') return 'DANGEROUS';
    if (category === 'suspicious') return 'SUSPICIOUS';
    return 'SAFE';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Risk Level</span>
        <span className={`text-sm font-bold ${percentage >= 61 ? 'text-destructive' : percentage >= 31 ? 'text-yellow-600' : 'text-green-600'}`}>
          {percentage}% - {getLabel()}
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0% Safe</span>
        <span>30% Suspicious</span>
        <span>60% Dangerous</span>
        <span>100% Critical</span>
      </div>
    </div>
  );
}

function AnalysisResult({
  analysis,
  showDetails,
  setShowDetails
}: {
  analysis: PhishingAnalysis;
  showDetails: boolean;
  setShowDetails: (show: boolean) => void;
}) {
  const getResultStyle = () => {
    if (analysis.risk_category === 'critical') {
      return { bg: 'bg-red-500/20', border: 'border-red-500/50', icon: AlertOctagon, color: 'text-red-500' };
    }
    if (analysis.is_phishing || analysis.recommendation === 'block') {
      return { bg: 'bg-destructive/10', border: 'border-destructive/30', icon: XCircle, color: 'text-destructive' };
    }
    if (analysis.recommendation === 'caution') {
      return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertTriangle, color: 'text-yellow-600' };
    }
    return { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: CheckCircle, color: 'text-green-600' };
  };

  const style = getResultStyle();
  const Icon = style.icon;

  // Group factors by category
  const factorsByCategory = analysis.factors.reduce((acc, factor) => {
    if (!acc[factor.category]) acc[factor.category] = [];
    acc[factor.category].push(factor);
    return acc;
  }, {} as Record<string, PhishingFactor[]>);

  const categoryLabels: Record<string, string> = {
    url_structure: 'URL Structure',
    domain: 'Domain Analysis',
    content: 'Content Analysis',
    technical: 'Technical Checks',
    blacklist: 'Blacklist Match',
  };

  return (
    <div className="space-y-4">
      {/* Main Result Card */}
      <div className={`p-5 rounded-xl border-2 ${style.bg} ${style.border}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${style.bg}`}>
            <Icon className={`h-8 w-8 ${style.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h4 className={`text-lg font-bold ${style.color}`}>
                {analysis.risk_category === 'critical'
                  ? '🚨 CRITICAL THREAT!'
                  : analysis.is_phishing
                    ? 'Phishing Detected!'
                    : analysis.recommendation === 'caution'
                      ? 'Proceed with Caution'
                      : 'Appears Safe'}
              </h4>
              <Badge variant="outline" className="font-mono">
                {analysis.threat_type.toUpperCase()}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-4">{analysis.explanation}</p>

            {/* Risk Meter */}
            <RiskMeter score={analysis.risk_score} category={analysis.risk_category} />
          </div>
        </div>
      </div>

      {/* Domain Info */}
      {analysis.domain_analysis.legitimate_domain && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Impersonation Warning</p>
            <p className="text-sm text-muted-foreground">
              This site may be impersonating <strong>{analysis.domain_analysis.legitimate_domain}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Detailed Breakdown Toggle */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
        {showDetails ? 'Hide' : 'Show'} Detailed Analysis ({analysis.factors.length} checks)
      </Button>

      {/* Detailed Factors */}
      {showDetails && analysis.factors.length > 0 && (
        <div className="space-y-4 pt-2">
          {Object.entries(factorsByCategory).map(([category, factors]) => (
            <div key={category} className="space-y-2">
              <h5 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4" />
                {categoryLabels[category] || category}
              </h5>
              <div className="space-y-2">
                {factors.map((factor, i) => (
                  <FactorCard key={i} factor={factor} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-2xl font-bold text-foreground">{analysis.factors.filter(f => f.impact > 0.3).length}</p>
          <p className="text-xs text-muted-foreground">Risk Factors</p>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-2xl font-bold text-foreground">{analysis.factors.filter(f => f.impact <= 0.3).length}</p>
          <p className="text-xs text-muted-foreground">Safe Factors</p>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-2xl font-bold text-foreground">{Math.round((1 - analysis.risk_score) * 100)}%</p>
          <p className="text-xs text-muted-foreground">Safety Score</p>
        </div>
      </div>
    </div>
  );
}

function FactorCard({ factor }: { factor: PhishingFactor }) {
  const isRisk = factor.impact > 0.3;
  const impactLabel = factor.impact > 0.6 ? 'high' : factor.impact > 0.3 ? 'medium' : 'low';
  const impactColor = impactLabel === 'high'
    ? 'text-destructive'
    : impactLabel === 'medium'
      ? 'text-yellow-600'
      : 'text-muted-foreground';

  return (
    <div className={`p-3 rounded-lg border ${isRisk ? 'bg-destructive/5 border-destructive/20' : 'bg-green-500/5 border-green-500/20'}`}>
      <div className="flex items-start gap-2">
        {isRisk ? (
          <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{factor.name}</p>
            <Badge variant="outline" className={`text-xs ${impactColor}`}>
              {impactLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{factor.description}</p>
        </div>
      </div>
    </div>
  );
}

function ScanHistory({ history, isLoading }: { history: ScanHistoryItem[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground mt-2">Loading history...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No scan history yet</p>
        <p className="text-sm mt-1">Your scanned URLs will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {history.map((item) => {
        const riskPercentage = Math.round(item.risk_score * 100);
        const riskColor = riskPercentage >= 60 ? 'text-destructive' : riskPercentage >= 30 ? 'text-yellow-600' : 'text-green-600';

        return (
          <div key={item.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {item.is_phishing ? (
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono truncate">{item.url}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${riskColor}`}>
                  {riskPercentage}%
                </span>
                <a
                  href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
