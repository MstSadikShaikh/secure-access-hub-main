import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Wallet, Search, Loader2, Send, RefreshCw,
    TrendingDown, TrendingUp
} from 'lucide-react';
import { useAdminWallet } from '@/hooks/useAdminWallet';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface UserProfile {
    id: string;
    user_id: string;
    email: string | null;
    full_name: string | null;
    wallet_balance: number;
    created_at: string;
}

export function AdminWalletTab() {
    const { balance, isLoading: isWalletLoading, distributeFunds, addFundsToMasterWallet } = useAdminWallet();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [sendAmount, setSendAmount] = useState('');
    const [topUpAmount, setTopUpAmount] = useState('');
    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
    const [isTopUpDialogOpen, setIsTopUpDialogOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isToppingUp, setIsToppingUp] = useState(false);

    // Fetch users with wallet balance
    const { data: users = [], isLoading: isUsersLoading, refetch: refetchUsers } = useQuery({
        queryKey: ['admin-users-wallet'],
        queryFn: async () => {
            // Note: we need to cast to any or rely on the updated types. 
            // Supabase returns what is in the DB, so if we migrated, it returns wallet_balance.
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as UserProfile[];
        },
        // Refresh often to show updated balances
        refetchInterval: 5000
    });

    const filteredUsers = users.filter((user) => {
        const query = searchQuery.toLowerCase();
        return (
            user.email?.toLowerCase().includes(query) ||
            user.full_name?.toLowerCase().includes(query)
        );
    });

    const handleSendClick = (user: UserProfile) => {
        setSelectedUser(user);
        setSendAmount('');
        setIsSendDialogOpen(true);
    };

    const submitTransfer = async () => {
        if (!selectedUser || !sendAmount) return;

        setIsSending(true);
        const amount = parseFloat(sendAmount);

        const success = await distributeFunds(selectedUser.user_id, amount);

        if (success) {
            setIsSendDialogOpen(false);
            setSendAmount('');
            // Refetch users to update their displayed balance
            refetchUsers();
        }

        setIsSending(false);
    };

    const submitTopUp = async () => {
        if (!topUpAmount) return;

        setIsToppingUp(true);
        const amount = parseFloat(topUpAmount);

        const success = await addFundsToMasterWallet(amount);

        if (success) {
            setIsTopUpDialogOpen(false);
            setTopUpAmount('');
        }

        setIsToppingUp(false);
    };

    return (
        <div className="space-y-6">
            {/* Master Wallet Card */}
            <Card className="bg-gradient-to-br from-primary via-primary/90 to-blue-600 text-primary-foreground border-none overflow-hidden relative">
                <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 blur-3xl -mr-10 -mt-10" />
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="text-primary-foreground/90">Master Admin Wallet</span>
                        <Wallet className="h-6 w-6 text-primary-foreground/80" />
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/70">
                        Central fund for checking and distributing user balances
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-3">
                        {isWalletLoading ? (
                            <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                            <span className="text-5xl font-bold tracking-tight">
                                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        )}
                        <span className="mb-2 text-primary-foreground/60 font-medium">Available</span>
                    </div>

                    <div className="mt-4">
                        <Button
                            variant="secondary"
                            className="bg-white/20 hover:bg-white/30 text-white border-none"
                            onClick={() => setIsTopUpDialogOpen(true)}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Top up Wallet
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Users List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>User Wallets</CardTitle>
                            <CardDescription>
                                Manage user balances and distribute funds
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => refetchUsers()}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users..."
                            className="pl-10"
                        />
                    </div>

                    {isUsersLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Current Balance</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No users found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="font-medium">{user.full_name || 'Anonymous'}</div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {user.email || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <span className={user.wallet_balance > 0 ? "font-bold text-emerald-600" : "text-muted-foreground"}>
                                                    ₹{(user.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSendClick(user)}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                >
                                                    <Send className="h-4 w-4 mr-2" />
                                                    Send Money
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

            {/* Send Funds Dialog */}
            <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Funds to User</DialogTitle>
                        <DialogDescription>
                            Transferring money from Master Wallet to {selectedUser?.full_name || selectedUser?.email}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount (₹)</label>
                            <Input
                                type="number"
                                value={sendAmount}
                                onChange={(e) => setSendAmount(e.target.value)}
                                placeholder="0.00"
                                className="text-lg"
                            />
                        </div>

                        <div className="bg-muted p-3 rounded-md text-sm flex justify-between">
                            <span>Master Wallet Balance:</span>
                            <span className="font-bold">₹{balance.toLocaleString('en-IN')}</span>
                        </div>

                        {parseFloat(sendAmount || '0') > balance && (
                            <p className="text-destructive text-xs">Insufficient admin funds</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={submitTransfer}
                            disabled={isSending || !sendAmount || parseFloat(sendAmount) <= 0 || parseFloat(sendAmount) > balance}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Transfer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Top Up Wallet Dialog */}
            <Dialog open={isTopUpDialogOpen} onOpenChange={setIsTopUpDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Top up Master Wallet</DialogTitle>
                        <DialogDescription>
                            Add funds to the central admin wallet for distribution.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount (₹)</label>
                            <Input
                                type="number"
                                value={topUpAmount}
                                onChange={(e) => setTopUpAmount(e.target.value)}
                                placeholder="0.00"
                                className="text-lg"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {[1000, 5000, 10000].map((amt) => (
                                <Button
                                    key={amt}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setTopUpAmount(amt.toString())}
                                >
                                    +₹{amt}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTopUpDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={submitTopUp}
                            disabled={isToppingUp || !topUpAmount || parseFloat(topUpAmount) <= 0}
                            className="bg-primary hover:bg-primary/90"
                        >
                            {isToppingUp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            Add Funds
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
