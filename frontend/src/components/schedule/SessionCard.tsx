import { Calendar, Clock, MapPin, Users, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimePT, formatTimeRangePT, formatDatePT } from "@/lib/utils";

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

interface SessionCardProps {
  session: Session;
  isRSVPd?: boolean;
  isWaitlisted?: boolean;
  conflictWith?: Session | null;
  onRSVP: (sessionId: string) => void;
  onAddToCalendar: (session: Session) => void;
  compact?: boolean;
}

const getCapacityStatus = (registered: number, capacity: number) => {
  const percentage = (registered / capacity) * 100;
  if (percentage < 80) return { color: "bg-green-500", label: "Available" };
  if (percentage < 100) return { color: "bg-amber-500", label: "Filling Up" };
  return { color: "bg-destructive", label: "Full" };
};

export const SessionCard = ({
  session,
  isRSVPd,
  isWaitlisted,
  conflictWith,
  onRSVP,
  onAddToCalendar: _onAddToCalendar,
  compact = false
}: SessionCardProps) => {
  // Note: _onAddToCalendar is available for future use (e.g., adding calendar download button)
  const capacityStatus = getCapacityStatus(session.registered_count, session.capacity);

  if (compact) {
    return (
      <Card className="p-2.5 md:p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2 md:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1 flex-wrap">
              <h4 className="font-semibold text-xs md:text-sm truncate">{session.title}</h4>
              {isRSVPd && <Badge variant="default" className="text-[10px] md:text-xs py-0 px-1">RSVP'd</Badge>}
              {conflictWith && (
                <Badge variant="outline" className="text-[10px] md:text-xs text-amber-600 border-amber-300 py-0 px-1">
                  <AlertTriangle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />
                  Conflict
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5 md:gap-1">
                <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                {formatTimePT(session.start_time)}
              </span>
              {session.location && (
                <span className="flex items-center gap-0.5 md:gap-1 truncate">
                  <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0" />
                  <span className="truncate max-w-[60px] md:max-w-none">{session.location}</span>
                </span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant={isRSVPd ? "destructive" : "default"}
            onClick={() => onRSVP(session.id)}
            className="h-7 md:h-8 text-[10px] md:text-xs px-2 md:px-3"
          >
            {isRSVPd ? "Cancel" : "RSVP"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 md:p-6 shadow-md border-border/50 hover:shadow-lg transition-all duration-300">
      {/* Header with status badges */}
      <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 flex-wrap">
        <div className={`h-1.5 w-1.5 md:h-2 md:w-2 rounded-full ${capacityStatus.color}`} />
        <span className="text-[10px] md:text-xs text-muted-foreground">{capacityStatus.label}</span>
        {isRSVPd && !isWaitlisted && (
          <Badge variant="default" className="text-[10px] md:text-xs py-0 px-1 md:py-0.5 md:px-1.5">Confirmed</Badge>
        )}
        {isWaitlisted && (
          <Badge variant="secondary" className="text-[10px] md:text-xs py-0 px-1 md:py-0.5 md:px-1.5">Waitlisted</Badge>
        )}
        {conflictWith && (
          <Badge variant="outline" className="text-[10px] md:text-xs text-amber-600 border-amber-300 py-0 px-1 md:py-0.5 md:px-1.5">
            <AlertTriangle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
            <span className="hidden sm:inline">Conflicts with </span>{conflictWith.title.slice(0, 15)}...
          </Badge>
        )}
        {session.session_type && (
          <Badge variant="outline" className="text-[10px] md:text-xs capitalize">
            {session.session_type}
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm md:text-lg font-semibold text-foreground mb-1.5 md:mb-2">{session.title}</h3>

      {/* Description */}
      {session.description && (
        <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">{session.description}</p>
      )}

      {/* Core info: Date, Time, Location */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 md:gap-x-4 md:gap-y-2 text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
        <div className="flex items-center gap-1 md:gap-2">
          <Calendar className="h-3 w-3 md:h-4 md:w-4 text-accent" />
          <span className="text-[11px] md:text-sm">
            {formatDatePT(session.start_time)}
          </span>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Clock className="h-3 w-3 md:h-4 md:w-4 text-accent" />
          <span className="text-[11px] md:text-sm">
            {formatTimeRangePT(session.start_time, session.end_time)}
          </span>
        </div>
        {session.location && (
          <div className="flex items-center gap-1 md:gap-2">
            <MapPin className="h-3 w-3 md:h-4 md:w-4 text-accent" />
            <span className="text-[11px] md:text-sm">{session.location}</span>
          </div>
        )}
      </div>

      {/* Speaker */}
      {session.speaker && (
        <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4">
          <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-accent" />
          <span className="text-xs md:text-sm">
            <span className="font-medium text-foreground">Speaker:</span>{" "}
            <span className="text-muted-foreground">{session.speaker}</span>
          </span>
        </div>
      )}

      {/* Capacity Bar */}
      <div className="mb-3 md:mb-4">
        <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">
          <span>Capacity</span>
          <span>{session.registered_count} / {session.capacity}</span>
        </div>
        <div className="h-1.5 md:h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full ${capacityStatus.color} transition-all duration-500`}
            style={{ width: `${Math.min((session.registered_count / session.capacity) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-1.5 md:gap-2">
        {isRSVPd ? (
          <Button
            variant="destructive"
            className="gap-1 md:gap-2 h-8 md:h-10 text-xs md:text-sm px-6 md:px-8"
            onClick={() => onRSVP(session.id)}
          >
            <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
            Cancel
          </Button>
        ) : (
          <Button
            className="gap-1 md:gap-2 h-8 md:h-10 text-xs md:text-sm px-6 md:px-8"
            onClick={() => onRSVP(session.id)}
            disabled={session.registered_count >= session.capacity}
          >
            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
            {session.registered_count >= session.capacity ? 'Waitlist' : 'RSVP'}
          </Button>
        )}
      </div>
    </Card>
  );
};
