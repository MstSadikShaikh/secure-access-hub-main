import { DashboardLayout } from '@/components/DashboardLayout';
import { PhishingScanner } from '@/components/PhishingScanner';
import { FraudCategoryChart } from '@/components/AnalyticsCharts';

export default function SecurityTools() {
    return (
        <DashboardLayout variant="user">
            <div className="p-8 space-y-8 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Security Tools</h1>
                    <p className="text-muted-foreground">Proactive tools to detect and report threats.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <PhishingScanner />
                    <FraudCategoryChart />
                </div>
            </div>
        </DashboardLayout>
    );
}
