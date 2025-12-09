import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Loader2,
  Users,
  UserPlus,
  Calendar,
  TrendingUp,
  UserCog,
  Settings,
  Download,
  Database,
  RefreshCw,
  CheckCircle,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { toast } from 'sonner';

interface DashboardStats {
  totalUsers: number;
  totalProfiles: number;
  totalProjects: number;
  totalOpportunities: number;
  totalConnections: number;
  totalSessions: number;
  recentSignups: number;
}

interface RoleDistribution {
  role: string;
  count: number;
}

interface RecentUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  roles: string[];
}

interface AttendanceMetrics {
  total_registered: number;
  checked_in: number;
  industry: number;
  nps: number;
  staff: number;
}

// API Response types
interface AdminStatsResponse {
  success: boolean;
  data: {
    overview: {
      totalUsers: number;
      totalSessions: number;
      totalConnections: number;
      totalMessages: number;
      totalProjects: number;
      recentUsers: number;
      upcomingSessions: number;
    };
    usersByRole: Array<{ role: string; count: number }>;
    sessionsByTrack: Array<{ track: string; count: number }>;
  };
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

interface AdminMetricsResponse {
  success: boolean;
  data: AttendanceMetrics;
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProfiles: 0,
    totalProjects: 0,
    totalOpportunities: 0,
    totalConnections: 0,
    totalSessions: 0,
    recentSignups: 0,
  });
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [attendanceMetrics, setAttendanceMetrics] = useState<AttendanceMetrics>({
    total_registered: 0,
    checked_in: 0,
    industry: 0,
    nps: 0,
    staff: 0,
  });

  // Fetch attendance metrics
  const fetchAttendanceMetrics = useCallback(async () => {
    try {
      const response = await api.get<AdminMetricsResponse>('/admin/attendance-metrics');
      if (response.success) {
        setAttendanceMetrics(response.data);
      }
    } catch (error) {
      console.error('Error fetching attendance metrics:', error);
      // Set default values if endpoint doesn't exist
      setAttendanceMetrics({
        total_registered: stats.totalUsers,
        checked_in: 0,
        industry: 0,
        nps: 0,
        staff: 0,
      });
    }
  }, [stats.totalUsers]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await api.get<AdminStatsResponse>('/admin/stats');
      if (response.success) {
        const data = response.data;
        setStats({
          totalUsers: data.overview?.totalUsers || 0,
          totalProfiles: data.overview?.totalUsers || 0,
          totalProjects: data.overview?.totalProjects || 0,
          totalOpportunities: 0,
          totalConnections: data.overview?.totalConnections || 0,
          totalSessions: data.overview?.totalSessions || 0,
          recentSignups: data.overview?.recentUsers || 0,
        });

        // Set role distribution
        if (data.usersByRole) {
          setRoleDistribution(data.usersByRole.map((item) => ({
            role: item.role,
            count: item.count,
          })));
        }

        // Fetch recent users
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
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Keep default stats - page will still render
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchDashboardData(),
        fetchAttendanceMetrics(),
      ]);
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchDashboardData, fetchAttendanceMetrics]);

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

      // Fetch all data
      await Promise.all([
        fetchDashboardData(),
        fetchAttendanceMetrics(),
      ]);
      setLastUpdated(new Date());

      // Set up auto-refresh every 30 seconds
      const interval = setInterval(async () => {
        await fetchAttendanceMetrics();
        setLastUpdated(new Date());
      }, 30000);

      return () => clearInterval(interval);
    };

    checkAdminAccess();
  }, [user, navigate, fetchDashboardData, fetchAttendanceMetrics]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
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
        <Card className="p-3 md:p-6 shadow-md border-blue-100">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <button
              className="bg-white hover:shadow-lg active:shadow-md border border-gray-200 hover:border-blue-300 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => navigate('/admin/users', { state: { fromAdmin: true } })}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <UserCog className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 group-hover:text-blue-600 transition-colors duration-300">
                    Manage Users
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 leading-snug line-clamp-2">
                    Assign roles & permissions
                  </div>
                </div>
              </div>
            </button>

            <button
              className="bg-white hover:shadow-lg active:shadow-md border border-gray-200 hover:border-blue-300 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => navigate('/opportunities', { state: { fromAdmin: true } })}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 group-hover:text-blue-600 transition-colors duration-300">
                    View Projects
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 leading-snug line-clamp-2">
                    Monitor research activity
                  </div>
                </div>
              </div>
            </button>

            <button
              className="bg-white hover:shadow-lg active:shadow-md border border-gray-200 hover:border-blue-300 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => navigate('/schedule', { state: { fromAdmin: true } })}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-900 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 group-hover:text-blue-600 transition-colors duration-300">
                    Event Schedule
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 leading-snug line-clamp-2">
                    Manage sessions
                  </div>
                </div>
              </div>
            </button>

            <button
              className="bg-white hover:shadow-lg active:shadow-md border border-gray-200 hover:border-blue-300 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => toast.info('Data Sync', { description: 'Import from Smartsheet coming soon' })}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 group-hover:text-blue-600 transition-colors duration-300">
                    Data Sync
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 leading-snug line-clamp-2">
                    Import from Smartsheet
                  </div>
                </div>
              </div>
            </button>

            <button
              className="bg-white hover:shadow-lg active:shadow-md border border-gray-200 hover:border-blue-300 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => navigate('/admin/sessions')}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-cyan-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 group-hover:text-blue-600 transition-colors duration-300">
                    Session Stats
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 leading-snug line-clamp-2">
                    Monitor attendance
                  </div>
                </div>
              </div>
            </button>

            <button
              className="bg-white hover:shadow-lg active:shadow-md border border-gray-200 hover:border-blue-300 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 cursor-pointer group"
              onClick={() => toast.info('RE Export', { description: 'Export for Raiser\'s Edge coming soon' })}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Download className="h-5 w-5 text-white" />
                </div>
                <div className="text-left w-full">
                  <div className="font-semibold text-sm md:text-base leading-tight mb-1 group-hover:text-blue-600 transition-colors duration-300">
                    RE Export
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 leading-snug line-clamp-2">
                    Export for Raiser's Edge
                  </div>
                </div>
              </div>
            </button>
          </div>
        </Card>

        {/* Analytics Card */}
        <Card className="p-3 md:p-6 shadow-md border-gray-200">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshAllData}
                disabled={isRefreshing}
                className="h-11 w-11 md:h-10 md:w-10"
              >
                <RefreshCw className={cn('h-5 w-5 md:h-5 md:w-5', isRefreshing && 'animate-spin')} />
              </Button>
              <h2 className="text-sm md:text-lg font-semibold text-gray-900">Analytics</h2>
            </div>
            <span className="text-xs md:text-sm text-gray-500">
              Updated: {format(lastUpdated, 'h:mm a')}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div className="p-2.5 md:p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-gray-900">
                    {stats.totalUsers}
                  </div>
                  <div className="text-xs md:text-sm text-gray-500">Total Users</div>
                </div>
              </div>
            </div>

            <div className="p-2.5 md:p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <UserPlus className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-gray-900">
                    {stats.recentSignups}
                  </div>
                  <div className="text-xs md:text-sm text-gray-500">New (7 days)</div>
                </div>
              </div>
            </div>

            <div className="p-2.5 md:p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-gray-900">
                    {stats.totalProjects}
                  </div>
                  <div className="text-xs md:text-sm text-gray-500">Projects</div>
                </div>
              </div>
            </div>

            <div className="p-2.5 md:p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-cyan-600" />
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-gray-900">
                    {stats.totalConnections}
                  </div>
                  <div className="text-xs md:text-sm text-gray-500">Connections</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Real-Time Metrics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
          {/* Attendance Metrics Card */}
          <Card className="p-3 md:p-6 shadow-md border-gray-200">
            <h2 className="text-sm md:text-lg font-semibold text-gray-900 mb-2 md:mb-4 flex items-center gap-1.5 md:gap-2">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              Event Attendance
            </h2>

            {/* Overall Stats */}
            <div className="grid grid-cols-2 gap-2 md:gap-4 mb-2 md:mb-4">
              <div className="text-center p-2 md:p-4 bg-green-50 rounded-lg">
                <p className="text-xl md:text-3xl font-bold text-green-600">
                  {attendanceMetrics.checked_in}
                </p>
                <p className="text-[10px] md:text-sm text-gray-500">Checked In</p>
              </div>
              <div className="text-center p-2 md:p-4 bg-gray-100 rounded-lg">
                <p className="text-xl md:text-3xl font-bold text-gray-900">
                  {attendanceMetrics.total_registered}
                </p>
                <p className="text-[10px] md:text-sm text-gray-500">Registered</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-2 md:mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Check-in Progress</span>
                <span className="font-semibold text-gray-900">
                  {attendanceMetrics.total_registered > 0
                    ? Math.round(
                        (attendanceMetrics.checked_in / attendanceMetrics.total_registered) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  attendanceMetrics.total_registered > 0
                    ? (attendanceMetrics.checked_in / attendanceMetrics.total_registered) * 100
                    : 0
                }
                className="h-1.5 md:h-2"
              />
            </div>

            {/* Breakdown by Type */}
            <div className="space-y-1 md:space-y-2">
              <p className="text-sm font-semibold text-gray-900">Breakdown by Type</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Industry Partners</span>
                  <span className="font-medium text-gray-900">{attendanceMetrics.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">NPS (Students/Faculty)</span>
                  <span className="font-medium text-gray-900">{attendanceMetrics.nps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Staff</span>
                  <span className="font-medium text-gray-900">{attendanceMetrics.staff}</span>
                </div>
              </div>
            </div>

            {/* Pie Chart */}
            {attendanceMetrics.checked_in > 0 && (
              <div className="h-32 md:h-48 mt-2 md:mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Industry', value: attendanceMetrics.industry },
                        { name: 'NPS', value: attendanceMetrics.nps },
                        { name: 'Staff', value: attendanceMetrics.staff },
                      ].filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Recent Registrations */}
          <Card className="p-3 md:p-6 shadow-md border-gray-200">
            <div className="mb-2 md:mb-4">
              <h2 className="text-sm md:text-lg font-semibold text-gray-900">
                Recent Registrations
              </h2>
            </div>
            <div className="space-y-1.5 md:space-y-2 max-h-[250px] md:max-h-[300px] overflow-y-auto">
              {recentUsers.length > 0 ? (
                recentUsers.map((recentUser) => (
                  <div
                    key={recentUser.id}
                    className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate('/admin/users', { state: { fromAdmin: true } })}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-900 to-blue-800 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                      {recentUser.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
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
                            className="text-xs px-1.5 py-0 text-gray-500"
                          >
                            No role
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {getTimeAgo(recentUser.created_at)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No registrations yet</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Role Distribution */}
        {roleDistribution.length > 0 && (
          <Card className="p-3 md:p-6 shadow-md border-gray-200">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-sm md:text-lg font-semibold text-gray-900">
                Users by Role
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {roleDistribution.map((item) => {
                  const percentage =
                    stats.totalUsers > 0 ? (item.count / stats.totalUsers) * 100 : 0;
                  return (
                    <div key={item.role}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {item.role === 'none' ? 'No Role' : item.role}
                        </span>
                        <span className="text-sm text-gray-600">
                          {item.count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor:
                              COLORS[item.role as keyof typeof COLORS] || COLORS.none,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleDistribution.map((item) => ({
                        name:
                          item.role === 'none'
                            ? 'No Role'
                            : item.role.charAt(0).toUpperCase() + item.role.slice(1),
                        value: item.count,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                      }
                    >
                      {roleDistribution.map((item, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[item.role as keyof typeof COLORS] || COLORS.none}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
