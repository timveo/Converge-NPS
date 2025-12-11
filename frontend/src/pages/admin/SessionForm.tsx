import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, Save, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';

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

interface SessionResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    description: string;
    speaker: string;
    startTime: string;
    endTime: string;
    location: string;
    track: string;
    capacity?: number;
    status: string;
  };
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
      const response = await api.get<SessionResponse>(`/sessions/${sessionId}`);
      const session = response.data;

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
      toast.error('Failed to load session');
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
        toast.success('Session updated successfully');
      } else {
        await api.post('/admin/sessions', submitData);
        toast.success('Session created successfully');
      }

      navigate('/admin/sessions');
    } catch (error: any) {
      setError(error.response?.data?.error || `Failed to ${isEdit ? 'update' : 'create'} session`);
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} session`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      {/* Header */}
      <div className="container mx-auto px-3 md:px-4 pt-2 md:pt-4 max-w-4xl">
        <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-10 rounded-lg">
          <div className="px-3 md:px-4 py-2 md:py-4">
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/admin/sessions">
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
                  <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                  {isEdit ? 'Edit Session' : 'Create Session'}
                </h1>
                <p className="text-xs md:text-sm text-blue-200">
                  {isEdit ? 'Update session details' : 'Add a new session'}
                </p>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-3 md:px-4 py-3 md:py-6 max-w-4xl">
        {/* Error Message */}
        {error && (
          <Card className="mb-4 p-3 md:p-4 bg-red-50 border-red-200">
            <div className="flex items-start gap-2 md:gap-3">
              <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs md:text-sm font-medium text-red-800">Error</h3>
                <p className="text-xs md:text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Form */}
        <Card className="p-4 md:p-6 shadow-md border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5"
              >
                Session Title *
              </label>
              <Input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                minLength={5}
                maxLength={200}
                placeholder="e.g., AI/ML in Autonomous Systems"
                className="h-10 md:h-11 text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5"
              >
                Description *
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                placeholder="Provide a detailed description of the session content..."
                className="text-sm"
              />
              <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                {formData.description.length} / 2000 characters
              </p>
            </div>

            {/* Speaker */}
            <div>
              <label
                htmlFor="speaker"
                className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5"
              >
                Speaker *
              </label>
              <Input
                type="text"
                id="speaker"
                name="speaker"
                value={formData.speaker}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={100}
                placeholder="e.g., Dr. Jane Smith"
                className="h-10 md:h-11 text-sm"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startTime"
                  className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5"
                >
                  Start Time *
                </label>
                <Input
                  type="datetime-local"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                  className="h-10 md:h-11 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="endTime"
                  className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5"
                >
                  End Time *
                </label>
                <Input
                  type="datetime-local"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                  className="h-10 md:h-11 text-sm"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5"
              >
                Location *
              </label>
              <Input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={100}
                placeholder="e.g., Main Auditorium"
                className="h-10 md:h-11 text-sm"
              />
            </div>

            {/* Track & Capacity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="track"
                  className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5"
                >
                  Track *
                </label>
                <Select
                  value={formData.track}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, track: value }))}
                >
                  <SelectTrigger className="h-10 md:h-11 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRACKS.map((track) => (
                      <SelectItem key={track} value={track}>
                        {track}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label
                  htmlFor="capacity"
                  className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5"
                >
                  Capacity (Optional)
                </label>
                <Input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={formData.capacity || ''}
                  onChange={handleChange}
                  min={1}
                  placeholder="e.g., 50"
                  className="h-10 md:h-11 text-sm"
                />
              </div>
            </div>

            {/* Status (Edit only) */}
            {isEdit && (
              <div>
                <label
                  htmlFor="status"
                  className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5"
                >
                  Status *
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="h-10 md:h-11 text-sm capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/sessions')}
                disabled={isSaving}
                className="h-11 md:h-10 text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-11 md:h-10 text-sm gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{isEdit ? 'Update' : 'Create'}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
