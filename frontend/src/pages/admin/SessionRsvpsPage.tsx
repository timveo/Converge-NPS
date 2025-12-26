import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Users,
  Building2,
  Mail,
  Linkedin,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatTimeRangePT, formatDatePT } from '@/lib/utils';

interface SessionRsvp {
  id: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    organization?: string;
    department?: string;
    role?: string;
    linkedinUrl?: string;
  };
}

interface SessionData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  capacity: number;
  sessionType?: string;
}

interface SessionRsvpsResponse {
  success: boolean;
  data: {
    session: SessionData;
    rsvps: SessionRsvp[];
    confirmedCount: number;
    waitlistedCount: number;
    totalCount: number;
  };
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  faculty: '#3b82f6',
  student: '#10b981',
  industry: '#f59e0b',
  staff: '#8b5cf6',
};

export default function SessionRsvpsPage() {
  const navigate = useNavigate();
  const { id: sessionId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [rsvps, setRsvps] = useState<SessionRsvp[]>([]);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [waitlistedCount, setWaitlistedCount] = useState(0);

  useEffect(() => {
    if (!user?.roles?.includes('admin') && !user?.roles?.includes('staff')) {
      toast.error('Admin access required');
      navigate('/');
      return;
    }

    if (sessionId) {
      fetchRsvps();
    }
  }, [user, navigate, sessionId]);

  const fetchRsvps = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const response = await api.get<SessionRsvpsResponse>(
        `/admin/sessions/${sessionId}/rsvps`
      );
      if (response.success && response.data) {
        setSession(response.data.session);
        setRsvps(response.data.rsvps);
        setConfirmedCount(response.data.confirmedCount);
        setWaitlistedCount(response.data.waitlistedCount);
      }
    } catch (error) {
      console.error('Failed to fetch session RSVPs:', error);
      toast.error('Failed to load confirmed participants');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const confirmedRsvps = rsvps.filter(r => r.status === 'confirmed');
  const waitlistedRsvps = rsvps.filter(r => r.status === 'waitlisted');

  const renderParticipantCard = (rsvp: SessionRsvp) => (
    <Card
      key={rsvp.id}
      className="p-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback
            className="text-white text-sm"
            style={{
              backgroundColor:
                ROLE_COLORS[rsvp.user.role || ''] || '#6b7280',
            }}
          >
            {getInitials(rsvp.user.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {rsvp.user.fullName}
            </span>
            {rsvp.user.role && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: ROLE_COLORS[rsvp.user.role] || '#6b7280',
                  color: ROLE_COLORS[rsvp.user.role] || '#6b7280',
                }}
              >
                {rsvp.user.role}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            {rsvp.user.organization && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {rsvp.user.organization}
              </span>
            )}
            {rsvp.user.department && (
              <span className="text-muted-foreground/70">
                {rsvp.user.department}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <a
              href={`mailto:${rsvp.user.email}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Mail className="h-3 w-3" />
              Email
            </a>
            {rsvp.user.linkedinUrl && (
              <a
                href={rsvp.user.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <Linkedin className="h-3 w-3" />
                LinkedIn
              </a>
            )}
          </div>

          <p className="text-xs text-muted-foreground/70 mt-2">
            RSVP'd: {getTimeAgo(rsvp.createdAt)}
          </p>
        </div>
      </div>
    </Card>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container mx-auto px-3 pt-2">
          <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-10 rounded-lg mb-4">
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-11 w-11 rounded bg-white/20" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 bg-white/20 mb-1" />
                  <Skeleton className="h-4 w-32 bg-white/20" />
                </div>
              </div>
            </div>
          </header>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="container mx-auto px-3 pt-2">
        <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-10 rounded-lg">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-white hover:bg-white/20 h-11 w-11"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Session Participants
                </h1>
                {session && (
                  <p className="text-sm text-blue-200 truncate">{session.title}</p>
                )}
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-3 py-4 space-y-4">
        {/* Session info */}
        {session && (
          <Card className="p-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDatePT(session.startTime)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeRangePT(session.startTime, session.endTime)}
              </span>
              {session.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {session.location}
                </span>
              )}
            </div>
            {session.capacity && (
              <p className="text-xs text-muted-foreground mt-2">
                {confirmedCount} / {session.capacity} capacity filled
              </p>
            )}
          </Card>
        )}

        {/* Tabs for confirmed/waitlisted */}
        <Tabs defaultValue="confirmed" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="confirmed" className="gap-2 text-xs">
              Confirmed
              <Badge variant="secondary" className="text-xs">
                {confirmedCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="waitlisted" className="gap-2 text-xs">
              Waitlisted
              <Badge variant="secondary" className="text-xs">
                {waitlistedCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="confirmed" className="mt-4 space-y-3">
            {confirmedRsvps.length > 0 ? (
              confirmedRsvps.map(renderParticipantCard)
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    No confirmed participants yet
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="waitlisted" className="mt-4 space-y-3">
            {waitlistedRsvps.length > 0 ? (
              waitlistedRsvps.map(renderParticipantCard)
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    No participants on waitlist
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
