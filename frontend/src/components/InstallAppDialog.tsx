import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Smartphone,
  Share,
  Plus,
  CheckCircle2,
  ArrowLeft,
  Apple
} from "lucide-react";

interface InstallAppDialogProps {
  open: boolean;
  onClose: () => void;
}

type DialogStep = 'choose' | 'apple' | 'android';

const InstallAppDialog = ({ open, onClose }: InstallAppDialogProps) => {
  const [step, setStep] = useState<DialogStep>('choose');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Listen for the beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Reset step when dialog opens
  useEffect(() => {
    if (open) {
      setStep('choose');
    }
  }, [open]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      localStorage.setItem('pwa-install-dismissed', 'true');
    }
    setDeferredPrompt(null);
  };

  const handleSkip = () => {
    onClose();
  };

  const handleFinish = () => {
    onClose();
  };

  const tips = [
    "Quick access on your home screen",
    "Works offline with automatic sync",
    "Better experience and performance"
  ];

  // Platform selection screen
  if (step === 'choose' && !isInstalled) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[calc(100%-24px)] max-w-[500px] md:max-w-[550px] max-h-[85vh] overflow-y-auto p-4 md:p-6 rounded-xl">
          <DialogHeader className="pb-2 md:pb-3">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <div className="p-2 md:p-3 rounded-full bg-primary/10 text-accent">
                <Smartphone className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base md:text-xl">Install the App</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-[280px] md:min-h-[320px] py-3 md:py-4 flex flex-col">
            <DialogDescription className="text-sm md:text-base text-foreground leading-relaxed mb-3 md:mb-4">
              Install Converge@NPS on your device for a better experience.
            </DialogDescription>

            <div className="space-y-2 md:space-y-3 mt-2 md:mt-4">
              <p className="text-xs md:text-sm font-semibold text-foreground">Key Features:</p>
              {tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-xs md:text-sm text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 md:mt-6">
              <p className="text-xs md:text-sm font-semibold text-foreground mb-3 md:mb-4">Select your device:</p>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Button
                  variant="outline"
                  className="h-16 md:h-20 flex-col gap-1.5 md:gap-2 hover:bg-primary/5 hover:border-primary"
                  onClick={() => setStep('apple')}
                >
                  <Apple className="h-6 w-6 md:h-8 md:w-8" />
                  <span className="font-semibold text-xs md:text-sm">Apple</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 md:h-20 flex-col gap-1.5 md:gap-2 hover:bg-primary/5 hover:border-primary"
                  onClick={() => setStep('android')}
                >
                  <Smartphone className="h-6 w-6 md:h-8 md:w-8" />
                  <span className="font-semibold text-xs md:text-sm">Android</span>
                </Button>
              </div>
            </div>

            <div className="flex-1" />
          </div>

          <DialogFooter className="pt-2 md:pt-3 border-t border-border/50">
            <Button variant="ghost" onClick={handleSkip} className="h-11 md:h-10 text-xs md:text-sm">
              Skip for now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Apple (iOS) instructions
  if (step === 'apple') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[calc(100%-24px)] max-w-[500px] md:max-w-[550px] max-h-[85vh] overflow-y-auto p-4 md:p-6 rounded-xl">
          <DialogHeader className="pb-2 md:pb-3">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <div className="p-2 md:p-3 rounded-full bg-primary/10 text-accent">
                <Apple className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base md:text-xl">iPhone / iPad</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-[280px] md:min-h-[320px] py-3 md:py-4 flex flex-col">
            <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
              Follow these steps using Safari browser.
            </p>

            <div className="space-y-3 md:space-y-4">
              {/* Step 1 */}
              <div className="flex gap-2.5 md:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-primary to-navy-light flex items-center justify-center text-primary-foreground font-bold text-xs md:text-sm">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm md:text-base mb-0.5 md:mb-1">Open in Safari</h3>
                  <p className="text-[11px] md:text-sm text-muted-foreground">
                    Make sure you're in <strong>Safari</strong> browser.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-2.5 md:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-primary to-navy-light flex items-center justify-center text-primary-foreground font-bold text-xs md:text-sm">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm md:text-base mb-0.5 md:mb-1">Tap Share Button</h3>
                  <p className="text-[11px] md:text-sm text-muted-foreground mb-1.5 md:mb-2">
                    Tap the Share button in Safari's toolbar.
                  </p>
                  <div className="flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 bg-muted rounded-lg w-fit">
                    <Share className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <span className="text-[10px] md:text-sm font-medium">Share icon</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-2.5 md:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-primary to-navy-light flex items-center justify-center text-primary-foreground font-bold text-xs md:text-sm">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm md:text-base mb-0.5 md:mb-1">Add to Home Screen</h3>
                  <p className="text-[11px] md:text-sm text-muted-foreground mb-1.5 md:mb-2">
                    Scroll and tap "Add to Home Screen".
                  </p>
                  <div className="flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 bg-muted rounded-lg w-fit">
                    <Plus className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <span className="text-[10px] md:text-sm font-medium">Add to Home Screen</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-2.5 md:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-military-green to-accent flex items-center justify-center text-primary-foreground font-bold text-xs md:text-sm">
                    4
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm md:text-base mb-0.5 md:mb-1">Confirm</h3>
                  <p className="text-[11px] md:text-sm text-muted-foreground">
                    Tap "Add" in the top-right. Done!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1" />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 md:pt-3 border-t border-border/50">
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => setStep('choose')} className="gap-1 md:gap-2 h-11 md:h-10 text-xs md:text-sm">
                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Back
              </Button>
              <Button onClick={handleFinish} className="flex-1 h-11 md:h-10 text-xs md:text-sm">
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Android instructions
  if (step === 'android') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[calc(100%-24px)] max-w-[500px] md:max-w-[550px] max-h-[85vh] overflow-y-auto p-4 md:p-6 rounded-xl">
          <DialogHeader className="pb-2 md:pb-3">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <div className="p-2 md:p-3 rounded-full bg-primary/10 text-accent">
                <Smartphone className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base md:text-xl">Android</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-[280px] md:min-h-[320px] py-3 md:py-4 flex flex-col">
            <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
              Follow these steps using Chrome browser.
            </p>

            <div className="space-y-3 md:space-y-4">
              {/* Step 1 */}
              <div className="flex gap-2.5 md:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-primary to-navy-light flex items-center justify-center text-primary-foreground font-bold text-xs md:text-sm">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm md:text-base mb-0.5 md:mb-1">Look for Install Banner</h3>
                  <p className="text-[11px] md:text-sm text-muted-foreground">
                    Chrome may show an "Install" banner at the bottom.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-2.5 md:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-primary to-navy-light flex items-center justify-center text-primary-foreground font-bold text-xs md:text-sm">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm md:text-base mb-0.5 md:mb-1">Or Use Chrome Menu</h3>
                  <p className="text-[11px] md:text-sm text-muted-foreground mb-1.5 md:mb-2">
                    Tap menu (⋮) → "Add to Home Screen".
                  </p>
                  <div className="flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 bg-muted rounded-lg w-fit">
                    <span className="text-base md:text-lg font-bold text-primary">⋮</span>
                    <span className="text-[10px] md:text-sm font-medium">Chrome menu</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-2.5 md:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-military-green to-accent flex items-center justify-center text-primary-foreground font-bold text-xs md:text-sm">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm md:text-base mb-0.5 md:mb-1">Confirm</h3>
                  <p className="text-[11px] md:text-sm text-muted-foreground">
                    Tap "Install" or "Add". The app appears on home screen!
                  </p>
                </div>
              </div>
            </div>

            {deferredPrompt && (
              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <p className="text-xs md:text-sm font-medium mb-2 md:mb-3">Quick Install Available!</p>
                <Button onClick={handleInstallClick} className="w-full gap-1.5 md:gap-2 h-11 md:h-10 text-xs md:text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Install Now
                </Button>
              </div>
            )}

            <div className="flex-1" />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 md:pt-3 border-t border-border/50">
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => setStep('choose')} className="gap-1 md:gap-2 h-11 md:h-10 text-xs md:text-sm">
                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Back
              </Button>
              <Button onClick={handleFinish} className="flex-1 h-11 md:h-10 text-xs md:text-sm">
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Already installed state
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-24px)] max-w-[500px] md:max-w-[550px] max-h-[85vh] overflow-y-auto p-4 md:p-6 rounded-xl">
        <DialogHeader className="pb-2 md:pb-3">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <div className="p-2 md:p-3 rounded-full bg-green-500/10 text-green-500">
              <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base md:text-xl">Already Installed!</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-[280px] md:min-h-[320px] py-3 md:py-4 flex flex-col">
          <DialogDescription className="text-sm md:text-base text-foreground leading-relaxed mb-3 md:mb-4">
            Great! You've already installed Converge@NPS. Enjoy quick access and offline support!
          </DialogDescription>

          <div className="p-3 md:p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-xs md:text-sm text-muted-foreground">
              You're all set with quick access from your home screen.
            </p>
          </div>

          <div className="flex-1" />
        </div>

        <DialogFooter className="pt-2 md:pt-3 border-t border-border/50">
          <Button onClick={handleFinish} className="w-full h-11 md:h-10 text-xs md:text-sm">
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InstallAppDialog;
