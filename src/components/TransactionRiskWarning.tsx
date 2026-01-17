import { PreAnalysisResult } from '@/hooks/usePreTransactionAnalysis';
import {
  Shield,
  ShieldAlert,
  ShieldX,
  ShieldBan,
  AlertTriangle,
  UserCheck,
  UserX,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileWarning,
  Ban,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface TransactionRiskWarningProps {
  analysis: PreAnalysisResult;
  amount: number;
  receiverUpi: string;
}

export function TransactionRiskWarning({
  analysis,
  amount,
  receiverUpi,
}: TransactionRiskWarningProps) {
  const getRiskConfig = () => {
    switch (analysis.risk_level) {
      case 'safe':
        return {
          icon: Shield,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          progressColor: 'bg-green-500',
          title: 'Transaction Looks Safe',
          description: 'No significant risk factors detected.',
        };
      case 'warning':
        return {
          icon: ShieldAlert,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          progressColor: 'bg-yellow-500',
          title: 'Proceed with Caution',
          description: 'Some risk factors detected. Please verify before proceeding.',
        };
      case 'danger':
        return {
          icon: ShieldX,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30',
          progressColor: 'bg-orange-500',
          title: 'High Risk Detected',
          description: 'This transaction has significant risk factors.',
        };
      case 'critical':
        return {
          icon: ShieldBan,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          progressColor: 'bg-red-500',
          title: 'Critical Risk - Block Recommended',
          description: 'Multiple severe risk factors detected. We strongly advise against this transaction.',
        };
      default:
        return {
          icon: Shield,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-border',
          progressColor: 'bg-muted',
          title: 'Risk Analysis',
          description: 'Analysis complete.',
        };
    }
  };

  const getContactIcon = () => {
    switch (analysis.contact_status) {
      case 'trusted':
        return { icon: UserCheck, color: 'text-green-500', label: 'Trusted Contact' };
      case 'flagged':
        return { icon: UserX, color: 'text-red-500', label: 'Flagged Contact' };
      default:
        return { icon: User, color: 'text-yellow-500', label: 'New Recipient' };
    }
  };

  const getBehaviorCheckStatus = (flagName: keyof typeof analysis.behavior_flags) => {
    if (!analysis.behavior_flags) return null;
    return analysis.behavior_flags[flagName];
  };

  const config = getRiskConfig();
  const contactConfig = getContactIcon();
  const IconComponent = config.icon;
  const ContactIcon = contactConfig.icon;

  // Updated behavior checks - only 5 essential checks
  const behaviorChecks = [
    {
      key: 'newContact' as const,
      label: 'Contact Check',
      icon: UserPlus,
      passMessage: 'Known contact',
      failMessage: 'New recipient',
    },
    {
      key: 'timeAnomaly' as const,
      label: 'Time Pattern',
      icon: Clock,
      passMessage: 'Usual hours',
      failMessage: 'Unusual time (12AM-5AM)',
    },
    {
      key: 'suspiciousUpi' as const,
      label: 'UPI Pattern',
      icon: AlertCircle,
      passMessage: 'Pattern looks safe',
      failMessage: 'Suspicious UPI pattern',
    },
    {
      key: 'suspiciousKeywords' as const,
      label: 'Keywords Check',
      icon: FileWarning,
      passMessage: 'No scam keywords',
      failMessage: 'Contains suspicious keywords',
    },
    {
      key: 'isBlacklisted' as const,
      label: 'Blacklist Check',
      icon: Ban,
      passMessage: 'Not in fraud database',
      failMessage: 'Found in blacklist!',
    },
  ];

  const riskPercentage = Math.round(analysis.risk_score * 100);

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        config.bgColor,
        config.borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-full', config.bgColor)}>
          <IconComponent className={cn('h-6 w-6', config.color)} />
        </div>
        <div className="flex-1">
          <h3 className={cn('font-semibold', config.color)}>{config.title}</h3>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        <div className="text-right">
          <div className={cn('text-2xl font-bold', config.color)}>
            {riskPercentage}%
          </div>
          <div className="text-xs text-muted-foreground">Risk Score</div>
        </div>
      </div>

      {/* Risk Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Safe</span>
          <span>Warning</span>
          <span>Danger</span>
          <span>Critical</span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-500', config.progressColor)}
            style={{ width: `${riskPercentage}%` }}
          />
          {/* Threshold markers */}
          <div className="absolute top-0 left-[30%] w-px h-full bg-background/50" />
          <div className="absolute top-0 left-[60%] w-px h-full bg-background/50" />
          <div className="absolute top-0 left-[80%] w-px h-full bg-background/50" />
        </div>
      </div>

      {/* Transaction Summary */}
      <div className="bg-background/50 rounded-md p-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className="font-mono font-medium">₹{amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Recipient</span>
          <span className="font-mono text-sm truncate max-w-[150px] text-right">{receiverUpi}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Contact Status</span>
          <div className="flex items-center gap-1.5">
            <ContactIcon className={cn('h-4 w-4', contactConfig.color)} />
            <span className={cn('text-sm font-medium', contactConfig.color)}>
              {analysis.contact_name || contactConfig.label}
            </span>
          </div>
        </div>
        {analysis.profile_stats && (
          <div className="flex justify-between items-center pt-1 border-t border-border/50">
            <span className="text-sm text-muted-foreground">Your avg transaction</span>
            <span className="font-mono text-sm text-muted-foreground">
              ₹{analysis.profile_stats.avg_amount.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Behavior Analysis Panel */}
      {analysis.behavior_flags && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            Behavior Analysis
          </p>
          <div className="grid grid-cols-2 gap-2">
            {behaviorChecks.map((check) => {
              const isAnomaly = getBehaviorCheckStatus(check.key);
              if (isAnomaly === null) return null;

              const CheckIcon = check.icon;
              return (
                <div
                  key={check.key}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md text-xs',
                    isAnomaly
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-green-500/10 text-green-400'
                  )}
                >
                  {isAnomaly ? (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <CheckIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="truncate">
                    {isAnomaly ? check.failMessage : check.passMessage}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Impersonation Warning */}
      {analysis.impersonation_warning && analysis.similar_contacts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-500">⚠️ Potential Impersonation</p>
            <p className="text-xs text-muted-foreground">
              This UPI ID is similar to your trusted contacts:{' '}
              <span className="font-mono">{analysis.similar_contacts.join(', ')}</span>
            </p>
          </div>
        </div>
      )}

      {/* Risk Reasons */}
      {analysis.reasons.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Analysis Details</p>
          <ul className="space-y-1.5">
            {analysis.reasons.map((reason, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className={cn(
                  'mt-1.5 h-1.5 w-1.5 rounded-full shrink-0',
                  reason.startsWith('✓') || reason.startsWith('✔')
                    ? 'bg-green-500'
                    : reason.startsWith('⚠️') || reason.startsWith('⚠')
                      ? 'bg-red-500'
                      : config.color.replace('text-', 'bg-')
                )} />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
