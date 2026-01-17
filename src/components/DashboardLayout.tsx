import { ReactNode, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  Shield,
  User,
  LayoutDashboard,
  CreditCard,
  Bell,
  Bot,
  BarChart3,
  MapPin,
  AlertTriangle,
  PieChart,
  Menu,
  X,
  Settings,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOSButton } from '@/components/SOSButton';
import { InstallPWAGuide } from '@/components/InstallPWAGuide';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardLayoutProps {
  children: ReactNode;
  variant: 'user' | 'admin';
}

const userNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Wallet, label: 'Wallet', href: '/dashboard/wallet' },
  { icon: Bell, label: 'Alerts', href: '/dashboard/alerts' },
  { icon: Shield, label: 'Security Tools', href: '/dashboard/security' },
  { icon: Bot, label: 'AI Assistant', href: '/dashboard/assistant' },
];

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: PieChart, label: 'Fraud Statistics', href: '/admin/fraud-stats' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: MapPin, label: 'Heatmaps', href: '/admin/heatmaps' },
  { icon: AlertTriangle, label: 'Reported Cases', href: '/admin/cases' },
  { icon: User, label: 'Users', href: '/admin/users' },
  { icon: Bell, label: 'SOS Alerts', href: '/admin/sos' },
  { icon: Shield, label: 'Blacklist', href: '/admin/blacklist' },
];

export function DashboardLayout({ children, variant }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = variant === 'admin' ? adminNavItems : userNavItems;
  const portalTitle = variant === 'admin' ? 'Admin Portal' : 'User Portal';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <span className="font-display font-bold text-lg leading-none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
                  Fraud Guard AI
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Account Dropdown */}
          <div className="hidden md:flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-full rounded-full p-0 hover:bg-transparent -mr-2">
                  <div className="flex items-center gap-3 pr-2">
                    <div className="text-right hidden lg:block">
                      <p className="text-sm font-medium leading-none">{user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-1 text-right">{role} Account</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center border border-border shadow-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.email}</p>
                    <p className="text-xs text-muted-foreground">{role} Account</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile & Security</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/dashboard/sos-settings')}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    <span>SOS & Emergency</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="container py-4 space-y-4 px-4">
              <nav className="flex flex-col space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-border pt-4">
                <div className="mb-4">
                  <InstallPWAGuide />
                </div>
                <div className="flex items-center gap-3 px-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{role} Account</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto container px-4 py-6">
        {children}
      </main>

      {/* Floating SOS Button */}
      {variant === 'user' && <SOSButton />}
    </div>
  );
}
