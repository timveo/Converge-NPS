import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  X, QrCode, Camera, Check, WifiOff, CheckCircle, AlertCircle,
  Keyboard, Sun, Maximize, Smartphone, CloudOff, Loader2, Lock, Mail,
  MessageCircle, ExternalLink, UserPlus, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type ScanState = 'idle' | 'success' | 'error';
type CameraPermission = 'granted' | 'denied' | 'prompt' | 'checking';
type ScanStage = 'idle' | 'scanning' | 'preview';

export default function ScannerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Flow stages: 'idle' -> 'scanning' -> 'preview'
  const [scanStage, setScanStage] = useState<ScanStage>('idle');
  const [scannedData, setScannedData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
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
  const isScannerStoppingRef = useRef(false);
  const isMountedRef = useRef(true);

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

  // Track mounted state and cleanup scanner on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Only stop if not already stopping
      if (html5QrCodeRef.current && !isScannerStoppingRef.current) {
        isScannerStoppingRef.current = true;
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          isScannerStoppingRef.current = false;
        });
      }
    };
  }, []);

  // Safe scanner stop function that prevents double stops
  const stopScanner = async () => {
    if (!html5QrCodeRef.current || isScannerStoppingRef.current) {
      return;
    }

    isScannerStoppingRef.current = true;
    try {
      await html5QrCodeRef.current.stop();
    } catch {
      // Ignore errors - scanner may already be stopped
    } finally {
      isScannerStoppingRef.current = false;
      html5QrCodeRef.current = null;
    }
  };

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

    let cancelled = false;

    const initScanner = async () => {
      try {
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if we were cancelled during the delay
        if (cancelled || !isMountedRef.current) return;

        const html5QrCode = new Html5Qrcode("qr-scanner-container");
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            if (!cancelled && isMountedRef.current) {
              await handleScanSuccess(decodedText);
            }
          },
          () => {
            // Ignore errors during scanning (expected when no QR code in frame)
          }
        );
      } catch (err) {
        console.error('Camera error:', err);
        if (!cancelled && isMountedRef.current) {
          toast.error("Failed to access camera. Please allow camera permissions.");
          setScanStage('idle');
        }
      }
    };

    initScanner();

    // Cleanup function for when scanStage changes or component unmounts
    return () => {
      cancelled = true;
      // Stop the scanner when leaving scanning mode
      if (html5QrCodeRef.current && !isScannerStoppingRef.current) {
        isScannerStoppingRef.current = true;
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          isScannerStoppingRef.current = false;
          html5QrCodeRef.current = null;
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanStage]);

  const handleScanSuccess = async (decodedText: string) => {
    // Stop the scanner safely
    await stopScanner();

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

      // Store basic scanned data
      setScannedData({
        uuid: userId,
        qrCodeData: decodedText,
        name: 'Loading...',
        org: '',
        role: '',
        bio: '',
        interests: [],
        linkedin: '',
        email: '',
        currentSessions: []
      });

      toast.success("QR Code Scanned Successfully!");

      // Fetch full profile data from backend
      try {
        const response = await api.get(`/users/${userId}`);
        const profile = (response as any).profile;

        // Update with fetched profile data
        const updatedScannedData = {
          uuid: userId,
          qrCodeData: decodedText,
          name: profile?.fullName || 'Unknown Participant',
          org: profile?.organization || '',
          role: profile?.role || '',
          bio: profile?.bio || '',
          interests: profile?.accelerationInterests || [],
          linkedin: profile?.linkedinUrl || '',
          email: profile?.email || '',
          currentSessions: []
        };

        setScannedData(updatedScannedData);

        // Set profile data for preview
        setProfileData({
          id: updatedScannedData.uuid,
          full_name: updatedScannedData.name,
          organization: updatedScannedData.org,
          role: updatedScannedData.role,
          bio: updatedScannedData.bio,
          acceleration_interests: updatedScannedData.interests,
          linkedin_url: updatedScannedData.linkedin,
          email: updatedScannedData.email,
          allow_qr_scan: profile?.allowQrScanning !== false,
          show_organization: profile?.show_organization !== false,
          show_role: profile?.show_role !== false,
          share_email: profile?.share_email !== false && !!updatedScannedData.email,
          allow_messaging: profile?.allowMessaging !== false
        });
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        // Use basic info if profile fetch fails
        setProfileData({
          id: userId,
          full_name: 'Event Participant',
          organization: '',
          role: '',
          bio: '',
          acceleration_interests: [],
          linkedin_url: '',
          email: '',
          allow_qr_scan: true,
          show_organization: true,
          show_role: true,
          share_email: false,
          allow_messaging: true
        });
      }

      // Go directly to preview (skip intent selection)
      setTimeout(() => {
        setScanStage('preview');
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
      
      // Set profile data from scanned data and go directly to preview
      setProfileData({
        id: profile?.id,
        full_name: profile?.fullName || 'Event Participant',
        organization: profile?.organization,
        role: profile?.role,
        bio: profile?.bio,
        acceleration_interests: profile?.accelerationInterests || [],
        linkedin_url: profile?.linkedinUrl,
        email: profile?.email,
        allow_qr_scan: true,
        show_organization: true,
        show_role: true,
        share_email: !!profile?.email,
        allow_messaging: true
      });
      
      // Go directly to preview (skip intent selection)
      setScanStage('preview');

    } catch (error) {
      console.error('Manual code error:', error);
      toast.error('Failed to process code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Intent selection removed - flow goes directly from scan to preview

  const handleSaveConnection = async () => {
    // Intent selection removed - save connection without requiring intents

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

      // Intent selection removed - no reminder or note functionality

      if (isOffline) {
        await addToOfflineQueue();
        setIsProcessing(false);
        return;
      }

      await api.post('/connections/manual', {
        connectedUserId: scannedData.uuid,
        collaborativeIntents: [],
        notes: null,
        connectionMethod: 'qr_scan',
      });


      toast.success("Connection saved successfully!");

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
        collaborativeIntents: [],
        notes: '',
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

  const handleClose = async () => {
    // Stop scanner first, then update state
    await stopScanner();

    // Only update state if still mounted
    if (isMountedRef.current) {
      setScanStage('idle');
      setScannedData(null);
      setProfileData(null);
      setScanState('idle');
      setScanError(null);
      setShowManualEntry(false);
      setManualCode("");
    }
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

  // Intent selection screen removed - flow goes directly from scan to preview

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
            <div className="relative w-full max-w-[280px] md:max-w-sm mx-auto mb-3 md:mb-6 overflow-hidden rounded-xl md:rounded-2xl bg-muted" style={{ minHeight: '300px' }}>
              <div
                id="qr-scanner-container"
                ref={scannerContainerRef}
                style={{ width: '100%', minHeight: '300px' }}
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
              onClick={async () => {
                await stopScanner();
                if (isMountedRef.current) {
                  setScanStage('idle');
                  setShowManualEntry(true);
                }
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

  // Default idle screen
  return (
    <div className="min-h-screen bg-background/95 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="container mx-auto px-3 md:px-4 max-w-md">
        <Card className="p-3 md:p-6 text-center shadow-2xl animate-scale-in">
          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
            <QrCode className="w-8 h-8 md:w-10 md:h-10 text-green-500" />
          </div>
          
          <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Scan Connection</h2>
          <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
            Scan someone's QR code to connect
          </p>

          <Button
            onClick={handleStartScan}
            className="w-full mb-3 md:mb-4 gap-2"
            size="lg"
          >
            <Camera className="w-4 h-4 md:w-5 md:h-5" />
            Start Scanning
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowManualEntry(true)}
            className="w-full gap-2"
          >
            <Keyboard className="w-4 h-4 md:w-5 md:h-5" />
            Enter Code Manually
          </Button>

          {showManualEntry && (
            <div className="mt-4 md:mt-6 space-y-3">
              <Input
                placeholder="Enter connection code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="text-center"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowManualEntry(false);
                    setManualCode("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManualCodeSubmit}
                  disabled={!manualCode.trim()}
                  className="flex-1"
                >
                  Connect
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
