import { FileWarning } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';

interface FraudReport {
    id: string;
    reported_upi_id: string;
    category: string;
    description: string | null;
    status: string;
    created_at: string;
}

interface AdminReportsTabProps {
    reports: FraudReport[];
    onStatusChange: (reportId: string, status: string) => void;
}

export function AdminReportsTab({ reports, onStatusChange }: AdminReportsTabProps) {
    return (
        <DashboardCard title="Fraud Reports" description="User-submitted fraud reports" icon={<FileWarning className="h-6 w-6" />}>
            <div className="mt-4">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Reported UPI ID</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reported</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    <FileWarning className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No fraud reports submitted yet</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            reports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell className="font-mono text-sm">{report.reported_upi_id}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {report.category.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                        {report.description || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                report.status === 'pending' ? 'destructive' :
                                                    report.status === 'investigating' ? 'default' :
                                                        report.status === 'resolved' ? 'secondary' : 'outline'
                                            }
                                        >
                                            {report.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={report.status}
                                            onValueChange={(value) => onStatusChange(report.id, value)}
                                        >
                                            <SelectTrigger className="w-32 h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="investigating">Investigating</SelectItem>
                                                <SelectItem value="resolved">Resolved</SelectItem>
                                                <SelectItem value="dismissed">Dismissed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </DashboardCard>
    );
}
