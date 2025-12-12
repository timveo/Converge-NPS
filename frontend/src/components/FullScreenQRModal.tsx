import { Copy, Download, Share2, WifiOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QRCode from "react-qr-code";
import { toast } from "sonner";

interface FullScreenQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    id: string;
    full_name: string;
    organization?: string | null;
    show_organization?: boolean | null;
    allow_qr_scan?: boolean | null;
  };
  qrData: string;
  isOffline?: boolean;
}

const FullScreenQRModal = ({ 
  open, 
  onOpenChange, 
  profile, 
  qrData,
  isOffline = false 
}: FullScreenQRModalProps) => {
  const manualCode = profile.id.slice(0, 8).toUpperCase();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(manualCode);
    toast.success("Code copied!", {
      description: "Manual code copied to clipboard",
    });
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('fullscreen-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.fillStyle = 'white';
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 50, 50, 300, 300);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr-code-${profile.full_name.replace(/\s/g, '-')}.png`;
        link.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    
    toast.info("Downloading...", {
      description: "Your QR code is being downloaded",
    });
  };

  const handleShareQR = async () => {
    const shareData = {
      title: 'My Event QR Code',
      text: `Connect with me at the event! Manual code: ${manualCode}`,
      url: `${window.location.origin}/connection/${profile.id}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(shareData.url);
          toast.success("Link copied!", {
            description: "Profile link copied to clipboard",
          });
        }
      }
    } else {
      navigator.clipboard.writeText(shareData.url);
      toast.success("Link copied!", {
        description: "Profile link copied to clipboard",
      });
    }
  };

  const showOrganization = profile.show_organization !== false;
  const allowQrScan = profile.allow_qr_scan !== false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">My QR Code</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Offline indicator */}
          {isOffline && (
            <Badge variant="secondary" className="gap-1">
              <WifiOff className="w-3 h-3" />
              Offline - Using Cached Data
            </Badge>
          )}

          {/* Privacy warning if QR scanning disabled */}
          {!allowQrScan && (
            <Alert variant="destructive" className="w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>QR Scanning Disabled</AlertTitle>
              <AlertDescription className="text-xs">
                You've disabled QR code scanning in your privacy settings. 
                Others will see limited information when they scan your code.
              </AlertDescription>
            </Alert>
          )}

          {/* Large QR code for easy scanning */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <QRCode
              id="fullscreen-qr-code"
              value={qrData}
              size={280}
              level="H"
            />
          </div>

          {/* User info overlay */}
          <div className="text-center">
            <p className="font-semibold text-lg">{profile.full_name}</p>
            {showOrganization && profile.organization ? (
              <p className="text-muted-foreground">{profile.organization}</p>
            ) : !showOrganization ? (
              <p className="text-xs text-muted-foreground italic">
                Organization hidden per privacy settings
              </p>
            ) : null}
          </div>

          {/* Manual code fallback */}
          <div className="w-full">
            <Label className="text-xs text-muted-foreground">
              Manual Code (if scan fails)
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={manualCode}
                readOnly
                className="font-mono text-center text-lg tracking-wider"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCopyCode}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownloadQR}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleShareQR}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullScreenQRModal;
