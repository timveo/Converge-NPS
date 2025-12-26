import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  X,
  AlertTriangle,
  Sparkles,
  List,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ThreePanelLayout } from '@/components/desktop/layouts/ThreePanelLayout';
import { DesktopShell } from '@/components/desktop/DesktopShell';
import { SESSION_TYPES, ScheduleFilters } from '@/components/schedule/ScheduleFilters';
import { ConflictDialog } from '@/components/schedule/ConflictDialog';
import { api } from '@/lib/api';
import { useDismissedRecommendations } from '@/hooks/useDismissedRecommendations';
import { cn, getDateStringPT, formatTimePT, formatTimeRangePT, formatDatePT, formatFullDatePT } from '@/lib/utils';

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

export default function ScheduleDesktopPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ScheduleFilters>({
    types: [],
    days: [],
    timeSlots: [],
    sortBy: 'time',
  });
  const [activeTab, setActiveTab] = useState<'all' | 'my-schedule'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [conflictDialog, setConflictDialog] = useState<{
    show: boolean;
    newSession: Session | null;
    conflictingSession: Session | null;
  }>({ show: false, newSession: null, conflictingSession: null });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const { isDismissed } = useDismissedRecommendations('schedule');

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
    .filter((rec) => !isDismissed(rec.id))
    .slice(0, 3);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, rsvpsRes] = await Promise.all([
        api.get('/sessions'),
        api.get('/sessions/rsvps/me').catch(() => ({ data: [] })),
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
        session_type: s.track || s.sessionType || s.session_type,
      }));

      const rsvpsData = (rsvpsRes as any).data || [];
      const mappedRsvps: RSVP[] = rsvpsData.map((r: any) => ({
        id: r.id,
        sessionId: r.sessionId || r.session?.id,
        status: r.status === 'confirmed' ? 'attending' : r.status,
      }));

      setSessions(mappedSessions);
      setRsvps(mappedRsvps);

      // Select first session by default
      if (mappedSessions.length > 0 && !selectedSession) {
        setSelectedSession(mappedSessions[0] ?? null);
      }
    } catch (err: any) {
      console.error('Failed to fetch data', err);
      setError('Failed to load sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const uniqueDays = useMemo(
    () =>
      Array.from(new Set(sessions.map((s) => getDateStringPT(s.start_time)))).sort(),
    [sessions]
  );

  const hasSessionTypes = useMemo(() => sessions.some((s) => s.session_type), [sessions]);

  const rsvpSessionIds = useMemo(
    () => rsvps.filter((r) => r.status !== 'cancelled').map((r) => r.sessionId),
    [rsvps]
  );

  const getRSVPForSession = useCallback(
    (sessionId: string) => rsvps.find((r) => r.sessionId === sessionId && r.status !== 'cancelled'),
    [rsvps]
  );

  const checkConflict = useCallback(
    (session: Session): Session | null => {
      const sessionStart = new Date(session.start_time).getTime();
      const sessionEnd = new Date(session.end_time).getTime();

      for (const rsvp of rsvps) {
        if (rsvp.status === 'cancelled') continue;
        const rsvpSession = sessions.find((s) => s.id === rsvp.sessionId);
        if (!rsvpSession || rsvpSession.id === session.id) continue;

        const rsvpStart = new Date(rsvpSession.start_time).getTime();
        const rsvpEnd = new Date(rsvpSession.end_time).getTime();

        if (sessionStart < rsvpEnd && sessionEnd > rsvpStart) {
          return rsvpSession;
        }
      }
      return null;
    },
    [rsvps, sessions]
  );

  const getConflictingSession = useCallback(
    (session: Session): Session | null => {
      if (!getRSVPForSession(session.id)) return null;
      return checkConflict(session);
    },
    [getRSVPForSession, checkConflict]
  );

  const totalConflicts = useMemo(() => {
    const conflictSet = new Set<string>();
    for (const rsvp of rsvps) {
      if (rsvp.status === 'cancelled') continue;
      const session = sessions.find((s) => s.id === rsvp.sessionId);
      if (session && checkConflict(session)) {
        conflictSet.add(session.id);
      }
    }
    return conflictSet.size;
  }, [rsvps, sessions, checkConflict]);

  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.speaker?.toLowerCase().includes(q)
      );
    }

    if (filters.types.length) {
      result = result.filter((s) => {
        const sessionType = s.session_type?.toLowerCase() || '';
        return filters.types.some((t) => t.toLowerCase() === sessionType);
      });
    }

    if (filters.days.length) {
      result = result.filter((s) =>
        filters.days.includes(getDateStringPT(s.start_time))
      );
    }

    if (filters.sortBy === 'time') {
      result.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    } else if (filters.sortBy === 'type') {
      result.sort((a, b) => (a.session_type || '').localeCompare(b.session_type || ''));
    } else if (filters.sortBy === 'capacity') {
      result.sort(
        (a, b) => b.capacity - b.registered_count - (a.capacity - a.registered_count)
      );
    }

    return result;
  }, [sessions, searchQuery, filters]);

  const myScheduleSessions = useMemo(
    () => filteredSessions.filter((s) => rsvpSessionIds.includes(s.id)),
    [filteredSessions, rsvpSessionIds]
  );

  const handleRSVP = async (sessionId: string) => {
    const existingRsvp = getRSVPForSession(sessionId);

    if (existingRsvp) {
      const previousRsvps = rsvps;
      const previousSessions = sessions;
      setRsvps((prev) => prev.filter((r) => r.id !== existingRsvp.id));
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, registered_count: Math.max(0, s.registered_count - 1) } : s
        )
      );

      try {
        await api.delete(`/sessions/rsvps/${existingRsvp.id}`);
      } catch (err) {
        console.error('Failed to cancel RSVP', err);
        setRsvps(previousRsvps);
        setSessions(previousSessions);
      }
      return;
    }

    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const conflict = checkConflict(session);
    if (conflict) {
      setConflictDialog({ show: true, newSession: session, conflictingSession: conflict });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const previousRsvps = rsvps;
    const previousSessions = sessions;
    setRsvps((prev) => [...prev, { id: tempId, sessionId, status: 'attending' }]);
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, registered_count: s.registered_count + 1 } : s))
    );

    try {
      const response = await api.post(`/sessions/${sessionId}/rsvp`, {
        sessionId,
        status: 'confirmed',
      });
      const newRsvp = (response as any).data || response;
      setRsvps((prev) =>
        prev.map((r) => (r.id === tempId ? { id: newRsvp.id, sessionId, status: 'attending' } : r))
      );
    } catch (err) {
      console.error('Failed to create RSVP', err);
      setRsvps(previousRsvps);
      setSessions(previousSessions);
    }
  };

  const handleSwitchRSVP = async () => {
    const newSession = conflictDialog.newSession;
    const conflictingSession = conflictDialog.conflictingSession;
    if (!newSession || !conflictingSession) return;

    const existingRsvp = getRSVPForSession(conflictingSession.id);
    if (!existingRsvp) return;

    const previousRsvps = rsvps;
    const previousSessions = sessions;
    const tempId = `temp-${Date.now()}`;

    setRsvps((prev) => [
      ...prev.filter((r) => r.id !== existingRsvp.id),
      { id: tempId, sessionId: newSession.id, status: 'attending' },
    ]);
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === conflictingSession.id) {
          return { ...s, registered_count: Math.max(0, s.registered_count - 1) };
        }
        if (s.id === newSession.id) {
          return { ...s, registered_count: s.registered_count + 1 };
        }
        return s;
      })
    );

    try {
      await api.delete(`/sessions/rsvps/${existingRsvp.id}`);
      const response = await api.post(`/sessions/${newSession.id}/rsvp`, { sessionId: newSession.id });
      const newRsvp = (response as any).data || response;
      setRsvps((prev) =>
        prev.map((r) => (r.id === tempId ? { id: newRsvp.id, sessionId: newSession.id, status: 'attending' } : r))
      );
    } catch (err) {
      console.error('Failed to switch RSVP', err);
      setRsvps(previousRsvps);
      setSessions(previousSessions);
    }
  };

  const displayed = activeTab === 'my-schedule' ? myScheduleSessions : filteredSessions;

  const toggleArrayFilter = (key: 'types' | 'days' | 'timeSlots', value: string) => {
    setFilters((prev) => {
      const current = prev[key];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({ types: [], days: [], timeSlots: [], sortBy: 'time' });
  };

  const activeFilterCount = filters.types.length + filters.days.length;

  // Group sessions by day for calendar view
  const sessionsByDay = useMemo(() => {
    const grouped: Record<string, Session[]> = {};
    displayed.forEach((session) => {
      const day = getDateStringPT(session.start_time);
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(session);
    });
    return grouped;
  }, [displayed]);

  const getCapacityStatus = (registered: number, capacity: number) => {
    const percentage = (registered / capacity) * 100;
    if (percentage < 80) return { color: 'bg-green-500', label: 'Available', textColor: 'text-green-600' };
    if (percentage < 100) return { color: 'bg-amber-500', label: 'Filling Up', textColor: 'text-amber-600' };
    return { color: 'bg-destructive', label: 'Full', textColor: 'text-destructive' };
  };

  // Left Panel - Filters
  const FiltersPanel = (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Filters</h2>
            <p className="text-sm text-muted-foreground">Refine your search</p>
          </div>
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Search */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Sessions, speakers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Sort */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Sort by</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters((p) => ({ ...p, sortBy: value }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Time</SelectItem>
                <SelectItem value="type">Track</SelectItem>
                <SelectItem value="capacity">Availability</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Day Filter */}
          {uniqueDays.length > 1 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Day</Label>
              <div className="space-y-2">
                {uniqueDays.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day}`}
                      checked={filters.days.includes(day)}
                      onCheckedChange={() => toggleArrayFilter('days', day)}
                    />
                    <Label htmlFor={`day-${day}`} className="cursor-pointer text-sm">
                      {format(parseISO(day), 'EEEE, MMM d')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type Filter */}
          {hasSessionTypes && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Track</Label>
              <div className="space-y-2">
                {SESSION_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type.value}`}
                      checked={filters.types.includes(type.value)}
                      onCheckedChange={() => toggleArrayFilter('types', type.value)}
                    />
                    <Label htmlFor={`type-${type.value}`} className="cursor-pointer text-sm">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </ScrollArea>
    </div>
  );

  // Center Panel - Session List
  const SessionListPanel = (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center justify-between border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Sessions</h2>
            <p className="text-sm text-muted-foreground">Browse and RSVP to sessions</p>
          </div>
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as 'list' | 'calendar')}
          size="sm"
        >
          <ToggleGroupItem value="list" className="h-8 w-8">
            <List className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="calendar" className="h-8 w-8">
            <CalendarDays className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Tabs and Conflicts */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'my-schedule')}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1 text-sm">
              All Sessions
              <Badge variant="secondary" className="ml-2 text-xs">
                {filteredSessions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="my-schedule" className="flex-1 text-sm">
              My Schedule
              <Badge variant="secondary" className="ml-2 text-xs">
                {rsvpSessionIds.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Conflicts Warning */}
        {totalConflicts > 0 && (
          <Alert
            variant="destructive"
            className="mt-3 py-2 border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs">
              {totalConflicts} schedule conflict{totalConflicts > 1 ? 's' : ''} detected
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Session List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* AI Recommendations Section */}
          {visibleRecommendations.length > 0 && !loading && activeTab === 'all' && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Sparkles className="h-4 w-4 text-sky-500" />
                <span className="text-sm font-semibold text-foreground">Recommended for You</span>
              </div>
              <div className="grid gap-2">
                {visibleRecommendations.map((rec) => {
                  const session = sessions.find(
                    (s) => s.title.toLowerCase() === rec.title.toLowerCase() || s.id === rec.id
                  );
                  const isSelected = session && selectedSession?.id === session.id;
                  return (
                    <motion.button
                      key={rec.id}
                      className={cn(
                        'w-full text-left p-3 rounded-xl transition-all border',
                        'bg-sky-50',
                        isSelected
                          ? 'border-sky-300 shadow-md bg-sky-100'
                          : 'border-sky-200 hover:border-sky-300 hover:shadow-sm'
                      )}
                      onClick={() => session && setSelectedSession(session)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                            <h4 className="font-medium text-sm line-clamp-1">{rec.title}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 pl-5">
                            {rec.reason}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <Separator className="my-4" />
            </div>
          )}

          {loading ? (
            <div className="space-y-2 px-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-border/50">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <div className="flex items-center gap-3 mb-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive" className="m-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium text-sm">No sessions found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTab === 'my-schedule'
                  ? 'RSVP to sessions to build your schedule'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : viewMode === 'calendar' ? (
            // Calendar View - grouped by day
            <div className="space-y-4">
              {Object.entries(sessionsByDay).map(([day, daySessions]) => (
                <div key={day}>
                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 px-2 mb-2 border-b border-border">
                    <h3 className="font-semibold text-sm">
                      {format(parseISO(day), 'EEEE, MMMM d')}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {daySessions.map((session) => {
                      const isRSVPd = !!getRSVPForSession(session.id);
                      const conflict = isRSVPd ? getConflictingSession(session) : null;
                      const isSelected = selectedSession?.id === session.id;

                      return (
                        <motion.button
                          key={session.id}
                          className={cn(
                            'w-full text-left p-3 rounded-lg transition-all',
                            isSelected
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-accent/5 border border-transparent'
                          )}
                          onClick={() => setSelectedSession(session)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">
                              {formatTimePT(session.start_time)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm truncate">{session.title}</h4>
                                {isRSVPd && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                )}
                                {conflict && (
                                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {session.location && <span>{session.location}</span>}
                                {session.session_type && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1">
                                    {session.session_type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List View
            <div className="space-y-1 pr-0">
              <AnimatePresence mode="popLayout">
                {displayed.map((session) => {
                  const isRSVPd = !!getRSVPForSession(session.id);
                  const conflict = isRSVPd ? getConflictingSession(session) : null;
                  const isSelected = selectedSession?.id === session.id;
                  const capacityStatus = getCapacityStatus(
                    session.registered_count,
                    session.capacity
                  );

                  return (
                    <motion.button
                      key={session.id}
                      className={cn(
                        'w-full text-left p-3 transition-all',
                        isSelected
                          ? 'bg-gray-100 rounded-l-lg rounded-r-none -mr-3 pr-6 border-y border-l border-gray-200'
                          : 'hover:bg-accent/5 rounded-lg border border-transparent'
                      )}
                      onClick={() => setSelectedSession(session)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      layout
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm line-clamp-1">{session.title}</h4>
                        <div className="flex items-center gap-1 shrink-0">
                          {isRSVPd && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {conflict && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDatePT(session.start_time)}, {formatTimePT(session.start_time)}
                        </span>
                        {session.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{session.location}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {session.session_type && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              {session.session_type}
                            </Badge>
                          )}
                          <span className={cn('text-[10px]', capacityStatus.textColor)}>
                            {capacityStatus.label}
                          </span>
                        </div>
                        <ChevronRight className={cn(
                          'h-4 w-4',
                          isSelected ? 'text-gray-400' : 'text-muted-foreground'
                        )} />
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Right Panel - Session Detail
  const SessionDetailPanel = selectedSession ? (
    <div className="h-full flex flex-col bg-gray-100 border-l border-gray-200">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center justify-between border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Session Details</h2>
            <p className="text-sm text-muted-foreground">View and manage your RSVP</p>
          </div>
        </div>
        {/* RSVP Button in header */}
        {getRSVPForSession(selectedSession.id) ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => handleRSVP(selectedSession.id)}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleRSVP(selectedSession.id)}
            disabled={selectedSession.registered_count >= selectedSession.capacity}
          >
            <Calendar className="h-3 w-3 mr-1" />
            {selectedSession.registered_count >= selectedSession.capacity ? 'Waitlist' : 'RSVP'}
          </Button>
        )}
      </div>

      {/* Session Title and Badges */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {getRSVPForSession(selectedSession.id) && (
            <Badge className="text-xs bg-green-500 hover:bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              RSVP'd
            </Badge>
          )}
          {getConflictingSession(selectedSession) && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Conflict
            </Badge>
          )}
          {selectedSession.session_type && (
            <Badge variant="outline" className="text-xs capitalize">
              {selectedSession.session_type}
            </Badge>
          )}
        </div>
        <h3 className="font-bold text-xl text-foreground">{selectedSession.title}</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Description */}
          {selectedSession.description && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">About</Label>
              <p className="text-sm leading-relaxed">{selectedSession.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 rounded-md bg-accent/10">
                <Calendar className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="font-medium">
                  {formatFullDatePT(selectedSession.start_time)}
                </p>
                <p className="text-muted-foreground">
                  {formatTimeRangePT(selectedSession.start_time, selectedSession.end_time)}
                </p>
              </div>
            </div>

            {selectedSession.location && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-md bg-accent/10">
                  <MapPin className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-muted-foreground">{selectedSession.location}</p>
                </div>
              </div>
            )}

            {selectedSession.speaker && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-md bg-accent/10">
                  <Users className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="font-medium">Speaker</p>
                  <p className="text-muted-foreground">{selectedSession.speaker}</p>
                </div>
              </div>
            )}
          </div>

          {/* Capacity */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <Label className="font-medium">Capacity</Label>
              <span className="text-muted-foreground">
                {selectedSession.registered_count} / {selectedSession.capacity} attendees
              </span>
            </div>
            <Progress
              value={(selectedSession.registered_count / selectedSession.capacity) * 100}
              className="h-2"
            />
            <p
              className={cn(
                'text-xs mt-1',
                getCapacityStatus(selectedSession.registered_count, selectedSession.capacity)
                  .textColor
              )}
            >
              {getCapacityStatus(selectedSession.registered_count, selectedSession.capacity).label}
            </p>
          </div>

          {/* Conflict Warning */}
          {getConflictingSession(selectedSession) && (
            <Alert
              variant="destructive"
              className="border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-sm">Schedule Conflict</AlertTitle>
              <AlertDescription className="text-xs">
                This session conflicts with "{getConflictingSession(selectedSession)?.title}"
              </AlertDescription>
            </Alert>
          )}
        </div>
      </ScrollArea>
    </div>
  ) : (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Session Details</h2>
            <p className="text-sm text-muted-foreground">View and manage your RSVP</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-primary/70" />
          </div>
          <p className="font-medium">Select a session</p>
          <p className="text-sm text-muted-foreground mt-1">Click on a session to view details</p>
        </div>
      </div>
    </div>
  );

  return (
    <DesktopShell>
      <div className="h-full flex flex-col">
        {/* Page Title */}
        <div className="px-6 py-4 border-b border-gray-200 bg-background flex-shrink-0">
          <h1 className="text-2xl font-bold">Sessions</h1>
        </div>

        <div className="flex-1 overflow-hidden">
        <ThreePanelLayout
          left={FiltersPanel}
          center={SessionListPanel}
          right={SessionDetailPanel}
          leftWidth="260px"
          equalCenterRight
          connectedPanels={!!selectedSession}
        />
        </div>
      </div>

      <ConflictDialog
        open={conflictDialog.show}
        onOpenChange={(o) => setConflictDialog({ ...conflictDialog, show: o })}
        newSession={conflictDialog.newSession}
        conflictingSession={conflictDialog.conflictingSession}
        onSwitchRSVP={handleSwitchRSVP}
      />
    </DesktopShell>
  );
}
