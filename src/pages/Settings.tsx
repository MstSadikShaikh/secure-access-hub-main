import { DashboardLayout } from "@/components/DashboardLayout";
import { UserSettings } from "@/components/UserSettings";

export default function Settings() {
    return (
        <DashboardLayout variant="user">
            <div className="p-8 space-y-6 animate-fade-in max-w-4xl mx-auto">
                <div className="space-y-2">
                    <h1 className="text-3xl font-display font-bold text-foreground">Account Settings</h1>
                    <p className="text-muted-foreground">Manage your profile, security, and notification preferences.</p>
                </div>
                <UserSettings />
            </div>
        </DashboardLayout>
    );
}
