import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Session {
  id: string;
  title: string;
  speaker: string;
  startTime: string;
  endTime: string;
  location: string;
  track: string;
  capacity?: number;
  status: string;
  _count?: {
    rsvps: number;
  };
}

interface SessionsResponse {
  success: boolean;
  data: Session[];
}

interface SessionManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionManagementModal({ open, onOpenChange }: SessionManagementModalProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchSessions();
    }
  }, [open]);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<SessionsResponse>('/sessions');
      const sessionsData = Array.isArray(response)
        ? response
        : (response.data || []);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to fetch sessions', error);
      toast.error('Failed to load sessions');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    setDeleteId(sessionId);
    try {
      await api.delete(`/admin/sessions/${sessionId}`);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      toast.success('Session deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete session');
    } finally {
      setDeleteId(null);
    }
  };

  const formatDateTime = (dateString: string | undefined | null) => {
    if (!dateString) return 'TBD';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'TBD';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const SessionCardSkeleton = () => (
    <Card className="p-4 border-border">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-3 w-24 mb-2" />
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-24px)] max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-900" />
              </div>
              <div>
                <DialogTitle className="text-lg">Session Management</DialogTitle>
                <DialogDescription className="text-sm">
                  Create and manage event sessions
                </DialogDescription>
              </div>
            </div>
            <Link to="/admin/sessions/new" onClick={() => onOpenChange(false)}>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Create Session
              </Button>
            </Link>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4">
            {isLoading ? (
              <div className="space-y-3">
                <SessionCardSkeleton />
                <SessionCardSkeleton />
                <SessionCardSkeleton />
                <SessionCardSkeleton />
              </div>
            ) : sessions.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No sessions yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first event session to get started
                </p>
                <Link to="/admin/sessions/new" onClick={() => onOpenChange(false)}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Session
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Session
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Speaker
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        RSVPs
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-foreground">{session.title}</div>
                          {session.track && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {session.track}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-foreground">{session.speaker || 'TBD'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-foreground">
                            {formatDateTime(session.startTime)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-foreground">{session.location || 'TBD'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1 text-sm text-foreground">
                            <Users className="w-4 h-4" />
                            <span>
                              {session._count?.rsvps || 0}
                              {session.capacity && ` / ${session.capacity}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'px-2 py-1 text-xs font-medium rounded-full capitalize',
                              getStatusColor(session.status || 'scheduled')
                            )}
                          >
                            {(session.status || 'scheduled').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/admin/sessions/${session.id}/edit`}
                              onClick={() => onOpenChange(false)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit session"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(session.id)}
                              disabled={deleteId === session.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete session"
                            >
                              {deleteId === session.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
