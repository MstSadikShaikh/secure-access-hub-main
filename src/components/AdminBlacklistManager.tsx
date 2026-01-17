import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShieldOff, Plus, Trash2, Search, Download, Loader2,
  AlertTriangle, RefreshCw, FileText
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface BlacklistEntry {
  id: string;
  upi_id: string;
  reason: string | null;
  severity: string;
  source: string;
  reported_count: number;
  created_at: string;
}

export function AdminBlacklistManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states
  const [newUpiId, setNewUpiId] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newSeverity, setNewSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // Fetch blacklist
  const { data: blacklist = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-blacklist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upi_blacklist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BlacklistEntry[];
    },
  });

  // Add to blacklist
  const addToBlacklist = useMutation({
    mutationFn: async (entry: { upi_id: string; reason: string; severity: string }) => {
      const { data, error } = await supabase
        .from('upi_blacklist')
        .insert({
          upi_id: entry.upi_id.toLowerCase(),
          reason: entry.reason,
          severity: entry.severity,
          source: 'admin',
          reported_count: 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blacklist'] });
      toast({
        title: 'Added to Blacklist',
        description: 'UPI ID has been blacklisted',
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message?.includes('duplicate')
          ? 'This UPI ID is already blacklisted'
          : 'Failed to add to blacklist',
        variant: 'destructive',
      });
    },
  });

  // Remove from blacklist
  const removeFromBlacklist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('upi_blacklist')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blacklist'] });
      toast({
        title: 'Removed from Blacklist',
        description: 'UPI ID has been removed',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove from blacklist',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setNewUpiId('');
    setNewReason('');
    setNewSeverity('medium');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUpiId.trim()) {
      toast({
        title: 'Error',
        description: 'UPI ID is required',
        variant: 'destructive',
      });
      return;
    }

    // Basic UPI ID validation
    const upiRegex = /^[\w.-]+@[\w]+$/;
    if (!upiRegex.test(newUpiId)) {
      toast({
        title: 'Invalid UPI ID',
        description: 'Please enter a valid UPI ID format (e.g., name@upi)',
        variant: 'destructive',
      });
      return;
    }

    addToBlacklist.mutate({
      upi_id: newUpiId.trim(),
      reason: newReason.trim(),
      severity: newSeverity,
    });
  };

  const exportBlacklist = () => {
    const csvContent = [
      'UPI ID,Reason,Severity,Source,Reports,Added Date',
      ...blacklist.map(entry =>
        `${entry.upi_id},"${entry.reason || ''}",${entry.severity},${entry.source},${entry.reported_count},${new Date(entry.created_at).toISOString()}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blacklist_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Blacklist has been exported as CSV',
    });
  };

  // Filter blacklist by search
  const filteredBlacklist = blacklist.filter((entry) =>
    entry.upi_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-destructive" />
              UPI Blacklist Manager
            </CardTitle>
            <CardDescription>
              Manage blocked UPI IDs ({blacklist.length} entries)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={exportBlacklist}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Blacklist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Add UPI ID to Blacklist</DialogTitle>
                    <DialogDescription>
                      Block a fraudulent or suspicious UPI ID
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="upi-id">UPI ID *</Label>
                      <Input
                        id="upi-id"
                        value={newUpiId}
                        onChange={(e) => setNewUpiId(e.target.value)}
                        placeholder="fraudster@upi"
                        className="font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="severity">Severity Level</Label>
                      <Select value={newSeverity} onValueChange={(v: 'low' | 'medium' | 'high' | 'critical') => setNewSeverity(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason</Label>
                      <Textarea
                        id="reason"
                        value={newReason}
                        onChange={(e) => setNewReason(e.target.value)}
                        placeholder="Describe why this UPI ID is being blacklisted..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addToBlacklist.isPending}>
                      {addToBlacklist.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add to Blacklist'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by UPI ID or reason..."
            className="pl-10"
          />
        </div>

        {/* Blacklist Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredBlacklist.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShieldOff className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No blacklisted UPI IDs</p>
            <p className="text-sm mt-1">Add suspicious UPI IDs to protect users</p>
          </div>
        ) : (
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>UPI ID</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBlacklist.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono font-medium">{entry.upi_id}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {entry.reason || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSeverityColor(entry.severity)}>
                      {entry.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{entry.source}</Badge>
                  </TableCell>
                  <TableCell>{entry.reported_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove from Blacklist</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove <strong>{entry.upi_id}</strong> from the blacklist?
                            This UPI ID will no longer be flagged as suspicious.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeFromBlacklist.mutate(entry.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
