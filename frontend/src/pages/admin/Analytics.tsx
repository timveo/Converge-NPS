import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  Loader2,
  TrendingUp,
  Users,
  Calendar,
  MessageSquare,
  Activity,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';

interface ActivityReport {
  period: string;
  since: string;
  activity: {
    newUsers: number;
    newConnections: number;
    newMessages: number;
    newRsvps: number;
    newProjects: number;
  };
}

interface RsvpStats {
  bySession: Array<{
    sessionId: string;
    sessionTitle: string;
    capacity: number | null;
    attending: number;
    fillRate: number | null;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
}

interface ActivityResponse {
  success: boolean;
  data: ActivityReport;
}

interface RsvpResponse {
  success: boolean;
  data: RsvpStats;
}

export default function Analytics() {
  const [activityReport, setActivityReport] = useState<ActivityReport | null>(null);
  const [rsvpStats, setRsvpStats] = useState<RsvpStats | null>(null);
  const [days, setDays] = useState('7');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [activityRes, rsvpRes] = await Promise.all([
        api.get<ActivityResponse>(`/admin/stats/activity?days=${days}`),
        api.get<RsvpResponse>('/admin/stats/rsvps'),
      ]);

      if (activityRes.success) {
        setActivityReport(activityRes.data);
      }
      if (rsvpRes.success) {
        setRsvpStats(rsvpRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFillRateColor = (fillRate: number | null) => {
    if (!fillRate) return 'bg-gray-200';
    if (fillRate >= 90) return 'bg-red-500';
    if (fillRate >= 70) return 'bg-yellow-500';
    if (fillRate >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  if (isLoading) {
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
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                  Analytics
                </h1>
                <p className="text-xs md:text-sm text-blue-200">
                  Track platform activity and engagement
                </p>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-3 md:px-4 py-3 md:py-6 max-w-6xl space-y-3 md:space-y-6">
        {/* Time Period Selector */}
        <Card className="p-3 md:p-4 shadow-md border-gray-200">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Activity Period:</label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Activity Report */}
        {activityReport && (
          <div>
            <h2 className="text-sm md:text-lg font-semibold text-gray-900 mb-2 md:mb-4">
              Activity Report ({activityReport.period})
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4">
              {/* New Users */}
              <Card className="p-3 md:p-6 shadow-md border-gray-200">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                  </div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                  {activityReport.activity.newUsers}
                </div>
                <div className="text-xs md:text-sm text-gray-600">New Users</div>
              </Card>

              {/* New Connections */}
              <Card className="p-3 md:p-6 shadow-md border-gray-200">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Activity className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                  </div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                  {activityReport.activity.newConnections}
                </div>
                <div className="text-xs md:text-sm text-gray-600">Connections</div>
              </Card>

              {/* New RSVPs */}
              <Card className="p-3 md:p-6 shadow-md border-gray-200">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                  </div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                  {activityReport.activity.newRsvps}
                </div>
                <div className="text-xs md:text-sm text-gray-600">RSVPs</div>
              </Card>

              {/* New Messages */}
              <Card className="p-3 md:p-6 shadow-md border-gray-200">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" />
                  </div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                  {activityReport.activity.newMessages}
                </div>
                <div className="text-xs md:text-sm text-gray-600">Messages</div>
              </Card>

              {/* New Projects */}
              <Card className="p-3 md:p-6 shadow-md border-gray-200">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
                  </div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                  {activityReport.activity.newProjects}
                </div>
                <div className="text-xs md:text-sm text-gray-600">Projects</div>
              </Card>
            </div>
          </div>
        )}

        {/* RSVP Statistics */}
        {rsvpStats && (
          <>
            {/* RSVP Status Breakdown */}
            <Card className="p-3 md:p-6 shadow-md border-gray-200">
              <h2 className="text-sm md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
                RSVPs by Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {rsvpStats.byStatus.map((item) => {
                  const total = rsvpStats.byStatus.reduce((sum, s) => sum + s.count, 0);
                  const percentage = total > 0 ? (item.count / total) * 100 : 0;

                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs md:text-sm font-medium text-gray-700 capitalize">
                          {item.status}
                        </span>
                        <span className="text-xs md:text-sm font-bold text-gray-900">
                          {item.count}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            item.status === 'attending'
                              ? 'bg-green-500'
                              : item.status === 'maybe'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-500 mt-1">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Session Fill Rates */}
            <Card className="p-3 md:p-6 shadow-md border-gray-200">
              <h2 className="text-sm md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
                Session Capacity & Fill Rates
              </h2>
              <div className="space-y-3">
                {rsvpStats.bySession.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No upcoming sessions with RSVPs</p>
                  </div>
                ) : (
                  rsvpStats.bySession.map((session) => (
                    <div
                      key={session.sessionId}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {session.sessionTitle}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {session.attending} attending
                            {session.capacity && ` / ${session.capacity} capacity`}
                          </p>
                        </div>
                        {session.fillRate !== null && (
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              session.fillRate >= 90
                                ? 'bg-red-100 text-red-800'
                                : session.fillRate >= 70
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {session.fillRate.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      {session.fillRate !== null && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${getFillRateColor(
                              session.fillRate
                            )}`}
                            style={{ width: `${Math.min(session.fillRate, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Insights */}
            <Card className="p-3 md:p-6 shadow-md border-blue-200 bg-blue-50">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Analytics Insights</h3>
                  <ul className="text-xs md:text-sm text-blue-800 space-y-1">
                    {activityReport && activityReport.activity.newUsers > 0 && (
                      <li>
                        {activityReport.activity.newUsers} new users joined in the last {days} days
                      </li>
                    )}
                    {rsvpStats.bySession.some((s) => s.fillRate && s.fillRate >= 90) && (
                      <li>
                        {rsvpStats.bySession.filter((s) => s.fillRate && s.fillRate >= 90).length}{' '}
                        sessions are nearly full (90%+ capacity)
                      </li>
                    )}
                    {rsvpStats.byStatus.find((s) => s.status === 'attending') && (
                      <li>
                        {rsvpStats.byStatus.find((s) => s.status === 'attending')?.count} total
                        confirmed attendees across all sessions
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
