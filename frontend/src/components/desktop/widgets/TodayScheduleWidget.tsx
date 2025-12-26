import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatTimeRangePT } from '@/lib/utils';

interface Session {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  track?: string;
  rsvpStatus?: string;
}

interface RSVPResponse {
  success: boolean;
  data: Array<{
    id: string;
    status: string;
    session: {
      id: string;
      title: string;
      start_time: string;
      end_time: string;
      location?: string;
      track?: string;
    };
  }>;
}

export function TodayScheduleWidget() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTodaySessions() {
      try {
        // Fetch user's RSVPs
        const response = await api.get<RSVPResponse>('/rsvps');
        if (response.success && response.data) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          // Filter and map to sessions happening today
          const todaySessions = response.data
            .filter((rsvp) => {
              const sessionDate = new Date(rsvp.session.start_time);
              return sessionDate >= today && sessionDate < tomorrow && rsvp.status === 'confirmed';
            })
            .map((rsvp) => ({
              id: rsvp.session.id,
              title: rsvp.session.title,
              startTime: rsvp.session.start_time,
              endTime: rsvp.session.end_time,
              location: rsvp.session.location,
              track: rsvp.session.track,
              rsvpStatus: rsvp.status,
            }))
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

          setSessions(todaySessions);
        }
      } catch (error) {
        console.error('Failed to fetch today sessions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTodaySessions();
  }, []);

  // formatTime is no longer needed - using formatTimeRangePT from utils

  const isNow = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    return now >= start && now <= end;
  };

  const isUpcoming = (startTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes > 0 && diffMinutes <= 30;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-3 rounded-xl border border-border/50">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 shadow-sm">
          <Calendar className="h-8 w-8 text-primary/70" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">No sessions scheduled for today</p>
        <p className="text-xs text-muted-foreground/70 mb-5">Browse the schedule to RSVP for sessions</p>
        <Link to="/schedule">
          <Button size="sm" className="gap-2 shadow-sm hover:shadow-md transition-shadow">
            <Calendar className="h-4 w-4" />
            Browse Schedule
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.slice(0, 4).map((session, index) => {
        const current = isNow(session.startTime, session.endTime);
        const upcoming = isUpcoming(session.startTime);

        return (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              to={`/schedule?session=${session.id}`}
              className={cn(
                'block p-3 rounded-xl transition-all duration-200 border',
                'hover:shadow-md',
                current && 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-sm',
                upcoming && !current && 'bg-gradient-to-r from-amber-50 to-amber-50/50 border-amber-200 shadow-sm',
                !current && !upcoming && 'border-border/50 hover:border-primary/20 hover:bg-muted/30'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {current && (
                      <Badge className="bg-primary text-xs px-2 py-0.5 animate-pulse">
                        Live Now
                      </Badge>
                    )}
                    {upcoming && !current && (
                      <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700 text-xs px-2 py-0.5">
                        Starting Soon
                      </Badge>
                    )}
                    {session.track && (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {session.track}
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm truncate text-foreground">{session.title}</h4>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                      <Clock className="h-3 w-3 text-primary/70" />
                      {formatTimeRangePT(session.startTime, session.endTime)}
                    </span>
                    {session.location && (
                      <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                        <MapPin className="h-3 w-3 text-primary/70" />
                        {session.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ChevronRight className="h-4 w-4 text-primary" />
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}

      {sessions.length > 4 && (
        <Link
          to="/schedule"
          className="flex items-center justify-center gap-2 py-3 mt-2 text-sm font-medium text-primary hover:text-primary/80 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors"
        >
          View all {sessions.length} sessions
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
