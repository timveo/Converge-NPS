import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Loader2,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Building2,
  Calendar,
  MessageSquare,
  Link2,
  TrendingUp,
  RefreshCw,
  Zap,
  BarChart3,
  PieChartIcon,
  Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

// Color palette
const COLORS = {
  admin: '#ef4444',
  faculty: '#3b82f6',
  student: '#10b981',
  industry: '#f59e0b',
  staff: '#8b5cf6',
  none: '#6b7280',
};

const TRACK_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
];

interface EventAnalyticsData {
  realTimeMetrics: {
    totalRegistered: number;
    checkedIn: number;
    checkInRate: number;
    noShows: number;
    walkIns: number;
    checkInsLastHour: number;
    checkInsByMethod: Array<{ method: string; count: number }>;
  };
  demographics: {
    byRole: Array<{ role: string; count: number }>;
    byOrganization: Array<{ organization: string; count: number }>;
  };
  sessionAnalytics: {
    sessions: Array<{
      id: string;
      title: string;
      track: string;
      capacity: number;
      confirmed: number;
      fillRate: number;
      startTime: string;
    }>;
    rsvpsByStatus: Array<{ status: string; count: number }>;
    trackPopularity: Array<{ track: string; count: number }>;
    totalCapacity: number;
    totalConfirmed: number;
  };
  networkingEngagement: {
    totalConnections: number;
    connectionsLast24h: number;
    connectionsByMethod: Array<{ method: string; count: number }>;
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

export default function EventAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<EventAnalyticsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; data: EventAnalyticsData }>(
        '/admin/event-analytics'
      );
      if (response.success) {
        setData(response.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
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
    fetchAnalytics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [user, navigate, fetchAnalytics]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  // Skeleton components for loading state
  const MetricCardSkeleton = () => (
    <Card className="p-3 md:p-4">
      <div className="flex items-center gap-2 mb-1 md:mb-2">
        <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-lg" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-8 w-20 mb-1" />
      <Skeleton className="h-3 w-12" />
    </Card>
  );

  const RoleCardSkeleton = () => (
    <Card className="p-3 md:p-4">
      <div className="flex items-center justify-between mb-1">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-8" />
      </div>
      <Skeleton className="h-6 w-12 mb-2" />
      <Skeleton className="h-1 w-full rounded-full" />
    </Card>
  );

  const ChartSkeleton = () => (
    <Card className="p-3 md:p-4">
      <Skeleton className="h-4 w-32 mb-3" />
      <div className="h-48 md:h-56 flex items-center justify-center">
        <Skeleton className="w-full h-full rounded" />
      </div>
    </Card>
  );

  const ListItemSkeleton = () => (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
      <Skeleton className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-3 w-24 mb-1" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <Skeleton className="h-5 w-8 rounded" />
    </div>
  );

  // Show error state if no data after loading
  if (!loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  const { realTimeMetrics, demographics, sessionAnalytics, networkingEngagement } = data || {
    realTimeMetrics: { totalRegistered: 0, checkedIn: 0, checkInRate: 0, noShows: 0, walkIns: 0, checkInsLastHour: 0, checkInsByMethod: [] },
    demographics: { byRole: [], byOrganization: [] },
    sessionAnalytics: { sessions: [], rsvpsByStatus: [], trackPopularity: [], totalCapacity: 0, totalConfirmed: 0 },
    networkingEngagement: { totalConnections: 0, connectionsLast24h: 0, connectionsByMethod: [], totalMessages: 0, totalConversations: 0, connectionGraph: {}, projectInterest: [] },
  };

  // Prepare chart data
  const roleChartData = demographics.byRole.map((r) => ({
    name: r.role ? r.role.charAt(0).toUpperCase() + r.role.slice(1) : 'Unknown',
    value: r.count,
    fill: COLORS[r.role as keyof typeof COLORS] || COLORS.none,
  }));

  const trackChartData = sessionAnalytics.trackPopularity.map((t, i) => ({
    name: t.track || 'Other',
    value: t.count,
    fill: TRACK_COLORS[i % TRACK_COLORS.length],
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      {/* Header */}
      <div className="container mx-auto px-3 md:px-4 pt-2 md:pt-4">
        <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-10 rounded-lg">
          <div className="px-3 md:px-4 py-2 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/admin')}
                  className="text-white hover:bg-white/20 h-11 w-11 md:h-10 md:w-10"
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
                <div>
                  <h1 className="text-base md:text-xl font-bold flex items-center gap-1.5 md:gap-2">
                    <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                    Event Analytics
                  </h1>
                  <p className="text-xs md:text-sm text-blue-200">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-white hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Real-Time Metrics Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Zap className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
            <h2 className="text-sm md:text-lg font-semibold text-gray-900">Real-Time Check-In</h2>
            <Badge variant="outline" className="text-[10px] md:text-xs bg-green-50 text-green-700 border-green-200">
              LIVE
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {loading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                {/* Total Registered */}
                <Card className="p-3 md:p-4 bg-gradient-to-br from-blue-50 to-white border-blue-100">
                  <div className="flex items-center gap-2 mb-1 md:mb-2">
                    <div className="p-1.5 md:p-2 rounded-lg bg-blue-100">
                      <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />
                    </div>
                    <span className="text-[10px] md:text-xs text-gray-500 font-medium">Registered</span>
                  </div>
                  <p className="text-xl md:text-3xl font-bold text-gray-900">
                    {realTimeMetrics.totalRegistered}
                  </p>
                </Card>

                {/* Checked In */}
                <Card className="p-3 md:p-4 bg-gradient-to-br from-green-50 to-white border-green-100">
                  <div className="flex items-center gap-2 mb-1 md:mb-2">
                    <div className="p-1.5 md:p-2 rounded-lg bg-green-100">
                      <UserCheck className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600" />
                    </div>
                    <span className="text-[10px] md:text-xs text-gray-500 font-medium">Checked In</span>
                  </div>
                  <p className="text-xl md:text-3xl font-bold text-gray-900">
                    {realTimeMetrics.checkedIn}
                  </p>
                  <p className="text-[10px] md:text-xs text-green-600 font-medium">
                    {realTimeMetrics.checkInRate}% rate
                  </p>
                </Card>

                {/* No Shows */}
                <Card className="p-3 md:p-4 bg-gradient-to-br from-red-50 to-white border-red-100">
                  <div className="flex items-center gap-2 mb-1 md:mb-2">
                    <div className="p-1.5 md:p-2 rounded-lg bg-red-100">
                      <UserX className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-600" />
                    </div>
                    <span className="text-[10px] md:text-xs text-gray-500 font-medium">No Shows</span>
                  </div>
                  <p className="text-xl md:text-3xl font-bold text-gray-900">
                    {realTimeMetrics.noShows}
                  </p>
                </Card>

                {/* Walk-ins */}
                <Card className="p-3 md:p-4 bg-gradient-to-br from-purple-50 to-white border-purple-100">
                  <div className="flex items-center gap-2 mb-1 md:mb-2">
                    <div className="p-1.5 md:p-2 rounded-lg bg-purple-100">
                      <UserPlus className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-600" />
                    </div>
                    <span className="text-[10px] md:text-xs text-gray-500 font-medium">Walk-ins</span>
                  </div>
                  <p className="text-xl md:text-3xl font-bold text-gray-900">
                    {realTimeMetrics.walkIns}
                  </p>
                </Card>
              </>
            )}
          </div>

          {/* Check-in velocity */}
          <Card className="mt-3 md:mt-4 p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs md:text-sm font-medium text-gray-700">
                  Check-ins in last hour
                </span>
              </div>
              <Badge variant="secondary" className="text-xs md:text-sm">
                {realTimeMetrics.checkInsLastHour} people
              </Badge>
            </div>
            <Progress
              value={Math.min((realTimeMetrics.checkInsLastHour / 50) * 100, 100)}
              className="mt-2 h-2"
            />
          </Card>
        </section>

        {/* Demographics Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <PieChartIcon className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
            <h2 className="text-sm md:text-lg font-semibold text-gray-900">Demographics</h2>
          </div>

          {/* Role Distribution - Visual Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-3 md:mb-4">
            {loading ? (
              <>
                <RoleCardSkeleton />
                <RoleCardSkeleton />
                <RoleCardSkeleton />
                <RoleCardSkeleton />
                <RoleCardSkeleton />
              </>
            ) : (['student', 'faculty', 'industry', 'staff', 'admin'] as const).map((role) => {
              const roleData = demographics.byRole.find((r) => r.role === role);
              const count = roleData?.count || 0;
              const total = demographics.byRole.reduce((sum, r) => sum + r.count, 0);
              const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
              const color = COLORS[role];

              return (
                <Card
                  key={role}
                  className="p-3 md:p-4 relative overflow-hidden"
                  style={{ borderLeftWidth: '4px', borderLeftColor: color }}
                >
                  <div
                    className="absolute inset-0 opacity-5"
                    style={{ backgroundColor: color }}
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[10px] md:text-xs font-semibold uppercase tracking-wide"
                        style={{ color }}
                      >
                        {role}
                      </span>
                      <span className="text-[10px] md:text-xs text-gray-400">{percentage}%</span>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{count}</p>
                    <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Role Bar Chart + Organizations */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              <ChartSkeleton />
              <Card className="p-3 md:p-4">
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="space-y-2.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <ListItemSkeleton key={i} />
                  ))}
                </div>
              </Card>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            {/* Role Distribution Bar Chart */}
            <Card className="p-3 md:p-4">
              <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-3">
                Role Distribution
              </h3>
              <div className="h-48 md:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={roleChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={55}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                      {roleChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* By Organization */}
            <Card className="p-3 md:p-4">
              <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-3">
                <Building2 className="inline h-3.5 w-3.5 mr-1" />
                Top Organizations
              </h3>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {demographics.byOrganization.length > 0 ? (
                  demographics.byOrganization.map((org, i) => {
                    const maxCount = demographics.byOrganization[0]?.count || 1;
                    const percentage = (org.count / maxCount) * 100;
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
                    const barColor = colors[i % colors.length];

                    return (
                      <div key={org.organization} className="group">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: barColor }}
                          >
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs md:text-sm font-medium text-gray-800 truncate pr-2">
                                {org.organization}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] md:text-xs flex-shrink-0"
                                style={{ backgroundColor: `${barColor}15`, color: barColor }}
                              >
                                {org.count}
                              </Badge>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                                style={{ width: `${percentage}%`, backgroundColor: barColor }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No organization data</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
          )}
        </section>

        {/* Session Analytics Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Calendar className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
            <h2 className="text-sm md:text-lg font-semibold text-gray-900">Session Analytics</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              <ChartSkeleton />
              <Card className="p-3 md:p-4">
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            {/* Track Popularity */}
            <Card className="p-3 md:p-4">
              <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-3">
                Track Popularity
              </h3>
              <div className="h-48 md:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trackChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="RSVPs" radius={[0, 4, 4, 0]}>
                      {trackChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Session Fill Rates */}
            <Card className="p-3 md:p-4">
              <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-3">
                Session Fill Rates
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {sessionAnalytics.sessions.slice(0, 8).map((session) => (
                  <div key={session.id}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs md:text-sm font-medium text-gray-800 truncate max-w-[200px]">
                        {session.title}
                      </span>
                      <span className="text-xs text-gray-500">
                        {session.confirmed}/{session.capacity || '?'}
                      </span>
                    </div>
                    <Progress
                      value={session.fillRate}
                      className={`h-2 ${
                        session.fillRate >= 90
                          ? '[&>div]:bg-red-500'
                          : session.fillRate >= 70
                          ? '[&>div]:bg-amber-500'
                          : '[&>div]:bg-green-500'
                      }`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-gray-600">Total Capacity</span>
                  <span className="font-medium">{sessionAnalytics.totalCapacity}</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-gray-600">Total Confirmed</span>
                  <span className="font-medium text-green-600">
                    {sessionAnalytics.totalConfirmed}
                  </span>
                </div>
              </div>
            </Card>
          </div>
          )}
        </section>

        {/* Networking Engagement Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Network className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
            <h2 className="text-sm md:text-lg font-semibold text-gray-900">
              Networking Engagement
            </h2>
          </div>

          {/* Quick Stats */}
          {loading ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-3 md:mb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-3 md:p-4 text-center">
                    <Skeleton className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 rounded" />
                    <Skeleton className="h-6 w-12 mx-auto mb-1" />
                    <Skeleton className="h-3 w-20 mx-auto" />
                  </Card>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                <ChartSkeleton />
                <Card className="p-3 md:p-4">
                  <Skeleton className="h-4 w-32 mb-3" />
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <ListItemSkeleton key={i} />
                    ))}
                  </div>
                </Card>
              </div>
            </>
          ) : (
          <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-3 md:mb-4">
            <Card className="p-3 md:p-4 text-center">
              <Link2 className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 text-blue-500" />
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {networkingEngagement.totalConnections}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500">Total Connections</p>
            </Card>
            <Card className="p-3 md:p-4 text-center">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 text-green-500" />
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {networkingEngagement.connectionsLast24h}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500">Last 24h</p>
            </Card>
            <Card className="p-3 md:p-4 text-center">
              <MessageSquare className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 text-purple-500" />
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {networkingEngagement.totalMessages}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500">Messages</p>
            </Card>
            <Card className="p-3 md:p-4 text-center">
              <Users className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 text-amber-500" />
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {networkingEngagement.totalConversations}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500">Conversations</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            {/* Connection Graph (Heatmap Style) */}
            <Card className="p-3 md:p-4">
              <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-3">
                Connection Patterns
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] md:text-xs">
                  <thead>
                    <tr>
                      <th className="p-1 text-left text-gray-500">From / To</th>
                      {Object.keys(networkingEngagement.connectionGraph).map((role) => (
                        <th
                          key={role}
                          className="p-1 text-center"
                          style={{ color: COLORS[role as keyof typeof COLORS] }}
                        >
                          {role.charAt(0).toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(networkingEngagement.connectionGraph).map(([fromRole, toRoles]) => (
                      <tr key={fromRole}>
                        <td
                          className="p-1 font-medium"
                          style={{ color: COLORS[fromRole as keyof typeof COLORS] }}
                        >
                          {fromRole.charAt(0).toUpperCase() + fromRole.slice(1)}
                        </td>
                        {Object.entries(toRoles).map(([toRole, count]) => {
                          const maxVal = Math.max(
                            ...Object.values(networkingEngagement.connectionGraph).flatMap((r) =>
                              Object.values(r)
                            )
                          );
                          const intensity = maxVal > 0 ? (count / maxVal) * 100 : 0;
                          return (
                            <td
                              key={toRole}
                              className="p-1 text-center rounded"
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
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                S=Student, F=Faculty, I=Industry, St=Staff, A=Admin
              </p>
            </Card>

            {/* Project Interest */}
            <Card className="p-3 md:p-4">
              <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-3">
                Top Research Projects
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {networkingEngagement.projectInterest.length > 0 ? (
                  networkingEngagement.projectInterest.map((project, i) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-xs md:text-sm font-medium text-gray-800 truncate">
                            {project.title}
                          </p>
                          <Badge variant="outline" className="text-[10px] mt-0.5">
                            {project.stage}
                          </Badge>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">
                        {project.interested} interested
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">No project data yet</p>
                )}
              </div>
            </Card>
          </div>
          </>
          )}
        </section>
      </main>
    </div>
  );
}
