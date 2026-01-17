import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, Phone, MapPin, Loader2, CheckCircle, X } from 'lucide-react';
import { useSOS } from '@/hooks/useSOS';
import { useShakeDetection } from '@/hooks/useShakeDetection';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';

export function SOSButton() {
  const [showPanel, setShowPanel] = useState(false);
  const { sosVisible, shakeDetectionEnabled } = useSettings();
  const {
    status,
    countdown,
    result,
    startCountdown,
    cancelCountdown,
    reset,
    handleShakeTrigger,
    isEnabled,
    isLoading
  } = useSOS();


  // Enable shake detection
  useShakeDetection({
    onShake: handleShakeTrigger,
    enabled: isEnabled && status === 'idle' && shakeDetectionEnabled,
  });

  if (!isEnabled || !sosVisible) return null;

  const handlePress = () => {
    if (status === 'idle') {
      setShowPanel(true);
      startCountdown();
    }
  };

  const handleCancel = () => {
    cancelCountdown();
    setShowPanel(false);
  };

  const handleClose = () => {
    reset();
    setShowPanel(false);
  };

  return (
    <>
      {/* Floating SOS Button */}
      <button
        onClick={handlePress}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full",
          "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
          "flex items-center justify-center shadow-lg",
          "transition-all duration-200 hover:scale-110",
          "animate-pulse-glow border-2 border-destructive-foreground/20",
          status !== 'idle' && "animate-none"
        )}
        aria-label="SOS Emergency Button"
      >
        <span className="font-bold text-sm">SOS</span>
      </button>

      {/* SOS Panel Dialog */}
      <Dialog open={showPanel} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-destructive/50">
          <div className={cn(
            "p-6 text-center",
            status === 'sent' ? "bg-success/10" : "bg-destructive/10"
          )}>
            {/* Countdown */}
            {status === 'countdown' && (
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-destructive flex items-center justify-center animate-pulse">
                  <span className="text-4xl font-bold text-destructive-foreground">{countdown}</span>
                </div>
                <h2 className="text-xl font-bold text-destructive">Sending SOS in {countdown}...</h2>
                <p className="text-sm text-muted-foreground">Tap cancel to stop</p>
                <Button variant="outline" onClick={handleCancel} className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}

            {/* Triggering */}
            {status === 'triggering' && (
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                  <Loader2 className="h-12 w-12 text-destructive animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-destructive">Sending Emergency Alerts...</h2>
                <p className="text-sm text-muted-foreground">Contacting your emergency contacts</p>
              </div>
            )}

            {/* Sent */}
            {status === 'sent' && result?.success && (
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-success" />
                </div>
                <h2 className="text-xl font-bold text-success">SOS Alert Sent!</h2>
                <p className="text-sm text-muted-foreground">{result.message}</p>
                {result.contactsNotified === 0 && (
                  <p className="text-xs text-warning">
                    ⚠️ No contacts were notified. Please add emergency contacts with email addresses in Settings.
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-destructive">Failed to Send</h2>
                <p className="text-sm text-muted-foreground">{result?.message}</p>
              </div>
            )}
          </div>

          {/* Emergency Call Buttons */}
          <div className="p-4 bg-card space-y-3">
            <p className="text-sm text-center text-muted-foreground mb-3">
              Or call emergency services directly:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <a href="tel:112" className="block">
                <Button variant="destructive" className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  Call 112
                </Button>
              </a>
              <a href="tel:100" className="block">
                <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  <Phone className="h-4 w-4 mr-2" />
                  Call 100
                </Button>
              </a>
            </div>

            {(status === 'sent' || status === 'error') && (
              <Button variant="ghost" onClick={handleClose} className="w-full mt-2">
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
