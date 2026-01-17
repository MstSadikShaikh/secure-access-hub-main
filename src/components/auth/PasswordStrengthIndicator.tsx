import { Progress } from '@/components/ui/progress';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
    passwordStrength: {
        score: number;
        label: string;
        color: string;
    };
    passwordChecks: {
        length: boolean;
        uppercase: boolean;
        lowercase: boolean;
        number: boolean;
        special: boolean;
    };
}

export function PasswordStrengthIndicator({ passwordStrength, passwordChecks }: PasswordStrengthIndicatorProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Password Strength</span>
                <span className={`font-medium ${passwordStrength.label === 'Weak' ? 'text-destructive' :
                        passwordStrength.label === 'Medium' ? 'text-warning' :
                            passwordStrength.label === 'Strong' ? 'text-info' : 'text-success'
                    }`}>{passwordStrength.label}</span>
            </div>
            <Progress value={passwordStrength.score} className={`h-1.5 ${passwordStrength.color}`} />

            {/* Password Requirements */}
            <div className="grid grid-cols-2 gap-1 text-xs">
                <div className={`flex items-center gap-1 ${passwordChecks.length ? 'text-success' : 'text-muted-foreground'}`}>
                    {passwordChecks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    8+ characters
                </div>
                <div className={`flex items-center gap-1 ${passwordChecks.uppercase ? 'text-success' : 'text-muted-foreground'}`}>
                    {passwordChecks.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Uppercase
                </div>
                <div className={`flex items-center gap-1 ${passwordChecks.lowercase ? 'text-success' : 'text-muted-foreground'}`}>
                    {passwordChecks.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Lowercase
                </div>
                <div className={`flex items-center gap-1 ${passwordChecks.number ? 'text-success' : 'text-muted-foreground'}`}>
                    {passwordChecks.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Number
                </div>
                <div className={`flex items-center gap-1 ${passwordChecks.special ? 'text-success' : 'text-muted-foreground'}`}>
                    {passwordChecks.special ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Special char
                </div>
            </div>
        </div>
    );
}
