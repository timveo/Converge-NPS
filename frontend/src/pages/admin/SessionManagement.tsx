import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  MapPin,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

export default function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get<SessionsResponse>('/sessions');
      // Handle both direct array response and wrapped response
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

  const getStatusBadgeVariant = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'scheduled':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Skeleton components for loading state
  const SessionCardSkeleton = () => (
    <Card className="p-3 shadow-md border-border">
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

  const SessionTableRowSkeleton = () => (
    <tr>
      <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end space-x-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="container mx-auto px-3 md:px-4 pt-2 md:pt-4 max-w-7xl">
        <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-10 rounded-lg">
          <div className="px-3 md:px-4 py-2 md:py-4">
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/admin">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-11 w-11 md:h-10 md:w-10"
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-base md:text-xl font-bold flex items-center gap-1.5 md:gap-2">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                  Session Management
                </h1>
                <p className="text-xs md:text-sm text-blue-200">
                  Create and manage event sessions
                </p>
              </div>
              <Link to="/admin/sessions/new">
                <Button
                  size="sm"
                  className="bg-white text-blue-900 hover:bg-blue-50 h-9 md:h-10 text-xs md:text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Create Session</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-3 md:px-4 py-3 md:py-6 max-w-7xl">
        {/* Loading State */}
        {isLoading ? (
          <>
            {/* Mobile Skeleton */}
            <div className="md:hidden space-y-2">
              <SessionCardSkeleton />
              <SessionCardSkeleton />
              <SessionCardSkeleton />
              <SessionCardSkeleton />
            </div>
            {/* Desktop Skeleton */}
            <div className="hidden md:block">
              <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Session</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Speaker</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date & Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Track</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">RSVPs</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <SessionTableRowSkeleton />
                      <SessionTableRowSkeleton />
                      <SessionTableRowSkeleton />
                      <SessionTableRowSkeleton />
                      <SessionTableRowSkeleton />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : sessions.length === 0 ? (
          <Card className="p-8 md:p-12 text-center shadow-md border-border">
            <Calendar className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-sm md:text-lg font-semibold text-foreground mb-2">No sessions yet</h3>
            <p className="text-xs md:text-sm text-muted-foreground mb-4">
              Create your first event session to get started
            </p>
            <Link to="/admin/sessions/new">
              <Button className="h-11 md:h-10">
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-2">
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  className="p-3 shadow-md border-border hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Title and Status */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {session.title}
                        </h3>
                        <Badge
                          variant={getStatusBadgeVariant(session.status || 'scheduled')}
                          className="text-[10px] capitalize flex-shrink-0"
                        >
                          {(session.status || 'scheduled').replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Speaker */}
                      <p className="text-xs text-muted-foreground mb-2">{session.speaker || 'TBD'}</p>

                      {/* Details */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(session.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{session.location || 'TBD'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>
                            {session._count?.rsvps || 0}
                            {session.capacity && ` / ${session.capacity}`}
                          </span>
                        </div>
                      </div>

                      {/* Track Badge */}
                      {session.track && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            {session.track}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Link to={`/admin/sessions/${session.id}/edit`}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(session.id)}
                        disabled={deleteId === session.id}
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                      >
                        {deleteId === session.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop Table View - Original Lovable Design */}
            <div className="hidden md:block">
              <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Session
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Speaker
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Track
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          RSVPs
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-muted/50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-foreground">{session.title}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-foreground">{session.speaker || 'TBD'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-foreground">
                              {formatDateTime(session.startTime)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-foreground">{session.location || 'TBD'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-foreground">{session.track || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-1 text-sm text-foreground">
                              <Users className="w-4 h-4" />
                              <span>
                                {session._count?.rsvps || 0}
                                {session.capacity && ` / ${session.capacity}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                'px-2 py-1 text-xs font-medium rounded-full capitalize',
                                getStatusColor(session.status || 'scheduled')
                              )}
                            >
                              {(session.status || 'scheduled').replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Link
                                to={`/admin/sessions/${session.id}/edit`}
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
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
