import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface SessionFormData {
  title: string;
  description: string;
  speaker: string;
  startTime: string;
  endTime: string;
  location: string;
  track: string;
  capacity?: number;
  status: string;
}

const TRACKS = [
  'AI/ML',
  'Cybersecurity',
  'Autonomous Systems',
  'Data Science',
  'Maritime Technology',
  'Defense Innovation',
  'Other',
];

const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

export default function SessionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<SessionFormData>({
    title: '',
    description: '',
    speaker: '',
    startTime: '',
    endTime: '',
    location: '',
    track: 'Other',
    capacity: undefined,
    status: 'scheduled',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      fetchSession(id);
    }
  }, [id, isEdit]);

  const fetchSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/sessions/${sessionId}`);
      const session = response.data.data;

      // Convert timestamps to datetime-local format
      const startTime = new Date(session.startTime).toISOString().slice(0, 16);
      const endTime = new Date(session.endTime).toISOString().slice(0, 16);

      setFormData({
        title: session.title,
        description: session.description,
        speaker: session.speaker,
        startTime,
        endTime,
        location: session.location,
        track: session.track,
        capacity: session.capacity || undefined,
        status: session.status,
      });
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to fetch session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'capacity' ? (value ? parseInt(value) : undefined) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      // Convert datetime-local to ISO strings
      const submitData = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      };

      if (isEdit && id) {
        await api.patch(`/admin/sessions/${id}`, submitData);
      } else {
        await api.post('/admin/sessions', submitData);
      }

      navigate('/admin/sessions');
    } catch (error: any) {
      setError(error.response?.data?.error || `Failed to ${isEdit ? 'update' : 'create'} session`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/sessions')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Sessions</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEdit ? 'Edit Session' : 'Create Session'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isEdit ? 'Update session details' : 'Add a new session to the event schedule'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Session Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              minLength={5}
              maxLength={200}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., AI/ML in Autonomous Systems"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Provide a detailed description of the session content..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length} / 2000 characters
            </p>
          </div>

          {/* Speaker */}
          <div>
            <label htmlFor="speaker" className="block text-sm font-medium text-gray-700 mb-2">
              Speaker *
            </label>
            <input
              type="text"
              id="speaker"
              name="speaker"
              value={formData.speaker}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Dr. Jane Smith"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <input
                type="datetime-local"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                End Time *
              </label>
              <input
                type="datetime-local"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Main Auditorium"
            />
          </div>

          {/* Track & Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="track" className="block text-sm font-medium text-gray-700 mb-2">
                Track *
              </label>
              <select
                id="track"
                name="track"
                value={formData.track}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {TRACKS.map((track) => (
                  <option key={track} value={track}>
                    {track}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
                Capacity (Optional)
              </label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity || ''}
                onChange={handleChange}
                min={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 50"
              />
            </div>
          </div>

          {/* Status (Edit only) */}
          {isEdit && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white capitalize"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status} className="capitalize">
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/admin/sessions')}
            disabled={isSaving}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEdit ? 'Update Session' : 'Create Session'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
