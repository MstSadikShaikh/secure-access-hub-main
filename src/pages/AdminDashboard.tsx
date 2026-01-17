import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AdminUserManagement } from '@/components/AdminUserManagement';
import { AdminSOSMonitor } from '@/components/AdminSOSMonitor';
import { AdminBlacklistManager } from '@/components/AdminBlacklistManager';
import { AdminStatsGrid } from '@/components/admin/AdminStatsGrid';
import { AdminTransactionsTab } from '@/components/admin/AdminTransactionsTab';
import { AdminReportsTab } from '@/components/admin/AdminReportsTab';
import { AdminAnalyticsTab } from '@/components/admin/AdminAnalyticsTab';
import { AdminHeatmapsTab } from '@/components/admin/AdminHeatmapsTab';
import { AdminWalletTab } from '@/components/admin/AdminWalletTab';
import { useAllTransactions } from '@/hooks/useTransactions';
import { useAllFraudReports } from '@/hooks/useFraudReports';
import { useAllAlerts } from '@/hooks/useAlerts';
import { Users, Bell, ShieldBan, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { transactions, isLoading } = useAllTransactions();
  const { reports, updateReport } = useAllFraudReports();
  const { alerts } = useAllAlerts();
  const [filter, setFilter] = useState<'all' | 'new' | 'flagged'>('all');

  // Sync tab with URL route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/admin/fraud-stats')) return 'transactions';
    if (path.includes('/admin/wallet')) return 'wallet';
    if (path.includes('/admin/analytics')) return 'analytics';
    if (path.includes('/admin/heatmaps')) return 'heatmaps';
    if (path.includes('/admin/cases')) return 'reports';
    if (path.includes('/admin/users')) return 'users';
    if (path.includes('/admin/sos')) return 'sos';
    if (path.includes('/admin/blacklist')) return 'blacklist';
    return 'transactions';
  };

  const handleTabChange = (value: string) => {
    const routeMap: Record<string, string> = {
      'transactions': '/admin',
      'wallet': '/admin/wallet',
      'reports': '/admin/cases',
      'analytics': '/admin/analytics',
      'heatmaps': '/admin/heatmaps',
      'users': '/admin/users',
      'sos': '/admin/sos',
      'blacklist': '/admin/blacklist',
    };
    navigate(routeMap[value] || '/admin');
  };

  const filteredTransactions = useMemo(() => {
    if (filter === 'new') return transactions.filter(t => t.status === 'pending');
    if (filter === 'flagged') return transactions.filter(t => t.is_flagged);
    return transactions;
  }, [transactions, filter]);

  const counts = useMemo(() => ({
    all: transactions.length,
    new: transactions.filter(t => t.status === 'pending').length,
    flagged: transactions.filter(t => t.is_flagged).length,
  }), [transactions]);

  const uniqueUsers = new Set(transactions.map(t => t.user_id)).size;
  const pendingReports = reports.filter(r => r.status === 'pending').length;

  const handleStatusChange = (reportId: string, status: string) => {
    updateReport({ id: reportId, status: status as 'pending' | 'investigating' | 'resolved' | 'dismissed' });
  };

  return (
    <DashboardLayout variant="admin">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor fraud detection, analytics, and system health</p>
        </div>

        {/* Stats Grid */}
        <AdminStatsGrid
          counts={counts}
          uniqueUsers={uniqueUsers}
          pendingReports={pendingReports}
        />

        {/* Tabs */}
        <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="space-y-6">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="wallet">
                <Wallet className="h-4 w-4 mr-1" />
                Master Wallet
              </TabsTrigger>
              <TabsTrigger value="reports" className="relative">
                Reports
                {pendingReports > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingReports}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="heatmaps">Heatmaps</TabsTrigger>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-1" />
                Users
              </TabsTrigger>
              <TabsTrigger value="sos">
                <Bell className="h-4 w-4 mr-1" />
                SOS
              </TabsTrigger>
              <TabsTrigger value="blacklist">
                <ShieldBan className="h-4 w-4 mr-1" />
                Blacklist
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="transactions">
            <AdminTransactionsTab
              transactions={filteredTransactions}
              isLoading={isLoading}
              filter={filter}
              onFilterChange={setFilter}
              counts={counts}
            />
          </TabsContent>

          <TabsContent value="wallet">
            <AdminWalletTab />
          </TabsContent>

          <TabsContent value="reports">
            <AdminReportsTab
              reports={reports}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalyticsTab />
          </TabsContent>

          <TabsContent value="heatmaps">
            <AdminHeatmapsTab alerts={alerts} />
          </TabsContent>

          <TabsContent value="users">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="sos">
            <AdminSOSMonitor />
          </TabsContent>

          <TabsContent value="blacklist">
            <AdminBlacklistManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
