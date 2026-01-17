import { CreditCard } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { TransactionTable } from '@/components/TransactionTable';
import { AdminTransactionFilters } from '@/components/AdminTransactionFilters';
import { TransactionWithContact } from '@/hooks/useTransactions';

// Since Transaction type might not be exported from component, let's use any for now or try to import if possible.
// Actually, useAllTransactions returns typed data. 
// Let's assume the shape matches what TransactionTable expects.

interface AdminTransactionsTabProps {
    transactions: TransactionWithContact[];
    isLoading: boolean;
    filter: 'all' | 'new' | 'flagged';
    onFilterChange: (filter: 'all' | 'new' | 'flagged') => void;
    counts: { all: number; new: number; flagged: number };
}

export function AdminTransactionsTab({ transactions, isLoading, filter, onFilterChange, counts }: AdminTransactionsTabProps) {
    return (
        <DashboardCard title="All Transactions" description="Read-only view of all user transactions" icon={<CreditCard className="h-6 w-6" />}>
            <div className="mt-4 space-y-4">
                <AdminTransactionFilters filter={filter} onFilterChange={onFilterChange} counts={counts} />
                <TransactionTable
                    transactions={transactions}
                    isLoading={isLoading}
                    showUserEmail
                    emptyMessage={filter === 'all' ? 'No transactions yet' : `No ${filter} transactions`}
                />
            </div>
        </DashboardCard>
    );
}
