import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Smartphone, Apple, Chrome } from 'lucide-react';


interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallPWAGuideProps {
  triggerClassName?: string;
}

export function InstallPWAGuide({ triggerClassName }: InstallPWAGuideProps) {
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-foreground",
            triggerClassName
          )}
        >
          <Download className="h-4 w-4" />
          Install App
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Install Fraud Guard AI
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="android" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="android" className="flex items-center gap-1">
              <Smartphone className="h-4 w-4" />
              Android
            </TabsTrigger>
            <TabsTrigger value="ios" className="flex items-center gap-1">
              <Apple className="h-4 w-4" />
              iOS
            </TabsTrigger>
            <TabsTrigger value="desktop" className="flex items-center gap-1">
              <Chrome className="h-4 w-4" />
              Desktop
            </TabsTrigger>
          </TabsList>

          <TabsContent value="android" className="space-y-4 mt-4">
            {deferredPrompt && (
              <Button onClick={handleInstallClick} className="w-full bg-primary text-primary-foreground mb-4">
                <Download className="mr-2 h-4 w-4" />
                Install App Now
              </Button>
            )}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">For Chrome (Recommended)</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                  <span>Open this website in Chrome browser</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                  <span>Tap the <strong>three dots menu (⋮)</strong> at the top right</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                  <span>Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
                  <span>Tap <strong>"Add"</strong> to confirm installation</span>
                </li>
              </ol>
              <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                <p className="text-sm text-success">✓ The app will appear on your home screen like a regular app!</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ios" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">For Safari (Required)</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                  <span>Open this website in <strong>Safari</strong> browser (not Chrome)</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                  <span>Tap the <strong>Share button</strong> (square with arrow) at bottom</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
                  <span>Tap <strong>"Add"</strong> in the top right corner</span>
                </li>
              </ol>
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <p className="text-sm text-warning">⚠️ Note: On IOS, you must use Safari browser to install the app</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="desktop" className="space-y-4 mt-4">
            {deferredPrompt && (
              <Button onClick={handleInstallClick} className="w-full bg-primary text-primary-foreground mb-4">
                <Download className="mr-2 h-4 w-4" />
                Install App Now
              </Button>
            )}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">For Chrome / Edge</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                  <span>Look for the <strong>install icon</strong> in the address bar (right side)</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                  <span>Click it and select <strong>"Install"</strong></span>
                </li>
              </ol>
              <p className="text-sm text-muted-foreground">
                Or use menu: <strong>⋮ → More tools → Create shortcut</strong> (check "Open as window")
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold mb-2">Benefits of Installing</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Works offline for core features</li>
            <li>• Faster access from home screen</li>
            <li>• Full screen experience</li>
            <li>• Push notifications (coming soon)</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
