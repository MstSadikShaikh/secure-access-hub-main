import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck, AlertCircle, Info, XCircle } from 'lucide-react';

const COLORS = ['hsl(174, 72%, 46%)', 'hsl(0, 72%, 51%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(142, 76%, 36%)'];

const FRAUD_DETAILS: Record<string, { info: string; example: string; prevention: string }> = {
  'Impersonation': {
    info: "Scammers pretend to be someone you trust (bank official, relative, or tech support) to steal your information or money.",
    example: "Receiving a call from someone claiming to be from your bank's fraud department, asking for your OTP to 'unblock' your account.",
    prevention: "Never share OTPs or passwords over the phone. Verify caller identity by calling the official customer care number yourself."
  },
  'Phishing': {
    info: "Sending fraudulent communications that appear to come from a reputable source, usually through email, SMS, or WhatsApp.",
    example: "An email saying your account will be suspended unless you click a link and 'verify' your login credentials on a fake website.",
    prevention: "Always check the sender's address. Hover over links to see the true destination. Use multi-factor authentication (MFA)."
  },
  'Social Engineering': {
    info: "Manipulating people into giving up confidential information by exploiting human psychology, urgency, or trust.",
    example: "A 'friend' on social media asks for an urgent loan via UPI, but their account was actually hacked by a scammer.",
    prevention: "Be skeptical of urgent requests. Always verify by calling the person directly on their known phone number."
  },
  'Fake QR': {
    info: "Tricking users into scanning a QR code that installs malware or initiates an unauthorized 'money-out' transaction.",
    example: "Scanning a QR code at a parking lot that promises a discount but instead triggers a payment request from your wallet.",
    prevention: "Remember: Scanning a QR is for SENDING money, not receiving. Only scan codes from verified, trusted sources."
  },
  'Other': {
    info: "Miscellaneous fraud types including lottery scams, job offer scams, and investment/crypto frauds.",
    example: "A WhatsApp message promising a high-paying job for just completing small tasks and paying a 'registration fee'.",
    prevention: "If it sounds too good to be true, it probably is. Never pay money to receive a prize or a job offer."
  }
};

interface FraudStatsProps {
  data?: { category: string; count: number }[];
}

export function FraudCategoryChart({ data = [] }: FraudStatsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const chartData = data.length > 0 ? data : [
    { category: 'Phishing', count: 45 },
    { category: 'Impersonation', count: 28 },
    { category: 'Fake QR', count: 15 },
    { category: 'Social Engineering', count: 8 },
    { category: 'Other', count: 4 },
  ];

  const handleSliceClick = (data: any) => {
    if (data && data.category) {
      setSelectedCategory(data.category);
    }
  };

  return (
    <>
      <Card className="h-full border-2 bg-gradient-to-br from-card to-secondary/10">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-primary" />
            Fraud by Category
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time distribution of reported fraud types
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  onClick={handleSliceClick}
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="hover:opacity-80 transition-opacity outline-none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Click on a category to learn more and stay protected
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="sm:max-w-[425px] border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display flex items-center gap-2">
              <Info className="h-6 w-6 text-primary" />
              {selectedCategory}
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Understanding and preventing this type of fraud.
            </DialogDescription>
          </DialogHeader>

          {selectedCategory && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-2 uppercase tracking-wider">
                  <Info className="h-4 w-4" /> What is it?
                </h4>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {FRAUD_DETAILS[selectedCategory].info}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-destructive flex items-center gap-2 uppercase tracking-wider">
                  <XCircle className="h-4 w-4" /> Real-world Example
                </h4>
                <p className="text-sm text-foreground/80 italic border-l-2 border-destructive/30 pl-3">
                  "{FRAUD_DETAILS[selectedCategory].example}"
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-green-500 flex items-center gap-2 uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4" /> How to Prevent
                </h4>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {FRAUD_DETAILS[selectedCategory].prevention}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TransactionTrendChart() {
  const data = [
    { day: 'Mon', transactions: 120, flagged: 5 },
    { day: 'Tue', transactions: 150, flagged: 8 },
    { day: 'Wed', transactions: 180, flagged: 3 },
    { day: 'Thu', transactions: 140, flagged: 12 },
    { day: 'Fri', transactions: 200, flagged: 6 },
    { day: 'Sat', transactions: 90, flagged: 2 },
    { day: 'Sun', transactions: 70, flagged: 1 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Weekly Transaction Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Bar dataKey="transactions" fill="hsl(174, 72%, 46%)" name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="flagged" fill="hsl(0, 72%, 51%)" name="Flagged" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function RiskScoreTimeline() {
  const data = [
    { time: '00:00', score: 0.2 },
    { time: '04:00', score: 0.15 },
    { time: '08:00', score: 0.4 },
    { time: '12:00', score: 0.6 },
    { time: '16:00', score: 0.35 },
    { time: '20:00', score: 0.5 },
    { time: '24:00', score: 0.25 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Risk Score Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 1]} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Line type="monotone" dataKey="score" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(38, 92%, 50%)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function RegionHeatmap() {
  const regions = [
    { name: 'Maharashtra', fraud: 85, color: 'bg-destructive' },
    { name: 'Delhi NCR', fraud: 72, color: 'bg-destructive/80' },
    { name: 'Karnataka', fraud: 45, color: 'bg-warning' },
    { name: 'Tamil Nadu', fraud: 38, color: 'bg-warning/80' },
    { name: 'Gujarat', fraud: 25, color: 'bg-info' },
    { name: 'West Bengal', fraud: 20, color: 'bg-info/80' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fraud Heatmap by Region</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {regions.map((region) => (
            <div key={region.name} className="flex items-center gap-3">
              <span className="text-sm w-28 truncate">{region.name}</span>
              <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full ${region.color} transition-all`}
                  style={{ width: `${region.fraud}%` }}
                />
              </div>
              <span className="text-sm font-medium w-10 text-right">{region.fraud}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
