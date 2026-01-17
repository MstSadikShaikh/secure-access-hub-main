import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContactStatusBadge } from './ContactStatusBadge';
import { TransactionStatusBadge } from './TransactionStatusBadge';
import { TransactionWithContact } from '@/hooks/useTransactions';
import { Skeleton } from '@/components/ui/skeleton';
import { useContacts } from '@/hooks/useContacts';
import { Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionTableProps {
  transactions: TransactionWithContact[];
  isLoading?: boolean;
  showUserEmail?: boolean;
  emptyMessage?: string;
}

export function TransactionTable({
  transactions,
  isLoading,
  showUserEmail = false,
  emptyMessage = 'No transactions found'
}: TransactionTableProps) {
  const { contacts, updateContactName } = useContacts();
  const [editingUpi, setEditingUpi] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleEditStart = (upiId: string, currentName: string | null) => {
    setEditingUpi(upiId);
    setEditName(currentName || '');
  };

  const handleEditSave = async (upiId: string) => {
    const contact = contacts.find(c => c.upi_id.toLowerCase() === upiId.toLowerCase());
    if (contact) {
      await updateContactName.mutateAsync({ contactId: contact.id, name: editName.trim() });
    }
    setEditingUpi(null);
    setEditName('');
  };

  const handleEditCancel = () => {
    setEditingUpi(null);
    setEditName('');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
            <TableHead className="text-foreground font-semibold">Date & Time</TableHead>
            {showUserEmail && <TableHead className="text-foreground font-semibold">User</TableHead>}
            <TableHead className="text-foreground font-semibold">Counterparty</TableHead>
            <TableHead className="text-foreground font-semibold">Contact</TableHead>
            <TableHead className="text-foreground font-semibold text-right">Amount</TableHead>
            <TableHead className="text-foreground font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const isEditing = editingUpi === tx.receiver_upi_id;

            return (
              <TableRow key={tx.id} className="hover:bg-secondary/30">
                <TableCell className="text-muted-foreground">
                  <div>
                    <p className="text-foreground">{format(new Date(tx.created_at), 'MMM dd, yyyy')}</p>
                    <p className="text-xs">{format(new Date(tx.created_at), 'hh:mm a')}</p>
                  </div>
                </TableCell>
                {showUserEmail && (
                  <TableCell className="text-muted-foreground">
                    {tx.user_email || 'Unknown'}
                  </TableCell>
                )}
                <TableCell>
                  <div>
                    <p className="font-mono text-foreground">{tx.receiver_upi_id}</p>
                    {isEditing ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-6 text-xs py-0 px-2 w-24"
                          placeholder="Enter name"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleEditSave(tx.receiver_upi_id)}
                          disabled={updateContactName.isPending}
                        >
                          <Check className="h-3 w-3 text-success" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={handleEditCancel}
                        >
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-muted-foreground">
                          {tx.contact_name || 'No name'}
                        </p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
                          onClick={() => handleEditStart(tx.receiver_upi_id, tx.contact_name)}
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <ContactStatusBadge status={tx.contact_status} size="sm" />
                </TableCell>
                <TableCell className={cn(
                  "text-right font-bold",
                  tx.type === 'credit' ? "text-green-500" : "text-destructive"
                )}>
                  {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <TransactionStatusBadge status={tx.status} size="sm" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
