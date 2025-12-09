import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Search, Filter, Shield, Clock } from 'lucide-react';

const mockLogs = [
  {
    id: '1',
    event: 'user_login',
    user: 'admin@nps.edu',
    timestamp: '2026-01-28 09:15:23',
    details: 'Successful login from 192.168.1.100',
  },
  {
    id: '2',
    event: 'role_changed',
    user: 'admin@nps.edu',
    timestamp: '2026-01-28 09:20:45',
    details: 'Changed role for user john@nps.edu to staff',
  },
  {
    id: '3',
    event: 'data_export',
    user: 'admin@nps.edu',
    timestamp: '2026-01-28 10:05:12',
    details: 'Exported connections data (CSV)',
  },
  {
    id: '4',
    event: 'session_created',
    user: 'admin@nps.edu',
    timestamp: '2026-01-28 10:30:00',
    details: 'Created new session: AI/ML Workshop',
  },
  {
    id: '5',
    event: 'user_registered',
    user: 'system',
    timestamp: '2026-01-28 11:00:15',
    details: 'New user registration: jane.doe@nps.edu',
  },
];

const getEventBadgeColor = (event: string) => {
  switch (event) {
    case 'user_login':
      return 'bg-green-100 text-green-800';
    case 'role_changed':
      return 'bg-yellow-100 text-yellow-800';
    case 'data_export':
      return 'bg-blue-100 text-blue-800';
    case 'session_created':
      return 'bg-purple-100 text-purple-800';
    case 'user_registered':
      return 'bg-teal-100 text-teal-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = mockLogs.filter(
    (log) =>
      log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <Shield className="h-4 w-4 md:h-5 md:w-5" />
                  Audit Logs
                </h1>
                <p className="text-xs md:text-sm text-blue-200">
                  Security and activity audit trail
                </p>
              </div>
              <Badge className="bg-white/20 text-white text-xs">
                {filteredLogs.length} logs
              </Badge>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-3 md:px-4 py-3 md:py-6 max-w-6xl space-y-3 md:space-y-6">
        {/* Search & Filter */}
        <Card className="shadow-md border-gray-200">
          <CardContent className="p-3 md:p-4">
            <div className="flex gap-2 md:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search logs by event, user, or details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 md:h-11 text-sm"
                />
              </div>
              <Button variant="outline" className="h-10 md:h-11 text-sm">
                <Filter className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Filter</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card className="shadow-md border-gray-200">
          <CardContent className="p-3 md:p-6">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No logs found matching your search</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${getEventBadgeColor(log.event)}`}>
                          {log.event.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs md:text-sm text-gray-600">{log.user}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-900 mb-2">{log.details}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {log.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="p-3 md:p-6 shadow-md border-blue-200 bg-blue-50">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-2">About Audit Logs</h3>
              <p className="text-xs md:text-sm text-blue-800">
                Audit logs track important security events and administrative actions. All logs are
                retained for 90 days and can be exported for compliance purposes.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
