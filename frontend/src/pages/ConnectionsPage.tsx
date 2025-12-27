import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { MessageSquare, CheckCircle2, Loader2, Trash2, Users, QrCode, Sparkles, FileText, Bell, BellOff, Search, X, SlidersHorizontal, Lock, Edit, Save, BookOpen, ChevronDown, ChevronUp, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { api } from "@/lib/api";
import { offlineDataCache } from "@/lib/offlineDataCache";
import { useDismissedRecommendations } from "@/hooks/useDismissedRecommendations";
import { useDevice } from "@/hooks/useDeviceType";
import { offlineQueue } from "@/lib/offlineQueue";
import { useAuth } from "@/hooks/useAuth";
import { OfflineDataBanner } from "@/components/OfflineDataBanner";

// Lazy load desktop version
const ConnectionsDesktopPage = lazy(() => import('./ConnectionsPage.desktop'));

function ConnectionsSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

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
}

const COLLABORATION_TYPES = [
  { value: 'collaborative_research', label: 'Collaborative Research' },
  { value: 'brainstorming', label: 'Brainstorming' },
  { value: 'design_sprint', label: 'Design Sprint' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'funded_research', label: 'Funded Research' }
];

const USER_TYPES = [
  { value: 'industry', label: 'Industry Partner' },
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'staff', label: 'Staff' }
];

export default function ConnectionsPage() {
  const { isDesktop } = useDevice();

  // Render desktop version for desktop users
  if (isDesktop) {
    return (
      <Suspense fallback={<ConnectionsSkeleton />}>
        <ConnectionsDesktopPage />
      </Suspense>
    );
  }

  // Mobile/Tablet version
  return <ConnectionsMobilePage />;
}

function ConnectionsMobilePage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    intents: string[];
    userTypes: string[];
    sortBy: string;
  }>({
    intents: [],
    userTypes: [],
    sortBy: 'recent'
  });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editedNote, setEditedNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedConnection[]>([]);
  const [connectingUser, setConnectingUser] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const { dismiss: dismissRecommendation, isDismissed: isRecommendationDismissed } = useDismissedRecommendations('connections');

  const navigate = useNavigate();

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    if (connections.length >= 0) {
      fetchRecommendations();
    }
  }, [connections]);

  // Fetch participants when tab is "participants"
  useEffect(() => {
    if (activeTab === 'participants') {
      fetchParticipants();
    }
  }, [activeTab]);

  const fetchParticipants = async (): Promise<Participant[]> => {
    setParticipantsLoading(true);
    try {
      const response = await api.get('/users/participants');
      const data = (response as any).data || [];
      const mapped: Participant[] = data.map((p: any) => ({
        id: p.id,
        fullName: p.fullName || p.full_name || 'Unknown',
        organization: p.organization,
        department: p.department,
        role: p.role,
        avatarUrl: p.avatarUrl,
        accelerationInterests: p.accelerationInterests || p.acceleration_interests || [],
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

  const handleConnectParticipant = async (participantId: string) => {
    setConnectingUser(participantId);
    try {
      if (!navigator.onLine) {
        if (user?.id) {
          await offlineQueue.add(user.id, 'create_connection', { connectedUserId: participantId });
          toast.success('Connection queued offline. Will sync when back online.');
        } else {
          toast.error('You must be logged in to add connections');
        }
        return;
      }
      await api.post('/connections', { connectedUserId: participantId });
      toast.success('Connection added successfully');
      // Remove from participants list and refresh connections
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      setActiveTab('all');
      fetchConnections();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to add connection';
      toast.error(message);
    } finally {
      setConnectingUser(null);
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
      if (!navigator.onLine) {
        if (user?.id) {
          await offlineQueue.add(user.id, 'create_connection', { connectedUserId: userId });
          toast.success('Connection queued offline. Will sync when back online.');
        } else {
          toast.error('You must be logged in to add connections');
        }
        return;
      }
      await api.post('/connections', { connectedUserId: userId });
      toast.success('Connection added successfully');
      setRecommendations(prev => prev.filter(rec => rec.id !== userId));
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
      if (connections.length === 0) {
        setLoading(true);
      }
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
        profile: conn.connectedUser || conn.profile ? {
          full_name: conn.connectedUser?.fullName || conn.profile?.full_name || conn.profile?.fullName || 'Unknown',
          role: conn.connectedUser?.role || conn.profile?.role,
          organization: conn.connectedUser?.organization || conn.profile?.organization,
          acceleration_interests: conn.connectedUser?.accelerationInterests || conn.profile?.acceleration_interests || []
        } : null
      }));
      setConnections(mappedConnections);

      const writeCache = () => {
        void offlineDataCache.set('connections:list', mappedConnections)
          .catch((e) => console.error('Failed to write connections cache', e));
      };
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(writeCache);
      } else {
        setTimeout(writeCache, 0);
      }
    } catch (error: any) {
      console.error('Error fetching connections:', error);
      const cached = await offlineDataCache.get<Connection[]>('connections:list');
      if (cached?.data) {
        setConnections(cached.data);
      } else {
        toast.error('Failed to load connections');
      }
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
      result = result.filter(conn => {
        const nameMatch = conn.profile?.full_name?.toLowerCase().includes(searchLower);
        const orgMatch = conn.profile?.organization?.toLowerCase().includes(searchLower);
        return nameMatch || orgMatch;
      });
    }

    if (filters.intents.length > 0) {
      result = result.filter(conn => {
        return filters.intents.some(intent =>
          conn.collaborative_intents?.includes(intent)
        );
      });
    }

    if (filters.userTypes.length > 0) {
      result = result.filter(conn => {
        const role = conn.profile?.role?.toLowerCase();
        return filters.userTypes.some(type => role?.includes(type));
      });
    }

    switch (filters.sortBy) {
      case 'recent':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

  const handleDeleteConnection = async (connectionId: string) => {
    try {
      await api.delete(`/connections/${connectionId}`);
      toast.success("Connection deleted");
      setConnections(connections.filter(c => c.id !== connectionId));
    } catch (error: any) {
      toast.error('Failed to delete connection');
    }
  };

  const handleStartMessage = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    try {
      // Create the conversation first
      await api.post('/messages/conversations', { recipientId: userId });
      // Then navigate to messages page where the new conversation will appear
      navigate('/messages');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to start conversation';
      toast.error(message);
    }
  };

  const handleSaveNote = async (connectionId: string) => {
    setSavingNote(true);
    try {
      if (!navigator.onLine) {
        if (user?.id) {
          await offlineQueue.add(user.id, 'connection_note', { connectionId, notes: editedNote });
          toast.success('Note queued offline. Will sync when back online.');
          setConnections(prev => prev.map(c =>
            c.id === connectionId ? { ...c, notes: editedNote } : c
          ));
          setEditingNoteId(null);
          return;
        }
        toast.error('You must be logged in to edit notes');
        return;
      }
      await api.patch(`/connections/${connectionId}`, { notes: editedNote });
      toast.success("Note saved");
      setConnections(prev => prev.map(c =>
        c.id === connectionId ? { ...c, notes: editedNote } : c
      ));
      setEditingNoteId(null);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to save note';
      toast.error(message);
    } finally {
      setSavingNote(false);
    }
  };

  const handleRemoveReminder = async (connectionId: string) => {
    try {
      if (!navigator.onLine) {
        if (user?.id) {
          await offlineQueue.add(user.id, 'connection_update', {
            connectionId,
            data: { followUpReminder: null, reminderSent: false },
          });
          toast.success('Reminder update queued offline. Will sync when back online.');
          fetchConnections();
          return;
        }
        toast.error('You must be logged in to update reminders');
        return;
      }
      await api.patch(`/connections/${connectionId}`, { followUpReminder: null, reminderSent: false });
      toast.success("Reminder removed");
      fetchConnections();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to remove reminder';
      toast.error(message);
    }
  };

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setFilters({ intents: [], userTypes: [], sortBy: 'recent' });
    setSearchQuery('');
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const getTimeUntil = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return 'Overdue';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const upcomingReminders = connections.filter(c =>
    c.follow_up_reminder && new Date(c.follow_up_reminder) > new Date() && !c.reminder_sent
  ).sort((a, b) =>
    new Date(a.follow_up_reminder!).getTime() - new Date(b.follow_up_reminder!).getTime()
  );

  const activeFilterCount = filters.intents.length + filters.userTypes.length;

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      <PageHeader
        title="My Connections"
        subtitle={`${connections.length} connections made`}
      />

      <main className="px-3 md:px-4 pt-3 md:pt-4 space-y-3 md:space-y-4">
        <OfflineDataBanner />

        {/* Search Bar */}
        <Card className="p-3 md:p-4 shadow-md border-accent/20 bg-gradient-to-br from-background to-secondary/20">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 md:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-4 md:h-4 text-accent" />
              <Input
                placeholder="Search by name or organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 md:pl-10 pr-10 md:pr-10 h-11 md:h-11 text-sm md:text-base border-border/50 bg-background/50 focus:bg-background transition-colors"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4 md:w-4 md:h-4" />
                </Button>
              )}
            </div>

            <div className="flex gap-2 md:gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex-1 sm:flex-none h-11 md:h-11 px-4 md:px-4 text-sm md:text-sm border-accent/30 hover:bg-accent/10 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4 md:w-4 md:h-4 mr-2 md:mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="ml-2 md:ml-2 h-5 w-5 md:h-5 md:w-5 p-0 flex items-center justify-center text-xs bg-accent">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>

              <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}>
                <SelectTrigger className="flex-1 sm:w-[160px] h-11 md:h-11 text-sm md:text-sm border-accent/30">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Search Results Count */}
        {(searchQuery || activeFilterCount > 0) && (
          <p className="text-sm text-muted-foreground">
            {filteredConnections.length} result{filteredConnections.length !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Collapsible Filter Panel */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent>
            <Card className="p-3 md:p-4 space-y-3 md:space-y-4">
              {/* Intent Filter */}
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-semibold">Filter by Intent</Label>
                <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                  {COLLABORATION_TYPES.map(type => (
                    <div key={type.value} className="flex items-center space-x-1.5 md:space-x-2">
                      <Checkbox
                        id={`intent-${type.value}`}
                        checked={filters.intents.includes(type.value)}
                        onCheckedChange={(checked) => {
                          setFilters(prev => ({
                            ...prev,
                            intents: checked
                              ? [...prev.intents, type.value]
                              : prev.intents.filter(i => i !== type.value)
                          }));
                        }}
                        className="h-3.5 w-3.5 md:h-4 md:w-4"
                      />
                      <Label htmlFor={`intent-${type.value}`} className="cursor-pointer text-xs md:text-sm">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Type Filter */}
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-semibold">Filter by User Type</Label>
                <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                  {USER_TYPES.map(type => (
                    <div key={type.value} className="flex items-center space-x-1.5 md:space-x-2">
                      <Checkbox
                        id={`type-${type.value}`}
                        checked={filters.userTypes.includes(type.value)}
                        onCheckedChange={(checked) => {
                          setFilters(prev => ({
                            ...prev,
                            userTypes: checked
                              ? [...prev.userTypes, type.value]
                              : prev.userTypes.filter(t => t !== type.value)
                          }));
                        }}
                        className="h-3.5 w-3.5 md:h-4 md:w-4"
                      />
                      <Label htmlFor={`type-${type.value}`} className="cursor-pointer text-xs md:text-sm">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full h-8 md:h-9 text-xs md:text-sm"
                  size="sm"
                >
                  Clear All Filters
                </Button>
              )}
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Active:</span>
            {filters.intents.map(intent => {
              const intentLabel = COLLABORATION_TYPES.find(t => t.value === intent)?.label;
              return (
                <Badge key={intent} variant="secondary" className="gap-1 pr-1">
                  {intentLabel}
                  <button
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      intents: prev.intents.filter(i => i !== intent)
                    }))}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
            {filters.userTypes.map(type => {
              const typeLabel = USER_TYPES.find(t => t.value === type)?.label;
              return (
                <Badge key={type} variant="secondary" className="gap-1 pr-1">
                  {typeLabel}
                  <button
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      userTypes: prev.userTypes.filter(t => t !== type)
                    }))}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 text-xs"
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Summary Stats */}
        <Card className="p-3 md:p-6 bg-gradient-tech text-primary-foreground shadow-md">
          <h3 className="font-semibold mb-2 md:mb-3 text-sm md:text-base">Your Networking Stats</h3>
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div>
              <div className="text-lg md:text-2xl font-bold">{connections.length}</div>
              <div className="text-[10px] md:text-xs opacity-90">Connections</div>
            </div>
            <div>
              <div className="text-lg md:text-2xl font-bold">{upcomingReminders.length}</div>
              <div className="text-[10px] md:text-xs opacity-90">Reminders</div>
            </div>
            <div>
              <div className="text-lg md:text-2xl font-bold">
                {connections.reduce((sum, c) => sum + (c.collaborative_intents?.length || 0), 0)}
              </div>
              <div className="text-[10px] md:text-xs opacity-90">Intents</div>
            </div>
          </div>
        </Card>

        {/* Inline Recommendations */}
        {recommendations.filter(r => !isRecommendationDismissed(r.id)).length > 0 && (
          <Card className="p-3 md:p-4 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/30">
            <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
              <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-accent" />
              <h3 className="font-semibold text-xs md:text-sm">Suggested Connections</h3>
            </div>
            <div className="space-y-2 md:space-y-3">
              {recommendations.filter(r => !isRecommendationDismissed(r.id)).map((rec) => (
                <div key={rec.id} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-background/50 rounded-lg hover:shadow-sm transition-shadow relative">
                  <Avatar className="h-8 w-8 md:h-10 md:w-10 shrink-0">
                    <AvatarFallback className="bg-gradient-navy text-primary-foreground text-xs md:text-sm">
                      {rec.full_name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 overflow-hidden pr-5 md:pr-6">
                    <p className="font-medium text-xs md:text-sm truncate" title={rec.full_name}>{rec.full_name}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate" title={`${rec.role} • ${rec.organization}`}>
                      {rec.role} • {rec.organization}
                    </p>
                    <div className="flex items-center gap-2 md:gap-3 mt-0.5 md:mt-1 flex-wrap">
                      {rec.sharedInterests.length > 0 && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-2.5 w-2.5 md:h-3 md:w-3 text-accent shrink-0" />
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            {rec.sharedInterests.length} shared
                          </span>
                        </div>
                      )}
                      {rec.mutualConnections > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-2.5 w-2.5 md:h-3 md:w-3 text-primary shrink-0" />
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            {rec.mutualConnections} mutual
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleConnectRecommendation(rec.id)}
                    disabled={connectingUser === rec.id}
                    className="shrink-0 h-7 md:h-8 text-xs md:text-sm px-2 md:px-3"
                  >
                    {connectingUser === rec.id ? (
                      <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Connect
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-4 w-4 md:h-5 md:w-5 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={(e) => { e.stopPropagation(); dismissRecommendation(rec.id); }}
                    aria-label="Dismiss recommendation"
                  >
                    <X className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 h-8 md:h-10">
            <TabsTrigger value="all" className="text-xs md:text-sm">
              My Connections
              <Badge variant="secondary" className="ml-1.5 text-[10px] md:text-xs px-1.5 py-0">
                {connections.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="participants" className="text-xs md:text-sm">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
              Participants
              <Badge variant="secondary" className="ml-1.5 text-[10px] md:text-xs px-1.5 py-0">
                {participants.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content List */}
        <div className="space-y-2.5 md:space-y-4">
        {/* Participants Tab Content */}
        {activeTab === 'participants' && (
          participantsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4 md:p-5">
                  <div className="flex items-start gap-3 md:gap-4">
                    <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-10 w-24 rounded-md" />
                  </div>
                </Card>
              ))}
            </div>
          ) : participants.length === 0 ? (
            <Card className="p-6 md:p-12 text-center">
              <div className="w-14 h-14 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 bg-secondary/50 rounded-full flex items-center justify-center">
                <Users className="h-7 w-7 md:h-10 md:w-10 text-muted-foreground" />
              </div>
              <h3 className="text-sm md:text-lg font-semibold text-foreground mb-1.5 md:mb-2">
                No Participants Yet
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
                Participants will appear here as they check in to the event
              </p>
            </Card>
          ) : (
            participants.map((participant) => (
              <Card key={participant.id} className="p-4 md:p-5 shadow-md border-border/50 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-3 md:gap-4">
                  {/* Avatar */}
                  <Avatar className="w-12 h-12 md:w-14 md:h-14">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm md:text-base">
                      {participant.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-foreground text-base md:text-lg">
                        {participant.fullName}
                      </h3>
                      {participant.role && (
                        <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 py-0">
                          {participant.role}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm md:text-sm text-muted-foreground">
                      {participant.organization || 'Organization not specified'}
                    </p>
                    {participant.accelerationInterests && participant.accelerationInterests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {participant.accelerationInterests.slice(0, 2).map((interest) => (
                          <Badge key={interest} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {interest}
                          </Badge>
                        ))}
                        {participant.accelerationInterests.length > 2 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            +{participant.accelerationInterests.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Connect Button */}
                  <Button
                    className="gap-2 h-10 px-4"
                    onClick={() => handleConnectParticipant(participant.id)}
                    disabled={connectingUser === participant.id}
                  >
                    {connectingUser === participant.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Connect</span>
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))
          )
        )}

        {/* Connections Tab Content */}
        {activeTab === 'all' && (loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 md:p-5">
                <div className="flex items-start gap-3 md:gap-4">
                  <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-10 w-24 rounded-md" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredConnections.length === 0 ? (
          <Card className="p-6 md:p-12 text-center">
            <div className="w-14 h-14 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 bg-secondary/50 rounded-full flex items-center justify-center">
              <Users className="h-7 w-7 md:h-10 md:w-10 text-muted-foreground" />
            </div>
            <h3 className="text-sm md:text-lg font-semibold text-foreground mb-1.5 md:mb-2">
              {searchQuery || activeFilterCount > 0
                ? 'No Matching Connections'
                : 'No Connections Yet'}
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
              {searchQuery || activeFilterCount > 0
                ? 'Try adjusting your search or filters'
                : 'Start networking by scanning QR codes at the event'
              }
            </p>
            {!searchQuery && activeFilterCount === 0 && (
              <Link to="/scanner">
                <Button className="gap-2 h-11 md:h-10 text-sm md:text-base">
                  <QrCode className="h-4 w-4 md:h-5 md:w-5" />
                  Scan QR Code
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          filteredConnections.map((connection) => {
            const profile = connection.profile;
            const isEditingThis = editingNoteId === connection.id;

            return (
              <Card key={connection.id} className="p-4 md:p-5 shadow-md border-border/50 hover:shadow-lg transition-all duration-300">
                {/* Collapsed View */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 md:gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-navy flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0 text-sm md:text-base">
                      {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('') : '?'}
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground text-base md:text-lg">
                          {profile?.full_name || 'Unknown User'}
                        </h3>
                        {connection.notes && (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            <FileText className="w-3 h-3 mr-1" />
                            Note
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm md:text-sm text-muted-foreground">
                        {profile?.role || 'Role not specified'}
                        {profile?.organization && ` • ${profile.organization}`}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(connection.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Primary Action */}
                    <Button
                      className="gap-2 h-10 px-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartMessage(e, connection.other_user_id);
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">Message</span>
                    </Button>
                  </div>

                  {/* Expand/Collapse Control */}
                  <Button
                    variant="ghost"
                    className="w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCardExpansion(connection.id);
                    }}
                  >
                    {expandedCards.has(connection.id) ? (
                      <>
                        <span>Show Less</span>
                        <ChevronUp className="h-4 w-4 ml-1" />
                      </>
                    ) : (
                      <>
                        <span>Show More Details</span>
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Expanded View */}
                {expandedCards.has(connection.id) && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4" onClick={(e) => e.stopPropagation()}>
                    {/* Badges Section */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 bg-accent/10 text-accent px-2 py-1 rounded-md text-xs font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </div>
                      {connection.follow_up_reminder && !connection.reminder_sent && (
                        <div className="flex items-center gap-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-md text-xs font-medium">
                          <Bell className="h-3 w-3" />
                          {getTimeUntil(connection.follow_up_reminder)}
                        </div>
                      )}
                    </div>

                    {/* Technology Interests */}
                    {profile?.acceleration_interests && profile.acceleration_interests.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Technology Interests</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.acceleration_interests.map((interest) => (
                            <Badge key={interest} variant="secondary" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Collaborative Intent */}
                    {connection.collaborative_intents && connection.collaborative_intents.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Collaborative Intents</p>
                        <div className="flex flex-wrap gap-2">
                          {connection.collaborative_intents.map((intent) => {
                            const intentLabel = COLLABORATION_TYPES.find(t => t.value === intent)?.label || intent;
                            return (
                              <Badge key={intent} variant="outline" className="text-xs">
                                {intentLabel}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Private Note Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Lock className="w-3 h-3" />
                          Private Note
                        </Label>
                        {!isEditingThis && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => {
                              setEditingNoteId(connection.id);
                              setEditedNote(connection.notes || '');
                            }}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>

                      {isEditingThis ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editedNote}
                            onChange={(e) => setEditedNote(e.target.value)}
                            placeholder="Add your private notes..."
                            rows={3}
                            className="resize-none text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveNote(connection.id)}
                              disabled={savingNote}
                              className="h-8 text-xs"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              {savingNote ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingNoteId(null);
                                setEditedNote('');
                              }}
                              className="h-8 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-secondary/30 rounded-lg min-h-[48px]">
                          {connection.notes ? (
                            <p className="text-sm text-foreground italic">"{connection.notes}"</p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              No notes yet. Click Edit to add.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex gap-2 pt-2">
                      {connection.follow_up_reminder && !connection.reminder_sent && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                          onClick={() => handleRemoveReminder(connection.id)}
                          title="Remove reminder"
                        >
                          <BellOff className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteConnection(connection.id)}
                        title="Delete connection"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        ))}
        </div>
      </main>
    </div>
  );
}
