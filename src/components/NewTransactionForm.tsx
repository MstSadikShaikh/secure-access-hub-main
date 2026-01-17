import { useState, useEffect } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { usePreTransactionAnalysis, PreAnalysisResult } from '@/hooks/usePreTransactionAnalysis';
import { useContacts } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2, Shield, ArrowLeft, AlertTriangle, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { TransactionRiskWarning } from './TransactionRiskWarning';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QRScanner } from './QRScanner';
import { getDeviceInfo } from '@/lib/device-fingerprint';
import { getCurrentLocation } from '@/lib/geolocation';

const transactionSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(10000000, 'Amount too large'),
  receiver_upi_id: z.string()
    .min(1, 'UPI ID is required')
    .max(100, 'UPI ID too long')
    .regex(/^([\w.-]+@[\w]+|\d{10})$/, 'Invalid UPI ID format (name@upi) or Mobile Number (10 digits)'),
});

type FormStep = 'input' | 'analyzing' | 'warning' | 'confirming';

interface NewTransactionFormProps {
  trigger?: React.ReactNode;
  onSuccess?: (amount: number, upiId?: string) => void;
  isWalletFrozen?: boolean;
  defaultUpi?: string;
  defaultAmount?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  currentBalance?: number;
}

export function NewTransactionForm({
  trigger,
  onSuccess,
  isWalletFrozen = false,
  defaultUpi = '',
  defaultAmount = '',
  open: controlledOpen,
  onOpenChange,
  currentBalance
}: NewTransactionFormProps) {
  const { createTransaction } = useTransactions();
  const { analyzeTransaction, isAnalyzing, reset: resetAnalysis } = usePreTransactionAnalysis();
  const { contacts } = useContacts();
  const { user } = useAuth();
  const { toast } = useToast();

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const [step, setStep] = useState<FormStep>('input');
  const [amount, setAmount] = useState(defaultAmount);
  const [upiId, setUpiId] = useState(defaultUpi);  // Sync with props when they change (e.g. from QR scan)
  useEffect(() => {
    setAmount(defaultAmount);
    setUpiId(defaultUpi);
  }, [defaultAmount, defaultUpi]);

  const [analysisResult, setAnalysisResult] = useState<PreAnalysisResult | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleQRScan = (data: string, parsed?: { upiId?: string; name?: string; amount?: number; note?: string; isUPI: boolean }) => {
    if (parsed?.isUPI && parsed.upiId) {
      setUpiId(parsed.upiId);
      if (parsed.amount) {
        setAmount(parsed.amount.toString());
      }
      toast({
        title: 'QR Scanned',
        description: `Filled UPI: ${parsed.upiId}`,
      });
    } else {
      toast({
        title: 'Invalid QR',
        description: 'QR code does not contain UPI payment details',
        variant: 'destructive',
      });
    }
    setShowQRScanner(false);
  };

  const resetForm = () => {
    if (!defaultAmount) setAmount('');
    if (!defaultUpi) setUpiId('');
    setStep('input');
    setAnalysisResult(null);
    resetAnalysis();
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(resetForm, 200);
  };

  // Auto-save contact based on analysis result
  const autoSaveContact = async (upi: string, riskLevel: string) => {
    if (!user) return;

    const existingContact = contacts.find(c => c.upi_id.toLowerCase() === upi.toLowerCase());

    let contactStatus: 'trusted' | 'new' | 'flagged';

    if (riskLevel === 'danger' || riskLevel === 'critical') {
      contactStatus = 'flagged';
      // Add to blacklist for danger/critical
      if (riskLevel === 'critical') {
        await supabase.from('upi_blacklist').upsert({
          upi_id: upi.toLowerCase(),
          reason: 'Automatically flagged due to critical risk assessment',
          severity: 'high',
          source: 'auto_detection',
          reported_count: 1,
        }, { onConflict: 'upi_id' });
      }
    } else if (riskLevel === 'safe' && existingContact) {
      contactStatus = 'trusted';
    } else {
      contactStatus = 'new';
    }

    if (existingContact) {
      // Update existing contact status
      await supabase
        .from('trusted_contacts')
        .update({ status: contactStatus })
        .eq('id', existingContact.id);
    } else {
      // Create new contact
      await supabase.from('trusted_contacts').insert({
        user_id: user.id,
        upi_id: upi.toLowerCase(),
        status: contactStatus,
        contact_name: null,
      });
    }
  };

  const handleAnalyze = async () => {
    if (isWalletFrozen) {
      toast({
        title: 'Wallet Frozen',
        description: 'You cannot make payments while your wallet is frozen.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const data = transactionSchema.parse({
        amount: parseFloat(amount),
        receiver_upi_id: upiId.trim(),
      });

      if (currentBalance !== undefined && data.amount > currentBalance) {
        toast({
          title: "Insufficient Funds",
          description: `Your wallet balance (₹${currentBalance}) is insufficient for this transaction.`,
          variant: "destructive"
        });
        return;
      }

      setStep('analyzing');

      let location = null;
      let deviceInfo = null;

      try {
        deviceInfo = getDeviceInfo();
      } catch (e) {
        console.warn('Failed to get device info', e);
      }

      try {
        // Quick timeout for location to avoid stalling UI
        location = await Promise.race([
          getCurrentLocation(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
        ]);
      } catch (e) {
        console.warn('Failed to get location', e);
      }

      const result = await analyzeTransaction.mutateAsync({
        amount: data.amount,
        receiverUpi: data.receiver_upi_id,
        localHour: new Date().getHours(),
        location,
        deviceInfo,
      });

      setAnalysisResult(result);

      if (result.risk_level === 'safe') {
        setStep('confirming');
      } else {
        setStep('warning');
      }
    } catch (err) {
      setStep('input');
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Analysis Failed',
          description: err instanceof Error ? err.message : 'Failed to analyze transaction',
          variant: 'destructive',
        });
      }
    }
  };

  const handleProceed = async () => {
    setStep('confirming');

    try {
      const data = transactionSchema.parse({
        amount: parseFloat(amount),
        receiver_upi_id: upiId.trim(),
      });

      await createTransaction.mutateAsync({
        amount: data.amount,
        receiver_upi_id: data.receiver_upi_id,
        status: 'completed',
      });

      // Auto-save contact based on risk level
      if (analysisResult) {
        await autoSaveContact(data.receiver_upi_id, analysisResult.risk_level);
      }

      toast({
        title: 'Transaction Created',
        description: `₹${data.amount} sent to ${data.receiver_upi_id}`,
      });

      if (onSuccess) {
        onSuccess(data.amount, data.receiver_upi_id);
      }

      handleClose();
    } catch (err) {
      setStep('warning');
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleBack = () => {
    setStep('input');
    setAnalysisResult(null);
    resetAnalysis();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(newOpen) => {
      if (!newOpen) handleClose();
      setOpen(newOpen);
    }}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ? trigger : (
            <Button className="gradient-bg text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              New Transaction
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            {step === 'input' && 'New Transaction'}
            {step === 'analyzing' && (
              <>
                <Shield className="h-5 w-5 text-primary animate-pulse" />
                Analyzing Transaction
              </>
            )}
            {step === 'warning' && (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Risk Warning
              </>
            )}
            {step === 'confirming' && 'Confirm Transaction'}
          </DialogTitle>
          <DialogDescription>
            {step === 'input' && 'Enter transaction details for AI fraud analysis'}
            {step === 'analyzing' && 'Our AI is analyzing 5 key security factors...'}
            {step === 'warning' && 'Review the risk analysis before proceeding'}
            {step === 'confirming' && 'Processing your transaction...'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Input Form */}
        {step === 'input' && (
          <div className="space-y-4 py-4">
            {showQRScanner ? (
              <div className="space-y-4">
                <QRScanner onScan={handleQRScan} />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowQRScanner(false)}
                >
                  Cancel Scan
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="upi-id">Receiver UPI ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="upi-id"
                      placeholder="name@upi or Mobile Number"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="bg-secondary border-border font-mono flex-1"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowQRScanner(true)}
                      title="Scan QR Code"
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-secondary border-border"
                    required
                  />
                  {currentBalance !== undefined && (
                    <p className="text-xs text-muted-foreground text-right">Available: ₹{currentBalance}</p>
                  )}
                </div>

                {/* Analysis Preview */}
                <div className="bg-muted/30 rounded-md p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">AI will analyze:</p>
                  <div className="grid grid-cols-2 gap-1">
                    <span>• New contact check</span>
                    <span>• Time pattern</span>
                    <span>• Suspicious UPI ID</span>
                    <span>• Suspicious keywords</span>
                    <span>• Blacklist check</span>
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="border-border"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAnalyze}
                    className="gradient-bg text-primary-foreground"
                    disabled={!amount || !upiId}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Check & Pay
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        )}

        {/* Step 2: Analyzing */}
        {step === 'analyzing' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative bg-primary/10 rounded-full p-4">
                <Shield className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">Analyzing Transaction</p>
              <p className="text-sm text-muted-foreground">
                Running 5 security checks...
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground w-full max-w-xs">
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                New contact
              </div>
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                Time pattern
              </div>
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                Suspicious UPI
              </div>
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                Keywords
              </div>
              <div className="flex items-center gap-1.5 col-span-2 justify-center">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                Blacklist
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Warning */}
        {step === 'warning' && analysisResult && (
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <TransactionRiskWarning
              analysis={analysisResult}
              amount={parseFloat(amount)}
              receiverUpi={upiId}
            />
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="border-border w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-border w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceed}
                variant={analysisResult.risk_level === 'danger' || analysisResult.risk_level === 'critical' ? 'destructive' : 'default'}
                className={analysisResult.risk_level !== 'danger' && analysisResult.risk_level !== 'critical' ? 'gradient-bg text-primary-foreground' : ''}
                disabled={createTransaction.isPending || analysisResult.risk_level === 'critical'}
              >
                {createTransaction.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : analysisResult.risk_level === 'critical' ? (
                  'Transaction Blocked'
                ) : (
                  <>
                    {analysisResult.risk_level === 'danger' ? 'Proceed Anyway' : 'Confirm & Pay'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Confirming (for safe transactions) */}
        {step === 'confirming' && analysisResult?.risk_level === 'safe' && (
          <div className="py-4 space-y-4">
            <TransactionRiskWarning
              analysis={analysisResult}
              amount={parseFloat(amount)}
              receiverUpi={upiId}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="border-border"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button
                onClick={handleProceed}
                className="gradient-bg text-primary-foreground"
                disabled={createTransaction.isPending}
              >
                {createTransaction.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm & Pay'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
