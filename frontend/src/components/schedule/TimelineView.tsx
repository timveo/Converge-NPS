import { format, parseISO } from "date-fns";
import { SessionCard } from "./SessionCard";

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

interface TimelineViewProps {
  sessions: Session[];
  rsvpSessionIds: string[];
  waitlistedSessionIds: string[];
  getConflictingSession: (session: Session) => Session | null;
  onRSVP: (sessionId: string) => void;
  onAddToCalendar: (session: Session) => void;
}

export const TimelineView = ({
  sessions,
  rsvpSessionIds,
  waitlistedSessionIds,
  getConflictingSession,
  onRSVP,
  onAddToCalendar
}: TimelineViewProps) => {
  // Group sessions by day
  const sessionsByDay = sessions.reduce((acc, session) => {
    const day = format(new Date(session.start_time), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  return (
    <div className="space-y-4 md:space-y-8">
      {Object.entries(sessionsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, daySessions]) => {
          // Sort sessions by start time
          const sortedSessions = [...daySessions].sort((a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          );

          return (
            <div key={day}>
              <h3 className="text-sm md:text-lg font-bold mb-2 md:mb-4 sticky top-0 bg-background py-1.5 md:py-2 border-b z-10">
                {format(parseISO(day), 'EEEE, MMMM d, yyyy')}
              </h3>

              <div className="space-y-1.5 md:space-y-3">
                {sortedSessions.map(session => {
                  const isRSVPd = rsvpSessionIds.includes(session.id);
                  const isWaitlisted = waitlistedSessionIds.includes(session.id);
                  const conflict = isRSVPd ? getConflictingSession(session) : null;

                  return (
                    <SessionCard
                      key={session.id}
                      session={session}
                      isRSVPd={isRSVPd}
                      isWaitlisted={isWaitlisted}
                      conflictWith={conflict}
                      onRSVP={onRSVP}
                      onAddToCalendar={onAddToCalendar}
                      compact
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
};
