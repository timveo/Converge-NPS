import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, Users, MessageCircle, SlidersHorizontal, ChevronLeft } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      {/* Header */}
      <div className="container mx-auto px-4 md:px-4 pt-3 md:pt-4">
        <header className="bg-gradient-navy text-primary-foreground shadow-lg rounded-lg mb-4">
          <div className="px-4 md:px-4 py-3 md:py-4">
            <div className="flex items-center gap-3 md:gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="h-11 w-11 md:h-10 md:w-10 text-primary-foreground hover:bg-primary/20">
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-lg md:text-xl font-bold">My Network</h1>
                <p className="text-sm md:text-sm text-tech-cyan-light">
                  {mockConnections.length} connection{mockConnections.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex-shrink-0"
              >
                <Download className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Export</span>
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 md:px-4 mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" className="text-xs md:text-sm">
              All Connections
            </TabsTrigger>
            <TabsTrigger value="recommended" className="text-xs md:text-sm">
              Recommended
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search & Filter */}
      <div className="container mx-auto px-4 md:px-4 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or organization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Connections List */}
      <main className="container mx-auto px-4 md:px-4 space-y-3 md:space-y-4">
        {mockConnections.length === 0 ? (
          <Card className="text-center py-12 md:py-16">
            <Users className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2">
              No connections yet
            </h3>
            <p className="text-sm md:text-sm text-muted-foreground mb-4">
              Start scanning QR codes to build your network
            </p>
            <Button>Scan QR Code</Button>
          </Card>
        ) : (
          mockConnections.map((connection) => (
            <Card
              key={connection.id}
              className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className="p-3 md:p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 md:h-14 md:w-14 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-base md:text-lg">
                      {connection.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm md:text-base truncate">
                      {connection.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {connection.role}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {connection.organization}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {connection.intents.map((intent) => (
                        <Badge key={intent} variant="secondary" className="text-xs">
                          {intentLabels[intent]}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                  >
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Connected on {new Date(connection.connectedAt).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
