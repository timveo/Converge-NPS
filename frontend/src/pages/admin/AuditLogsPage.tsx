import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';

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
];

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-gray-600 mt-1">
          Security and activity audit trail
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {mockLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{log.event}</Badge>
                    <span className="text-sm text-gray-600">{log.user}</span>
                  </div>
                  <p className="text-sm text-gray-900">{log.details}</p>
                  <p className="text-xs text-gray-500 mt-1">{log.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
