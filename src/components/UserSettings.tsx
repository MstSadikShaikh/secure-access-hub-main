import { useState, useEffect } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, User, Bell, Shield, Loader2, Save, AlertTriangle, Phone, Mail } from 'lucide-react';
import { EmergencyContactsManager } from './EmergencyContactsManager';

export function UserSettings() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile, sosEnabled, shakeDetectionEnabled, alarmEnabled } = useUserSettings();

  // Form states
  const [fullName, setFullName] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sosEnabledLocal, setSosEnabledLocal] = useState(true);
  const [shakeDetectionLocal, setShakeDetectionLocal] = useState(true);
  const [alarmEnabledLocal, setAlarmEnabledLocal] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Load profile data
  useEffect(() => {
    if (!isLoading) {
      setFullName(profile?.full_name || '');
      setNotificationEmail(profile?.notification_email || '');
      setPhone(profile?.phone || '');
      setSosEnabledLocal(sosEnabled);
      setShakeDetectionLocal(shakeDetectionEnabled);
      setAlarmEnabledLocal(alarmEnabled);
    }
  }, [profile, isLoading, sosEnabled, shakeDetectionEnabled, alarmEnabled]);

  // Track changes
  useEffect(() => {
    if (!isLoading) {
      const changed =
        fullName !== (profile?.full_name || '') ||
        notificationEmail !== (profile?.notification_email || '') ||
        phone !== (profile?.phone || '') ||
        sosEnabledLocal !== sosEnabled ||
        shakeDetectionLocal !== shakeDetectionEnabled ||
        alarmEnabledLocal !== alarmEnabled;
      setHasChanges(changed);
    }
  }, [fullName, notificationEmail, phone, sosEnabledLocal, shakeDetectionLocal, alarmEnabledLocal, profile, isLoading, sosEnabled, shakeDetectionEnabled, alarmEnabled]);

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      full_name: fullName.trim() || undefined,
      notification_email: notificationEmail.trim() || undefined,
      phone: phone.trim() || undefined,
      sos_enabled: sosEnabledLocal,
      shake_detection_enabled: shakeDetectionLocal,
      alarm_enabled: alarmEnabledLocal,
    });
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Manage your account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notificationEmail">Notification Email</Label>
              <div className="relative">
                <Bell className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="notificationEmail"
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="alerts@example.com"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Receive alerts at a different email
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SOS Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            SOS Emergency Settings
          </CardTitle>
          <CardDescription>
            Configure your emergency response preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="sos-enabled" className="text-base">SOS Feature</Label>
                <Badge variant={sosEnabledLocal ? 'default' : 'secondary'}>
                  {sosEnabledLocal ? 'ON' : 'OFF'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Enable or disable the SOS emergency button
              </p>
            </div>
            <Switch
              id="sos-enabled"
              checked={sosEnabledLocal}
              onCheckedChange={setSosEnabledLocal}
            />
          </div>

          {sosEnabledLocal && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="shake-detection" className="text-base">Shake Detection</Label>
                  <p className="text-sm text-muted-foreground">
                    Trigger SOS by shaking your device vigorously
                  </p>
                </div>
                <Switch
                  id="shake-detection"
                  checked={shakeDetectionLocal}
                  onCheckedChange={setShakeDetectionLocal}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="alarm-enabled" className="text-base">Alarm Sound</Label>
                  <p className="text-sm text-muted-foreground">
                    Play loud alarm when SOS is triggered
                  </p>
                </div>
                <Switch
                  id="alarm-enabled"
                  checked={alarmEnabledLocal}
                  onCheckedChange={setAlarmEnabledLocal}
                />
              </div>

              {!shakeDetectionLocal && !alarmEnabledLocal && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning">Limited Protection</p>
                    <p className="text-muted-foreground">
                      Consider enabling at least one additional safety feature
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {!sosEnabledLocal && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">SOS Disabled</p>
                <p className="text-muted-foreground">
                  You won't be able to send emergency alerts. Enable SOS for enhanced protection.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <EmergencyContactsManager />

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="shadow-lg"
            size="lg"
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
