import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, PlayCircle } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/hooks/use-toast';

export default function SOSSettings() {
    const {
        sosVisible, setSosVisible,
        shakeDetectionEnabled, setShakeDetectionEnabled,
        alarmEnabled, setAlarmEnabled
    } = useSettings();
    const { toast } = useToast();

    const handleTestAlarm = () => {
        toast({
            title: "Test Alarm Triggered",
            description: "Alarm sound is playing (Mock). check volume.",
        });
        // Simulating alarm
        const audio = new Audio('/alarm-sound.mp3'); // Mock path, won't play if missing but safe
        audio.play().catch(e => console.log('Audio test skipped', e));
    };

    return (
        <DashboardLayout variant="user">
            <div className="p-8 space-y-8 animate-fade-in max-w-3xl mx-auto">
                <div className="space-y-2">
                    <h1 className="text-3xl font-display font-bold text-foreground">SOS & Emergency Controls</h1>
                    <p className="text-muted-foreground">Configure how and when your emergency alerts are triggered.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-destructive" />
                            Emergency Features
                        </CardTitle>
                        <CardDescription>Manage visibility and triggers for the SOS system</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Floating Button Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="sos-visible" className="text-base">Show Floating SOS Button</Label>
                                <p className="text-sm text-muted-foreground">Keep the red SOS button visible on screen at all times</p>
                            </div>
                            <Switch
                                id="sos-visible"
                                checked={sosVisible}
                                onCheckedChange={setSosVisible}
                            />
                        </div>
                        <Separator />

                        {/* Shake Detection */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="shake-detection" className="text-base">Shake Detection</Label>
                                    <Badge variant="outline" className="text-xs">Beta</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">Trigger SOS by shaking device vigorously</p>
                            </div>
                            <Switch
                                id="shake-detection"
                                checked={shakeDetectionEnabled}
                                onCheckedChange={setShakeDetectionEnabled}
                            />
                        </div>
                        <Separator />

                        {/* Auto Alarm */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="alarm-enabled" className="text-base">Auto-Alarm Sound</Label>
                                <p className="text-sm text-muted-foreground">Play loud siren automatically when SOS is activated</p>
                            </div>
                            <Switch
                                id="alarm-enabled"
                                checked={alarmEnabled}
                                onCheckedChange={setAlarmEnabled}
                            />
                        </div>

                        {!sosVisible && !shakeDetectionEnabled && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3">
                                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                                <div>
                                    <p className="font-semibold text-destructive">Emergency Access Limited</p>
                                    <p className="text-sm text-destructive/80">You have disabled both the button and shake detection. You may not be able to trigger SOS quickly.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>System Test</CardTitle>
                        <CardDescription>Verify your safety systems are working correctly</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={handleTestAlarm} className="w-full sm:w-auto">
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Test Alarm Sound
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
