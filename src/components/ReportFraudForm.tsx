import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFraudReports, FraudCategory } from '@/hooks/useFraudReports';
import { useUpiBlacklist } from '@/hooks/useUpiBlacklist';
import { useEmailNotification } from '@/hooks/useEmailNotification';
import { useAuth } from '@/hooks/useAuth';
import { useTransactions } from '@/hooks/useTransactions';
import { Flag, Loader2, Mail, CheckCircle } from 'lucide-react';

const fraudCategories: { value: FraudCategory; label: string }[] = [
  { value: 'phishing', label: 'Phishing Attack' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'duplicate_id', label: 'Duplicate UPI ID' },
  { value: 'social_engineering', label: 'Social Engineering' },
  { value: 'fake_qr', label: 'Fake QR Code' },
  { value: 'suspicious_pattern', label: 'Suspicious Pattern' },
  { value: 'unknown', label: 'Other / Unknown' },
];

interface ReportFraudFormProps {
  initialUpiId?: string;
}

export function ReportFraudForm({ initialUpiId = '' }: ReportFraudFormProps) {
  const { user } = useAuth();
  const { createReport, isCreating } = useFraudReports();
  const { addToBlacklist, isAdding } = useUpiBlacklist();
  const { sendFraudReportEmail, isSending } = useEmailNotification();
  const { transactions } = useTransactions();

  const [upiId, setUpiId] = useState(initialUpiId);
  const [category, setCategory] = useState<FraudCategory>('unknown');
  const [description, setDescription] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const isSubmitting = isCreating || isAdding || isSending;

  // Get unique UPI IDs from recent transactions
  const uniqueRecentUpis = React.useMemo(() => {
    const upis = transactions?.map(t => t.receiver_upi_id) || [];
    return [...new Set(upis)];
  }, [transactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim() || isSubmitting) return;

    try {
      // 1. Create the fraud report
      createReport(
        {
          reported_upi_id: upiId.trim(),
          category,
          description: description.trim() || undefined,
        },
        {
          onSuccess: async () => {
            // 2. Add to blacklist
            addToBlacklist({
              upiId: upiId.trim(),
              reason: `${category}: ${description.trim() || 'User reported'}`,
              severity: 'medium',
            });

            // 3. Send email notification to admin
            try {
              await sendFraudReportEmail({
                upiId: upiId.trim(),
                category: fraudCategories.find(c => c.value === category)?.label || category,
                description: description.trim(),
                reporterEmail: user?.email || 'Unknown',
              });
              setEmailSent(true);
              setTimeout(() => setEmailSent(false), 3000);
            } catch (emailError) {
              console.error('Failed to send email notification:', emailError);
            }

            // Reset form
            setUpiId('');
            setCategory('unknown');
            setDescription('');
          },
        }
      );
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-destructive" />
          Report Fraud
        </CardTitle>
        <CardDescription>
          Report suspicious UPI IDs or fraudulent activity. Reports are sent to authorities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Suspicious UPI ID *</label>
            <Input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g., scammer@upi"
              required
              list="fraud-upi-suggestions"
            />
            <datalist id="fraud-upi-suggestions">
              {uniqueRecentUpis.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Fraud Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as FraudCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fraudCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened..."
              rows={3}
            />
          </div>

          {emailSent && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              Report sent to authorities for investigation
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting || !upiId.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Submit Report to Authorities
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
