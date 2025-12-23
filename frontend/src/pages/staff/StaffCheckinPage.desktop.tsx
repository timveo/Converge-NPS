import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera, CheckCircle, XCircle, AlertCircle, UserPlus,
  RefreshCw
} from "lucide-react";
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
import { DesktopShell } from "@/components/desktop/DesktopShell";

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

export default function StaffCheckinDesktopPage() {
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
    <DesktopShell>
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Event Check-In</h1>
              <p className="text-muted-foreground">Scan attendee QR codes to check them in</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { loadStats(); loadRecentCheckIns(); }}
              disabled={statsLoading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", statsLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Scanner and Actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Scan Status Feedback */}
              {lastScan && (
                <Alert
                  className={cn("py-3", {
                    "border-green-500 bg-green-50 dark:bg-green-950/20": lastScan.status === 'success',
                    "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20": lastScan.status === 'duplicate',
                    "border-red-500 bg-red-50 dark:bg-red-950/20": lastScan.status === 'not_found'
                  })}
                >
                  {lastScan.status === 'success' && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertTitle className="text-green-900 dark:text-green-100">
                        {lastScan.name} - CHECKED IN
                      </AlertTitle>
                      <AlertDescription className="text-green-800 dark:text-green-200 text-sm">
                        {lastScan.organization && `${lastScan.organization} • `}
                        Successfully checked in at {format(lastScan.timestamp, 'h:mm:ss a')}
                      </AlertDescription>
                    </>
                  )}
                  {lastScan.status === 'duplicate' && (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <AlertTitle className="text-yellow-900 dark:text-yellow-100">
                        {lastScan.name} - Already Checked In
                      </AlertTitle>
                      <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-sm">
                        {lastScan.organization && `${lastScan.organization} • `}
                        Previously checked in at {format(lastScan.timestamp, 'h:mm a')}
                      </AlertDescription>
                    </>
                  )}
                  {lastScan.status === 'not_found' && (
                    <>
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <AlertTitle className="text-red-900 dark:text-red-100">
                        User Not Found
                      </AlertTitle>
                      <AlertDescription className="text-red-800 dark:text-red-200 text-sm">
                        No registration found. Please use walk-in registration below.
                      </AlertDescription>
                    </>
                  )}
                </Alert>
              )}

              {/* Scanner Button */}
              <Card>
                <CardContent className="p-6">
                  <Button
                    className="w-full h-20 text-lg"
                    onClick={handleStartScan}
                  >
                    <Camera className="h-6 w-6 mr-3" />
                    Scan QR Code
                  </Button>
                </CardContent>
              </Card>

              {/* Walk-In Registration Link */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Walk-In Attendee?</CardTitle>
                  <CardDescription>
                    For attendees without pre-registration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowWalkIn(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register Walk-In Attendee
                  </Button>
                </CardContent>
              </Card>

              {/* Stats Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Check-In Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <p className="text-3xl font-bold">{stats.checked_in}</p>
                      <p className="text-sm text-muted-foreground">Checked In</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{stats.total_registered}</p>
                      <p className="text-sm text-muted-foreground">Registered</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Recent Check-ins */}
            <div>
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Recent Check-Ins
                  </CardTitle>
                  <CardDescription>
                    Most recent attendees checked in
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-y-auto space-y-2">
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
                              "flex items-center justify-between p-3 rounded-lg border animate-fade-in",
                              index === 0 ? "bg-accent/10 border-accent/30" : "bg-secondary/30 border-border/50"
                            )}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm truncate",
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
          </div>
        </div>
      </div>

      {/* Scanner Modal */}
      <Dialog open={scanning} onOpenChange={handleCloseScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Attendee QR Code</DialogTitle>
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

          <p className="text-center text-sm text-muted-foreground">
            Position QR code within the frame
          </p>

          <Button variant="outline" onClick={handleCloseScanner}>
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
    </DesktopShell>
  );
}
