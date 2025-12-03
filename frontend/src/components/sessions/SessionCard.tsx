import { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Check, X } from 'lucide-react';
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

interface SessionCardProps {
  session: Session;
  onRsvpChange?: () => void;
}

export function SessionCard({ session, onRsvpChange }: SessionCardProps) {
  const [rsvpStatus, setRsvpStatus] = useState(session.userRsvp?.status);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRsvp = async (status: 'attending' | 'maybe' | 'not_attending') => {
    setIsLoading(true);
    setError(null);

    try {
      if (session.userRsvp) {
        // Update existing RSVP
        await api.patch(`/rsvps/${session.userRsvp.id}`, { status });
      } else {
        // Create new RSVP
        await api.post(`/sessions/${session.id}/rsvp`, { status });
      }

      setRsvpStatus(status);
      onRsvpChange?.();
    } catch (err: any) {
      console.error('Failed to update RSVP', err);
      setError(err.response?.data?.error || 'Failed to update RSVP');
    } finally {
      setIsLoading(false);
    }
  };

  const isFull = session.capacity && session.attendeeCount >= session.capacity;
  const spotsLeft = session.capacity ? session.capacity - session.attendeeCount : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {session.title}
          </h3>
          <span
            className={cn(
              'inline-block px-2 py-1 text-xs font-medium rounded-full',
              session.track === 'AI/ML' && 'bg-purple-100 text-purple-800',
              session.track === 'Cybersecurity' && 'bg-red-100 text-red-800',
              session.track === 'Autonomous Systems' && 'bg-blue-100 text-blue-800',
              session.track === 'Data Science' && 'bg-green-100 text-green-800',
              session.track === 'Other' && 'bg-gray-100 text-gray-800'
            )}
          >
            {session.track}
          </span>
        </div>

        {rsvpStatus === 'attending' && (
          <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Going</span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {session.description}
      </p>

      {/* Speaker */}
      <p className="text-sm font-medium text-gray-900 mb-3">
        Speaker: {session.speaker}
      </p>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{formatDate(session.startTime)}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-2" />
          <span>
            {formatTime(session.startTime)} - {formatTime(session.endTime)}
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-2" />
          <span>{session.location}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-2" />
          <span>
            {session.attendeeCount} attending
            {spotsLeft !== null && (
              <span className="ml-1 text-gray-500">
                ({spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600 flex items-start">
          <X className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* RSVP Buttons */}
      {isFull && rsvpStatus !== 'attending' ? (
        <div className="bg-gray-100 text-gray-600 text-center py-2 rounded-lg text-sm font-medium">
          Session Full
        </div>
      ) : (
        <div className="flex space-x-2">
          <button
            onClick={() => handleRsvp('attending')}
            disabled={isLoading}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
              rsvpStatus === 'attending'
                ? 'bg-green-600 text-white'
                : 'bg-green-50 text-green-600 hover:bg-green-100',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {rsvpStatus === 'attending' ? 'Going' : 'Attend'}
          </button>

          <button
            onClick={() => handleRsvp('maybe')}
            disabled={isLoading}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
              rsvpStatus === 'maybe'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {rsvpStatus === 'maybe' ? 'Maybe' : 'Interested'}
          </button>

          {rsvpStatus && (
            <button
              onClick={() => handleRsvp('not_attending')}
              disabled={isLoading}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors bg-gray-50 text-gray-600 hover:bg-gray-100',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
