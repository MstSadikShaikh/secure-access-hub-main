import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardCard } from '@/components/DashboardCard';
import { useContacts } from '@/hooks/useContacts';
import { useAlerts } from '@/hooks/useAlerts';
import { ShieldCheck, AlertTriangle, Lock, Activity, Info, ExternalLink, Bot, Shield } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InstallPWAGuide } from '@/components/InstallPWAGuide';
import { cn } from '@/lib/utils';

export default function UserDashboard() {
  const navigate = useNavigate();
  const { contacts } = useContacts();
  const { unreadCount, alerts } = useAlerts();

  const trustedContacts = contacts.filter(c => c.status === 'trusted').length;
  const highRiskAlerts = alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length;

  // Calculate a mock security score
  const securityScore = Math.max(0, 100 - (highRiskAlerts * 10) - (unreadCount * 2));

  // Fraud Awareness Tips
  const securityTips = [
    {
      title: "UPI Pin Safety",
      description: "Never share your UPI PIN with anyone. PIN is only for sending money, not receiving."
    },
    {
      title: "Beware of Screen Sharing",
      description: "Fraudsters use apps like AnyDesk/TeamViewer to steal data. Never install these for strangers."
    },
    {
      title: "Verifying QR Codes",
      description: "Scanning a QR code is ONLY for paying money. If asked to scan for prizes, it's a scam."
    }
  ];

  return (
    <DashboardLayout variant="user">
      <div className="p-8 space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Security Command Center</h1>
            <p className="text-muted-foreground">Monitor threats, manage defenses, and stay informed.</p>
          </div>
          <div className="flex-shrink-0">
            <InstallPWAGuide triggerClassName="w-auto justify-center text-foreground font-medium border-primary/50 hover:bg-primary/5 hover:text-primary" />
          </div>
        </div>

        {/* Top Level Metrics - Strictly Security Focused */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardCard title="Security Accuracy" icon={<ShieldCheck className="h-6 w-6 text-primary" />}>
            <div className="mt-4 space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-4xl font-display font-bold text-primary">{securityScore}</span>
                <span className="text-sm text-muted-foreground mb-1">/ 100</span>
              </div>
              <Progress value={securityScore} className="h-2 bg-secondary" />
            </div>
          </DashboardCard>

          <DashboardCard title="Active Threats" icon={<AlertTriangle className={`h-6 w-6 ${highRiskAlerts > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />}>
            <p className={`text-3xl font-display font-bold mt-2 ${highRiskAlerts > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {highRiskAlerts}
            </p>
            <p className="text-sm text-muted-foreground mt-1">High severity alerts detected</p>
          </DashboardCard>

          <DashboardCard title="Trusted Contacts" icon={<Lock className="h-6 w-6 text-blue-500" />}>
            <p className="text-3xl font-display font-bold text-foreground mt-2">{trustedContacts}</p>
            <p className="text-sm text-muted-foreground mt-1">Entities whitelisted</p>
          </DashboardCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Security Visual Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-600" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Threat Detection Activity
                </CardTitle>
                <CardDescription>Real-time analysis of potential security risks over the last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full bg-secondary/10 rounded-lg flex items-end justify-between p-4 gap-2 border border-border/20 shadow-inner">
                  {/* Mock Bar Chart Visuals with dynamic colors */}
                  {[40, 20, 55, 30, 70, 45, 60, 25, 10, 35, 50, 65, 30, 45, 20, 35, 15, 40, 60, 30, 50, 75, 40, 25].map((h, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-full transition-all duration-500 rounded-t-md relative group cursor-pointer",
                        h > 60 ? "bg-gradient-to-t from-destructive/40 to-destructive hover:to-destructive/80" :
                          h > 40 ? "bg-gradient-to-t from-yellow-500/40 to-yellow-500 hover:to-yellow-500/80" :
                            "bg-gradient-to-t from-primary/40 to-primary hover:to-primary/80"
                      )}
                      style={{ height: `${h}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 py-1 px-2 bg-popover rounded border border-border shadow-md text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                        {h === 75 || h === 70 ? 'CRITICAL' : h > 50 ? 'WARNING' : 'STABLE'}: {h}%
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>Now</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  {alerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="mb-4 last:mb-0 p-3 rounded-lg bg-secondary/30 border border-border/50 flex gap-3">
                      <div className={`mt-1 h-2 w-2 rounded-full ${alert.severity === 'high' ? 'bg-destructive' : 'bg-yellow-500'}`} />
                      <div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No security alerts found.
                    </div>
                  )}
                  <Button variant="link" className="px-0 text-xs w-full text-center" onClick={() => navigate('/dashboard/alerts')}>
                    View all alerts
                  </Button>
                </CardContent>
              </Card>

              <Card className="h-full bg-gradient-to-br from-indigo-900/10 to-purple-900/10 border-indigo-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bot className="h-5 w-5 text-indigo-500" />
                    AI Sentinel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Auto-Block</p>
                      <p className="text-xs text-muted-foreground">Enabled for suspect UPIs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Behavioral Analysis</p>
                      <p className="text-xs text-muted-foreground">Learning patterns</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/dashboard/assistant')}>
                    Ask Security Assistant
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar / Right Panel */}
          <div className="space-y-6">
            {/* Fraud Awareness Section */}
            <Card className="border-l-4 border-l-yellow-500 shadow-sm h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5 text-yellow-500" />
                  Security Insights
                </CardTitle>
                <CardDescription>Latest fraud trends & protection tips</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {securityTips.map((tip, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="font-bold text-yellow-500 opacity-50">{i + 1}</span>
                    <div>
                      <h4 className="text-sm font-medium text-foreground">{tip.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{tip.description}</p>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-semibold transition-all hover:scale-[1.02]"
                  onClick={() => window.open('https://rbikehtahai.rbi.org.in/', '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Learn More at RBI
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
