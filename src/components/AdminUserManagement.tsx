import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users, Search, Loader2, Eye, ShieldAlert,
  CreditCard, AlertTriangle, UserCheck, UserX, RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  sos_enabled: boolean;
  created_at: string;
}

interface UserTransaction {
  id: string;
  amount: number;
  receiver_upi_id: string;
  status: string;
  is_flagged: boolean;
  created_at: string;
}

export function AdminUserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch all user profiles
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Fetch user's transactions when viewing details
  const { data: userTransactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['admin-user-transactions', selectedUser?.user_id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', selectedUser.user_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as UserTransaction[];
    },
    enabled: !!selectedUser,
  });

  // Fetch user's SOS alerts
  const { data: userSosAlerts = [] } = useQuery({
    queryKey: ['admin-user-sos', selectedUser?.user_id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('*')
        .eq('user_id', selectedUser.user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedUser,
  });

  // Filter users by search
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query) ||
      user.phone?.includes(query)
    );
  });

  const handleViewUser = (user: UserProfile) => {
    setSelectedUser(user);
    setShowDetails(true);
  };

  // Calculate user stats
  const getUserStats = () => {
    const flaggedTransactions = userTransactions.filter(t => t.is_flagged).length;
    const totalAmount = userTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const sosCount = userSosAlerts.length;

    return { flaggedTransactions, totalAmount, sosCount };
  };

  const stats = selectedUser ? getUserStats() : null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Management
              </CardTitle>
              <CardDescription>
                View and manage all registered users
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email, name, or phone..."
              className="pl-10"
            />
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>SOS</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{user.full_name || 'Anonymous'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{user.email || '-'}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={user.sos_enabled ? 'default' : 'secondary'}>
                          {user.sos_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Details
            </DialogTitle>
            <DialogDescription>
              Viewing profile for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* User Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Transactions</span>
                  </div>
                  <p className="text-2xl font-bold">{userTransactions.length}</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{stats?.totalAmount.toLocaleString('en-IN')} total
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">Flagged</span>
                  </div>
                  <p className="text-2xl font-bold text-warning">{stats?.flaggedTransactions}</p>
                  <p className="text-xs text-muted-foreground">Suspicious activity</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">SOS Alerts</span>
                  </div>
                  <p className="text-2xl font-bold text-destructive">{stats?.sosCount}</p>
                  <p className="text-xs text-muted-foreground">Emergency triggers</p>
                </div>
              </div>

              {/* Profile Info */}
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-3">Profile Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Full Name</p>
                    <p className="font-medium">{selectedUser.full_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedUser.email || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedUser.phone || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Member Since</p>
                    <p className="font-medium">
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <h4 className="font-medium mb-3">Recent Transactions</h4>
                {isLoadingTransactions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : userTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No transactions yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {userTransactions.slice(0, 5).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium font-mono text-sm">{tx.receiver_upi_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{Number(tx.amount).toLocaleString('en-IN')}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={tx.status === 'completed' ? 'secondary' : 'outline'} className="text-xs">
                              {tx.status}
                            </Badge>
                            {tx.is_flagged && (
                              <Badge variant="destructive" className="text-xs">
                                Flagged
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
