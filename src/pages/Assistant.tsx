import { DashboardLayout } from '@/components/DashboardLayout';
import { AIChatbot } from '@/components/AIChatbot';

export default function Assistant() {
    return (
        <DashboardLayout variant="user">
            <div className="p-8 h-[calc(100vh-100px)] animate-fade-in flex flex-col">
                <div className="mb-4">
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">AI Security Assistant</h1>
                    <p className="text-muted-foreground">Your personal guide to digital safety.</p>
                </div>
                <div className="flex-1 min-h-0 border rounded-xl overflow-hidden shadow-sm bg-card">
                    <AIChatbot inline />
                </div>
            </div>
        </DashboardLayout>
    );
}
