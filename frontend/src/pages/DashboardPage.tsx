import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  Calendar,
  Briefcase,
  MessageCircle,
  Users,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

// Mock data - replace with API calls
const mockRecommendedConnections = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    organization: 'Naval Postgraduate School',
    role: 'Associate Professor',
    interests: ['AI/ML', 'Cybersecurity'],
    matchScore: 95,
  },
  {
    id: '2',
    name: 'Michael Chen',
    organization: 'Lockheed Martin',
    role: 'Senior Engineer',
    interests: ['Autonomous Systems', 'Robotics'],
    matchScore: 88,
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    organization: 'DARPA',
    role: 'Program Manager',
    interests: ['Emerging Technologies', 'Innovation'],
    matchScore: 85,
  },
];

const mockUpcomingSessions = [
  {
    id: '1',
    title: 'AI in Defense: Current Trends',
    time: '10:00 AM',
    location: 'Main Hall',
    type: 'keynote' as const,
  },
  {
    id: '2',
    title: 'Autonomous Systems Workshop',
    time: '2:00 PM',
    location: 'Lab 3',
    type: 'workshop' as const,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Scan QR Code',
      description: 'Connect with attendees',
      icon: QrCode,
      href: '/scanner',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'View Schedule',
      description: 'Browse sessions',
      icon: Calendar,
      href: '/schedule',
      color: 'text-green-600 bg-green-50',
    },
    {
      title: 'Browse Projects',
      description: 'Discover research',
      icon: Briefcase,
      href: '/projects',
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: 'Messages',
      description: '3 new messages',
      icon: MessageCircle,
      href: '/messages',
      color: 'text-orange-600 bg-orange-50',
      badge: 3,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.fullName?.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 mt-1">
            NPS Tech Accelerator 2026 - January 28-30
          </p>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} to={action.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg ${action.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      {action.badge && (
                        <Badge variant="destructive">{action.badge}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mt-4">{action.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Today's Schedule
                  </CardTitle>
                  <CardDescription>Your upcoming sessions</CardDescription>
                </div>
                <Link to="/my-schedule">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUpcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-2 min-w-[60px]">
                      <span className="text-xs text-gray-600">Today</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {session.time}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{session.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {session.location}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        {session.type}
                      </Badge>
                    </div>
                  </div>
                ))}
                {mockUpcomingSessions.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No sessions scheduled for today</p>
                    <Link to="/schedule">
                      <Button variant="link" className="mt-2">
                        Browse Schedule
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Connections */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Recommended Connections
                  </CardTitle>
                  <CardDescription>People you should meet</CardDescription>
                </div>
                <Link to="/connections">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecommendedConnections.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {person.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{person.name}</h4>
                      <p className="text-sm text-gray-600">{person.role}</p>
                      <p className="text-sm text-gray-500">{person.organization}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {person.interests.slice(0, 2).map((interest) => (
                          <Badge key={interest} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      {person.matchScore}% match
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-gray-600">Connections</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">5</p>
                  <p className="text-sm text-gray-600">Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-sm text-gray-600">Bookmarks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-sm text-gray-600">Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
