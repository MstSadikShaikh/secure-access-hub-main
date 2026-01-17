import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionTable } from '@/components/TransactionTable';
import { NewTransactionForm } from '@/components/NewTransactionForm';
import { ReportFraudForm } from '@/components/ReportFraudForm';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import {
    Wallet as WalletIcon,
    QrCode,
    Send,
    Smartphone,
    History,
    RefreshCw,
    ShieldAlert,
    Ban,
    FileWarning,
    CheckCircle2,
    Gamepad2,
    BookOpen,
    ExternalLink,
    Lock,
    Trophy,
    XCircle,
    ArrowRight
} from 'lucide-react';
import { QRScanner } from '@/components/QRScanner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Flashcard Mock Data with Multiple Questions per Category (Ensuring 4 options each)
const RBI_FLASHCARDS_DATA = [
    {
        id: "otp",
        title: "OTP Security",
        icon: <Lock className="h-7 w-7 text-amber-500" />,
        color: "amber",
        questions: [
            {
                question: "A caller claiming to be a bank official asks for your OTP to verify a gift. Should you share it?",
                options: ["Share immediately", "No, never share OTP", "Share only if he's polite", "Verify his name first"],
                correctAnswer: "No, never share OTP",
                fact: "Banks NEVER ask for OTP, PIN, or passwords. Any such request is 100% a scam."
            },
            {
                question: "You get an OTP for a transaction you didn't initiate. What is the safest action?",
                options: ["Ignore it entirely", "Contact bank & freeze", "Cancel via caller's link", "Share OTP to 'reverse'"],
                correctAnswer: "Contact bank & freeze",
                fact: "Unauthorized OTPs mean your credentials might be compromised. Inform your bank immediately."
            },
            {
                question: "Can an OTP be used to 'receive' money into your account from a stranger?",
                options: ["Yes, if it's a refund", "No, OTP is for sending", "Yes, for cashback", "Only on holidays"],
                correctAnswer: "No, OTP is for sending",
                fact: "Scammers trick people into sharing OTPs to 'receive' money, but it's actually used to drain your account."
            }
        ]
    },
    {
        id: "qr",
        title: "QR Code Scam",
        icon: <QrCode className="h-7 w-7 text-blue-500" />,
        color: "blue",
        questions: [
            {
                question: "A stranger sends a QR code for 'Winning a Lottery'. Do you need a PIN to claim it?",
                options: ["Yes, for verification", "PIN is NEVER for receiving", "Yes, to pay tax", "Only for big amounts"],
                correctAnswer: "PIN is NEVER for receiving",
                fact: "You only enter your UPI PIN to SEND money. Any claim that you need a PIN to receive is a fraud."
            },
            {
                question: "You scan a QR at a shop and it shows 'Payment to [Personal Name]' instead of shop. Action?",
                options: ["Pay anyway", "Ask shopkeeper first", "Check my balance", "Scan again immediately"],
                correctAnswer: "Ask shopkeeper first",
                fact: "Malicious actors often paste their personal QR codes over shop QRs. Always verify the recipient's name."
            },
            {
                question: "Someone asks you to scan a QR to 'refund' your failed transaction. Safe?",
                options: ["Safe for refunds", "Scam: Block them", "Only if QR is colorful", "Check bank statement"],
                correctAnswer: "Scam: Block them",
                fact: "Refunds are processed automatically to the source. You don't need to scan anything to get your money back."
            }
        ]
    },
    {
        id: "device",
        title: "Device Resilience",
        icon: <Smartphone className="h-7 w-7 text-emerald-500" />,
        color: "emerald",
        questions: [
            {
                question: "Which connection is most prone to 'Man-in-the-middle' attacks for banking?",
                options: ["Home Private Wi-Fi", "Free Public Wi-Fi", "Your Mobile Data", "USB Tethering"],
                correctAnswer: "Free Public Wi-Fi",
                fact: "Public Wi-Fi networks are often unencrypted, allowing hackers to 'sniff' your sensitive banking data."
            },
            {
                question: "An app asks for 'SMS Reading' permissions during installation. Safe for a calculator app?",
                options: ["Yes, why not", "No, it's suspicious", "Only if it's high rated", "Yes, if ads are there"],
                correctAnswer: "No, it's suspicious",
                fact: "Malicious apps use SMS permissions to read your OTPs silently. Always check if the permission matches app utility."
            },
            {
                question: "Should you click on links in SMS that promise 'KYC update' to avoid account block?",
                options: ["Click & update fast", "Delete the message", "Call the SMS number", "Forward it to friends"],
                correctAnswer: "Delete the message",
                fact: "Banks never send links for KYC updates. These are 'vishing' links designed to steal your details."
            }
        ]
    }
];

function FlashCard({ category }: { category: typeof RBI_FLASHCARDS_DATA[0] }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [qIndex, setQIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showFact, setShowFact] = useState(false);
    const { toast } = useToast();

    const currentQuestionData = category.questions[qIndex];

    // Shuffle options whenever the question changes
    const shuffledOptions = useMemo(() => {
        const options = [...currentQuestionData.options];
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        return options;
    }, [qIndex, category.id]);

    const handleAnswer = (option: string) => {
        if (selectedOption !== null) return;
        setSelectedOption(option);

        if (option === currentQuestionData.correctAnswer) {
            // Play "7 CR" Audio instantly
            const winAudio = new Audio('/amitabh-7cr.mp3');
            winAudio.volume = 1.0;
            winAudio.play().catch(e => console.warn("Audio autoplay blocked or file invalid:", e));

            toast({
                title: "Security Mastered!",
                description: "You've successfully identified the threat.",
            });
        } else {
            toast({
                title: "Alert! Threat Detected",
                description: "This action could lead to a financial loss.",
                variant: "destructive"
            });
        }

        setTimeout(() => setShowFact(true), 600);
    };

    const nextChallenge = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedOption(null);
        setShowFact(false);
        // Ensure a different question is picked
        let nextIdx;
        if (category.questions.length > 1) {
            do {
                nextIdx = Math.floor(Math.random() * category.questions.length);
            } while (nextIdx === qIndex);
            setQIndex(nextIdx);
        }
    };

    const resetCard = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFlipped(false);
        // Reset to a random question on exit so next entry is different
        setSelectedOption(null);
        setShowFact(false);
        if (category.questions.length > 1) {
            setQIndex(Math.floor(Math.random() * category.questions.length));
        }
    };

    return (
        <div
            className="relative h-[360px] w-full perspective-1000 cursor-pointer group"
            onClick={() => !isFlipped && setIsFlipped(true)}
        >
            <div className={cn(
                "relative w-full h-full transition-all duration-700 preserve-3d shadow-xl rounded-2xl",
                isFlipped ? "rotate-y-180" : ""
            )}>
                {/* Front Side */}
                <div className="absolute inset-0 backface-hidden bg-card border-2 border-border/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 group-hover:border-primary/50 transition-colors shadow-inner">
                    <div className={cn(
                        "p-5 rounded-2xl bg-background shadow-lg mb-2 transform group-hover:scale-110 transition-transform",
                        category.color === 'amber' ? "text-amber-500" : category.color === 'blue' ? "text-blue-500" : "text-emerald-500"
                    )}>
                        {category.icon}
                    </div>
                    <CardTitle className="text-2xl font-display">{category.title}</CardTitle>
                    <p className="text-muted-foreground text-sm font-medium">Interactive Security Challenge</p>
                    <div className="pt-4 flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                        START QUEST <Gamepad2 className="h-4 w-4" />
                    </div>
                </div>

                {/* Back Side (The Game/Quiz) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-card border-2 border-primary/30 rounded-2xl p-6 flex flex-col items-center justify-between text-center overflow-hidden">
                    <div className="absolute top-0 left-0 p-4 opacity-10">
                        <Trophy className="h-10 w-10 text-primary" />
                    </div>

                    {!showFact ? (
                        <div className="space-y-4 w-full">
                            <div className="flex justify-between items-center w-full px-1 relative z-30">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Quest ID: {qIndex + 1}</h4>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-all pointer-events-auto"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsFlipped(false);
                                    }}
                                >
                                    <XCircle className="h-5 w-5 opacity-70" />
                                </Button>
                            </div>
                            <p className="text-base font-bold leading-tight px-2 text-foreground/90 h-[60px] flex items-center justify-center">{currentQuestionData.question}</p>
                            <div className="grid grid-cols-1 gap-2 w-full pt-2">
                                {shuffledOptions.map((opt, i) => (
                                    <Button
                                        key={`${qIndex}-${i}`}
                                        variant={selectedOption === opt ? (opt === currentQuestionData.correctAnswer ? "default" : "destructive") : "outline"}
                                        className={cn(
                                            "w-full h-10 text-xs font-bold border-2 transition-all",
                                            selectedOption === null && "hover:border-primary hover:bg-primary/5 active:scale-95"
                                        )}
                                        onClick={(e) => { e.stopPropagation(); handleAnswer(opt); }}
                                    >
                                        <span className="truncate">{opt}</span>
                                        {selectedOption === opt && (
                                            opt === currentQuestionData.correctAnswer ? <CheckCircle2 className="ml-2 h-4 w-4 flex-shrink-0" /> : <XCircle className="ml-2 h-4 w-4 flex-shrink-0" />
                                        )}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in zoom-in duration-500 w-full h-full flex flex-col items-center">
                            <div className="flex justify-end w-full px-2 relative z-30">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 -mr-2 hover:bg-destructive/10 hover:text-destructive transition-colors pointer-events-auto"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsFlipped(false);
                                    }}
                                >
                                    <XCircle className="h-5 w-5 opacity-70" />
                                </Button>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                                <div className={cn(
                                    "mx-auto p-4 rounded-full w-fit",
                                    selectedOption === currentQuestionData.correctAnswer ? "bg-emerald-500/20 text-emerald-500" : "bg-destructive/20 text-destructive"
                                )}>
                                    {selectedOption === currentQuestionData.correctAnswer ? <Trophy className="h-12 w-12 animate-bounce" /> : <ShieldAlert className="h-12 w-12" />}
                                </div>
                                <h4 className="font-bold text-lg">{selectedOption === currentQuestionData.correctAnswer ? "Well Done!" : "Lesson Learned"}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed italic px-2 font-medium">
                                    "{currentQuestionData.fact}"
                                </p>
                                <div className="flex gap-2 justify-center pt-2">
                                    <Button variant="outline" size="sm" className="font-bold h-9 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary" onClick={nextChallenge}>
                                        Next Challenge <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="font-bold h-9" onClick={resetCard}>
                                        Exit
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}} />
        </div>
    );
}

export default function Wallet() {
    const { transactions, isLoading: isTransactionsLoading } = useTransactions();
    const { balance, refetch: refetchBalance } = useWallet();
    const [upiId, setUpiId] = useState<string>('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isFrozen, setIsFrozen] = useState(false);
    const [lastTransactionUpi, setLastTransactionUpi] = useState<string>('');
    const [transactionFormOpen, setTransactionFormOpen] = useState(false);
    const [transactionFormData, setTransactionFormData] = useState({ upi: '', amount: '' });
    const { toast } = useToast();

    // Fetch and subscribe to real-time wallet balance
    useEffect(() => {
        let channel: any;

        const setupWallet = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch UPI ID (Balance is handled by useWallet hook, but we can fetch it once for sync if needed)
            const fetchProfileData = async () => {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('upi_id')
                    .eq('user_id', user.id)
                    .single();

                if (data) {
                    setUpiId(data.upi_id || '');
                }
            };
            fetchProfileData();

            // Realtime subscription for UI feedback or other profile changes
            channel = supabase
                .channel('wallet_updates')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload: any) => {
                        if (payload.new) {
                            // If balance changed, refetch via React Query to keep it in sync
                            if (typeof payload.new.wallet_balance === 'number') {
                                refetchBalance();
                                toast({
                                    title: "Wallet Updated",
                                    description: `Your balance has been updated to ₹${payload.new.wallet_balance.toLocaleString('en-IN')}`,
                                });
                            }
                        }
                    }
                )
                .subscribe();
        };

        setupWallet();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [toast, refetchBalance]);

    const handleTransactionSuccess = (amount: number, upiId?: string) => {
        if (upiId) setLastTransactionUpi(upiId);
    };

    const refreshBalance = async () => {
        setIsRefreshing(true);
        await refetchBalance();

        setTimeout(() => {
            setIsRefreshing(false);
            toast({
                title: "Balance Updated",
                description: "Your wallet balance is up to date.",
            });
        }, 800);
    };

    const handleQRScan = (data: string, parsed?: any) => {
        if (parsed?.isUPI) {
            setTransactionFormData({
                upi: parsed.upiId || '',
                amount: parsed.amount ? parsed.amount.toString() : ''
            });
            setTransactionFormOpen(true);
        } else {
            toast({
                title: "Invalid QR Code",
                description: "Please scan a valid payment QR code.",
                variant: "destructive"
            });
        }
    };

    return (
        <DashboardLayout variant="user">
            <div className="space-y-8 animate-fade-in p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-display font-bold text-foreground mb-1">Financial Protection Center</h1>
                        <p className="text-muted-foreground">Manage your assets with AI-powered fraud surveillance.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">Secure Access Hub</span>
                        </div>
                    </div>
                </div>

                {/* Main Grid: Balance & Quick Payments */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Balance Card - col-span-1 */}
                    <Card className="lg:col-span-1 overflow-hidden border-none shadow-2xl relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-blue-600" />
                        <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />

                        <CardHeader className="relative z-10 pb-2">
                            <CardTitle className="text-white/80 font-medium text-sm flex items-center justify-between">
                                <span>Total Balance</span>
                                <WalletIcon className="h-4 w-4 opacity-70" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10 space-y-6">
                            <div className="flex items-end gap-3">
                                <span className="text-5xl font-bold tracking-tight text-white leading-none">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                    onClick={refreshBalance}
                                >
                                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                                </Button>
                            </div>

                            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                                <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-1">Your Personal UPI ID</p>
                                <p className="text-white font-mono font-bold tracking-tight">{upiId || 'Generating...'}</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <Button
                                    disabled={isFrozen}
                                    className="w-full bg-white text-primary hover:bg-primary-foreground border-0 font-bold shadow-lg transition-all active:scale-95"
                                    onClick={() => {
                                        setTransactionFormData({ upi: '', amount: '' });
                                        setTransactionFormOpen(true);
                                    }}
                                >
                                    {isFrozen ? <Ban className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                    {isFrozen ? "Frozen" : "Send Money"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions Section - col-span-2 */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                            <QRScanner
                                onScan={handleQRScan}
                                trigger={
                                    <Button variant="outline" className="h-full bg-card hover:bg-secondary/40 border-border/50 flex flex-col items-center justify-center p-6 gap-4 transition-all hover:scale-[1.02] shadow-sm">
                                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                                            <QrCode className="h-8 w-8 text-primary" />
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-lg font-bold">Scan & Pay</span>
                                            <span className="text-xs text-muted-foreground mt-1">Instant QR payments</span>
                                        </div>
                                    </Button>
                                }
                            />

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="h-full bg-card hover:bg-secondary/40 border-border/50 flex flex-col items-center justify-center p-6 gap-4 transition-all hover:scale-[1.02] shadow-sm">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center shadow-inner">
                                            <History className="h-8 w-8 text-blue-500" />
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-lg font-bold">Transactions</span>
                                            <span className="text-xs text-muted-foreground mt-1">View history & status</span>
                                        </div>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Transaction History</DialogTitle>
                                        <DialogDescription>
                                            Monitor your financial footprint and security audits.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="mt-4">
                                        <TransactionTable transactions={transactions || []} isLoading={isTransactionsLoading} />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                {/* Panic Controls - NOW AT TOP */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                        <h2 className="text-xl font-display font-bold text-destructive uppercase tracking-widest">Emergency Panic Controls</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className={cn(
                            "relative overflow-hidden transition-all duration-500 border-2 cursor-pointer group",
                            isFrozen
                                ? "border-destructive bg-destructive/5 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                                : "border-destructive/20 hover:border-destructive hover:bg-destructive/5 shadow-sm"
                        )} onClick={() => setIsFrozen(!isFrozen)}>
                            <div className="p-6 flex items-center justify-between relative z-10">
                                <div className="space-y-1">
                                    <h3 className={cn("text-lg font-bold transition-colors", isFrozen ? "text-destructive" : "text-foreground")}>
                                        {isFrozen ? "Wallet Security Mode Active" : "Freeze Outgoing Funds"}
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {isFrozen ? "Manual unlock required to restore payments" : "Halt all transactions in case of suspicious activity"}
                                    </p>
                                </div>
                                <div className={cn(
                                    "p-4 rounded-2xl transition-all duration-500",
                                    isFrozen ? "bg-destructive text-white scale-110 shadow-lg" : "bg-destructive/10 text-destructive group-hover:scale-110"
                                )}>
                                    {isFrozen ? <CheckCircle2 className="h-7 w-7" /> : <Ban className="h-7 w-7" />}
                                </div>
                            </div>
                        </Card>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Card className="border-2 border-orange-500/20 hover:border-orange-500 hover:bg-orange-500/5 transition-all duration-300 shadow-sm cursor-pointer group">
                                    <div className="p-6 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-bold text-foreground">Report Incident</h3>
                                            <p className="text-xs text-muted-foreground font-medium">Direct reporting to bank and cyber-cell</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-orange-500/10 text-orange-500 group-hover:scale-110 transition-transform shadow-sm">
                                            <FileWarning className="h-7 w-7" />
                                        </div>
                                    </div>
                                </Card>
                            </DialogTrigger>
                            <DialogContent>
                                <ReportFraudForm initialUpiId={lastTransactionUpi} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* RBI Security Quest - NOW BELOW PANIC CONTROL */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Gamepad2 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-display font-bold text-foreground">RBI Kehta Hai: Security Quest</h2>
                                <p className="text-sm text-muted-foreground font-medium">Test your skills with interactive randomized security challenges</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            className="text-primary font-bold hover:bg-primary/5 transition-colors"
                            onClick={() => window.open('https://rbikehtahai.rbi.org.in/', '_blank')}
                        >
                            Official RBI Portal <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {RBI_FLASHCARDS_DATA.map((cat) => (
                            <FlashCard key={cat.id} category={cat} />
                        ))}
                    </div>
                </div>



                {/* Off-canvas New Transaction Form */}
                <NewTransactionForm
                    trigger={null}
                    open={transactionFormOpen}
                    onOpenChange={setTransactionFormOpen}
                    defaultUpi={transactionFormData.upi}
                    defaultAmount={transactionFormData.amount}
                    onSuccess={handleTransactionSuccess}
                    isWalletFrozen={isFrozen}
                    currentBalance={balance}
                />
            </div>
        </DashboardLayout>
    );
}
