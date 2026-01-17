import { Clock, ShieldAlert } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { RegionHeatmap } from '@/components/AnalyticsCharts';
import { Badge } from '@/components/ui/badge';

interface Alert {
    id: string;
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
}

interface AdminHeatmapsTabProps {
    alerts: Alert[];
}

export function AdminHeatmapsTab({ alerts }: AdminHeatmapsTabProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RegionHeatmap />
            <DashboardCard title="High-Risk Time Periods" icon={<Clock className="h-6 w-6" />}>
                <div className="mt-4 space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">
                        Time periods with elevated fraud activity based on historical data
                    </p>
                    {[
                        { time: '12:00 - 14:00', risk: 'High', transactions: 45, color: 'bg-destructive' },
                        { time: '18:00 - 21:00', risk: 'Critical', transactions: 78, color: 'bg-destructive' },
                        { time: '22:00 - 00:00', risk: 'Medium', transactions: 23, color: 'bg-warning' },
                        { time: '02:00 - 04:00', risk: 'Low', transactions: 8, color: 'bg-info' },
                    ].map((period) => (
                        <div key={period.time} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                            <div className="flex items-center gap-3">
                                <div className={`h-3 w-3 rounded-full ${period.color}`} />
                                <span className="font-medium">{period.time}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Badge variant="outline">{period.transactions} flagged</Badge>
                                <Badge variant={period.risk === 'Critical' ? 'destructive' : period.risk === 'High' ? 'destructive' : 'secondary'}>
                                    {period.risk}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </DashboardCard>

            <DashboardCard title="Recent Critical Alerts" icon={<ShieldAlert className="h-6 w-6" />}>
                <div className="mt-4 space-y-3">
                    {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 5).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No critical alerts</p>
                        </div>
                    ) : (
                        alerts
                            .filter(a => a.severity === 'critical' || a.severity === 'high')
                            .slice(0, 5)
                            .map((alert) => (
                                <div key={alert.id} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-sm">{alert.title}</span>
                                        <Badge variant="destructive">{alert.severity}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                                </div>
                            ))
                    )}
                </div>
            </DashboardCard>
        </div>
    );
}
