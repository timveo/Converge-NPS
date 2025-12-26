import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  UserCog,
  Download,
  Database,
  RefreshCw,
  UserCheck,
  UserX,
  UserPlus,
  MessageSquare,
  Link2,
  ChevronRight,
  TrendingUp,
  Briefcase,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DesktopShell } from '@/components/desktop/DesktopShell';
import {
  DashboardWidget,
} from '@/components/desktop/layouts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  UserManagementModal,
  SessionManagementModal,
  SmartsheetModal,
  RaisersEdgeExportModal,
} from '@/components/admin/modals';

interface RecentUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  roles: string[];
}

interface EventAnalyticsData {
  realTimeMetrics: {
    totalRegistered: number;
    checkedIn: number;
    checkInRate: number;
    noShows: number;
    walkIns: number;
    checkInsLastHour: number;
  };
  demographics: {
    byRole: Array<{ role: string; count: number }>;
    byOrganization: Array<{ organization: string; count: number }>;
  };
  sessionAnalytics: {
    sessions: Array<{
      id: string;
      title: string;
      capacity: number;
      confirmed: number;
      fillRate: number;
    }>;
    trackPopularity: Array<{ track: string; count: number }>;
    totalCapacity: number;
    totalConfirmed: number;
  };
  networkingEngagement: {
    totalConnections: number;
    connectionsLast24h: number;
    totalMessages: number;
    totalConversations: number;
    connectionGraph: Record<string, Record<string, number>>;
    projectInterest: Array<{
      id: string;
      title: string;
      interested: number;
      stage: string;
    }>;
  };
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  faculty: '#3b82f6',
  student: '#10b981',
  industry: '#f59e0b',
  staff: '#8b5cf6',
};

const TRACK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function AdminDashboardDesktop() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [analytics, setAnalytics] = useState<EventAnalyticsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Modal states
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [smartsheetModalOpen, setSmartsheetModalOpen] = useState(false);
  const [reExportModalOpen, setReExportModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, analyticsRes] = await Promise.all([
        api.get<{ success: boolean; data: RecentUser[] }>('/admin/users?limit=10&sort=created_at&order=desc'),
        api.get<{ success: boolean; data: EventAnalyticsData }>('/admin/event-analytics'),
      ]);

      if (usersRes.success) {
        setRecentUsers(usersRes.data.map((u: any) => ({
          id: u.id,
          full_name: u.full_name || u.email,
          email: u.email,
          created_at: u.created_at,
          roles: u.roles || [],
        })));
      }

      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.roles?.includes('admin')) {
      toast.error('Admin access required');
      navigate('/');
      return;
    }

    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user, navigate, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Prepare chart data
  const roleChartData = analytics?.demographics.byRole.map((r) => ({
    name: r.role ? r.role.charAt(0).toUpperCase() + r.role.slice(1) : 'Unknown',
    value: r.count,
    fill: ROLE_COLORS[r.role] || '#6b7280',
  })) || [];

  const trackChartData = analytics?.sessionAnalytics.trackPopularity.map((t, i) => ({
    name: t.track || 'Other',
    value: t.count,
    fill: TRACK_COLORS[i % TRACK_COLORS.length],
  })) || [];

  // Quick action items with onClick handlers for modals
  const quickActions = [
    { title: 'Manage Users', icon: UserCog, color: 'bg-rose-600', onClick: () => setUserModalOpen(true) },
    { title: 'Sessions', icon: Calendar, color: 'bg-blue-900', onClick: () => setSessionModalOpen(true) },
    { title: 'Data Sync', icon: Database, color: 'bg-emerald-600', onClick: () => setSmartsheetModalOpen(true) },
    { title: 'RE Export', icon: Download, color: 'bg-red-600', onClick: () => setReExportModalOpen(true) },
  ];

  return (
    <DesktopShell>
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                LIVE
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Quick Actions - directly below header */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="p-4 hover:shadow-md transition-all hover:scale-105 cursor-pointer h-full"
                  onClick={action.onClick}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', action.color)}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="font-medium text-sm">{action.title}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* KPI Cards Row - equal sizing */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-5 h-[140px]">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </Card>
              ))
            ) : (
              <>
                <Card className="p-5 h-[140px] flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Registered</p>
                      <p className="text-3xl font-bold mt-1">{analytics?.realTimeMetrics.totalRegistered || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-sm text-green-600">↑ +12% vs yesterday</p>
                </Card>
                <Card className="p-5 h-[140px] flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Checked In</p>
                      <p className="text-3xl font-bold mt-1">{analytics?.realTimeMetrics.checkedIn || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <UserCheck className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-green-600">↑ {analytics?.realTimeMetrics.checkInRate || 0}% rate</p>
                </Card>
                <Card className="p-5 h-[140px] flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Connections</p>
                      <p className="text-3xl font-bold mt-1">{analytics?.networkingEngagement.totalConnections || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Link2 className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-sm text-green-600">↑ +{analytics?.networkingEngagement.connectionsLast24h || 0} last 24h</p>
                </Card>
                <Card className="p-5 h-[140px] flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Messages</p>
                      <p className="text-3xl font-bold mt-1">{analytics?.networkingEngagement.totalMessages || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{analytics?.networkingEngagement.totalConversations || 0} conversations</p>
                </Card>
              </>
            )}
          </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Check-in Status */}
            <DashboardWidget title="Real-Time Check-In Status" subtitle="Live attendance tracking">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">{analytics?.realTimeMetrics.totalRegistered}</p>
                    <p className="text-xs text-muted-foreground">Registered</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <UserCheck className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold">{analytics?.realTimeMetrics.checkedIn}</p>
                    <p className="text-xs text-muted-foreground">Checked In</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <UserX className="h-6 w-6 mx-auto mb-2 text-red-600" />
                    <p className="text-2xl font-bold">{analytics?.realTimeMetrics.noShows}</p>
                    <p className="text-xs text-muted-foreground">No Shows</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <UserPlus className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold">{analytics?.realTimeMetrics.walkIns}</p>
                    <p className="text-xs text-muted-foreground">Walk-ins</p>
                  </div>
                </div>
              )}
              {!loading && (
                <>
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Check-in Progress</span>
                      <span className="text-sm font-semibold">
                        {analytics?.realTimeMetrics.checkInRate || 0}%
                      </span>
                    </div>
                    <Progress value={analytics?.realTimeMetrics.checkInRate || 0} className="h-3" />
                  </div>
                  {/* Check-in Velocity */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Check-ins in last hour</span>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {analytics?.realTimeMetrics.checkInsLastHour || 0} people
                    </Badge>
                  </div>
                </>
              )}
            </DashboardWidget>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Role Distribution */}
              <DashboardWidget title="Role Distribution" noPadding>
                {loading ? (
                  <div className="p-5">
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : (
                  <div className="h-64 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={roleChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {roleChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="px-5 pb-5 flex flex-wrap gap-2 justify-center">
                  {roleChartData.map((role) => (
                    <div key={role.name} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.fill }} />
                      <span className="text-xs text-muted-foreground">{role.name}</span>
                    </div>
                  ))}
                </div>
              </DashboardWidget>

              {/* Track Popularity */}
              <DashboardWidget title="Track Popularity" noPadding>
                {loading ? (
                  <div className="p-5">
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : (
                  <div className="h-64 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trackChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                        <Tooltip />
                        <Bar dataKey="value" name="RSVPs" radius={[0, 4, 4, 0]}>
                          {trackChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </DashboardWidget>
            </div>

            {/* Session Fill Rates */}
            <DashboardWidget
              title="Session Fill Rates"
              subtitle="Capacity utilization"
              action={
                <Button variant="ghost" size="sm" onClick={() => setSessionModalOpen(true)}>
                  Manage <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              }
            >
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {analytics?.sessionAnalytics.sessions.slice(0, 8).map((session) => (
                    <div key={session.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium truncate max-w-[300px]">
                          {session.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {session.confirmed}/{session.capacity}
                        </span>
                      </div>
                      <Progress
                        value={session.fillRate}
                        className={cn(
                          'h-2',
                          session.fillRate >= 90
                            ? '[&>div]:bg-red-500'
                            : session.fillRate >= 70
                            ? '[&>div]:bg-amber-500'
                            : '[&>div]:bg-green-500'
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}
            </DashboardWidget>

            {/* Networking Engagement Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Connection Patterns */}
              <DashboardWidget title="Connection Patterns" subtitle="Cross-role networking">
                {loading ? (
                  <Skeleton className="h-48 w-full" />
                ) : analytics?.networkingEngagement.connectionGraph && Object.keys(analytics.networkingEngagement.connectionGraph).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="p-2 text-left text-muted-foreground font-medium">From / To</th>
                          {Object.keys(analytics.networkingEngagement.connectionGraph).map((role) => (
                            <th
                              key={role}
                              className="p-2 text-center font-medium"
                              style={{ color: ROLE_COLORS[role] || '#6b7280' }}
                            >
                              {role.charAt(0).toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(analytics.networkingEngagement.connectionGraph).map(([fromRole, toRoles]) => (
                          <tr key={fromRole}>
                            <td
                              className="p-2 font-medium"
                              style={{ color: ROLE_COLORS[fromRole] || '#6b7280' }}
                            >
                              {fromRole.charAt(0).toUpperCase() + fromRole.slice(1)}
                            </td>
                            {Object.entries(toRoles).map(([toRole, count]) => {
                              const maxVal = Math.max(
                                ...Object.values(analytics.networkingEngagement.connectionGraph).flatMap((r) =>
                                  Object.values(r)
                                )
                              );
                              const intensity = maxVal > 0 ? (count / maxVal) * 100 : 0;
                              return (
                                <td
                                  key={toRole}
                                  className="p-2 text-center rounded"
                                  style={{
                                    backgroundColor: `rgba(59, 130, 246, ${intensity / 100})`,
                                    color: intensity > 50 ? 'white' : 'inherit',
                                  }}
                                >
                                  {count}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-muted-foreground mt-2">
                      S=Student, F=Faculty, I=Industry, St=Staff, A=Admin
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No connection data yet</p>
                  </div>
                )}
              </DashboardWidget>

              {/* Top Research Projects */}
              <DashboardWidget title="Top Research Projects" subtitle="By interest level">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : analytics?.networkingEngagement.projectInterest && analytics.networkingEngagement.projectInterest.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {analytics.networkingEngagement.projectInterest.slice(0, 6).map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{project.title}</p>
                            <Badge variant="outline" className="text-xs mt-0.5">
                              {project.stage}
                            </Badge>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 text-xs flex-shrink-0 ml-2">
                          {project.interested} interested
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No project data yet</p>
                  </div>
                )}
              </DashboardWidget>
            </div>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="space-y-6">
            {/* Recent Registrations */}
            <DashboardWidget
              title="Recent Registrations"
              subtitle="New users"
              action={
                <Button variant="ghost" size="sm" onClick={() => setUserModalOpen(true)}>
                  View All
                </Button>
              }
            >
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentUsers.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {recentUsers.map((recentUser, index) => (
                    <motion.div
                      key={recentUser.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm">
                          {getInitials(recentUser.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{recentUser.full_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {recentUser.roles.slice(0, 2).map((role) => (
                            <Badge
                              key={role}
                              variant="outline"
                              className="text-xs px-1.5 py-0"
                              style={{
                                borderColor: ROLE_COLORS[role] || '#6b7280',
                                color: ROLE_COLORS[role] || '#6b7280',
                              }}
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {getTimeAgo(recentUser.created_at)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No registrations yet</p>
                </div>
              )}
            </DashboardWidget>

            {/* Top Organizations */}
            <DashboardWidget title="Top Organizations" subtitle="By attendance">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : analytics?.demographics.byOrganization.length ? (
                <div className="space-y-2">
                  {analytics.demographics.byOrganization.slice(0, 5).map((org) => {
                    const maxCount = analytics.demographics.byOrganization[0]?.count || 1;
                    const percentage = (org.count / maxCount) * 100;

                    return (
                      <div key={org.organization} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm truncate pr-2">{org.organization}</span>
                          <Badge variant="secondary" className="text-xs">
                            {org.count}
                          </Badge>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-primary"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
              )}
            </DashboardWidget>
          </div>
        </div>
        </div>
      </div>

      {/* Admin Modals */}
      <UserManagementModal open={userModalOpen} onOpenChange={setUserModalOpen} />
      <SessionManagementModal open={sessionModalOpen} onOpenChange={setSessionModalOpen} />
      <SmartsheetModal open={smartsheetModalOpen} onOpenChange={setSmartsheetModalOpen} />
      <RaisersEdgeExportModal open={reExportModalOpen} onOpenChange={setReExportModalOpen} />
    </DesktopShell>
  );
}
