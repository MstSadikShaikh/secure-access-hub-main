import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface LoginFormProps {
    onForgotPassword: () => void;
}

export function LoginForm({ onForgotPassword }: LoginFormProps) {
    const { signIn } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            z.string().email('Please enter a valid email address').parse(email);
            z.string().min(1, 'Password is required').parse(password);
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
        const { error } = await signIn(email, password);
        setIsSubmitting(false);

        if (error) {
            toast({
                title: 'Login Failed',
                description: error.message === 'Invalid login credentials'
                    ? 'Invalid email or password. Please try again.'
                    : error.message,
                variant: 'destructive',
            });
        }
    };

    return (
        <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-foreground">Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 bg-secondary border-border"
                            required
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-foreground">Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="login-password"
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
                </div>
                <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm text-muted-foreground hover:text-primary"
                    onClick={onForgotPassword}
                >
                    Forgot Password?
                </Button>
            </CardContent>
            <CardFooter>
                <Button
                    type="submit"
                    className="w-full gradient-bg text-primary-foreground font-medium"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                        </>
                    ) : (
                        'Sign In'
                    )}
                </Button>
            </CardFooter>
        </form>
    );
}
