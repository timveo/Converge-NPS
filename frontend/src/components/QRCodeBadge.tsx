import { useState, useMemo } from "react";
import { QrCode, Maximize2, WifiOff } from "lucide-react";
import QRCode from "react-qr-code";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface QRCodeBadgeProps {
  user: {
    name: string;
    role: string;
    uuid: string;
    event: string;
    org?: string;
    bio?: string;
    interests?: string[];
    linkedin?: string;
    show_organization?: boolean | null;
    allow_qr_scan?: boolean | null;
  };
  isOffline?: boolean;
}

const QRCodeBadge = ({ user, isOffline = false }: QRCodeBadgeProps) => {
  const [showFullScreen, setShowFullScreen] = useState(false);

  // Generate QR data - simplified payload with just user ID
  const qrData = useMemo(() => {
    return JSON.stringify({
      type: "converge-nps-profile",
      id: user.uuid,
      v: 1
    });
  }, [user.uuid]);

  const manualCode = user.uuid.slice(0, 8).toUpperCase();

  return (
    <>
      <div className="space-y-2 md:space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base md:text-xl font-bold text-foreground">{user.name}</h2>
            <p className="text-[11px] md:text-sm text-muted-foreground">{user.role}</p>
          </div>
          {isOffline && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <WifiOff className="w-3 h-3" />
              Offline
            </Badge>
          )}
        </div>

        {/* Tappable QR code area - compact on mobile */}
        <div
          className="flex flex-col items-center justify-center py-2 md:py-6 bg-gradient-subtle rounded-xl border border-border/50 cursor-pointer hover:shadow-lg transition-shadow group"
          onClick={() => setShowFullScreen(true)}
        >
          <div className="bg-white p-2 md:p-4 rounded-lg md:rounded-xl shadow-md mb-2 md:mb-4 relative">
            <QRCode
              id="qr-code-svg"
              value={qrData}
              size={130}
              className="w-[110px] h-[110px] md:w-[160px] md:h-[160px]"
              level="H"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg md:rounded-xl">
              <Maximize2 className="w-6 h-6 md:w-8 md:h-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[9px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Manual Code</p>
            <p className="text-xs md:text-lg font-mono font-semibold text-primary tracking-wider">{manualCode}</p>
          </div>
        </div>

        <div className="bg-secondary/50 p-2 md:p-4 rounded-lg">
          <div className="flex items-start gap-2 md:gap-3">
            <QrCode className="h-4 w-4 md:h-5 md:w-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-[11px] md:text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-0.5 md:mb-1">Your Digital Badge</p>
              <p className="text-[10px] md:text-xs hidden sm:block">Tap the QR code to view full screen for easier scanning.</p>
              <p className="text-[10px] sm:hidden">Tap to enlarge</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen QR Modal */}
      <Dialog open={showFullScreen} onOpenChange={setShowFullScreen}>
        <DialogContent className="max-w-md p-6 bg-white dark:bg-card">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold">{user.name}</h3>
            {user.org && user.show_organization !== false && (
              <p className="text-sm text-muted-foreground">{user.org}</p>
            )}
          </div>

          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <QRCode
                value={qrData}
                size={250}
                level="H"
              />
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Manual Code</p>
            <p className="text-2xl font-mono font-bold text-primary tracking-wider">{manualCode}</p>
          </div>

          {isOffline && (
            <div className="mt-4 flex justify-center">
              <Badge variant="secondary" className="gap-1">
                <WifiOff className="w-3 h-3" />
                Offline Mode
              </Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QRCodeBadge;
