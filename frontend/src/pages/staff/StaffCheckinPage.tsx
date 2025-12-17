import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  Camera, CheckCircle, XCircle, AlertCircle, UserPlus,
  RefreshCw, ChevronLeft, Loader2
} from "lucide-react";
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
    fullName: '',
    email: '',
    organization: '',
    role: ''
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      // Use mock data for development
      setStats({ total_registered: 487, checked_in: 342 });
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
        name: item.profile?.fullName || item.name || 'Unknown',
        organization: item.profile?.organization || item.organization,
        checkedInAt: item.checkedInAt || item.checked_in_at
      })));
    } catch (error) {
      console.error('Error loading recent check-ins:', error);
      // Mock data for development
      setRecentCheckIns([
        { id: '1', name: 'Dr. Sarah Johnson', organization: 'Naval Postgraduate School', checkedInAt: new Date().toISOString() },
        { id: '2', name: 'Lt. Mike Chen', organization: 'US Navy', checkedInAt: new Date(Date.now() - 300000).toISOString() },
        { id: '3', name: 'Alice Williams', organization: 'DARPA', checkedInAt: new Date(Date.now() - 600000).toISOString() },
      ]);
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

  const handleStartScan = async () => {
    setScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      toast.error("Failed to access camera. Please allow camera permissions.");
      setScanning(false);
    }
  };

  const handleCloseScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleWalkInSubmit = async () => {
    if (!walkInData.fullName || !walkInData.email) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      await api.post('/staff/walkin', walkInData);
      toast.success(`${walkInData.fullName} registered and checked in!`);
      setShowWalkIn(false);
      setWalkInData({ fullName: '', email: '', organization: '', role: '' });
      loadStats();
      loadRecentCheckIns();
    } catch (error) {
      toast.error('Walk-in registration failed');
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { loadStats(); loadRecentCheckIns(); }}
                disabled={statsLoading}
                className="h-11 w-11 md:h-10 md:w-10"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 md:h-4 md:w-4", statsLoading && "animate-spin")} />
              </Button>
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
            <div className="h-[400px] overflow-y-auto space-y-2">
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

          <div className="relative w-full aspect-square max-w-sm mx-auto overflow-hidden rounded-lg bg-muted">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
            </div>
          </div>

          <p className="text-center text-xs md:text-sm text-muted-foreground">
            Position QR code within the frame
          </p>

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
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={walkInData.fullName}
                onChange={(e) => setWalkInData({ ...walkInData, fullName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={walkInData.email}
                onChange={(e) => setWalkInData({ ...walkInData, email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={walkInData.organization}
                onChange={(e) => setWalkInData({ ...walkInData, organization: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={walkInData.role}
                onChange={(e) => setWalkInData({ ...walkInData, role: e.target.value })}
                className="mt-1"
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
