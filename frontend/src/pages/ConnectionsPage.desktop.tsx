import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Loader2,
  Trash2,
  Users,
  Sparkles,
  FileText,
  Bell,
  BellOff,
  Search,
  X,
  Lock,
  Edit,
  Save,
  BookOpen,
  UserPlus,
  ChevronRight,
  Building2,
  Calendar,
  Tag,
  Clock,
  Filter,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ThreePanelLayout } from '@/components/desktop/layouts/ThreePanelLayout';
import { DesktopShell } from '@/components/desktop/DesktopShell';
import { api } from '@/lib/api';
import { useDismissedRecommendations } from '@/hooks/useDismissedRecommendations';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Connection {
  id: string;
  other_user_id: string;
  is_initiator: boolean;
  notes: string | null;
  collaborative_intents: string[] | null;
  created_at: string;
  follow_up_reminder: string | null;
  reminder_sent: boolean;
  profile: {
    full_name: string;
    role: string | null;
    organization: string | null;
    acceleration_interests: string[] | null;
    is_checked_in?: boolean;
    participant_type?: string | null;
  } | null;
}

interface RecommendedConnection {
  id: string;
  full_name: string;
  role: string;
  organization: string;
  acceleration_interests: string[];
  score: number;
  sharedInterests: string[];
  mutualConnections: number;
  sameOrganization: boolean;
}

interface Participant {
  id: string;
  fullName: string;
  organization?: string;
  department?: string;
  role?: string;
  avatarUrl?: string;
  accelerationInterests?: string[];
  isConnected?: boolean;
  isCheckedIn?: boolean;
  participantType?: string;
}

const COLLABORATION_TYPES = [
  { value: 'collaborative_research', label: 'Collaborative Research' },
  { value: 'brainstorming', label: 'Brainstorming' },
  { value: 'design_sprint', label: 'Design Sprint' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'funded_research', label: 'Funded Research' },
];

const PARTICIPANT_TYPES = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'industry', label: 'Industry' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'guest', label: 'Guest' },
];

export default function ConnectionsDesktopPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    participantTypes: string[];
    sortBy: string;
    eventAttendeesOnly: boolean;
  }>({
    participantTypes: [],
    sortBy: 'recent',
    eventAttendeesOnly: false,
  });
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [editedNote, setEditedNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedConnection[]>([]);
  const [connectingUser, setConnectingUser] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const {
    dismiss: dismissRecommendation,
    isDismissed: isRecommendationDismissed,
  } = useDismissedRecommendations('connections');

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchConnections();
    fetchParticipants();
  }, []);

  useEffect(() => {
    if (connections.length >= 0) {
      fetchRecommendations();
    }
  }, [connections]);

  // Handle query params (userId and tab)
  useEffect(() => {
    const userId = searchParams.get('userId');
    const tab = searchParams.get('tab');

    // Handle tab query param
    if (tab === 'participants' && activeTab !== 'participants') {
      setActiveTab('participants');
    }

    // Handle userId query param to auto-select participant
    if (userId) {
      // Switch to participants tab and fetch participants
      setActiveTab('participants');
      fetchParticipants().then((fetchedParticipants) => {
        const participant = fetchedParticipants.find((p) => p.id === userId);
        if (participant) {
          setSelectedParticipant(participant);
          setSelectedConnection(null);
        }
      });
      // Clear the query param after processing
      setSearchParams({}, { replace: true });
    } else if (tab) {
      // Clear tab param but keep the tab state
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const [privateProfileMatch, setPrivateProfileMatch] = useState(false);

  const fetchParticipants = async (): Promise<Participant[]> => {
    setParticipantsLoading(true);
    try {
      const response = await api.get('/users/participants?limit=1000');
      const data = (response as any).data || [];
      setPrivateProfileMatch((response as any).privateProfileMatch || false);
      const mapped: Participant[] = data.map((p: any) => ({
        id: p.id,
        fullName: p.fullName || p.full_name || 'Unknown',
        organization: p.organization,
        department: p.department,
        role: p.role,
        avatarUrl: p.avatarUrl,
        accelerationInterests: p.accelerationInterests || p.acceleration_interests || [],
        isConnected: p.isConnected || p.is_connected || false,
        isCheckedIn: p.isCheckedIn || p.is_checked_in || false,
        participantType: p.participantType || p.participant_type || null,
      }));
      setParticipants(mapped);
      return mapped;
    } catch (error) {
      console.error('Error fetching participants:', error);
      return [];
    } finally {
      setParticipantsLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await api.get('/connections/recommendations');
      const data = (response as any).data || [];
      const mapped = data.map((rec: any) => ({
        id: rec.id,
        full_name: rec.fullName || rec.full_name || 'Unknown',
        role: rec.role || '',
        organization: rec.organization || '',
        acceleration_interests: rec.accelerationInterests || rec.acceleration_interests || [],
        score: rec.matchScore || rec.score || 0,
        sharedInterests: rec.matchReasons || rec.sharedInterests || [],
        mutualConnections: rec.mutualConnections || 0,
        sameOrganization: rec.sameOrganization || false,
      }));
      setRecommendations(mapped.slice(0, 3));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleConnectRecommendation = async (userId: string) => {
    setConnectingUser(userId);
    try {
      await api.post('/connections', { connectedUserId: userId });
      toast.success('Connection added successfully');
      setRecommendations((prev) => prev.filter((rec) => rec.id !== userId));
      fetchConnections();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to add connection';
      toast.error(message);
    } finally {
      setConnectingUser(null);
    }
  };

  const handleConnectParticipant = async (participantId: string) => {
    setConnectingUser(participantId);
    try {
      await api.post('/connections', { connectedUserId: participantId });
      toast.success('Connection added successfully');
      // Remove from participants list and refresh connections
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      setSelectedParticipant(null);
      setActiveTab('all');
      fetchConnections();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to add connection';
      toast.error(message);
    } finally {
      setConnectingUser(null);
    }
  };

  const fetchConnections = async () => {
    try {
      const response = await api.get('/connections');
      const data = (response as any).connections || (response as any).data || [];

      const mappedConnections: Connection[] = data.map((conn: any) => ({
        id: conn.id,
        other_user_id: conn.connectedUserId || conn.connected_user_id || conn.otherUserId,
        is_initiator: conn.isInitiator || conn.is_initiator || false,
        notes: conn.notes,
        collaborative_intents: conn.collaborativeIntents || conn.collaborative_intents || [],
        created_at: conn.createdAt || conn.created_at,
        follow_up_reminder: conn.followUpReminder || conn.follow_up_reminder,
        reminder_sent: conn.reminderSent || conn.reminder_sent || false,
        profile: conn.connectedUser || conn.profile
          ? {
              full_name:
                conn.connectedUser?.fullName ||
                conn.profile?.full_name ||
                conn.profile?.fullName ||
                'Unknown',
              role: conn.connectedUser?.role || conn.profile?.role,
              organization: conn.connectedUser?.organization || conn.profile?.organization,
              acceleration_interests:
                conn.connectedUser?.accelerationInterests ||
                conn.profile?.acceleration_interests ||
                [],
              is_checked_in: conn.connectedUser?.isCheckedIn || conn.profile?.is_checked_in || false,
              participant_type: conn.connectedUser?.participantType || conn.profile?.participant_type || null,
            }
          : null,
      }));

      setConnections(mappedConnections);
      if (mappedConnections.length > 0 && !selectedConnection) {
        setSelectedConnection(mappedConnections[0] ?? null);
      }
    } catch (error: any) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const filteredConnections = useMemo(() => {
    // When on participants tab, return empty to hide connections
    if (activeTab === 'participants') {
      return [];
    }

    let result = [...connections];

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter((conn) => {
        const nameMatch = conn.profile?.full_name?.toLowerCase().includes(searchLower);
        const orgMatch = conn.profile?.organization?.toLowerCase().includes(searchLower);
        return nameMatch || orgMatch;
      });
    }

    if (filters.participantTypes.length > 0) {
      result = result.filter((conn) => {
        const participantType = conn.profile?.participant_type?.toLowerCase();
        return filters.participantTypes.some((type: string) => participantType === type);
      });
    }

    if (filters.eventAttendeesOnly) {
      result = result.filter((conn) => conn.profile?.is_checked_in === true);
    }

    switch (filters.sortBy) {
      case 'recent':
        result.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case 'name-asc':
        result.sort((a, b) =>
          (a.profile?.full_name || '').localeCompare(b.profile?.full_name || '')
        );
        break;
      case 'name-desc':
        result.sort((a, b) =>
          (b.profile?.full_name || '').localeCompare(a.profile?.full_name || '')
        );
        break;
    }

    return result;
  }, [connections, searchQuery, filters, activeTab]);

  // Filter participants by search query and filters
  const filteredParticipants = useMemo(() => {
    let result = [...participants];

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const nameMatch = p.fullName?.toLowerCase().includes(searchLower);
        const orgMatch = p.organization?.toLowerCase().includes(searchLower);
        return nameMatch || orgMatch;
      });
    }

    if (filters.participantTypes.length > 0) {
      result = result.filter((p) => {
        const pType = p.participantType?.toLowerCase();
        return filters.participantTypes.some((type: string) => pType === type);
      });
    }

    if (filters.eventAttendeesOnly) {
      result = result.filter((p) => p.isCheckedIn === true);
    }

    return result;
  }, [participants, searchQuery, filters]);

  const handleDeleteConnection = async (connectionId: string) => {
    try {
      await api.delete(`/connections/${connectionId}`);
      toast.success('Connection deleted');
      setConnections(connections.filter((c) => c.id !== connectionId));
      if (selectedConnection?.id === connectionId) {
        const remaining = connections.filter((c) => c.id !== connectionId);
        setSelectedConnection(remaining.length > 0 ? remaining[0] ?? null : null);
      }
    } catch (error: any) {
      toast.error('Failed to delete connection');
    }
  };

  const handleSaveNote = async () => {
    if (!selectedConnection) return;
    setSavingNote(true);
    try {
      await api.patch(`/connections/${selectedConnection.id}`, { notes: editedNote });
      toast.success('Note saved');
      setConnections((prev) =>
        prev.map((c) => (c.id === selectedConnection.id ? { ...c, notes: editedNote } : c))
      );
      setSelectedConnection((prev) => (prev ? { ...prev, notes: editedNote } : null));
      setEditingNote(false);
    } catch (error: any) {
      toast.error('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleRemoveReminder = async (connectionId: string) => {
    try {
      await api.patch(`/connections/${connectionId}`, {
        followUpReminder: null,
        reminderSent: false,
      });
      toast.success('Reminder removed');
      fetchConnections();
    } catch (error: any) {
      toast.error('Failed to remove reminder');
    }
  };

  const clearFilters = () => {
    setFilters({ participantTypes: [], sortBy: 'recent', eventAttendeesOnly: false });
    setSearchQuery('');
  };

  const toggleArrayFilter = useCallback(
    (key: 'participantTypes', value: string) => {
      setFilters((prev) => {
        const current = prev[key];
        const updated = current.includes(value)
          ? current.filter((v: string) => v !== value)
          : [...current, value];
        return { ...prev, [key]: updated };
      });
    },
    []
  );

  const activeFilterCount = filters.participantTypes.length + (filters.eventAttendeesOnly ? 1 : 0);

  const visibleRecommendations = recommendations
    .filter((r) => !isRecommendationDismissed(r.id))
    .slice(0, 3);

  // Left Panel - Filters
  const FiltersPanel = (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Filter className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Filters</h2>
            <p className="text-sm text-muted-foreground">Refine your search</p>
          </div>
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Search */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Name, organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Sort */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Sort By</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters((p) => ({ ...p, sortBy: value }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* At Event Filter */}
          <div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="at-event-filter"
                checked={filters.eventAttendeesOnly}
                onChange={(e) => setFilters(prev => ({ ...prev, eventAttendeesOnly: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="at-event-filter" className="cursor-pointer text-sm font-medium">
                At Event
              </Label>
            </div>
          </div>

          <Separator />

          {/* Participant Type Filters */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Participant Type</Label>
            <div className="space-y-2">
              {PARTICIPANT_TYPES.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`type-${type.value}`}
                    checked={filters.participantTypes.includes(type.value)}
                    onChange={() => toggleArrayFilter('participantTypes', type.value)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={`type-${type.value}`} className="cursor-pointer text-sm">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  // Center Panel - Connection List
  const ConnectionListPanel = (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center justify-between border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">My Network</h2>
            <p className="text-sm text-muted-foreground">Your connections</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          // Clear selections when switching tabs
          if (value === 'participants') {
            setSelectedConnection(null);
          } else {
            setSelectedParticipant(null);
          }
        }}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1 text-sm">
              My Connections
              <Badge variant="secondary" className="ml-2 text-xs">
                {connections.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex-1 text-sm">
              <Users className="h-3 w-3 mr-1" />
              NPS Community
              <Badge variant="secondary" className="ml-2 text-xs">
                {participants.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Connection List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Recommendations Section */}
          {visibleRecommendations.length > 0 && !loading && activeTab === 'all' && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Sparkles className="h-4 w-4 text-sky-500" />
                <span className="text-sm font-semibold text-foreground">Suggested Connections</span>
              </div>
              <div className="grid gap-2">
                {visibleRecommendations.map((rec) => (
                  <motion.div
                    key={rec.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 border border-sky-200 hover:border-sky-300 transition-all"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-sky-100 text-sky-600 text-sm">
                        {rec.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rec.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {rec.sharedInterests.length} shared interests
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleConnectRecommendation(rec.id)}
                      disabled={connectingUser === rec.id}
                    >
                      {connectingUser === rec.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3 mr-1" />
                          Connect
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground"
                      onClick={() => dismissRecommendation(rec.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </motion.div>
                ))}
              </div>
              <Separator className="my-4" />
            </div>
          )}

          {/* Participants Tab Content */}
          {activeTab === 'participants' && (
            <>
              {participantsLoading ? (
                <div className="space-y-2 px-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredParticipants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-primary/70" />
                  </div>
                  {participants.length === 0 ? (
                    <>
                      <p className="font-medium text-sm">No participants yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Participants will appear here as they register
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-sm">No matching participants</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your search or filters
                      </p>
                    </>
                  )}
                  {privateProfileMatch && searchQuery && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        A participant matching "{searchQuery}" has a private profile. Connect in person using QR code.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1 pr-0">
                  <AnimatePresence mode="popLayout">
                    {filteredParticipants.map((participant) => {
                      const isSelected = selectedParticipant?.id === participant.id;

                      return (
                        <motion.button
                          key={participant.id}
                          className={cn(
                            'w-full text-left p-3 transition-all',
                            isSelected
                              ? 'bg-gray-100 rounded-l-lg rounded-r-none -mr-3 pr-6 border-y border-l border-gray-200'
                              : 'hover:bg-accent/5 rounded-lg border border-transparent'
                          )}
                          onClick={() => {
                            setSelectedParticipant(participant);
                            setSelectedConnection(null);
                          }}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          layout
                        >
                          <div className="flex items-center gap-3 h-[52px]">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarFallback className="text-white text-sm bg-gradient-to-br from-primary to-primary/80">
                                {participant.fullName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="font-medium text-sm truncate">
                                  {participant.fullName}
                                </h4>
                                {participant.role && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 flex-shrink-0">
                                    {participant.role}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                {participant.organization && (
                                  <>
                                    <Building2 className="h-3 w-3 flex-shrink-0" />
                                    {participant.organization}
                                  </>
                                )}
                              </p>
                            </div>
                            {/* Badges and arrow - fixed width container for consistent alignment */}
                            <div className="flex items-start gap-2 shrink-0 h-[44px] pt-1">
                              <div className="flex flex-col gap-1 w-[85px]">
                                {participant.isConnected && (
                                  <Badge variant="default" className="text-[9px] px-1.5 py-0.5 h-5 w-full bg-green-500 hover:bg-green-600 flex items-center justify-center">
                                    <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                    Connected
                                  </Badge>
                                )}
                                {participant.isCheckedIn && (
                                  <Badge variant="default" className="text-[9px] px-1.5 py-0.5 h-5 w-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center">
                                    <MapPin className="h-3 w-3 mr-0.5" />
                                    At Event
                                  </Badge>
                                )}
                              </div>
                              <ChevronRight
                                className={cn(
                                  'h-4 w-4 mt-0.5',
                                  isSelected ? 'text-gray-400' : 'text-muted-foreground'
                                )}
                              />
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}

          {/* Connections Tab Content */}
          {activeTab === 'all' && loading ? (
            <div className="space-y-2 px-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'all' && filteredConnections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary/70" />
              </div>
              <p className="font-medium text-sm">No connections found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery || activeFilterCount > 0
                  ? 'Try adjusting your filters'
                  : 'Start networking to add connections'}
              </p>
            </div>
          ) : activeTab === 'all' && (
            <div className="space-y-1 pr-0">
              <AnimatePresence mode="popLayout">
                {filteredConnections.map((connection) => {
                  const profile = connection.profile;
                  const isSelected = selectedConnection?.id === connection.id;
                  const hasReminder = connection.follow_up_reminder && !connection.reminder_sent;

                  return (
                    <motion.button
                      key={connection.id}
                      className={cn(
                        'w-full text-left p-3 transition-all',
                        isSelected
                          ? 'bg-gray-100 rounded-l-lg rounded-r-none -mr-3 pr-6 border-y border-l border-gray-200'
                          : 'hover:bg-accent/5 rounded-lg border border-transparent'
                      )}
                      onClick={() => {
                        setSelectedConnection(connection);
                        setEditingNote(false);
                      }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      layout
                    >
                      <div className="flex items-center gap-3 h-[52px]">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-gradient-navy text-primary-foreground text-sm">
                            {profile?.full_name
                              ? profile.full_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                              : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-medium text-sm truncate">
                              {profile?.full_name || 'Unknown'}
                            </h4>
                            {hasReminder && <Bell className="h-3 w-3 text-orange-500 shrink-0" />}
                            {connection.notes && (
                              <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {profile?.role}
                            {profile?.organization && ` at ${profile.organization}`}
                          </p>
                        </div>
                        {/* Badges and arrow - fixed width container for consistent alignment */}
                        <div className="flex items-start gap-2 shrink-0 h-[44px] pt-1">
                          <div className="flex flex-col gap-1 w-[85px]">
                            <Badge variant="default" className="text-[9px] px-1.5 py-0.5 h-5 w-full bg-green-500 hover:bg-green-600 flex items-center justify-center">
                              <CheckCircle2 className="h-3 w-3 mr-0.5" />
                              Connected
                            </Badge>
                            {profile?.is_checked_in && (
                              <Badge variant="default" className="text-[9px] px-1.5 py-0.5 h-5 w-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center">
                                <MapPin className="h-3 w-3 mr-0.5" />
                                At Event
                              </Badge>
                            )}
                          </div>
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 mt-0.5',
                              isSelected ? 'text-gray-400' : 'text-muted-foreground'
                            )}
                          />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Right Panel - Connection Detail
  const ConnectionDetailPanel = selectedConnection ? (
    <div className="h-full flex flex-col bg-gray-100 border-l border-gray-200">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Connection Details</h2>
            <p className="text-sm text-muted-foreground">View and manage</p>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start gap-4 mb-3">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-gradient-navy text-primary-foreground text-lg">
              {selectedConnection.profile?.full_name
                ? selectedConnection.profile.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-bold text-xl text-foreground">
              {selectedConnection.profile?.full_name || 'Unknown User'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedConnection.profile?.role}
              {selectedConnection.profile?.organization &&
                ` at ${selectedConnection.profile.organization}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {selectedConnection.profile?.is_checked_in && (
            <Badge className="text-xs bg-blue-500 hover:bg-blue-600 w-fit">
              <MapPin className="h-3 w-3 mr-1" />
              At Event
            </Badge>
          )}
          <Badge className="text-xs bg-green-500 hover:bg-green-600 w-fit">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
          {selectedConnection.follow_up_reminder && !selectedConnection.reminder_sent && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 bg-orange-50 w-fit">
              <Bell className="h-3 w-3 mr-1" />
              Reminder set
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Connection Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 rounded-md bg-white border border-gray-200">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Connected</p>
                <p className="font-medium">
                  {format(new Date(selectedConnection.created_at), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>

            {selectedConnection.profile?.organization && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-md bg-white border border-gray-200">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Organization</p>
                  <p className="font-medium">{selectedConnection.profile.organization}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Technology Interests */}
          {selectedConnection.profile?.acceleration_interests &&
            selectedConnection.profile.acceleration_interests.length > 0 && (
              <div>
                <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Technology Interests
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedConnection.profile.acceleration_interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          {/* Collaborative Intents */}
          {selectedConnection.collaborative_intents &&
            selectedConnection.collaborative_intents.length > 0 && (
              <div>
                <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-primary" />
                  Collaboration Intents
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedConnection.collaborative_intents.map((intent) => {
                    const intentLabel =
                      COLLABORATION_TYPES.find((t) => t.value === intent)?.label || intent;
                    return (
                      <Badge key={intent} variant="outline" className="text-xs">
                        {intentLabel}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

          <Separator />

          {/* Private Notes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Private Notes
              </Label>
              {!editingNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setEditingNote(true);
                    setEditedNote(selectedConnection.notes || '');
                  }}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {editingNote ? (
              <div className="space-y-3">
                <Textarea
                  value={editedNote}
                  onChange={(e) => setEditedNote(e.target.value)}
                  placeholder="Add your private notes about this connection..."
                  rows={4}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNote} disabled={savingNote}>
                    <Save className="h-4 w-4 mr-1" />
                    {savingNote ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingNote(false);
                      setEditedNote('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white border border-gray-200 rounded-lg min-h-[80px]">
                {selectedConnection.notes ? (
                  <p className="text-sm leading-relaxed">{selectedConnection.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No notes yet. Click Edit to add your private notes.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            {selectedConnection.follow_up_reminder && !selectedConnection.reminder_sent && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleRemoveReminder(selectedConnection.id)}
              >
                <BellOff className="h-4 w-4 mr-2" />
                Remove Reminder
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Connection
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Connection</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete your connection with{' '}
                    {selectedConnection.profile?.full_name}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteConnection(selectedConnection.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </ScrollArea>
    </div>
  ) : (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Connection Details</h2>
            <p className="text-sm text-muted-foreground">View and manage</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary/70" />
          </div>
          <p className="font-medium">Select a connection</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click on a connection to view details
          </p>
        </div>
      </div>
    </div>
  );

  // Right Panel - Participant Detail (matches Connection Detail layout)
  const ParticipantDetailPanel = selectedParticipant ? (
    <div className="h-full flex flex-col bg-gray-100 border-l border-gray-200">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Profile Details</h2>
            <p className="text-sm text-muted-foreground">View and connect</p>
          </div>
        </div>
      </div>

      {/* Profile Info - Same layout as Connection Detail */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start gap-4 mb-3">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-gradient-navy text-primary-foreground text-lg">
              {selectedParticipant.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-bold text-xl text-foreground">
              {selectedParticipant.fullName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedParticipant.role}
              {selectedParticipant.organization && ` at ${selectedParticipant.organization}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {selectedParticipant.isCheckedIn && (
            <Badge className="text-xs bg-blue-500 hover:bg-blue-600 w-fit">
              <MapPin className="h-3 w-3 mr-1" />
              At Event
            </Badge>
          )}
          {selectedParticipant.isConnected && (
            <Badge className="text-xs bg-green-500 hover:bg-green-600 w-fit">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Profile Info */}
          <div className="space-y-3">
            {selectedParticipant.organization && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-md bg-white border border-gray-200">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Organization</p>
                  <p className="font-medium">{selectedParticipant.organization}</p>
                </div>
              </div>
            )}

            {selectedParticipant.department && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-md bg-white border border-gray-200">
                  <Tag className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Department</p>
                  <p className="font-medium">{selectedParticipant.department}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Technology Interests */}
          {selectedParticipant.accelerationInterests &&
            selectedParticipant.accelerationInterests.length > 0 && (
              <div>
                <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Technology Interests
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedParticipant.accelerationInterests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          {/* Connect Button - Only show for non-connected users */}
          {!selectedParticipant.isConnected && (
            <div className="pt-2">
              <Button
                className="w-full"
                onClick={() => handleConnectParticipant(selectedParticipant.id)}
                disabled={connectingUser === selectedParticipant.id}
              >
                {connectingUser === selectedParticipant.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  ) : (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">NPS Community</h2>
            <p className="text-sm text-muted-foreground">User details</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary/70" />
          </div>
          <p className="font-medium">Select a community member</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click on a user to view their details
          </p>
        </div>
      </div>
    </div>
  );

  // Determine which right panel to show
  const RightPanel = activeTab === 'participants' ? ParticipantDetailPanel : ConnectionDetailPanel;

  return (
    <DesktopShell>
      <div className="h-full flex flex-col">
        {/* Page Title */}
        <div className="px-6 py-4 border-b border-gray-200 bg-background flex-shrink-0">
          <h1 className="text-2xl font-bold">Network</h1>
        </div>

        <div className="flex-1 overflow-hidden">
          <ThreePanelLayout
            left={FiltersPanel}
            center={ConnectionListPanel}
            right={RightPanel}
            leftWidth="260px"
            equalCenterRight
            connectedPanels={activeTab === 'participants' ? !!selectedParticipant : !!selectedConnection}
          />
        </div>
      </div>
    </DesktopShell>
  );
}
