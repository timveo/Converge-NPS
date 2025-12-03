import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';

interface DashboardStats {
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
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load dashboard statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.overview.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      link: '/admin/users',
    },
    {
      title: 'Total Sessions',
      value: stats.overview.totalSessions,
      icon: Calendar,
      color: 'bg-green-500',
      link: '/admin/sessions',
    },
    {
      title: 'Connections',
      value: stats.overview.totalConnections,
      icon: Activity,
      color: 'bg-purple-500',
    },
    {
      title: 'Messages',
      value: stats.overview.totalMessages,
      icon: MessageSquare,
      color: 'bg-orange-500',
    },
    {
      title: 'Research Projects',
      value: stats.overview.totalProjects,
      icon: TrendingUp,
      color: 'bg-pink-500',
    },
    {
      title: 'Recent Signups (7d)',
      value: stats.overview.recentUsers,
      icon: UserPlus,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">
          Event management and analytics overview
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          to="/admin/sessions/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Create Session
        </Link>
        <Link
          to="/admin/users"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Manage Users
        </Link>
        <Link
          to="/admin/analytics"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          View Analytics
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const CardWrapper = stat.link ? Link : 'div';
          const wrapperProps = stat.link ? { to: stat.link } : {};

          return (
            <CardWrapper
              key={stat.title}
              {...wrapperProps}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${
                stat.link ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">{stat.title}</p>
              </div>
            </CardWrapper>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Users by Role
          </h3>
          <div className="space-y-3">
            {stats.usersByRole.map((item) => {
              const percentage = (item.count / stats.overview.totalUsers) * 100;
              return (
                <div key={item.role}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {item.role}
                    </span>
                    <span className="text-sm text-gray-600">
                      {item.count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sessions by Track */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sessions by Track
          </h3>
          <div className="space-y-3">
            {stats.sessionsByTrack.map((item) => {
              const percentage = (item.count / stats.overview.totalSessions) * 100;
              const colors: { [key: string]: string } = {
                'AI/ML': 'bg-purple-600',
                'Cybersecurity': 'bg-red-600',
                'Autonomous Systems': 'bg-blue-600',
                'Data Science': 'bg-green-600',
                'Other': 'bg-gray-600',
              };
              const color = colors[item.track] || 'bg-gray-600';

              return (
                <div key={item.track}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {item.track}
                    </span>
                    <span className="text-sm text-gray-600">
                      {item.count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${color} h-2 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Sessions Alert */}
      {stats.overview.upcomingSessions > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Calendar className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                {stats.overview.upcomingSessions} Upcoming Session
                {stats.overview.upcomingSessions !== 1 ? 's' : ''}
              </h4>
              <p className="text-sm text-blue-700">
                View and manage scheduled sessions
              </p>
              <Link
                to="/admin/sessions"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block"
              >
                Go to Sessions →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
