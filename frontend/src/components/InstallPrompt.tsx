import { useState, useEffect } from 'react';
import { X, Download, Smartphone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    // Check if user has already dismissed or installed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;

    if (dismissed || isStandalone) {
      return;
    }

    // For iOS, show the prompt immediately since there's no beforeinstallprompt
    if (isIOS) {
      setShowPrompt(true);
      return;
    }

    // Listen for the beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default mini-infobar from appearing
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
      // Show our custom install prompt
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isIOS]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-fade-in md:left-auto md:right-4 md:w-96">
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary to-navy-light border-accent/50 shadow-lg">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-tech-cyan/10 to-transparent pointer-events-none" />
        
        <div className="relative p-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex items-start gap-4 pr-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-tech-cyan flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-6 w-6 text-white" />
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-lg text-primary-foreground mb-1">
                Install Converge@NPS
              </h3>
              <p className="text-sm text-primary-foreground/90 mb-4">
                Get quick access and work offline. Install the app for the best experience!
              </p>

              <div className="flex gap-2">
                {isIOS ? (
                  <Link to="/install">
                    <Button
                      size="sm"
                      className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      See Instructions
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={handleInstallClick}
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Install
                  </Button>
                )}
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="outline"
                  className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Not Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InstallPrompt;
