import { useState, useEffect } from 'react';
import { TrendingUp, Users, Calendar, MessageSquare, Activity, Briefcase } from 'lucide-react';
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

export default function Analytics() {
  const [activityReport, setActivityReport] = useState<ActivityReport | null>(null);
  const [rsvpStats, setRsvpStats] = useState<RsvpStats | null>(null);
  const [days, setDays] = useState(7);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [activityRes, rsvpRes] = await Promise.all([
        api.get(`/admin/stats/activity?days=${days}`),
        api.get('/admin/stats/rsvps'),
      ]);

      setActivityReport(activityRes.data.data);
      setRsvpStats(rsvpRes.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      attending: 'bg-green-100 text-green-800',
      maybe: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
      <div className="flex items-center justify-center h-full py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
        <p className="text-gray-600">Track platform activity and engagement metrics</p>
      </div>

      {/* Time Period Selector */}
      <div className="mb-6 flex items-center space-x-4">
        <label htmlFor="days" className="text-sm font-medium text-gray-700">
          Activity Period:
        </label>
        <select
          id="days"
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Activity Report */}
      {activityReport && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Activity Report ({activityReport.period})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* New Users */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {activityReport.activity.newUsers}
              </div>
              <div className="text-sm text-gray-600">New Users</div>
            </div>

            {/* New Connections */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {activityReport.activity.newConnections}
              </div>
              <div className="text-sm text-gray-600">New Connections</div>
            </div>

            {/* New RSVPs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {activityReport.activity.newRsvps}
              </div>
              <div className="text-sm text-gray-600">New RSVPs</div>
            </div>

            {/* New Messages */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {activityReport.activity.newMessages}
              </div>
              <div className="text-sm text-gray-600">New Messages</div>
            </div>

            {/* New Projects */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Briefcase className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {activityReport.activity.newProjects}
              </div>
              <div className="text-sm text-gray-600">New Projects</div>
            </div>
          </div>
        </div>
      )}

      {/* RSVP Statistics */}
      {rsvpStats && (
        <>
          {/* RSVP Status Breakdown */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">RSVPs by Status</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {rsvpStats.byStatus.map((item) => {
                  const total = rsvpStats.byStatus.reduce((sum, s) => sum + s.count, 0);
                  const percentage = total > 0 ? (item.count / total) * 100 : 0;

                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {item.status}
                        </span>
                        <span className="text-sm font-bold text-gray-900">{item.count}</span>
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
                      <div className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Session Fill Rates */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Session Capacity & Fill Rates
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Session
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attending
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fill Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rsvpStats.bySession.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          No upcoming sessions with RSVPs
                        </td>
                      </tr>
                    ) : (
                      rsvpStats.bySession.map((session) => (
                        <tr key={session.sessionId} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {session.sessionTitle}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 font-medium">
                              {session.attending}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {session.capacity || 'No limit'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {session.fillRate !== null ? (
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                                    <div
                                      className={`h-2 rounded-full transition-all ${getFillRateColor(
                                        session.fillRate
                                      )}`}
                                      style={{
                                        width: `${Math.min(session.fillRate, 100)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {session.fillRate.toFixed(0)}%
                                  </span>
                                </div>
                                {session.fillRate >= 90 && (
                                  <div className="text-xs text-red-600 font-medium">
                                    Nearly full
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-2">Analytics Insights</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  {activityReport && activityReport.activity.newUsers > 0 && (
                    <li>
                      • {activityReport.activity.newUsers} new users joined in the last {days}{' '}
                      days
                    </li>
                  )}
                  {rsvpStats.bySession.some((s) => s.fillRate && s.fillRate >= 90) && (
                    <li>
                      • {rsvpStats.bySession.filter((s) => s.fillRate && s.fillRate >= 90).length}{' '}
                      sessions are nearly full (90%+ capacity)
                    </li>
                  )}
                  {rsvpStats.byStatus.find((s) => s.status === 'attending') && (
                    <li>
                      • {rsvpStats.byStatus.find((s) => s.status === 'attending')?.count} total
                      confirmed attendees across all sessions
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
