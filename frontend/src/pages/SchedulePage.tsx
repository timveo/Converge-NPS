import { useState, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, Search, X, List, CalendarDays, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ScheduleFilters>({ types: [], days: [], timeSlots: [], sortBy: 'time' });
  const [activeTab, setActiveTab] = useState<'all' | 'my-schedule'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [conflictDialog, setConflictDialog] = useState<{ show: boolean; newSession: Session | null; conflictingSession: Session | null }>({ show: false, newSession: null, conflictingSession: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, rsvpsRes] = await Promise.all([
        api.get('/sessions'),
        api.get('/rsvps/me').catch(() => ({ data: { data: [] } }))
      ]);

      const sessionsData = (sessionsRes as any).data.data || (sessionsRes as any).data || [];
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
        session_type: s.sessionType || s.session_type || s.track
      }));

      const rsvpsData = (rsvpsRes as any).data.data || (rsvpsRes as any).data || [];
      const mappedRsvps: RSVP[] = rsvpsData.map((r: any) => ({
        id: r.id,
        sessionId: r.sessionId || r.session?.id,
        status: r.status
      }));

      setSessions(mappedSessions);
      setRsvps(mappedRsvps);
    } catch (err: any) {
      console.error('Failed to fetch data', err);
      setError('Failed to load sessions. Please try again.');
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
      result = result.filter(s => filters.types.includes(s.session_type?.toLowerCase() || ''));
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
      try {
        await api.delete(`/rsvps/${existingRsvp.id}`);
        setRsvps(prev => prev.filter(r => r.id !== existingRsvp.id));
        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? { ...s, registered_count: Math.max(0, s.registered_count - 1) }
            : s
        ));
      } catch (err) {
        console.error('Failed to cancel RSVP', err);
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

    try {
      const response = await api.post('/rsvps', { sessionId, status: 'attending' });
      const newRsvp = (response as any).data.data || (response as any).data;
      setRsvps(prev => [...prev, { id: newRsvp.id, sessionId, status: 'attending' }]);
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, registered_count: s.registered_count + 1 }
          : s
      ));
    } catch (err) {
      console.error('Failed to create RSVP', err);
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
                onClick={() => navigate('/')}
              >
                <ChevronLeft className="h-5 w-5 md:h-5 md:w-5" />
              </Button>
              <div>
                <h1 className="text-lg md:text-xl font-bold">Event Schedule</h1>
                <p className="text-sm md:text-sm text-tech-cyan-light">Browse sessions and RSVP</p>
              </div>
            </div>
          </div>
        </header>
      </div>

      <div className="container mx-auto px-4 md:px-4 pt-3 md:pt-4 space-y-3 md:space-y-4">
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
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading sessions...</p>
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
