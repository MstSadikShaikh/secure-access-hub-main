import { CreditCard, Users, AlertTriangle, Flag } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';

interface AdminStatsGridProps {
    counts: {
        all: number;
        flagged: number;
    };
    uniqueUsers: number;
    pendingReports: number;
}

export function AdminStatsGrid({ counts, uniqueUsers, pendingReports }: AdminStatsGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <DashboardCard title="Total Transactions" icon={<CreditCard className="h-6 w-6" />}>
                <p className="text-3xl font-display font-bold text-foreground mt-2">{counts.all}</p>
                <p className="text-sm text-muted-foreground mt-1">Across all users</p>
            </DashboardCard>

            <DashboardCard title="Active Users" icon={<Users className="h-6 w-6" />}>
                <p className="text-3xl font-display font-bold text-foreground mt-2">{uniqueUsers}</p>
                <p className="text-sm text-muted-foreground mt-1">With transaction history</p>
            </DashboardCard>

            <DashboardCard title="Flagged Transactions" icon={<AlertTriangle className="h-6 w-6" />}>
                <p className={`text-3xl font-display font-bold mt-2 ${counts.flagged > 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {counts.flagged}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                    {counts.flagged > 0 ? 'Requires attention' : 'No flags'}
                </p>
            </DashboardCard>

            <DashboardCard title="Pending Reports" icon={<Flag className="h-6 w-6" />}>
                <p className={`text-3xl font-display font-bold mt-2 ${pendingReports > 0 ? 'text-warning' : 'text-foreground'}`}>
                    {pendingReports}
                </p>
                <p className="text-sm text-muted-foreground mt-1">User fraud reports</p>
            </DashboardCard>
        </div>
    );
}
