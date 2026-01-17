import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ForgotPasswordFormProps {
    onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
    const { resetPassword } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [email, setEmail] = useState('');

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            z.string().email('Please enter a valid email address').parse(email);
        } catch (err) {
            if (err instanceof z.ZodError) {
                toast({
                    title: 'Validation Error',
                    description: err.errors[0].message,
                    variant: 'destructive',
                });
                return;
            }
        }

        setIsSubmitting(true);
        const { error } = await resetPassword(email);
        setIsSubmitting(false);

        if (error) {
            toast({
                title: 'Reset Failed',
                description: error.message,
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'Reset Link Sent',
                description: 'Check your email for a password reset link.',
            });
            onBack();
        }
    };

    return (
        <form onSubmit={handleForgotPassword}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-foreground">Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="forgot-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 bg-secondary border-border"
                            required
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
                <Button
                    type="submit"
                    className="w-full gradient-bg text-primary-foreground font-medium"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        'Send Reset Link'
                    )}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={onBack}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                </Button>
            </CardFooter>
        </form>
    );
}
