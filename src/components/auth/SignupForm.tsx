import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { User, Mail, Lock, Eye, EyeOff, Loader2, KeyRound, Check, ArrowLeft } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

// Allowed email domains
const ALLOWED_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'protonmail.com'];

// Email validation with domain restriction
const emailSchema = z.string()
    .email('Please enter a valid email address')
    .refine((email) => {
        const domain = email.split('@')[1]?.toLowerCase();
        return ALLOWED_DOMAINS.includes(domain);
    }, {
        message: `Email must be from: ${ALLOWED_DOMAINS.join(', ')}`
    });

// Strong password validation
const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

function calculatePasswordStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 20;

    if (score < 40) return { score, label: 'Weak', color: 'bg-destructive' };
    if (score < 70) return { score, label: 'Medium', color: 'bg-warning' };
    if (score < 90) return { score, label: 'Strong', color: 'bg-info' };
    return { score, label: 'Very Strong', color: 'bg-success' };
}

type SignupStep = 'credentials' | 'otp' | 'complete';

export function SignupForm({ onComplete, onSwitchToLogin }: { onComplete: () => void, onSwitchToLogin: () => void }) {
    const { signUp } = useAuth();
    const { toast } = useToast();

    const [step, setStep] = useState<SignupStep>('credentials');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [otp, setOtp] = useState('');

    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const passwordStrength = calculatePasswordStrength(password);
    const passwordChecks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const sendOtp = async () => {
        try {
            emailSchema.parse(email);
            passwordSchema.parse(password);
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

        setIsSendingOtp(true);

        try {
            const response = await supabase.functions.invoke('send-otp', {
                body: { email, name: name || 'User' }
            });

            if (response.error) throw new Error(response.error.message);
            if (response.data?.error) throw new Error(response.data.error);

            setStep('otp');
            toast({
                title: 'OTP Sent',
                description: 'Please check your email for the verification code.',
            });
        } catch (error) {
            toast({
                title: 'Failed to Send OTP',
                description: error instanceof Error ? error.message : 'Please try again',
                variant: 'destructive',
            });
        } finally {
            setIsSendingOtp(false);
        }
    };

    const verifyOtpAndSignup = async () => {
        if (otp.length !== 6) {
            toast({
                title: 'Invalid OTP',
                description: 'Please enter the 6-digit code',
                variant: 'destructive',
            });
            return;
        }

        setIsVerifyingOtp(true);

        try {
            const response = await supabase.functions.invoke('verify-otp', {
                body: { email, otp }
            });

            if (response.error) throw new Error(response.error.message);
            if (!response.data?.valid) throw new Error(response.data?.error || 'Invalid or expired OTP.');

            const { error: signupError } = await signUp(email, password, name);

            if (signupError) {
                if (signupError.message.includes('already registered')) {
                    toast({
                        title: 'Account Exists',
                        description: 'This email is already registered. Please sign in instead.',
                        variant: 'destructive',
                    });
                    onSwitchToLogin();
                } else {
                    throw signupError;
                }
            } else {
                setStep('complete');
                toast({
                    title: 'Account Created',
                    description: 'Welcome! You are now signed in.',
                });
                onComplete();
            }
        } catch (error) {
            toast({
                title: 'Verification Failed',
                description: error instanceof Error ? error.message : 'Please try again',
                variant: 'destructive',
            });
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    if (step === 'credentials') {
        return (
            <div>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-foreground">Full Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="signup-name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="pl-10 bg-secondary border-border"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="signup-email"
                                type="email"
                                placeholder="you@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 bg-secondary border-border"
                                required
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Allowed: {ALLOWED_DOMAINS.join(', ')}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-foreground">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="signup-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 pr-10 bg-secondary border-border"
                                required
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>

                        {password && (
                            <PasswordStrengthIndicator
                                passwordStrength={passwordStrength}
                                passwordChecks={passwordChecks}
                            />
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        type="button"
                        onClick={sendOtp}
                        className="w-full gradient-bg text-primary-foreground font-medium"
                        disabled={isSendingOtp || !email || !password}
                    >
                        {isSendingOtp ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending OTP...
                            </>
                        ) : (
                            <>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Verification Code
                            </>
                        )}
                    </Button>
                </CardFooter>
            </div>
        );
    }

    return (
        <div>
            <CardContent className="space-y-6">
                <div className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <KeyRound className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Enter the 6-digit code sent to<br />
                        <span className="font-medium text-foreground">{email}</span>
                    </p>
                </div>

                <div className="flex justify-center">
                    <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={setOtp}
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>

                <div className="text-center">
                    <Button
                        type="button"
                        variant="link"
                        className="text-sm text-muted-foreground"
                        onClick={sendOtp}
                        disabled={isSendingOtp}
                    >
                        {isSendingOtp ? 'Sending...' : 'Resend Code'}
                    </Button>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
                <Button
                    type="button"
                    onClick={verifyOtpAndSignup}
                    className="w-full gradient-bg text-primary-foreground font-medium"
                    disabled={isVerifyingOtp || otp.length !== 6}
                >
                    {isVerifyingOtp ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        <>
                            <Check className="mr-2 h-4 w-4" />
                            Verify & Create Account
                        </>
                    )}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setStep('credentials')}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </CardFooter>
        </div>
    );
}
