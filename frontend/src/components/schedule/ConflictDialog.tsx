import { XCircle, ArrowRightLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTimeRangePT } from "@/lib/utils";

interface Session {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
}

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newSession: Session | null;
  conflictingSession: Session | null;
  onSwitchRSVP?: () => void;
}

export const ConflictDialog = ({
  open,
  onOpenChange,
  newSession,
  conflictingSession,
  onSwitchRSVP,
}: ConflictDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            Cannot RSVP - Schedule Conflict
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-destructive font-medium">
                You cannot RSVP to this session because it overlaps with another session you're already registered for.
              </p>

              {/* New Session */}
              <Card className="border-2 border-muted">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-xs text-muted-foreground">Requested Session</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 pb-4">
                  <p className="font-semibold text-foreground">{newSession?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {newSession && formatTimeRangePT(newSession.start_time, newSession.end_time)}
                  </p>
                  {newSession?.location && (
                    <p className="text-sm text-muted-foreground">{newSession.location}</p>
                  )}
                </CardContent>
              </Card>

              {/* Conflicting Session */}
              <Card className="border-2 border-destructive/50 bg-destructive/5">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-xs text-destructive">Already Registered For</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 pb-4">
                  <p className="font-semibold text-foreground">{conflictingSession?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {conflictingSession && formatTimeRangePT(conflictingSession.start_time, conflictingSession.end_time)}
                  </p>
                  {conflictingSession?.location && (
                    <p className="text-sm text-muted-foreground">{conflictingSession.location}</p>
                  )}
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground">
                You can switch your RSVP to the new session, or keep your existing registration.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {onSwitchRSVP && (
            <Button
              onClick={() => {
                onSwitchRSVP();
                onOpenChange(false);
              }}
              className="w-full sm:w-auto"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Switch to New Session
            </Button>
          )}
          <AlertDialogCancel className="w-full sm:w-auto mt-0">
            Keep Existing RSVP
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
