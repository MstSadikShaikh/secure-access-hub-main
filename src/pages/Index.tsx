import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, Lock, Users, Zap, Loader2 } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (user && role && !loading) {
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-info/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center glow">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">Fraud Guard AI</span>
        </div>
        <Link to="/auth">
          <Button variant="outline" className="border-primary/30 text-foreground hover:bg-primary/10">
            Sign In
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-8 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-8 animate-fade-in">
            <Lock className="h-4 w-4" />
            Enterprise-grade security
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6 animate-slide-up">
            Secure Access
            <br />
            <span className="gradient-text">Role-Based Control</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Advanced authentication system with separate portals for users and administrators. 
            Protect your data with military-grade security.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/auth">
              <Button size="lg" className="gradient-bg text-primary-foreground font-medium text-lg px-8 py-6 glow">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
          {[
            {
              icon: Lock,
              title: 'Secure Authentication',
              description: 'Multi-factor authentication with encrypted sessions and secure password policies.',
            },
            {
              icon: Users,
              title: 'Role-Based Access',
              description: 'Separate portals for users and admins with granular permission controls.',
            },
            {
              icon: Zap,
              title: 'Real-time Protection',
              description: 'Instant threat detection and automated security responses.',
            },
          ].map((feature, i) => (
            <div 
              key={i} 
              className="glass-card p-8 rounded-2xl animate-slide-up"
              style={{ animationDelay: `${0.3 + i * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
