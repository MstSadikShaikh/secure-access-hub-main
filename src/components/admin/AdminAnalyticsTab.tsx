import { TransactionTrendChart, RiskScoreTimeline } from '@/components/AnalyticsCharts';

export function AdminAnalyticsTab() {
    return (
        <div className="grid grid-cols-1 gap-6">
            <TransactionTrendChart />
            <RiskScoreTimeline />
        </div>
    );
}
