import { DashboardLayout } from '@/components/DashboardLayout';
import { AlertsPanel } from '@/components/AlertsPanel';

export default function Alerts() {
    return (
        <DashboardLayout variant="user">
            <div className="p-8 space-y-8 animate-fade-in">
                <h1 className="text-3xl font-display font-bold text-foreground mb-2">Security Alerts</h1>
                <p className="text-muted-foreground mb-6">Stay updated on potential risks and system notifications.</p>
                <AlertsPanel />
            </div>
        </DashboardLayout>
    );
}
