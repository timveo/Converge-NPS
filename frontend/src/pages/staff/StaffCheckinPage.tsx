import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  Camera, CheckCircle, XCircle, AlertCircle, UserPlus,
  RefreshCw, ChevronLeft, Loader2, Keyboard
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { triggerHapticFeedback } from "@/lib/mobileUtils";
import { useDevice } from "@/hooks/useDeviceType";

// Lazy load desktop version
const StaffCheckinDesktopPage = lazy(() => import('./StaffCheckinPage.desktop'));
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { format } from "date-fns";

interface LastScan {
  name: string;
  organization?: string;
  status: 'success' | 'duplicate' | 'not_found';
  timestamp: Date;
}

interface Stats {
  total_registered: number;
  checked_in: number;
}

interface RecentCheckIn {
  id: string;
  name: string;
  organization: string | null;
  checkedInAt: string;
}

function StaffCheckinSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function StaffCheckinPage() {
  const { isDesktop } = useDevice();

  // Render desktop version for desktop users
  if (isDesktop) {
    return (
      <Suspense fallback={<StaffCheckinSkeleton />}>
        <StaffCheckinDesktopPage />
      </Suspense>
    );
  }

  // Mobile/Tablet version
  return <StaffCheckinMobilePage />;
}

function StaffCheckinMobilePage() {
  const [scanning, setScanning] = useState(false);
  const [lastScan, _setLastScan] = useState<LastScan | null>(null);
  const [stats, setStats] = useState<Stats>({ total_registered: 0, checked_in: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInData, setWalkInData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    participantType: ''
  });
  const [scanError, setScanError] = useState<string | null>(null);
  const [isProcessingQr, setIsProcessingQr] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isProcessingManual, setIsProcessingManual] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScannerStoppingRef = useRef(false);
  const isMountedRef = useRef(true);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await api.get('/staff/checkin/stats');
      const data = response as any;
      setStats({
        total_registered: data.totalRegistered || 0,
        checked_in: data.checkedIn || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadRecentCheckIns = useCallback(async () => {
    try {
      const response = await api.get('/staff/checkin/recent');
      const data = (response as any).data || [];
      setRecentCheckIns(data.map((item: any) => ({
        id: item.id,
        name: item.name || 'Unknown',
        organization: item.organization,
        checkedInAt: item.checkedInAt
      })));
    } catch (error) {
      console.error('Error loading recent check-ins:', error);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadRecentCheckIns();
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(() => {
      loadStats();
      loadRecentCheckIns();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadStats, loadRecentCheckIns]);

  // Safe scanner stop function
  const stopScanner = useCallback(async () => {
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
  }, []);

  const handleStartScan = async () => {
    setScanning(true);
    setScanError(null);
    triggerHapticFeedback('light');
  };

  const handleCloseScanner = useCallback(async () => {
    await stopScanner();
    setScanning(false);
    setScanError(null);
  }, [stopScanner]);

  // Handle QR code scan success
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (isProcessingQr) return;
    setIsProcessingQr(true);

    // Stop the scanner
    await stopScanner();

    try {
      const qrData = JSON.parse(decodedText);

      // Handle the QR format: {type, id, v} or legacy {uuid}
      const userId = qrData.id || qrData.uuid;

      if (!userId) {
        triggerHapticFeedback('heavy');
        toast.error('Invalid QR code format');
        setScanError('Invalid QR code - not from event app');
        setIsProcessingQr(false);
        return;
      }

      // Validate type if present
      if (qrData.type && qrData.type !== 'converge-nps-profile') {
        triggerHapticFeedback('heavy');
        toast.error('Invalid QR code type');
        setScanError('This QR code is not from the Converge app');
        setIsProcessingQr(false);
        return;
      }

      // Call check-in API
      try {
        const response = await api.post('/staff/checkin', { userId });
        const data = response as any;

        triggerHapticFeedback('medium');
        toast.success(`${data.data?.fullName || 'Attendee'} checked in!`);

        // Update stats and recent check-ins
        loadStats();
        loadRecentCheckIns();

        // Close scanner
        setScanning(false);
      } catch (error: any) {
        triggerHapticFeedback('heavy');
        const errorMessage = error.response?.data?.error?.message || 'Check-in failed';
        const errorCode = error.response?.data?.error?.code;

        if (errorCode === 'ALREADY_CHECKED_IN') {
          toast.warning(errorMessage);
          setScanError('Already checked in');
        } else if (errorCode === 'NOT_FOUND') {
          toast.error('User not found');
          setScanError('User not found - try walk-in registration');
        } else {
          toast.error(errorMessage);
          setScanError(errorMessage);
        }
      }
    } catch {
      triggerHapticFeedback('heavy');
      toast.error('Unable to parse QR code');
      setScanError('Cannot read QR code');
    } finally {
      setIsProcessingQr(false);
    }
  }, [isProcessingQr, stopScanner, loadStats, loadRecentCheckIns]);

  // Initialize scanner when scanning starts
  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;

    const initScanner = async () => {
      try {
        // Wait for DOM element to be ready
        let attempts = 0;
        while (!document.getElementById('staff-qr-scanner-container') && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 50));
          attempts++;
        }

        if (cancelled || !isMountedRef.current) return;

        const container = document.getElementById('staff-qr-scanner-container');
        if (!container) {
          console.error('Scanner container not found');
          toast.error('Scanner initialization failed');
          setScanning(false);
          return;
        }

        const html5QrCode = new Html5Qrcode("staff-qr-scanner-container");
        html5QrCodeRef.current = html5QrCode;

        const qrConfig = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        };

        const onSuccess = async (decodedText: string) => {
          if (!cancelled && isMountedRef.current) {
            await handleScanSuccess(decodedText);
          }
        };

        const onError = () => {}; // Ignore scan errors (no QR in frame)

        await html5QrCode.start(
          { facingMode: "environment" },
          qrConfig,
          onSuccess,
          onError
        );
      } catch (err) {
        console.error('Camera error:', err);
        if (!cancelled && isMountedRef.current) {
          toast.error("Failed to access camera. Please allow camera permissions.");
          setScanning(false);
        }
      }
    };

    initScanner();

    return () => {
      cancelled = true;
      if (html5QrCodeRef.current && !isScannerStoppingRef.current) {
        isScannerStoppingRef.current = true;
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          isScannerStoppingRef.current = false;
          html5QrCodeRef.current = null;
        });
      }
    };
  }, [scanning, handleScanSuccess]);

  const handleWalkInSubmit = async () => {
    if (!walkInData.firstName || !walkInData.lastName || !walkInData.email || !walkInData.organization || !walkInData.participantType) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await api.post('/staff/walkin', walkInData);
      const fullName = `${walkInData.firstName} ${walkInData.lastName}`.trim();
      toast.success(`${fullName} registered and checked in!`);
      setShowWalkIn(false);
      setWalkInData({ firstName: '', lastName: '', email: '', organization: '', participantType: '' });
      loadStats();
      loadRecentCheckIns();
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Walk-in registration failed';
      toast.error(message);
    }
  };

  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (manualCode.length < 4) {
      toast.error('Please enter a valid code (at least 4 characters)');
      return;
    }

    setIsProcessingManual(true);

    try {
      // Look up user by manual code
      const lookupResponse = await api.post<{ profile: { id: string; fullName?: string } }>(
        '/connections/manual/lookup',
        { code: manualCode }
      );

      const profile = (lookupResponse as any).profile;

      if (!profile?.id) {
        toast.error('No user found for that code');
        setIsProcessingManual(false);
        return;
      }

      // Now check in the user
      try {
        const response = await api.post('/staff/checkin', { userId: profile.id });
        const data = response as any;

        triggerHapticFeedback('medium');
        toast.success(`${data.data?.fullName || profile.fullName || 'Attendee'} checked in!`);

        // Reset form and update stats
        setShowManualEntry(false);
        setManualCode('');
        loadStats();
        loadRecentCheckIns();
      } catch (error: any) {
        triggerHapticFeedback('heavy');
        const errorMessage = error.response?.data?.error?.message || 'Check-in failed';
        const errorCode = error.response?.data?.error?.code;

        if (errorCode === 'ALREADY_CHECKED_IN') {
          toast.warning(errorMessage);
        } else if (errorCode === 'NOT_FOUND') {
          toast.error('User not found - try walk-in registration');
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Manual code error:', error);
      const errorMessage = error.response?.data?.error?.message || 'Code not found. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsProcessingManual(false);
    }
  };

  // Track mounted state and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (html5QrCodeRef.current && !isScannerStoppingRef.current) {
        isScannerStoppingRef.current = true;
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          isScannerStoppingRef.current = false;
        });
      }
    };
  }, []);

  const progressPercent = stats.total_registered > 0
    ? Math.round((stats.checked_in / stats.total_registered) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      {/* Header */}
      <div className="container mx-auto px-3 md:px-4 pt-2 md:pt-4">
        <header className="bg-gradient-navy text-primary-foreground shadow-lg sticky top-0 z-10 rounded-lg">
          <div className="px-3 md:px-4 py-2 md:py-4">
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/20 h-8 w-8 md:h-10 md:w-10">
                  <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-base md:text-xl font-bold">Event Check-In</h1>
                <p className="text-xs md:text-sm text-tech-cyan-light">Scan attendee QR codes</p>
              </div>
            </div>
          </div>
        </header>
      </div>

      <div className="container max-w-2xl mx-auto px-3 md:px-4 pt-2 md:pt-4">

        {/* Stats Card */}
        <Card className="mb-3 md:mb-6">
          <CardHeader className="pb-1.5 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm md:text-lg">Check-In Statistics</CardTitle>
              <button
                type="button"
                onClick={() => { loadStats(); loadRecentCheckIns(); }}
                disabled={statsLoading}
                onTouchStart={(e) => {
                  // Immediately blur to prevent any focus/hover state on mobile
                  e.currentTarget.blur();
                }}
                onPointerDown={(e) => {
                  // Prevent focus on mobile touch
                  if (window.matchMedia('(max-width: 768px)').matches) {
                    e.preventDefault();
                  }
                }}
                className="inline-flex items-center justify-center h-11 w-11 md:h-10 md:w-10 rounded-md transition-colors disabled:pointer-events-none disabled:opacity-50 md:hover:bg-accent md:hover:text-accent-foreground focus:outline-none"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                <RefreshCw className={cn("h-3.5 w-3.5 md:h-4 md:w-4", statsLoading && "animate-spin")} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-2 md:mb-4">
              <div>
                <p className="text-2xl md:text-3xl font-bold">{stats.checked_in}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Checked In</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold">{stats.total_registered}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Registered</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs md:text-sm mb-0.5 md:mb-1">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5 md:h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Scan Status Feedback */}
        {lastScan && (
          <Alert
            className={cn("mb-3 md:mb-6 py-2 md:py-3", {
              "border-green-500 bg-green-50 dark:bg-green-950/20": lastScan.status === 'success',
              "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20": lastScan.status === 'duplicate',
              "border-red-500 bg-red-50 dark:bg-red-950/20": lastScan.status === 'not_found'
            })}
          >
            {lastScan.status === 'success' && (
              <>
                <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-900 dark:text-green-100 text-xs md:text-sm">
                  {lastScan.name} - CHECKED IN
                </AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200 text-[11px] md:text-sm">
                  {lastScan.organization && `${lastScan.organization} • `}
                  Successfully checked in at {format(lastScan.timestamp, 'h:mm:ss a')}
                </AlertDescription>
              </>
            )}
            {lastScan.status === 'duplicate' && (
              <>
                <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertTitle className="text-yellow-900 dark:text-yellow-100 text-xs md:text-sm">
                  {lastScan.name} - Already Checked In
                </AlertTitle>
                <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-[11px] md:text-sm">
                  {lastScan.organization && `${lastScan.organization} • `}
                  Previously checked in at {format(lastScan.timestamp, 'h:mm a')}
                </AlertDescription>
              </>
            )}
            {lastScan.status === 'not_found' && (
              <>
                <XCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-600 dark:text-red-400" />
                <AlertTitle className="text-red-900 dark:text-red-100 text-xs md:text-sm">
                  User Not Found
                </AlertTitle>
                <AlertDescription className="text-red-800 dark:text-red-200 text-[11px] md:text-sm">
                  No registration found. Please use walk-in registration below.
                </AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Scanner Button */}
        <Card className="mb-3 md:mb-6">
          <CardContent className="p-3 md:p-6">
            <Button
              className="w-full h-14 md:h-20 text-sm md:text-lg"
              onClick={handleStartScan}
            >
              <Camera className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-3" />
              Scan QR Code
            </Button>

            {/* Manual entry button */}
            <Button
              variant="outline"
              className="w-full mt-3 h-11 md:h-10 text-xs md:text-sm"
              onClick={() => setShowManualEntry(!showManualEntry)}
            >
              <Keyboard className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              Enter Code Manually
            </Button>

            {/* Manual entry form */}
            {showManualEntry && (
              <Card className="mt-3 text-left">
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
                      disabled={manualCode.length < 4 || isProcessingManual}
                    >
                      {isProcessingManual ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
                          Checking in...
                        </>
                      ) : (
                        'Submit Code'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Walk-In Registration Link */}
        <Card className="mb-3 md:mb-6">
          <CardHeader className="px-3 md:px-6 pt-3 md:pt-6 pb-1.5 md:pb-2">
            <CardTitle className="text-sm md:text-base">Walk-In Attendee?</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              For attendees without pre-registration
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <Button
              variant="outline"
              className="w-full h-11 md:h-10 text-xs md:text-sm"
              onClick={() => setShowWalkIn(true)}
            >
              <UserPlus className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
              Register Walk-In Attendee
            </Button>
          </CardContent>
        </Card>

        {/* Recent Check-Ins */}
        <Card className="mb-3 md:mb-6">
          <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent" />
              Recent Check-Ins
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Most recent attendees checked in
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto space-y-2">
              {recentCheckIns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No check-ins yet
                </p>
              ) : (
                <>
                  {recentCheckIns.map((checkIn, index) => (
                    <div
                      key={checkIn.id}
                      className={cn(
                        "flex items-center justify-between p-2 md:p-3 rounded-lg border animate-fade-in",
                        index === 0 ? "bg-accent/10 border-accent/30" : "bg-secondary/30 border-border/50"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm md:text-base truncate",
                          index === 0 ? "font-semibold" : "font-medium"
                        )}>
                          {checkIn.name}
                        </p>
                        {checkIn.organization && (
                          <p className="text-xs text-muted-foreground truncate">
                            {checkIn.organization}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                        {checkIn.checkedInAt ? format(new Date(checkIn.checkedInAt), 'h:mm a') : ''}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner Modal */}
      <Dialog open={scanning} onOpenChange={handleCloseScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm md:text-base">Scan Attendee QR Code</DialogTitle>
          </DialogHeader>

          <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-lg bg-muted" style={{ minHeight: '300px' }}>
            <div id="staff-qr-scanner-container" style={{ width: '100%', minHeight: '300px' }} />
            {isProcessingQr && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          {scanError ? (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          ) : (
            <p className="text-center text-xs md:text-sm text-muted-foreground">
              Position QR code within the frame
            </p>
          )}

          <Button variant="outline" onClick={handleCloseScanner} className="h-11 md:h-10 text-xs md:text-sm">
            Cancel
          </Button>
        </DialogContent>
      </Dialog>

      {/* Walk-In Registration Modal */}
      <Dialog open={showWalkIn} onOpenChange={setShowWalkIn}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Walk-In Registration</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={walkInData.firstName}
                  onChange={(e) => setWalkInData({ ...walkInData, firstName: e.target.value })}
                  className="mt-1"
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={walkInData.lastName}
                  onChange={(e) => setWalkInData({ ...walkInData, lastName: e.target.value })}
                  className="mt-1"
                  maxLength={50}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={walkInData.email}
                onChange={(e) => setWalkInData({ ...walkInData, email: e.target.value })}
                className="mt-1"
                maxLength={255}
              />
            </div>
            <div>
              <Label htmlFor="participantType">Participant Type *</Label>
              <Select
                value={walkInData.participantType}
                onValueChange={(value) => setWalkInData({ ...walkInData, participantType: value })}
              >
                <SelectTrigger id="participantType" className="mt-1">
                  <SelectValue placeholder="Select participant type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty/Staff</SelectItem>
                  <SelectItem value="industry">Industry</SelectItem>
                  <SelectItem value="alumni">Alumni</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="organization">Organization / Company *</Label>
              <Input
                id="organization"
                placeholder="Your organization or company"
                value={walkInData.organization}
                onChange={(e) => setWalkInData({ ...walkInData, organization: e.target.value })}
                className="mt-1"
                maxLength={200}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowWalkIn(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleWalkInSubmit} className="flex-1">
              Register & Check In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
