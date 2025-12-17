import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  X, QrCode, Camera, Check, WifiOff, Bell, CheckCircle, AlertCircle,
  Keyboard, Sun, Maximize, Smartphone, CloudOff, Loader2, Lock, Mail,
  MessageCircle, ExternalLink, UserPlus, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { offlineQueue } from "@/lib/offlineQueue";
import { triggerHapticFeedback } from "@/lib/mobileUtils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ScanState = 'idle' | 'success' | 'error';
type CameraPermission = 'granted' | 'denied' | 'prompt' | 'checking';
type ScanStage = 'idle' | 'scanning' | 'intent' | 'preview';

// Exactly 5 collaboration types per spec
const collaborativeIntents = [
  { id: "collaborative_research", label: "Collaborative Research", description: "Academic partnership" },
  { id: "brainstorming", label: "Brainstorming", description: "Idea generation session" },
  { id: "design_sprint", label: "Design Sprint", description: "Rapid prototyping session" },
  { id: "hackathon", label: "Hackathon", description: "Collaborative coding event" },
  { id: "funded_research", label: "Funded Research", description: "Joint research project" }
];

export default function ScannerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Flow stages: 'idle' -> 'scanning' -> 'intent' -> 'preview'
  const [scanStage, setScanStage] = useState<ScanStage>('idle');
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [reminderTime, setReminderTime] = useState<string>("");
  const [scannedData, setScannedData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoadingProfile, _setIsLoadingProfile] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingScansCount, setPendingScansCount] = useState(0);
  const [cameraPermission, setCameraPermission] = useState<CameraPermission>('checking');
  const [scanError, setScanError] = useState<{ title: string; message: string } | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending scans count
  useEffect(() => {
    const loadPendingCount = async () => {
      const count = await offlineQueue.getPendingCount();
      setPendingScansCount(count);
    };
    loadPendingCount();
  }, []);

  // Check camera permission on mount and auto-start scanning if granted
  useEffect(() => {
    const checkCameraPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPermission(result.state as CameraPermission);

        result.addEventListener('change', () => {
          setCameraPermission(result.state as CameraPermission);
        });

        // Auto-start scanning if camera permission is already granted
        if (result.state === 'granted') {
          // Small delay to ensure component is fully mounted
          setTimeout(() => {
            handleStartScan();
          }, 100);
        }
      } catch {
        // Fallback for browsers that don't support permissions API
        setCameraPermission('prompt');
      }
    };
    checkCameraPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const requestCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      return true;
    } catch {
      setCameraPermission('denied');
      return false;
    }
  };

  const handleStartScan = async () => {
    // Check camera permission first
    if (cameraPermission === 'denied') {
      toast.error('Camera access denied. Please enable in settings or use manual entry.');
      return;
    }

    if (cameraPermission === 'prompt') {
      const granted = await requestCameraAccess();
      if (!granted) return;
    }

    setScanStage('scanning');
    setScanState('idle');
    setScanError(null);
    triggerHapticFeedback('light');
    // Scanner initialization moved to useEffect to wait for DOM
  };

  // Initialize scanner when scanStage changes to 'scanning'
  useEffect(() => {
    if (scanStage !== 'scanning') return;

    const initScanner = async () => {
      try {
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        const html5QrCode = new Html5Qrcode("qr-scanner-container");
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            await handleScanSuccess(decodedText);
          },
          () => {
            // Ignore errors during scanning (expected when no QR code in frame)
          }
        );
      } catch (err) {
        console.error('Camera error:', err);
        toast.error("Failed to access camera. Please allow camera permissions.");
        setScanStage('idle');
      }
    };

    initScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanStage]);

  const handleScanSuccess = async (decodedText: string) => {
    // Stop the scanner
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.stop().catch(() => {});
    }

    try {
      const qrData = JSON.parse(decodedText);

      // Handle the simplified QR format from QRCodeBadge: {type, id, v}
      // Also support legacy format with uuid field
      const userId = qrData.id || qrData.uuid;

      // Basic validation - expect id or uuid field
      if (!userId) {
        setScanState('error');
        triggerHapticFeedback('heavy');
        setScanError({
          title: 'Invalid QR Code',
          message: 'This QR code is not from the event app'
        });
        toast.error('Invalid QR code format');
        setTimeout(() => {
          setScanState('idle');
          setScanError(null);
        }, 2000);
        return;
      }

      // Validate type if present (for new format)
      if (qrData.type && qrData.type !== 'converge-nps-profile') {
        setScanState('error');
        triggerHapticFeedback('heavy');
        setScanError({
          title: 'Invalid QR Code',
          message: 'This QR code is not from the Converge app'
        });
        toast.error('Invalid QR code type');
        setTimeout(() => {
          setScanState('idle');
          setScanError(null);
        }, 2000);
        return;
      }

      // Success!
      setScanState('success');
      triggerHapticFeedback('medium');

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      // Store the QR code data (user ID) - profile will be fetched from backend
      setScannedData({
        uuid: userId,
        qrCodeData: decodedText, // Store raw QR data for backend
        name: qrData.name || 'Loading...',
        org: qrData.org || qrData.organization || '',
        role: qrData.role || '',
        bio: qrData.bio || '',
        interests: qrData.interests || qrData.acceleration_interests || [],
        linkedin: qrData.linkedin || qrData.linkedin_url || '',
        email: qrData.email || '',
        currentSessions: qrData.currentSessions || []
      });

      toast.success("QR Code Scanned Successfully!");

      // Go to intent selection (BEFORE profile preview)
      setTimeout(() => {
        setScanStage('intent');
      }, 500);

    } catch {
      setScanState('error');
      triggerHapticFeedback('heavy');
      setScanError({
        title: 'Cannot Read QR Code',
        message: 'Unable to parse QR code data'
      });
      toast.error('Unable to parse QR code data');
      setTimeout(() => {
        setScanState('idle');
        setScanError(null);
      }, 2000);
    }
  };

  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (manualCode.length < 4) {
      toast.error('Please enter a valid code (at least 4 characters)');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await api.post<{ profile: any }>(
        '/connections/manual/lookup',
        { code: manualCode }
      );

      const profile = (response as any).profile;

      setScannedData({
        uuid: profile?.id,
        name: profile?.fullName || 'Event Participant',
        org: profile?.organization || '',
        role: profile?.role || '',
        bio: profile?.bio || '',
        interests: profile?.accelerationInterests || [],
        linkedin: profile?.linkedinUrl || '',
        email: profile?.email || '',
        currentSessions: []
      });

      triggerHapticFeedback('medium');
      toast.success('Code accepted!');
      setShowManualEntry(false);
      setScanStage('intent');

    } catch (error) {
      console.error('Manual code error:', error);
      toast.error('Failed to process code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleIntent = (intentId: string) => {
    triggerHapticFeedback('light');
    setSelectedIntents(prev =>
      prev.includes(intentId)
        ? prev.filter(id => id !== intentId)
        : [...prev, intentId]
    );
  };

  const handleProceedToPreview = async () => {
    if (selectedIntents.length === 0) {
      toast.error("Please select at least one collaborative intent");
      return;
    }

    // Set profile data from scanned data
    setProfileData({
      id: scannedData?.uuid,
      full_name: scannedData?.name || 'Unknown Participant',
      organization: scannedData?.org,
      role: scannedData?.role,
      bio: scannedData?.bio,
      acceleration_interests: scannedData?.interests,
      linkedin_url: scannedData?.linkedin,
      email: scannedData?.email,
      allow_qr_scan: true,
      show_organization: true,
      show_role: true,
      share_email: !!scannedData?.email,
      allow_messaging: true
    });

    setScanStage('preview');
  };

  const handleSaveConnection = async () => {
    if (selectedIntents.length === 0) {
      toast.error("Please select at least one collaborative intent");
      return;
    }

    triggerHapticFeedback('medium');
    setIsProcessing(true);

    try {
      if (!user?.id) {
        toast.error("You must be logged in to save connections");
        setIsProcessing(false);
        return;
      }

      if (!scannedData?.uuid) {
        toast.error("Invalid QR code data");
        setIsProcessing(false);
        return;
      }

      // Calculate reminder timestamp if set
      let reminderTimestamp = null;
      if (reminderTime) {
        const now = new Date();
        switch (reminderTime) {
          case '1hour':
            reminderTimestamp = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
            break;
          case '1day':
            reminderTimestamp = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
            break;
          case '3days':
            reminderTimestamp = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case '1week':
            reminderTimestamp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
        }
      }

      if (isOffline) {
        await addToOfflineQueue();
        setIsProcessing(false);
        return;
      }

      await api.post('/connections/manual', {
        connectedUserId: scannedData.uuid,
        collaborativeIntents: selectedIntents,
        notes: note || null,
        connectionMethod: 'manual_entry',
      });


      toast.success("Connection saved successfully!" + (reminderTimestamp ? " Reminder set." : ""));

      // Navigate to connections page to see the new connection
      setTimeout(() => {
        handleClose();
        navigate('/connections');
      }, 1000);
    } catch (error: any) {
      console.error('Save connection error:', error);
      const errorMessage = error.response?.data?.error?.message || 'Failed to save connection';

      // If it's a network error or server error, try offline queue
      if (!error.response || error.response.status >= 500) {
        await addToOfflineQueue();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const addToOfflineQueue = async () => {
    try {
      if (!user?.id || !scannedData?.uuid) return;

      await offlineQueue.add(user.id, 'qr_scan', {
        qrCodeData: scannedData.qrCodeData || scannedData.uuid,
        collaborativeIntents: selectedIntents,
        notes: note || '',
      });

      toast.success(
        'Scan saved offline',
        {
          description: 'Will sync when connection restored',
          duration: 4000
        }
      );

      setPendingScansCount(prev => prev + 1);

      // Reset and close
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error) {
      console.error('Offline queue error:', error);
      toast.error("Failed to save to offline queue");
    }
  };

  const handleClose = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(() => {});
    }
    setScanStage('idle');
    setSelectedIntents([]);
    setNote("");
    setReminderTime("");
    setScannedData(null);
    setProfileData(null);
    setScanState('idle');
    setScanError(null);
    setShowManualEntry(false);
    setManualCode("");
  };

  const handleMessageUser = async () => {
    if (!profileData?.id || !profileData?.allow_messaging) return;

    const recipientId = profileData.id;

    handleClose();
    navigate('/messages', {
      state: { startConversationWithUserId: recipientId },
    });
  };

  // Check if profile has privacy limits
  const hasPrivacyLimits = profileData && (
    !profileData.share_email ||
    !profileData.show_organization ||
    !profileData.show_role ||
    !profileData.allow_qr_scan
  );

  // Intent selection screen (after scan, before preview)
  if (scanStage === 'intent') {
    return (
      <div className="min-h-screen bg-background/95 backdrop-blur-sm fixed inset-0 z-50 animate-fade-in overflow-y-auto">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-6 max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 md:mb-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-base md:text-xl font-bold text-foreground">Why are you connecting?</h2>
                <p className="text-xs md:text-sm text-muted-foreground">Select at least one intent</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-11 w-11 md:h-10 md:w-10">
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </div>

          {/* Intent Selection */}
          <Card className="p-3 md:p-6 mb-3 md:mb-6 shadow-lg">
            <div className="space-y-2 md:space-y-3 mb-3 md:mb-6">
              {collaborativeIntents.map((intent) => (
                <div
                  key={intent.id}
                  onClick={() => handleToggleIntent(intent.id)}
                  className={cn(
                    "flex items-start gap-2 md:gap-3 p-2.5 md:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200",
                    selectedIntents.includes(intent.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Checkbox
                    checked={selectedIntents.includes(intent.id)}
                    onCheckedChange={() => handleToggleIntent(intent.id)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-xs md:text-sm text-foreground">{intent.label}</div>
                    <div className="text-[10px] md:text-xs text-muted-foreground">{intent.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Note - 50 char limit */}
            <div className="mb-3 md:mb-6">
              <Label className="text-xs md:text-sm font-medium text-foreground mb-1.5 md:mb-2 block">
                Quick Note (Optional)
              </Label>
              <Textarea
                placeholder="E.g., Discuss AI project..."
                value={note}
                onChange={(e) => {
                  if (e.target.value.length <= 50) {
                    setNote(e.target.value);
                  }
                }}
                maxLength={50}
                className="resize-none h-12 md:h-16 text-sm"
              />
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1 text-right">{note.length}/50</p>
            </div>

            {/* Proceed Button - DISABLED until intent selected */}
            <Button
              onClick={handleProceedToPreview}
              disabled={selectedIntents.length === 0 || isLoadingProfile}
              className="w-full h-11 md:h-10 text-sm md:text-base"
            >
              {isLoadingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                  Loading...
                </>
              ) : selectedIntents.length === 0 ? (
                <>
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Select intent to continue
                </>
              ) : (
                'Continue to Preview'
              )}
            </Button>
          </Card>

          <Button variant="outline" onClick={handleClose} className="w-full h-11 md:h-10 text-sm md:text-base">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Profile preview screen (shows intents as confirmation)
  if (scanStage === 'preview') {
    const displayProfile = profileData || scannedData;
    const profileName = displayProfile?.full_name || displayProfile?.name || 'Unknown Participant';
    const profileOrg = displayProfile?.organization || displayProfile?.org || '';
    const profileRole = displayProfile?.role || '';
    const profileBio = displayProfile?.bio || '';
    const profileInterests = displayProfile?.acceleration_interests || displayProfile?.interests || [];
    const profileLinkedin = displayProfile?.linkedin_url || displayProfile?.linkedin || '';
    const profileEmail = displayProfile?.email || '';

    // Check if user has opted out of QR scanning
    if (profileData && profileData.allow_qr_scan === false) {
      return (
        <div className="min-h-screen bg-background/95 backdrop-blur-sm fixed inset-0 z-50 animate-fade-in overflow-y-auto">
          <div className="container mx-auto px-3 md:px-4 py-3 md:py-6 max-w-lg">
            <Card className="p-4 md:p-8 text-center space-y-3 md:space-y-4">
              <Lock className="w-12 h-12 md:w-16 md:h-16 mx-auto text-muted-foreground" />

              <div>
                <h3 className="text-base md:text-xl font-semibold mb-1 md:mb-2">
                  Participant #{(profileData.id || scannedData?.uuid || '').slice(0, 4).toUpperCase()}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">Event Attendee</p>
              </div>

              <Alert className="py-2 md:py-3">
                <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <AlertTitle className="text-sm">Limited Profile</AlertTitle>
                <AlertDescription className="text-xs md:text-sm">
                  This participant has opted out of contact sharing.
                </AlertDescription>
              </Alert>

              <Button variant="outline" onClick={handleClose} className="w-full h-9 md:h-10 text-sm">
                ← Back to Scanner
              </Button>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background/95 backdrop-blur-sm fixed inset-0 z-50 animate-fade-in overflow-y-auto">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-6 max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 md:mb-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
              </div>
              <div>
                <h2 className="text-base md:text-xl font-bold text-foreground">Review Connection</h2>
                <p className="text-xs md:text-sm text-muted-foreground">Confirm and save</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              {hasPrivacyLimits && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="gap-0.5 md:gap-1 text-xs">
                        <Lock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        Limited
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      This participant has limited their profile visibility
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 md:h-10 md:w-10">
                <X className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>

          {/* Profile Preview - Privacy Aware */}
          <Card className="p-3 md:p-6 mb-3 md:mb-6 shadow-lg border-accent/20 animate-scale-in">
            <div className="flex items-start gap-2.5 md:gap-4 mb-2.5 md:mb-4">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-base md:text-xl">
                {profileName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <h3 className="text-sm md:text-lg font-bold text-foreground">{profileName}</h3>
                  {hasPrivacyLimits && (
                    <Lock className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                  )}
                </div>

                {/* Role - Privacy Aware */}
                {profileData?.show_role !== false && profileRole ? (
                  <p className="text-xs md:text-sm text-muted-foreground">{profileRole}</p>
                ) : profileData?.show_role === false && (
                  <p className="text-[10px] md:text-xs text-muted-foreground italic">Role hidden</p>
                )}

                {/* Organization - Privacy Aware */}
                {profileData?.show_organization !== false && profileOrg ? (
                  <p className="text-xs md:text-sm text-muted-foreground">{profileOrg}</p>
                ) : profileData?.show_organization === false && (
                  <p className="text-[10px] md:text-xs text-muted-foreground italic">Organization hidden</p>
                )}
              </div>
            </div>

            {/* Contact Info - Privacy Aware */}
            <div className="space-y-1.5 md:space-y-2 mb-2.5 md:mb-4">
              {profileData?.share_email !== false && profileEmail ? (
                <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                  <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                  <a href={`mailto:${profileEmail}`} className="text-accent hover:underline truncate">
                    {profileEmail}
                  </a>
                </div>
              ) : profileData?.share_email === false && (
                <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="italic">Email hidden</span>
                </div>
              )}

              {profileData?.show_linkedin !== false && profileLinkedin && (
                <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                  <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                  <a
                    href={profileLinkedin.startsWith('http') ? profileLinkedin : `https://${profileLinkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    LinkedIn
                  </a>
                </div>
              )}
            </div>

            {profileBio && (
              <p className="text-xs md:text-sm text-muted-foreground mb-2.5 md:mb-4 line-clamp-2">{profileBio}</p>
            )}

            {/* Interests */}
            {profileInterests?.length > 0 && (
              <div className="mb-2.5 md:mb-4">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground mb-1 md:mb-2">Research Interests</p>
                <div className="flex flex-wrap gap-1 md:gap-2">
                  {profileInterests.slice(0, 4).map((interest: string) => (
                    <Badge key={interest} variant="outline" className="text-[10px] md:text-xs px-1.5 md:px-2">
                      {interest}
                    </Badge>
                  ))}
                  {profileInterests.length > 4 && (
                    <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 md:px-2">
                      +{profileInterests.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Connection Intent Confirmation (read-only) */}
          <Card className="p-3 md:p-6 mb-3 md:mb-6 shadow-lg">
            <div className="mb-2.5 md:mb-4">
              <h3 className="font-semibold text-sm md:text-lg text-foreground mb-0.5 md:mb-1">
                Your Connection Intent
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Review before saving
              </p>
            </div>

            {/* Display selected intents as badges */}
            <div className="mb-2.5 md:mb-4">
              <Label className="text-xs md:text-sm font-medium text-foreground mb-1.5 md:mb-2 block">Selected:</Label>
              <div className="flex flex-wrap gap-1 md:gap-2">
                {selectedIntents.map(intentId => {
                  const intent = collaborativeIntents.find(i => i.id === intentId);
                  return (
                    <Badge key={intentId} variant="secondary" className="px-2 md:px-3 py-0.5 md:py-1 text-xs">
                      {intent?.label || intentId}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Display note as read-only */}
            {note && (
              <div className="mb-2.5 md:mb-4">
                <Label className="text-xs md:text-sm font-medium text-foreground mb-1 md:mb-2 block">Note:</Label>
                <p className="text-xs md:text-sm text-muted-foreground italic bg-muted/50 p-2 md:p-3 rounded-lg">
                  "{note}"
                </p>
              </div>
            )}

            {/* Back to edit intents */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScanStage('intent')}
              className="mb-2.5 md:mb-4 h-7 md:h-8 text-xs md:text-sm"
            >
              ← Edit Intents
            </Button>

            {/* Follow-up Reminder */}
            <div>
              <label className="text-xs md:text-sm font-medium text-foreground mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2">
                <Bell className="h-3.5 w-3.5 md:h-4 md:w-4 text-accent" />
                Follow-up Reminder
              </label>
              <Select value={reminderTime} onValueChange={setReminderTime}>
                <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                  <SelectValue placeholder="No reminder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1hour">In 1 hour</SelectItem>
                  <SelectItem value="1day">Tomorrow</SelectItem>
                  <SelectItem value="3days">In 3 days</SelectItem>
                  <SelectItem value="1week">In 1 week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Offline indicator */}
          {isOffline && (
            <Alert className="mb-2.5 md:mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 py-2">
              <WifiOff className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-900 dark:text-yellow-100 text-sm">Offline</AlertTitle>
              <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-xs">
                Will sync when back online
              </AlertDescription>
            </Alert>
          )}

          {/* Primary Action */}
          <Button
            onClick={handleSaveConnection}
            className="w-full mb-2 md:mb-3 gap-2 h-11 md:h-12"
            size="lg"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Save Connection
              </>
            )}
          </Button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2 md:gap-3 mb-2 md:mb-3">
            {profileData?.allow_messaging !== false && (
              <Button
                variant="outline"
                onClick={handleMessageUser}
                className="gap-2 h-11 md:h-10 text-sm md:text-base"
              >
                <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
                Message
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleClose}
              className="gap-2 h-11 md:h-10 text-sm md:text-base"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Scanning screen
  if (scanStage === 'scanning') {
    return (
      <div className="min-h-screen bg-background/95 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
        <div className="container mx-auto px-3 md:px-4 max-w-md">
          <Card className="p-3 md:p-6 text-center shadow-2xl animate-scale-in">
            {/* Offline banner */}
            {isOffline && (
              <Alert className="mb-2.5 md:mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 py-2 md:py-3">
                <WifiOff className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertTitle className="text-yellow-900 dark:text-yellow-100 text-sm">Offline Mode</AlertTitle>
                <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-xs">
                  Scans will sync when back online
                </AlertDescription>
              </Alert>
            )}

            {/* Pending scans badge */}
            {isOffline && pendingScansCount > 0 && (
              <Badge variant="secondary" className="mb-2.5 md:mb-4 text-xs">
                <CloudOff className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" />
                {pendingScansCount} queued
              </Badge>
            )}

            {/* Camera viewfinder */}
            <div className="w-full aspect-square max-w-[280px] md:max-w-sm mx-auto mb-3 md:mb-6 relative overflow-hidden rounded-xl md:rounded-2xl">
              <div
                id="qr-scanner-container"
                ref={scannerContainerRef}
                className="w-full h-full"
              />

              {/* Scanning frame with state-based colors */}
              <div className={cn(
                "absolute inset-0 border-4 pointer-events-none transition-colors duration-300",
                {
                  "border-accent": scanState === 'idle',
                  "border-green-500": scanState === 'success',
                  "border-red-500": scanState === 'error'
                }
              )}>
                <div className={cn(
                  "absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 transition-colors duration-300",
                  {
                    "border-accent": scanState === 'idle',
                    "border-green-500": scanState === 'success',
                    "border-red-500": scanState === 'error'
                  }
                )} />
                <div className={cn(
                  "absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 transition-colors duration-300",
                  {
                    "border-accent": scanState === 'idle',
                    "border-green-500": scanState === 'success',
                    "border-red-500": scanState === 'error'
                  }
                )} />
                <div className={cn(
                  "absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 transition-colors duration-300",
                  {
                    "border-accent": scanState === 'idle',
                    "border-green-500": scanState === 'success',
                    "border-red-500": scanState === 'error'
                  }
                )} />
                <div className={cn(
                  "absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 transition-colors duration-300",
                  {
                    "border-accent": scanState === 'idle',
                    "border-green-500": scanState === 'success',
                    "border-red-500": scanState === 'error'
                  }
                )} />
              </div>

              {/* Success overlay */}
              {scanState === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 animate-in fade-in duration-300">
                  <div className="bg-green-500 rounded-full p-4">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {scanState === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 animate-in fade-in duration-300">
                  <div className="bg-red-500 rounded-full p-4">
                    <AlertCircle className="w-12 h-12 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {scanError && (
              <Alert variant="destructive" className="mb-2.5 md:mb-4 py-2">
                <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <AlertTitle className="text-sm">{scanError.title}</AlertTitle>
                <AlertDescription className="text-xs">{scanError.message}</AlertDescription>
              </Alert>
            )}

            <h3 className="text-base md:text-xl font-bold text-foreground mb-1 md:mb-2">Scanning QR Code...</h3>
            <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-6">
              Position QR code in frame
            </p>

            {/* Manual entry toggle */}
            <Button
              variant="outline"
              className="w-full mb-2.5 md:mb-4 h-9 md:h-10 text-sm"
              onClick={() => {
                if (html5QrCodeRef.current) {
                  html5QrCodeRef.current.stop().catch(() => {});
                }
                setScanStage('idle');
                setShowManualEntry(true);
              }}
            >
              <Keyboard className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              Enter Code Manually
            </Button>

            <Button variant="ghost" onClick={handleClose} className="h-9 md:h-10 text-sm">
              Cancel Scan
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Main screen - not scanning
  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 md:pb-24">
      {/* Header */}
      <div className="container mx-auto px-3 md:px-4 pt-4 md:pt-8 max-w-md">
        <Card className="p-3 md:p-4 shadow-md bg-gradient-navy text-primary-foreground mb-3 md:mb-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-11 w-11 md:h-10 md:w-10 text-primary-foreground hover:bg-primary/20">
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
            </Link>
            <h1 className="text-base md:text-xl font-bold">QR Scanner</h1>
          </div>
        </Card>
      </div>

      <div className="container mx-auto px-3 md:px-4 max-w-md space-y-2.5 md:space-y-4">
        {/* Offline banner */}
        {isOffline && (
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 py-2 md:py-3">
            <WifiOff className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertTitle className="text-yellow-900 dark:text-yellow-100 text-sm md:text-base">Offline Mode</AlertTitle>
            <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-xs md:text-sm">
              Scans will sync when back online
            </AlertDescription>
          </Alert>
        )}

        {/* Pending scans indicator */}
        {pendingScansCount > 0 && (
          <Alert className="py-2 md:py-3">
            <CloudOff className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <AlertTitle className="text-sm md:text-base">Pending Scans</AlertTitle>
            <AlertDescription className="text-xs md:text-sm">
              {pendingScansCount} scan{pendingScansCount !== 1 ? 's' : ''} waiting to sync
            </AlertDescription>
          </Alert>
        )}

        {/* Camera permission denied */}
        {cameraPermission === 'denied' && (
          <Alert variant="destructive" className="py-2 md:py-3">
            <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <AlertTitle className="text-sm md:text-base">Camera Access Denied</AlertTitle>
            <AlertDescription className="text-xs md:text-sm">
              Enable camera access in settings or use manual code entry.
            </AlertDescription>
          </Alert>
        )}

        {/* Main scanner card */}
        <Card className="p-4 md:p-8 text-center shadow-xl">
          <div className="w-20 h-20 md:w-32 md:h-32 mx-auto mb-4 md:mb-6 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg">
            <Camera className="h-10 w-10 md:h-16 md:w-16 text-primary-foreground" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1.5 md:mb-2">Scan QR Code</h2>
          <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-8">
            Connect with participants by scanning their badge
          </p>

          <Button
            onClick={handleStartScan}
            size="lg"
            className="w-full gap-1.5 md:gap-2 mb-2.5 md:mb-4 h-11 md:h-10 text-sm md:text-base"
            disabled={cameraPermission === 'checking'}
          >
            {cameraPermission === 'checking' ? (
              <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4 md:h-5 md:w-5" />
            )}
            {cameraPermission === 'checking' ? 'Checking...' : 'Start Scanning'}
          </Button>

          {/* Manual entry button */}
          <Button
            variant="outline"
            className="w-full mb-2.5 md:mb-4 h-9 md:h-10 text-sm"
            onClick={() => setShowManualEntry(!showManualEntry)}
          >
            <Keyboard className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
            Enter Code Manually
          </Button>

          {/* Manual entry form */}
          {showManualEntry && (
            <Card className="mt-2.5 md:mt-4 text-left">
              <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
                <form onSubmit={handleManualCodeSubmit} className="space-y-3 md:space-y-4">
                  <div>
                    <Label htmlFor="manual-code" className="text-xs md:text-sm">Manual Code</Label>
                    <Input
                      id="manual-code"
                      placeholder="A7F3D9C2"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                      maxLength={36}
                      className="font-mono text-center text-base md:text-lg h-9 md:h-10"
                    />
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                      Enter the code below the QR code
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-9 md:h-10 text-sm"
                    disabled={manualCode.length < 4 || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Submit Code'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </Card>

        {/* Scanning tips */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-1 md:pb-2 pt-3 md:pt-4 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm">Scanning Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-xs md:text-sm space-y-1.5 md:space-y-2 px-3 md:px-6 pb-3 md:pb-4">
            <div className="flex items-start gap-1.5 md:gap-2">
              <Sun className="w-3.5 h-3.5 md:w-4 md:h-4 mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-muted-foreground text-[11px] md:text-sm">Ensure good lighting</p>
            </div>
            <div className="flex items-start gap-1.5 md:gap-2">
              <Maximize className="w-3.5 h-3.5 md:w-4 md:h-4 mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-muted-foreground text-[11px] md:text-sm">Hold steady, align in frame</p>
            </div>
            <div className="flex items-start gap-1.5 md:gap-2">
              <Smartphone className="w-3.5 h-3.5 md:w-4 md:h-4 mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-muted-foreground text-[11px] md:text-sm">Clean lens if scan fails</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
