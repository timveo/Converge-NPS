import { useState, useEffect } from 'react';
import { Users, Building2, Mail, Linkedin, Clock, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { formatTimeRangePT, formatDatePT } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface SessionRsvpsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  sessionTitle?: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  faculty: '#3b82f6',
  student: '#10b981',
  industry: '#f59e0b',
  staff: '#8b5cf6',
};

export function SessionRsvpsModal({
  open,
  onOpenChange,
  sessionId,
  sessionTitle,
}: SessionRsvpsModalProps) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [rsvps, setRsvps] = useState<SessionRsvp[]>([]);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [waitlistedCount, setWaitlistedCount] = useState(0);

  useEffect(() => {
    if (open && sessionId) {
      fetchRsvps();
    }
  }, [open, sessionId]);

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

  const renderParticipantList = (participants: SessionRsvp[]) => (
    <div className="space-y-3">
      {participants.map((rsvp) => (
        <div
          key={rsvp.id}
          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <Avatar className="h-10 w-10">
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

            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
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

            <div className="flex items-center gap-2 mt-2">
              <a
                href={`mailto:${rsvp.user.email}`}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Mail className="h-3 w-3" />
                {rsvp.user.email}
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
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Session Participants
          </DialogTitle>
          {(session || sessionTitle) && (
            <div className="space-y-2 mt-2">
              <span className="text-sm font-medium">{session?.title || sessionTitle}</span>
              {session && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
              )}
            </div>
          )}
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="confirmed" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="confirmed" className="gap-2">
                Confirmed
                <Badge variant="secondary" className="text-xs">
                  {confirmedCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="waitlisted" className="gap-2">
                Waitlisted
                <Badge variant="secondary" className="text-xs">
                  {waitlistedCount}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="confirmed" className="mt-0">
                {confirmedRsvps.length > 0 ? (
                  renderParticipantList(confirmedRsvps)
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No confirmed participants yet</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="waitlisted" className="mt-0">
                {waitlistedRsvps.length > 0 ? (
                  renderParticipantList(waitlistedRsvps)
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No participants on waitlist</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {session?.capacity && (
              <span>
                {confirmedCount} / {session.capacity} capacity
              </span>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
