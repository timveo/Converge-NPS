import { useState, useEffect } from 'react';
import { Filter, Search, Calendar } from 'lucide-react';
import { SessionCard } from '@/components/sessions/SessionCard';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  title: string;
  description: string;
  speaker: string;
  startTime: string;
  endTime: string;
  location: string;
  track: string;
  capacity?: number;
  attendeeCount: number;
  userRsvp?: {
    id: string;
    status: 'attending' | 'maybe' | 'not_attending';
  };
}

const TRACKS = [
  'All',
  'AI/ML',
  'Cybersecurity',
  'Autonomous Systems',
  'Data Science',
  'Other',
];

const TABS = [
  { id: 'all', label: 'All Sessions' },
  { id: 'my-rsvps', label: 'My RSVPs' },
  { id: 'upcoming', label: 'Upcoming' },
];

export default function SchedulePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('all');
  const [selectedTrack, setSelectedTrack] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [activeTab, selectedTrack, searchQuery]);

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: any = {};

      // Add filters based on active tab
      if (activeTab === 'my-rsvps') {
        // Fetch user's RSVPs instead
        const response = await api.get('/rsvps/me', { params: { upcoming: true } });
        const rsvps = response.data.data;
        setSessions(rsvps.map((rsvp: any) => ({
          ...rsvp.session,
          userRsvp: { id: rsvp.id, status: rsvp.status },
        })));
        setIsLoading(false);
        return;
      }

      // Regular session filters
      if (selectedTrack !== 'All') {
        params.track = selectedTrack;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (activeTab === 'upcoming') {
        params.status = 'scheduled';
      }

      const response = await api.get('/sessions', { params });
      setSessions(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch sessions', err);
      setError('Failed to load sessions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const groupSessionsByDate = (sessions: Session[]) => {
    const groups: { [date: string]: Session[] } = {};

    sessions.forEach(session => {
      const date = new Date(session.startTime).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[date]) {
        groups[date] = [];
      }

      groups[date].push(session);
    });

    return groups;
  };

  const sessionGroups = groupSessionsByDate(sessions);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Schedule</h1>
        <p className="text-gray-600">
          Browse sessions and RSVP to reserve your spot
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 py-2 px-4 rounded-md font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search sessions, speakers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
        >
          <Filter className="w-5 h-5" />
          <span className="font-medium">Filters</span>
        </button>

        {/* Track Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            {TRACKS.map(track => (
              <button
                key={track}
                onClick={() => setSelectedTrack(track)}
                className={cn(
                  'px-4 py-2 rounded-full font-medium transition-colors',
                  selectedTrack === track
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {track}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Loading sessions...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && sessions.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No sessions found
          </h3>
          <p className="text-gray-600">
            Try adjusting your filters or check back later
          </p>
        </div>
      )}

      {/* Session List */}
      {!isLoading && !error && sessions.length > 0 && (
        <div className="space-y-8">
          {Object.entries(sessionGroups).map(([date, dateSessions]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center mb-4">
                <div className="flex-1 h-px bg-gray-200" />
                <h2 className="px-4 text-lg font-semibold text-gray-900">{date}</h2>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Sessions for this date */}
              <div className="grid gap-4 md:grid-cols-2">
                {dateSessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onRsvpChange={fetchSessions}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
