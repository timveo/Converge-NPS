import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Download, Users, SortAsc } from 'lucide-react';

const mockConnections = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    organization: 'Naval Postgraduate School',
    role: 'Associate Professor',
    intents: ['research', 'funding'],
    connectedAt: '2026-01-28',
  },
  {
    id: '2',
    name: 'Michael Chen',
    organization: 'Lockheed Martin',
    role: 'Senior Engineer',
    intents: ['brainstorming', 'hackathon'],
    connectedAt: '2026-01-29',
  },
];

const intentLabels: Record<string, string> = {
  research: 'Research',
  brainstorming: 'Brainstorming',
  funding: 'Funding',
  hackathon: 'Hackathon',
};

export default function ConnectionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Connections</h1>
            <p className="text-gray-600 mt-1">
              {mockConnections.length} connections
            </p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export vCard
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline">
                <SortAsc className="w-4 h-4 mr-2" />
                Sort
              </Button>
            </div>
          </CardContent>
        </Card>

        {mockConnections.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
                <p className="text-gray-600 mb-4">
                  Start scanning QR codes to build your network
                </p>
                <Button>Scan QR Code</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockConnections.map((connection) => (
              <Card key={connection.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {connection.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{connection.name}</h3>
                      <p className="text-sm text-gray-600 truncate">{connection.role}</p>
                      <p className="text-sm text-gray-500 truncate">{connection.organization}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {connection.intents.map((intent) => (
                      <Badge key={intent} variant="secondary" className="text-xs">
                        {intentLabels[intent]}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Connected on {new Date(connection.connectedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
