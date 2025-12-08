import { XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

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
}

export const ConflictDialog = ({
  open,
  onOpenChange,
  newSession,
  conflictingSession,
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
                    {newSession && format(new Date(newSession.start_time), 'h:mm a')} -
                    {newSession && format(new Date(newSession.end_time), 'h:mm a')}
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
                    {conflictingSession && format(new Date(conflictingSession.start_time), 'h:mm a')} -
                    {conflictingSession && format(new Date(conflictingSession.end_time), 'h:mm a')}
                  </p>
                  {conflictingSession?.location && (
                    <p className="text-sm text-muted-foreground">{conflictingSession.location}</p>
                  )}
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground">
                To RSVP for this session, please first cancel your registration for the conflicting session.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Got It</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
