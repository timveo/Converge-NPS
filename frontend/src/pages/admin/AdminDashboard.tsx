import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Loader2,
  Users,
  Calendar,
  TrendingUp,
  UserCog,
  Settings,
  Download,
  Database,
  Briefcase,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useDevice } from '@/hooks/useDeviceType';
import { toast } from 'sonner';

// Lazy load desktop version
const AdminDashboardDesktop = lazy(() => import('./AdminDashboard.desktop'));

function AdminDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

interface RecentUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  roles: string[];
}

interface AdminUsersResponse {
  success: boolean;
  data: Array<{
    id: string;
    email: string;
    full_name: string;
    organization?: string;
    department?: string;
    role?: string;
    roles?: string[];
    created_at: string;
  }>;
}

const COLORS = {
  admin: '#ef4444',
  faculty: '#3b82f6',
  student: '#10b981',
  industry: '#f59e0b',
  staff: '#8b5cf6',
  none: '#6b7280',
};

export default function AdminDashboard() {
  const { isDesktop } = useDevice();

  // Render desktop version for desktop users
  if (isDesktop) {
    return (
      <Suspense fallback={<AdminDashboardSkeleton />}>
        <AdminDashboardDesktop />
      </Suspense>
    );
  }

  // Mobile/Tablet version
  return <AdminDashboardMobile />;
}

function AdminDashboardMobile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  // Fetch recent users
  const fetchRecentUsers = useCallback(async () => {
    try {
      const usersResponse = await api.get<AdminUsersResponse>('/admin/users?limit=10&sort=created_at&order=desc');
      if (usersResponse.success) {
        setRecentUsers(usersResponse.data.map((u) => ({
          id: u.id,
          full_name: u.full_name || u.email,
          email: u.email,
          created_at: u.created_at,
          roles: u.roles || [],
        })));
      }
    } catch (error) {
      console.error('Failed to fetch recent users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        toast.error('You must be logged in');
        navigate('/auth');
        return;
      }

      // Check if user has admin role
      const hasAdminRole = user.roles?.includes('admin');

      if (!hasAdminRole) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/');
        return;
      }

      setIsAdmin(true);
      setCheckingAuth(false);

      // Fetch recent users
      await fetchRecentUsers();
    };

    checkAdminAccess();
  }, [user, navigate, fetchRecentUsers]);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // Show loading screen while checking authorization
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Don't render admin UI if not authorized
  if (!isAdmin) {
    return null;
  }

  // Skeleton component for loading state
  const RecentUsersSkeleton = () => (
    <div className="space-y-1.5 md:space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2 bg-muted rounded-lg">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="container mx-auto px-3 md:px-4 pt-2 md:pt-4 max-w-6xl">
        <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-10 rounded-lg">
          <div className="px-3 md:px-4 py-2 md:py-4">
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-11 w-11"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-lg md:text-xl font-bold">Admin Dashboard</h1>
                <p className="text-sm md:text-base text-blue-200">System Overview</p>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-3 md:px-4 py-3 md:py-8 max-w-6xl space-y-3 md:space-y-6">
        {/* Quick Actions */}
        <Card className="p-3 md:p-6 shadow-md border-border">
          <h2 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <button
              className="bg-card hover:shadow-lg active:shadow-md border border-border hover:border-primary/50 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => navigate('/admin/users', { state: { fromAdmin: true } })}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <UserCog className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 text-foreground group-hover:text-primary transition-colors duration-300">
                    Manage Users
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground leading-snug line-clamp-2">
                    Assign roles & permissions
                  </div>
                </div>
              </div>
            </button>

            <button
              className="bg-card hover:shadow-lg active:shadow-md border border-border hover:border-primary/50 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => navigate('/opportunities', { state: { fromAdmin: true } })}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 text-foreground group-hover:text-primary transition-colors duration-300">
                    View Projects
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground leading-snug line-clamp-2">
                    Monitor research activity
                  </div>
                </div>
              </div>
            </button>

            <button
              className="bg-card hover:shadow-lg active:shadow-md border border-border hover:border-primary/50 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => navigate('/schedule', { state: { fromAdmin: true } })}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-900 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 text-foreground group-hover:text-primary transition-colors duration-300">
                    Event Schedule
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground leading-snug line-clamp-2">
                    Manage sessions
                  </div>
                </div>
              </div>
            </button>

            <button
              className="bg-card hover:shadow-lg active:shadow-md border border-border hover:border-primary/50 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => navigate('/admin/smartsheet')}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 text-foreground group-hover:text-primary transition-colors duration-300">
                    Data Sync
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground leading-snug line-clamp-2">
                    Import from Smartsheet
                  </div>
                </div>
              </div>
            </button>

            <button
              className="bg-card hover:shadow-lg active:shadow-md border border-border hover:border-primary/50 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => navigate('/admin/sessions')}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-cyan-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 text-foreground group-hover:text-primary transition-colors duration-300">
                    Session Stats
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground leading-snug line-clamp-2">
                    Monitor attendance
                  </div>
                </div>
              </div>
            </button>

            <button
              className="bg-card hover:shadow-lg active:shadow-md border border-border hover:border-primary/50 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => navigate('/admin/event-analytics')}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 text-foreground group-hover:text-primary transition-colors duration-300">
                    Event Analytics
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground leading-snug line-clamp-2">
                    Real-time insights
                  </div>
                </div>
              </div>
            </button>

            <button
              className="bg-card hover:shadow-lg active:shadow-md border border-border hover:border-primary/50 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => navigate('/admin/raisers-edge-export')}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Download className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 text-foreground group-hover:text-primary transition-colors duration-300">
                    RE Export
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground leading-snug line-clamp-2">
                    Export for Raiser's Edge
                  </div>
                </div>
              </div>
            </button>
          </div>
        </Card>

        {/* Recent Registrations */}
        <Card className="p-3 md:p-6 shadow-md border-border">
          <div className="mb-2 md:mb-4">
            <h2 className="text-sm md:text-lg font-semibold text-foreground">
              Recent Registrations
            </h2>
          </div>
          <div className="space-y-1.5 md:space-y-2 max-h-[350px] md:max-h-[400px] overflow-y-auto">
            {loading ? (
              <RecentUsersSkeleton />
            ) : recentUsers.length > 0 ? (
              recentUsers.map((recentUser) => (
                <div
                  key={recentUser.id}
                  className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2 bg-muted rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-900 to-blue-800 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                    {recentUser.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {recentUser.full_name}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {recentUser.roles.length > 0 ? (
                        recentUser.roles.slice(0, 2).map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className="text-xs px-1.5 py-0"
                            style={{
                              borderColor: COLORS[role as keyof typeof COLORS],
                              color: COLORS[role as keyof typeof COLORS],
                            }}
                          >
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0 text-muted-foreground"
                        >
                          No role
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {getTimeAgo(recentUser.created_at)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No registrations yet</p>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
