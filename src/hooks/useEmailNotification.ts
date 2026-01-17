import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EmailContent {
  title: string;
  message: string;
  details?: Record<string, string>;
}

interface SendEmailParams {
  type: 'fraud_report' | 'user_alert';
  recipientEmail?: string;
  subject: string;
  content: EmailContent;
}

export function useEmailNotification() {
  const sendEmailMutation = useMutation({
    mutationFn: async (params: SendEmailParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send email');
      }

      return response.json();
    },
  });

  const sendFraudReportEmail = async (report: {
    upiId: string;
    category: string;
    description?: string;
    reporterEmail: string;
  }) => {
    return sendEmailMutation.mutateAsync({
      type: 'fraud_report',
      subject: `Fraud Report: ${report.upiId}`,
      content: {
        title: '🚨 New Fraud Report Submitted',
        message: 'A user has reported a potentially fraudulent UPI ID. Please investigate this case.',
        details: {
          'Reported UPI ID': report.upiId,
          'Category': report.category,
          'Description': report.description || 'No description provided',
          'Reporter Email': report.reporterEmail,
          'Reported At': new Date().toLocaleString(),
        },
      },
    });
  };

  const sendUserAlert = async (params: {
    recipientEmail: string;
    alertType: string;
    message: string;
    details?: Record<string, string>;
  }) => {
    return sendEmailMutation.mutateAsync({
      type: 'user_alert',
      recipientEmail: params.recipientEmail,
      subject: `Security Alert: ${params.alertType}`,
      content: {
        title: `⚠️ ${params.alertType}`,
        message: params.message,
        details: params.details,
      },
    });
  };

  return {
    sendFraudReportEmail,
    sendUserAlert,
    isSending: sendEmailMutation.isPending,
    error: sendEmailMutation.error,
  };
}
