import { useState, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, Search, X, List, CalendarDays, AlertTriangle, Sparkles, Clock } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScheduleFiltersPanel, ScheduleFilters, TIME_SLOTS } from "@/components/schedule/ScheduleFilters";
import { SessionCard } from "@/components/schedule/SessionCard";
import { ConflictDialog } from "@/components/schedule/ConflictDialog";
import { TimelineView } from "@/components/schedule/TimelineView";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { useDismissedRecommendations } from "@/hooks/useDismissedRecommendations";
import { OfflineDataBanner } from "@/components/OfflineDataBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { offlineDataCache } from "@/lib/offlineDataCache";
import { offlineQueue } from "@/lib/offlineQueue";
import { useAuth } from "@/hooks/useAuth";

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  reason: string;
  relevanceScore: number;
  tags: string[];
}

interface Session {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  speaker?: string;
  capacity: number;
  registered_count: number;
  session_type?: string;
}

interface RSVP {
  id: string;
  sessionId: string;
  status: 'attending' | 'waitlisted' | 'cancelled';
}

export default function SchedulePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const fromAdmin = location.state?.fromAdmin === true;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ScheduleFilters>({ types: [], days: [], timeSlots: [], sortBy: 'time' });
  const [activeTab, setActiveTab] = useState<'all' | 'my-schedule'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [conflictDialog, setConflictDialog] = useState<{ show: boolean; newSession: Session | null; conflictingSession: Session | null }>({ show: false, newSession: null, conflictingSession: null });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const { dismiss, isDismissed } = useDismissedRecommendations('schedule');

  useEffect(() => {
    fetchData();
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await api.post('/recommendations', { type: 'session' });
      const data = (response as any)?.recommendations || [];
      setRecommendations(data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const visibleRecommendations = recommendations
    .filter(rec => !isDismissed(rec.id))
    .slice(0, 3);

  const handleRecommendationRSVP = async (rec: Recommendation) => {
    // Find the session and RSVP to it
    const session = sessions.find(s =>
      s.title.toLowerCase() === rec.title.toLowerCase() ||
      s.id === rec.id
    );
    if (session) {
      await handleRSVP(session.id);
      // Dismiss the recommendation after RSVP
      dismiss(rec.id);
    }
  };

  const fetchData = async () => {
    if (sessions.length === 0) {
      setLoading(true);
    }
    setError(null);
    try {
      const [sessionsRes, rsvpsRes] = await Promise.all([
        api.get('/sessions'),
        api.get('/sessions/rsvps/me').catch(() => ({ data: [] }))
      ]);

      const sessionsData = (sessionsRes as any).data || [];
      const mappedSessions: Session[] = sessionsData.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        start_time: s.startTime || s.start_time,
        end_time: s.endTime || s.end_time,
        location: s.location,
        speaker: s.speaker,
        capacity: s.capacity || 100,
        registered_count: s._count?.rsvps || s.registeredCount || s.registered_count || 0,
        session_type: s.track || s.sessionType || s.session_type
      }));

      const rsvpsData = (rsvpsRes as any).data || [];
      const mappedRsvps: RSVP[] = rsvpsData.map((r: any) => ({
        id: r.id,
        sessionId: r.sessionId || r.session?.id,
        status: r.status === 'confirmed' ? 'attending' : r.status
      }));

      setSessions(mappedSessions);
      setRsvps(mappedRsvps);

      const writeCache = () => {
        void Promise.all([
          offlineDataCache.set('schedule:sessions', mappedSessions),
          offlineDataCache.set('schedule:rsvps:me', mappedRsvps),
        ]).catch((e) => console.error('Failed to write schedule cache', e));
      };
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(writeCache);
      } else {
        setTimeout(writeCache, 0);
      }
    } catch (err: any) {
      console.error('Failed to fetch data', err);

      try {
        const [cachedSessions, cachedRsvps] = await Promise.all([
          offlineDataCache.get<Session[]>('schedule:sessions'),
          offlineDataCache.get<RSVP[]>('schedule:rsvps:me'),
        ]);

        if (cachedSessions?.data) {
          setSessions(cachedSessions.data);
          setRsvps(cachedRsvps?.data ?? []);
          setError(null);
        } else {
          setError('Failed to load sessions. Please try again.');
        }
      } catch {
        setError('Failed to load sessions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const uniqueDays = useMemo(() =>
    Array.from(new Set(sessions.map(s => format(new Date(s.start_time), 'yyyy-MM-dd')))).sort(),
    [sessions]
  );

  const hasSessionTypes = useMemo(() => sessions.some(s => s.session_type), [sessions]);

  const rsvpSessionIds = useMemo(() =>
    rsvps.filter(r => r.status !== 'cancelled').map(r => r.sessionId),
    [rsvps]
  );

  const waitlistedSessionIds = useMemo(() =>
    rsvps.filter(r => r.status === 'waitlisted').map(r => r.sessionId),
    [rsvps]
  );

  const getRSVPForSession = (sessionId: string) =>
    rsvps.find(r => r.sessionId === sessionId && r.status !== 'cancelled');

  const checkConflict = (session: Session): Session | null => {
    const sessionStart = new Date(session.start_time).getTime();
    const sessionEnd = new Date(session.end_time).getTime();

    for (const rsvp of rsvps) {
      if (rsvp.status === 'cancelled') continue;
      const rsvpSession = sessions.find(s => s.id === rsvp.sessionId);
      if (!rsvpSession || rsvpSession.id === session.id) continue;

      const rsvpStart = new Date(rsvpSession.start_time).getTime();
      const rsvpEnd = new Date(rsvpSession.end_time).getTime();

      if (sessionStart < rsvpEnd && sessionEnd > rsvpStart) {
        return rsvpSession;
      }
    }
    return null;
  };

  const getConflictingSession = (session: Session): Session | null => {
    if (!getRSVPForSession(session.id)) return null;
    return checkConflict(session);
  };

  const totalConflicts = useMemo(() => {
    const conflictSet = new Set<string>();
    for (const rsvp of rsvps) {
      if (rsvp.status === 'cancelled') continue;
      const session = sessions.find(s => s.id === rsvp.sessionId);
      if (session && checkConflict(session)) {
        conflictSet.add(session.id);
      }
    }
    return conflictSet.size;
  }, [rsvps, sessions]);

  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.speaker?.toLowerCase().includes(q)
      );
    }

    if (filters.types.length) {
      result = result.filter(s => {
        const sessionType = s.session_type?.toLowerCase() || '';
        return filters.types.some(t => t.toLowerCase() === sessionType);
      });
    }

    if (filters.timeSlots.length) {
      result = result.filter(s => {
        const h = new Date(s.start_time).getHours();
        return filters.timeSlots.some(slot => {
          const ts = TIME_SLOTS.find(t => t.value === slot);
          return ts && h >= ts.start && h < ts.end;
        });
      });
    }

    if (filters.days.length) {
      result = result.filter(s => filters.days.includes(format(new Date(s.start_time), 'yyyy-MM-dd')));
    }

    if (filters.sortBy === 'time') {
      result.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    } else if (filters.sortBy === 'type') {
      result.sort((a, b) => (a.session_type || '').localeCompare(b.session_type || ''));
    } else if (filters.sortBy === 'capacity') {
      result.sort((a, b) => (b.capacity - b.registered_count) - (a.capacity - a.registered_count));
    }

    return result;
  }, [sessions, searchQuery, filters]);

  const myScheduleSessions = useMemo(() =>
    filteredSessions.filter(s => rsvpSessionIds.includes(s.id)),
    [filteredSessions, rsvpSessionIds]
  );

  const handleRSVP = async (sessionId: string) => {
    const existingRsvp = getRSVPForSession(sessionId);

    if (existingRsvp) {
      // Optimistic update - remove RSVP immediately
      const previousRsvps = rsvps;
      const previousSessions = sessions;
      setRsvps(prev => prev.filter(r => r.id !== existingRsvp.id));
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, registered_count: Math.max(0, s.registered_count - 1) }
          : s
      ));

      try {
        if (!navigator.onLine) {
          if (user?.id) {
            await offlineQueue.add(user.id, 'rsvp_delete', { rsvpId: existingRsvp.id });
          }
          return;
        }
        await api.delete(`/sessions/rsvps/${existingRsvp.id}`);
      } catch (err) {
        // Rollback on error
        console.error('Failed to cancel RSVP', err);
        setRsvps(previousRsvps);
        setSessions(previousSessions);
      }
      return;
    }

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const conflict = checkConflict(session);
    if (conflict) {
      setConflictDialog({ show: true, newSession: session, conflictingSession: conflict });
      return;
    }

    // Optimistic update - add temporary RSVP immediately
    const tempId = `temp-${Date.now()}`;
    const previousRsvps = rsvps;
    const previousSessions = sessions;
    setRsvps(prev => [...prev, { id: tempId, sessionId, status: 'attending' }]);
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, registered_count: s.registered_count + 1 }
        : s
    ));

    try {
      if (!navigator.onLine) {
        if (user?.id) {
          await offlineQueue.add(user.id, 'rsvp', { sessionId });
        }
        // Keep temp RSVP; it will reconcile when data is refreshed online
        return;
      }

      const response = await api.post(`/sessions/${sessionId}/rsvp`, { sessionId });
      const newRsvp = (response as any).data || response;
      // Replace temp RSVP with real one
      setRsvps(prev => prev.map(r => r.id === tempId ? { id: newRsvp.id, sessionId, status: 'attending' } : r));
    } catch (err) {
      // Rollback on error
      console.error('Failed to create RSVP', err);
      setRsvps(previousRsvps);
      setSessions(previousSessions);
    }
  };

  const handleAddToCalendar = (session: Session) => {
    const startDate = new Date(session.start_time);
    const endDate = new Date(session.end_time);

    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, -1);

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${session.title}
DESCRIPTION:${session.description || ''}
LOCATION:${session.location || ''}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const displayed = activeTab === 'my-schedule' ? myScheduleSessions : filteredSessions;

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      <div className="container mx-auto px-3 md:px-4 pt-2 md:pt-4">
        <header className="bg-gradient-navy text-primary-foreground shadow-lg sticky top-0 z-20 rounded-lg">
          <div className="px-3 md:px-4 py-2 md:py-4 flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary/20 h-11 w-11 md:h-10 md:w-10"
                onClick={() => navigate(fromAdmin ? '/admin' : '/')}
              >
                <ChevronLeft className="h-5 w-5 md:h-5 md:w-5" />
              </Button>
              <div>
                <h1 className="text-lg md:text-xl font-bold">Event Schedule</h1>
                <p className="text-sm md:text-sm text-tech-cyan-light">Browse Sessions</p>
              </div>
            </div>
          </div>
        </header>
      </div>

      <div className="container mx-auto px-4 md:px-4 pt-3 md:pt-4 space-y-3 md:space-y-4">
        <OfflineDataBanner />

        {/* Error Banner */}
        {error && (
          <Alert variant="destructive" className="rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Conflict Warning Banner */}
        {totalConflicts > 0 && (
          <Alert variant="destructive" className="rounded-lg border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100 py-3 md:py-3">
            <AlertTriangle className="h-4 w-4 md:h-4 md:w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 text-sm md:text-sm">Schedule Conflicts Detected</AlertTitle>
            <AlertDescription className="text-amber-800 text-sm md:text-sm">
              You have {totalConflicts} conflict{totalConflicts > 1 ? 's' : ''}. Review your RSVPs to resolve.
            </AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-4 md:h-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 md:pl-10 h-11 md:h-10 text-base"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 md:h-10 md:w-10"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-5 h-5 md:w-5 md:h-5" />
            </Button>
          )}
        </div>
        {searchQuery && (
          <p className="text-sm md:text-sm text-muted-foreground">
            {filteredSessions.length} result{filteredSessions.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Filters and View Toggle */}
        <div className="flex items-start justify-between gap-2 md:gap-4">
          <div className="flex-1 min-w-0">
            <ScheduleFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              uniqueDays={uniqueDays}
              hasSessionTypes={hasSessionTypes}
            />
          </div>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as 'list' | 'timeline')}
            className="flex-shrink-0"
          >
            <ToggleGroupItem value="list" size="sm" className="h-11 w-11 md:h-10 md:w-10">
              <List className="w-5 h-5 md:w-5 md:h-5" />
            </ToggleGroupItem>
            <ToggleGroupItem value="timeline" size="sm" className="h-11 w-11 md:h-10 md:w-10">
              <CalendarDays className="w-5 h-5 md:w-5 md:h-5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'my-schedule')}>
          <TabsList className="grid w-full grid-cols-2 h-11 md:h-10">
            <TabsTrigger value="all" className="text-xs md:text-sm">
              All
              <Badge variant="secondary" className="ml-1 text-[10px] md:text-xs">
                {filteredSessions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="my-schedule" className="text-xs md:text-sm">
              My Schedule
              <Badge variant="secondary" className="ml-1 text-[10px] md:text-xs">
                {rsvpSessionIds.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-2 md:space-y-4 mt-2 md:mt-4">
            {/* AI Recommendations */}
            {visibleRecommendations.length > 0 && !loading && (
              <Card className="w-full p-4 md:p-4 bg-gradient-to-br from-primary/5 via-accent/5 to-tech-cyan/5 border-accent/20 mb-4">
                <div className="flex items-center gap-2 md:gap-2 mb-3 md:mb-3">
                  <div className="p-1.5 md:p-1.5 rounded-md bg-accent/10">
                    <Sparkles className="h-4 w-4 md:h-4 md:w-4 text-accent" />
                  </div>
                  <span className="font-semibold text-sm md:text-sm">Recommended for You</span>
                </div>
                <div className="grid gap-2 md:gap-2.5">
                  {visibleRecommendations.map((rec, index) => {
                    const session = sessions.find(s =>
                      s.title.toLowerCase() === rec.title.toLowerCase() || s.id === rec.id
                    );
                    const isRsvpd = session ? !!getRSVPForSession(session.id) : false;
                    return (
                      <div
                        key={rec.id}
                        className="group flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 hover:border-accent/30 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex-shrink-0 w-5 h-5 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center text-[9px] md:text-xs font-bold text-accent">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] md:text-sm font-medium text-foreground line-clamp-1 group-hover:text-accent transition-colors" title={rec.title}>
                            {rec.title}
                          </p>
                          <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 flex-wrap">
                            {session && (
                              <span className="text-[9px] md:text-xs text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2 w-2 md:h-3 md:w-3" />
                                {format(new Date(session.start_time), "h:mm a")}
                              </span>
                            )}
                            {session?.location && (
                              <span className="text-[9px] md:text-xs text-muted-foreground truncate max-w-[60px] md:max-w-[100px]">
                                • {session.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant={isRsvpd ? "secondary" : "default"}
                            className={`h-8 md:h-8 text-xs md:text-sm px-2 md:px-3 ${!isRsvpd ? 'bg-accent hover:bg-accent/90' : ''}`}
                            onClick={() => handleRecommendationRSVP(rec)}
                          >
                            {isRsvpd ? "Added" : "Add"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 md:h-8 md:w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full"
                            onClick={(e) => { e.stopPropagation(); dismiss(rec.id); }}
                            aria-label="Dismiss"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-3 md:p-6">
                    <Skeleton className="h-6 md:h-8 w-3/4 mb-2 md:mb-4" />
                    <Skeleton className="h-3 md:h-4 w-full mb-2" />
                    <Skeleton className="h-3 md:h-4 w-2/3" />
                  </Card>
                ))}
              </div>
            ) : !displayed.length ? (
              <Card className="p-8 md:p-12 text-center">
                <Calendar className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 md:mb-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm md:text-base">No sessions found</h3>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
              </Card>
            ) : viewMode === 'timeline' ? (
              <TimelineView
                sessions={displayed}
                rsvpSessionIds={rsvpSessionIds}
                waitlistedSessionIds={waitlistedSessionIds}
                getConflictingSession={getConflictingSession}
                onRSVP={handleRSVP}
                onAddToCalendar={handleAddToCalendar}
              />
            ) : (
              displayed.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  isRSVPd={!!getRSVPForSession(s.id)}
                  isWaitlisted={getRSVPForSession(s.id)?.status === 'waitlisted'}
                  conflictWith={getRSVPForSession(s.id) ? getConflictingSession(s) : null}
                  onRSVP={handleRSVP}
                  onAddToCalendar={handleAddToCalendar}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="my-schedule" className="space-y-2 md:space-y-4 mt-2 md:mt-4">
            {!rsvpSessionIds.length ? (
              <Card className="p-8 md:p-12 text-center">
                <Calendar className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 md:mb-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm md:text-base mb-2">No Sessions Added</h3>
                <p className="text-sm text-muted-foreground mb-4">Browse sessions and RSVP to build your schedule</p>
                <Button size="sm" className="h-11 md:h-10 text-xs md:text-sm" onClick={() => setActiveTab('all')}>
                  Browse Sessions
                </Button>
              </Card>
            ) : viewMode === 'timeline' ? (
              <TimelineView
                sessions={myScheduleSessions}
                rsvpSessionIds={rsvpSessionIds}
                waitlistedSessionIds={waitlistedSessionIds}
                getConflictingSession={getConflictingSession}
                onRSVP={handleRSVP}
                onAddToCalendar={handleAddToCalendar}
              />
            ) : (
              myScheduleSessions.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  isRSVPd
                  conflictWith={getConflictingSession(s)}
                  onRSVP={handleRSVP}
                  onAddToCalendar={handleAddToCalendar}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ConflictDialog
        open={conflictDialog.show}
        onOpenChange={(o) => setConflictDialog({ ...conflictDialog, show: o })}
        newSession={conflictDialog.newSession}
        conflictingSession={conflictDialog.conflictingSession}
      />
    </div>
  );
}
