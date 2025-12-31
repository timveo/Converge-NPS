import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  GraduationCap,
  Building2,
  Users,
  Sparkles,
  TrendingUp,
  Search,
  X,
  MessageSquare,
  Filter,
  Briefcase,
  Clock,
  ChevronRight,
  Calendar,
  MapPin,
  Tag,
  DollarSign,
  Mail,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { DesktopShell } from '@/components/desktop/DesktopShell';
import { ThreePanelLayout } from '@/components/desktop/layouts/ThreePanelLayout';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// NPS Projects filters - match backend enum values
const PROJECT_STAGES = ['concept', 'prototype', 'pilot_ready', 'deployed'];
const PROJECT_STAGE_LABELS: Record<string, string> = {
  concept: 'Concept',
  prototype: 'Prototype',
  pilot_ready: 'Pilot Ready',
  deployed: 'Deployed',
};
const SEEKING_TYPES = [
  'Industry Partnership',
  'Government Sponsor',
  'Research Collaboration',
  'Funding',
  'Test & Evaluation',
];

interface Project {
  id: string;
  title: string;
  description?: string;
  stage: string;
  funding_status?: string;
  research_areas?: string[];
  seeking?: string[];
  classification?: string;
  department?: string;
  demo_schedule?: string;
  students?: string[];
  keywords?: string[];
  interested?: number;
  pi_id?: string;
  created_at: string;
  poc_user_id?: string;
  poc_first_name?: string;
  poc_last_name?: string;
  poc_email?: string;
  poc_rank?: string;
  poc_is_checked_in?: boolean;
  pocUserId?: string;
  pocFirstName?: string;
  pocLastName?: string;
  pocEmail?: string;
  pocRank?: string;
  pocIsCheckedIn?: boolean;
  profiles?: {
    id: string;
    full_name: string;
    rank?: string;
    organization?: string;
    department?: string;
  };
}

interface Opportunity {
  id: string;
  title: string;
  description?: string;
  type: string;
  sponsor_organization?: string;
  location?: string;
  duration?: string;
  deadline?: Date;
  featured: boolean;
  dod_alignment?: string[];
  requirements?: string;
  benefits?: string;
  sponsor_contact_id?: string;
  created_at: string;
  stage?: string;
  poc_user_id?: string;
  poc_first_name?: string;
  poc_last_name?: string;
  poc_email?: string;
  poc_rank?: string;
  poc_is_checked_in?: boolean;
  pocUserId?: string;
  pocFirstName?: string;
  pocLastName?: string;
  pocEmail?: string;
  pocRank?: string;
  pocIsCheckedIn?: boolean;
}

type CombinedItem =
  | (Project & { sourceType: 'NPS' })
  | (Opportunity & { sourceType: 'Military/Gov' })
  | (Opportunity & { sourceType: 'Industry'; isProjectOrigin?: boolean });

export default function OpportunitiesDesktopPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<CombinedItem | null>(null);

  // Organization type filter
  const [activeTab, setActiveTab] = useState<'all' | 'nps' | 'military' | 'industry'>('all');

  // NPS filters
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedFunding, setSelectedFunding] = useState<string[]>([]);
  const [selectedSeeking, setSelectedSeeking] = useState<string[]>([]);

  const [sortBy, setSortBy] = useState('recent');

  // Favorites state
  const [projectFavorites, setProjectFavorites] = useState<Set<string>>(new Set());
  const [opportunityFavorites, setOpportunityFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const toggleFavorite = async (id: string, isProject: boolean) => {
    const favorites = isProject ? projectFavorites : opportunityFavorites;
    const setFavorites = isProject ? setProjectFavorites : setOpportunityFavorites;
    const endpoint = isProject ? `/projects/${id}/bookmark` : `/opportunities/${id}/bookmark`;

    const isFavorited = favorites.has(id);

    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFavorited) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    try {
      if (isFavorited) {
        await api.delete(endpoint);
      } else {
        await api.post(endpoint);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Revert on error
      setFavorites(prev => {
        const next = new Set(prev);
        if (isFavorited) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
      toast.error('Failed to update favorite');
    }
  };

  const isFavorite = (id: string, isProject: boolean) => {
    return isProject ? projectFavorites.has(id) : opportunityFavorites.has(id);
  };

  const totalFavoritesCount = projectFavorites.size + opportunityFavorites.size;

  const handleContact = async (contactId?: string) => {
    if (!contactId) {
      console.info('Contact information not available');
      return;
    }

    try {
      const response = await api.post('/conversations', { participantId: contactId });
      const conversation = (response as any).data?.data || (response as any).data;
      if (conversation?.id) {
        navigate(`/messages/${conversation.id}`);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  useEffect(() => {
    loadData();
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const [projectBookmarksRes, oppBookmarksRes] = await Promise.all([
        api.get('/projects/bookmarks'),
        api.get('/opportunities/bookmarks')
      ]);

      const projectBookmarks = (projectBookmarksRes as any).data?.data || (projectBookmarksRes as any).data || [];
      const oppBookmarks = (oppBookmarksRes as any).data?.data || (oppBookmarksRes as any).data || [];

      setProjectFavorites(new Set(projectBookmarks.map((b: any) => b.projectId || b.project_id)));
      setOpportunityFavorites(new Set(oppBookmarks.map((b: any) => b.opportunityId || b.opportunity_id)));
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [projectsRes, oppsRes] = await Promise.all([
        api.get('/projects').catch(() => ({ data: { data: [] } })),
        api.get('/opportunities').catch(() => ({ data: { data: [] } })),
      ]);

      const projectsData =
        (projectsRes as any).data?.data || (projectsRes as any).data || [];
      const oppsData = (oppsRes as any).data?.data || (oppsRes as any).data || [];

      setProjects(projectsData);
      setOpportunities(oppsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return selectedStages.length + selectedFunding.length + selectedSeeking.length;
  }, [selectedStages, selectedFunding, selectedSeeking]);

  const isIndustryProject = (project: Project) =>
    (project.classification || '').toLowerCase() === 'industry';

  // Filter NPS projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.research_areas?.some((a: string) => a.toLowerCase().includes(q)) ||
          p.profiles?.full_name?.toLowerCase().includes(q) ||
          p.department?.toLowerCase().includes(q)
      );
    }

    if (selectedStages.length > 0) {
      filtered = filtered.filter((p) => selectedStages.includes(p.stage));
    }

    // Note: funding_status field doesn't exist in database - removing this filter
    // if (selectedFunding.length > 0) {
    //   filtered = filtered.filter((p) => selectedFunding.includes(p.funding_status || ''));
    // }

    if (selectedSeeking.length > 0) {
      filtered = filtered.filter((p) => {
        // Handle both snake_case and camelCase from API
        const seekingArray = p.seeking || (p as any).Seeking || [];
        return seekingArray.some((s: string) =>
          selectedSeeking.some(selected =>
            s.toLowerCase().includes(selected.toLowerCase()) ||
            selected.toLowerCase().includes(s.toLowerCase())
          )
        );
      });
    }

    return filtered;
  }, [projects, searchQuery, selectedStages, selectedFunding, selectedSeeking]);

  // Filter Military/Government opportunities
  const filteredOpportunities = useMemo(() => {
    let filtered = [...opportunities];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.title?.toLowerCase().includes(q) ||
          o.description?.toLowerCase().includes(q) ||
          o.sponsor_organization?.toLowerCase().includes(q)
      );
    }

    // Apply stage filter to opportunities if they have a stage field
    if (selectedStages.length > 0) {
      filtered = filtered.filter((o) => {
        const stage = o.stage;
        if (!stage) return true; // Keep opportunities without stage
        return selectedStages.includes(stage);
      });
    }

    return filtered;
  }, [opportunities, searchQuery, selectedStages]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStages([]);
    setSelectedFunding([]);
    setSelectedSeeking([]);
    setShowFavoritesOnly(false);
  };

  // Combined and filtered items with counts
  const { combinedItems, counts } = useMemo(() => {
    const industryProjects = filteredProjects.filter(isIndustryProject);
    const npsProjects = filteredProjects.filter(p => !isIndustryProject(p));
    

    const mapProjectToOpportunity = (project: Project): Opportunity & { stage?: string; isProjectOrigin: boolean } => ({
      id: project.id,
      title: project.title,
      description: project.description,
      type: 'Industry',
      sponsor_organization: project.department || 'Industry Partner',
      location: project.department || undefined,
      duration: project.demo_schedule || undefined,
      deadline: undefined,
      featured: false,
      dod_alignment: project.research_areas || [],
      requirements: project.seeking?.join(', ') || undefined,
      benefits: project.keywords?.join(', ') || undefined,
      sponsor_contact_id: project.poc_user_id || project.pocUserId || undefined,
      created_at: project.created_at,
      stage: project.stage, // Preserve stage for Industry projects
      // POC fields
      poc_user_id: project.poc_user_id || project.pocUserId,
      poc_first_name: project.poc_first_name || project.pocFirstName,
      poc_last_name: project.poc_last_name || project.pocLastName,
      poc_email: project.poc_email || project.pocEmail,
      poc_rank: project.poc_rank || project.pocRank,
      poc_is_checked_in: project.poc_is_checked_in || project.pocIsCheckedIn,
      pocUserId: project.pocUserId,
      pocFirstName: project.pocFirstName,
      pocLastName: project.pocLastName,
      pocEmail: project.pocEmail,
      pocRank: project.pocRank,
      pocIsCheckedIn: project.pocIsCheckedIn,
      isProjectOrigin: true, // Mark as originating from a project
    });

    const industryProjectOpportunities = industryProjects.map(mapProjectToOpportunity);

    const npsItems: CombinedItem[] = npsProjects.map((p) => ({
      ...p,
      sourceType: 'NPS' as const,
    }));
    // When "Seeking" filter is active, hide Military/Gov opportunities since they don't have seeking field
    const milItems: CombinedItem[] = selectedSeeking.length > 0
      ? []
      : filteredOpportunities
          .filter((o) => o.type?.toLowerCase() !== 'industry')
          .map((o) => ({
            ...o,
            sourceType: 'Military/Gov' as const,
          }));

    const industryItems: CombinedItem[] = [
      // Real industry opportunities from the opportunities table
      ...filteredOpportunities
        .filter((o) => o.type?.toLowerCase() === 'industry')
        .map((o) => ({
          ...o,
          sourceType: 'Industry' as const,
          isProjectOrigin: false as const,
        })),
      // Industry projects converted to opportunity format
      ...industryProjectOpportunities.map((o) => ({
        ...o,
        sourceType: 'Industry' as const,
        isProjectOrigin: true as const,
      })),
    ];

    // Filter out real Industry opportunities when seeking filter is active
    const filteredIndustryItems = selectedSeeking.length > 0
      ? industryItems.filter(item => (item as any).isProjectOrigin === true)
      : industryItems;

    let combined: CombinedItem[] = [];

    if (activeTab === 'all') {
      combined = [...npsItems, ...milItems, ...filteredIndustryItems];
    } else if (activeTab === 'nps') {
      combined = npsItems;
    } else if (activeTab === 'military') {
      combined = milItems;
    } else {
      combined = filteredIndustryItems;
    }

    // Filter by favorites
    if (showFavoritesOnly) {
      combined = combined.filter(item => {
        if (item.sourceType === 'NPS') {
          return projectFavorites.has(item.id);
        } else if (item.sourceType === 'Industry' && (item as any).isProjectOrigin) {
          // Industry items derived from projects use project bookmarks
          return projectFavorites.has(item.id);
        } else {
          return opportunityFavorites.has(item.id);
        }
      });
    }

    // Sort
    if (sortBy === 'recent') {
      combined.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === 'stage') {
      // Sort by stage - items with stage come first, sorted by PROJECT_STAGES order
      // Items without stage (Military/Gov opportunities) go to the end
      combined.sort((a, b) => {
        const stageA = (a as any).stage;
        const stageB = (b as any).stage;
        const indexA = stageA ? PROJECT_STAGES.indexOf(stageA) : PROJECT_STAGES.length;
        const indexB = stageB ? PROJECT_STAGES.indexOf(stageB) : PROJECT_STAGES.length;
        return indexA - indexB;
      });
    }

    return {
      combinedItems: combined,
      counts: {
        nps: npsItems.length,
        mil: milItems.length,
        industry: filteredIndustryItems.length,
      },
    };
  }, [filteredProjects, filteredOpportunities, activeTab, selectedSeeking, sortBy, showFavoritesOnly, projectFavorites, opportunityFavorites]);

  const isNPSItem = (item: CombinedItem): item is Project & { sourceType: 'NPS' } => {
    return item.sourceType === 'NPS';
  };

  const toggleArrayFilter = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

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
        {(activeFilterCount > 0 || showFavoritesOnly) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
            Clear ({activeFilterCount + (showFavoritesOnly ? 1 : 0)})
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
                placeholder="Title, description..."
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
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="stage">By Stage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Favorites Filter */}
          <div>
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                "w-full gap-2 text-sm h-9 focus-visible:ring-0 focus-visible:ring-offset-0",
                !showFavoritesOnly && "bg-white hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Star className={cn("w-4 h-4", showFavoritesOnly && "fill-current")} />
              Favorites
              {totalFavoritesCount > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">{totalFavoritesCount}</Badge>
              )}
            </Button>
          </div>
          <Separator />

          {/* Project Stage Filters (NPS) */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Project Stage</Label>
            <div className="space-y-2">
              {PROJECT_STAGES.map((stage) => (
                <div key={stage} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`stage-${stage}`}
                    checked={selectedStages.includes(stage)}
                    onChange={() => toggleArrayFilter(setSelectedStages, stage)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={`stage-${stage}`} className="cursor-pointer text-sm">
                    {PROJECT_STAGE_LABELS[stage]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Funding Status Filters - Hidden since field doesn't exist in database */}
          {/* <div>
            <Label className="text-sm font-medium mb-3 block">Funding Status</Label>
            <div className="space-y-2">
              {FUNDING_STATUSES.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`funding-${status}`}
                    checked={selectedFunding.includes(status)}
                    onChange={() => toggleArrayFilter(setSelectedFunding, status)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={`funding-${status}`} className="cursor-pointer text-sm">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div> */}

          <Separator />

          {/* Seeking Filters */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Seeking</Label>
            <div className="space-y-2">
              {SEEKING_TYPES.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`seeking-${type}`}
                    checked={selectedSeeking.includes(type)}
                    onChange={() => toggleArrayFilter(setSelectedSeeking, type)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={`seeking-${type}`} className="cursor-pointer text-sm">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );

  // Center Panel - Opportunities List
  const OpportunitiesListPanel = (
    <div className="h-full flex flex-col bg-gray-50 min-w-0 overflow-hidden">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center justify-between border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Opportunities</h2>
            <p className="text-sm text-muted-foreground">Discover collaborations</p>
          </div>
        </div>
        <Button size="sm" className="h-8 text-xs" onClick={() => navigate('/opportunities/submit')}>
          <Plus className="h-3 w-3 mr-1" />
          Submit
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'nps' | 'military' | 'industry')}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1 text-sm">
              All
              <Badge variant="secondary" className="ml-2 text-xs">
                {counts.nps + counts.mil + counts.industry}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="nps" className="flex-1 text-sm">
              <GraduationCap className="h-3 w-3 mr-1" />
              NPS
              <Badge variant="secondary" className="ml-2 text-xs">
                {counts.nps}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="military" className="flex-1 text-sm">
              <Building2 className="h-3 w-3 mr-1" />
              Gov
              <Badge variant="secondary" className="ml-2 text-xs">
                {counts.mil}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="industry" className="flex-1 text-sm">
              <Briefcase className="h-3 w-3 mr-1" />
              Industry
              <Badge variant="secondary" className="ml-2 text-xs">
                {counts.industry}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Opportunities List */}
      <ScrollArea className="flex-1 min-w-0">
        <div className="p-3 min-w-0 overflow-hidden">
          {loading ? (
            <div className="space-y-2 px-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : combinedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              {showFavoritesOnly ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                  <p className="font-medium text-sm">No favorites yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mark opportunities as favorites to easily find them later
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowFavoritesOnly(false)} className="mt-4">
                    Browse All Opportunities
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-primary/70" />
                  </div>
                  <p className="font-medium text-sm">No opportunities found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery || activeFilterCount > 0
                      ? 'Try adjusting your filters'
                      : 'Check back later for new opportunities'}
                  </p>
                  {activeFilterCount > 0 && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                      Clear Filters
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1 pr-0 overflow-hidden">
              <AnimatePresence mode="popLayout">
                {combinedItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const isNPS = isNPSItem(item);

                  return (
                    <motion.button
                      key={`${item.sourceType}-${item.id}`}
                      className={cn(
                        'w-full text-left p-3 transition-all',
                        isSelected
                          ? 'bg-gray-100 rounded-l-lg rounded-r-none -mr-3 pr-6 border-y border-l border-gray-200'
                          : 'hover:bg-accent/5 rounded-lg border border-transparent'
                      )}
                      onClick={() => setSelectedItem(item)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      layout
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                            isNPS ? 'bg-blue-100' : item.sourceType === 'Industry' ? 'bg-slate-100' : 'bg-slate-200'
                          )}
                        >
                          {isNPS ? (
                            <GraduationCap className="h-4 w-4 text-blue-600" />
                          ) : item.sourceType === 'Industry' ? (
                            <Briefcase className="h-4 w-4 text-slate-600" />
                          ) : (
                            <Building2 className="h-4 w-4 text-slate-700" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-0.5">
                            <h4 className="font-medium text-sm flex-1 break-words">{item.title}</h4>
                            {(() => {
                              // Industry items from projects should use project bookmarks
                              const useProjectBookmarks = isNPS || (item.sourceType === 'Industry' && (item as any).isProjectOrigin);
                              return isFavorite(item.id, useProjectBookmarks) ? (
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
                              ) : null;
                            })()}
                            {!isNPS && (item as Opportunity).featured && (
                              <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {isNPS
                                ? (() => {
                                    const project = item as Project;
                                    const pocRank = project.poc_rank || project.pocRank;
                                    const pocFirstName = project.poc_first_name || project.pocFirstName;
                                    const pocLastName = project.poc_last_name || project.pocLastName;
                                    const pocName = (pocFirstName || pocLastName) 
                                      ? `${pocFirstName || ''} ${pocLastName || ''}`.trim()
                                      : project.profiles?.full_name || 'Unknown';
                                    return pocRank ? `${pocRank} ${pocName}` : pocName;
                                  })()
                                : (() => {
                                    const opp = item as Opportunity;
                                    const pocRank = opp.poc_rank || opp.pocRank;
                                    const pocFirstName = opp.poc_first_name || opp.pocFirstName;
                                    const pocLastName = opp.poc_last_name || opp.pocLastName;
                                    const pocName = (pocFirstName || pocLastName)
                                      ? `${pocFirstName || ''} ${pocLastName || ''}`.trim()
                                      : 'Unknown';
                                    return pocRank ? `${pocRank} ${pocName}` : pocName;
                                  })()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] py-0 px-1.5',
                                isNPS ? 'border-blue-200 text-blue-700' : item.sourceType === 'Industry' ? 'border-slate-200 text-slate-600' : 'border-slate-300 text-slate-700'
                              )}
                            >
                              {isNPS ? (item as Project).stage : item.sourceType === 'Industry' && (item as any).stage ? (item as any).stage : (item as Opportunity).type}
                            </Badge>
                            {isNPS && (item as Project).funding_status && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                {(item as Project).funding_status}
                              </Badge>
                            )}
                            {isNPS && ((item as Project).interested || 0) > 0 && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <TrendingUp className="h-3 w-3" />
                                {(item as Project).interested}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 shrink-0 mt-1',
                            isSelected ? 'text-gray-400' : 'text-muted-foreground'
                          )}
                        />
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

  // Right Panel - Opportunity Detail
  const OpportunityDetailPanel = selectedItem ? (
    <div className="h-full flex flex-col bg-gray-100 border-l border-gray-200">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center justify-between border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Details</h2>
            <p className="text-sm text-muted-foreground">View opportunity info</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          {(() => {
            // Industry items from projects should use project bookmarks
            const useProjectBookmarks = isNPSItem(selectedItem) || (selectedItem.sourceType === 'Industry' && (selectedItem as any).isProjectOrigin);
            return (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-transparent active:bg-transparent"
                onClick={() => toggleFavorite(selectedItem.id, useProjectBookmarks)}
              >
                <Star className={cn(
                  "w-5 h-5 transition-colors",
                  isFavorite(selectedItem.id, useProjectBookmarks) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"
                )} />
              </Button>
            );
          })()}
          <div className="flex flex-col items-end">
            <Button
              size="sm"
              className={cn(
                "h-8 text-xs",
                (selectedItem.pocUserId || selectedItem.poc_user_id ||
                  (isNPSItem(selectedItem)
                    ? (selectedItem as Project).pi_id
                    : (selectedItem as Opportunity).sponsor_contact_id))
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-gray-400 hover:bg-gray-400"
              )}
              onClick={() =>
                handleContact(
                selectedItem.pocUserId || selectedItem.poc_user_id ||
                (isNPSItem(selectedItem)
                  ? (selectedItem as Project).pi_id
                  : (selectedItem as Opportunity).sponsor_contact_id)
              )
            }
            disabled={!(selectedItem.pocUserId || selectedItem.poc_user_id ||
              (isNPSItem(selectedItem)
                ? (selectedItem as Project).pi_id
                : (selectedItem as Opportunity).sponsor_contact_id))}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Message
          </Button>
            {!(selectedItem.pocUserId || selectedItem.poc_user_id ||
              (isNPSItem(selectedItem)
                ? (selectedItem as Project).pi_id
                : (selectedItem as Opportunity).sponsor_contact_id)) ? (
              <span className="text-[9px] text-muted-foreground mt-0.5">POC is not registered</span>
            ) : !(selectedItem.pocIsCheckedIn || selectedItem.poc_is_checked_in) ? (
              <span className="text-[9px] text-amber-600 mt-0.5">POC registered but not at event</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Title and Source Badge */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              isNPSItem(selectedItem)
                ? 'bg-blue-600 text-white border-blue-600'
                : selectedItem.sourceType === 'Industry'
                ? 'bg-slate-600 text-white border-slate-600'
                : 'bg-slate-700 text-white border-slate-700'
            )}
          >
            {isNPSItem(selectedItem) ? (
              <>
                <GraduationCap className="h-3 w-3 mr-1" />
                NPS Project
              </>
            ) : selectedItem.sourceType === 'Industry' ? (
              <>
                <Briefcase className="h-3 w-3 mr-1" />
                Industry
              </>
            ) : (
              <>
                <Building2 className="h-3 w-3 mr-1" />
                Military/Gov
              </>
            )}
          </Badge>
          {!isNPSItem(selectedItem) && (selectedItem as Opportunity).featured && (
            <Badge className="bg-amber-500 text-white text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
        </div>
        <h3 className="font-bold text-xl text-foreground">{selectedItem.title}</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Description */}
          {selectedItem.description && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                About
              </Label>
              <p className="text-sm leading-relaxed">{selectedItem.description}</p>
            </div>
          )}

          {isNPSItem(selectedItem) ? (
            // NPS Project Details
            <>
              {/* POC Info */}
              {(selectedItem.poc_first_name || selectedItem.pocFirstName ||
                selectedItem.poc_last_name || selectedItem.pocLastName ||
                selectedItem.poc_email || selectedItem.pocEmail) && (
                <div className="p-4 bg-white border border-gray-200 rounded-lg">
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Point of Contact
                  </Label>
                  <p className="font-medium text-sm">
                    {(selectedItem.poc_rank || selectedItem.pocRank) && (
                      <span className="text-muted-foreground mr-1">
                        {selectedItem.poc_rank || selectedItem.pocRank}
                      </span>
                    )}
                    {(selectedItem.poc_first_name || selectedItem.pocFirstName ||
                      selectedItem.poc_last_name || selectedItem.pocLastName) &&
                      `${selectedItem.poc_first_name || selectedItem.pocFirstName || ''} ${
                        selectedItem.poc_last_name || selectedItem.pocLastName || ''
                      }`.trim()}
                  </p>
                  {(selectedItem.poc_email || selectedItem.pocEmail) && (
                    <a
                      href={`mailto:${selectedItem.poc_email || selectedItem.pocEmail}`}
                      className="flex items-center gap-2 text-xs text-primary hover:underline mt-2"
                    >
                      <Mail className="h-3 w-3" />
                      {selectedItem.poc_email || selectedItem.pocEmail}
                    </a>
                  )}
                </div>
              )}

              {/* Additional Project Info */}
              <div className="space-y-3">

                {(selectedItem as Project).department && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-md bg-white border border-gray-200">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Department</p>
                      <p className="font-medium">{(selectedItem as Project).department}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 rounded-md bg-white border border-gray-200">
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Stage</p>
                    <p className="font-medium">{(selectedItem as Project).stage}</p>
                  </div>
                </div>

                {(selectedItem as Project).funding_status && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-md bg-white border border-gray-200">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Funding Status</p>
                      <p className="font-medium">{(selectedItem as Project).funding_status}</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Research Areas */}
              {(selectedItem as Project).research_areas &&
                (selectedItem as Project).research_areas!.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Research Areas</Label>
                    <div className="flex flex-wrap gap-2">
                      {(selectedItem as Project).research_areas!.map((area, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Seeking */}
              {(selectedItem as Project).seeking &&
                (selectedItem as Project).seeking!.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Seeking</Label>
                    <div className="flex flex-wrap gap-2">
                      {(selectedItem as Project).seeking!.map((s, idx) => (
                        <Badge
                          key={idx}
                          className="text-xs bg-primary/10 text-primary border-0"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Keywords */}
              {(selectedItem as Project).keywords &&
                (selectedItem as Project).keywords!.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Keywords</Label>
                    <div className="flex flex-wrap gap-2">
                      {(selectedItem as Project).keywords!.map((k, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Team */}
              {(selectedItem as Project).students &&
                (selectedItem as Project).students!.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Team Members</Label>
                    <p className="text-sm">{(selectedItem as Project).students!.join(', ')}</p>
                  </div>
                )}
            </>
          ) : (
            // Military/Gov Opportunity Details
            <>
              {/* POC Info */}
              {(selectedItem.poc_first_name || selectedItem.pocFirstName ||
                selectedItem.poc_last_name || selectedItem.pocLastName ||
                selectedItem.poc_email || selectedItem.pocEmail) && (
                <div className="p-4 bg-white border border-gray-200 rounded-lg">
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Point of Contact
                  </Label>
                  <p className="font-medium text-sm">
                    {(selectedItem.poc_rank || selectedItem.pocRank) && (
                      <span className="text-muted-foreground mr-1">
                        {selectedItem.poc_rank || selectedItem.pocRank}
                      </span>
                    )}
                    {(selectedItem.poc_first_name || selectedItem.pocFirstName ||
                      selectedItem.poc_last_name || selectedItem.pocLastName) &&
                      `${selectedItem.poc_first_name || selectedItem.pocFirstName || ''} ${
                        selectedItem.poc_last_name || selectedItem.pocLastName || ''
                      }`.trim()}
                  </p>
                  {(selectedItem.poc_email || selectedItem.pocEmail) && (
                    <a
                      href={`mailto:${selectedItem.poc_email || selectedItem.pocEmail}`}
                      className="flex items-center gap-2 text-xs text-primary hover:underline mt-2"
                    >
                      <Mail className="h-3 w-3" />
                      {selectedItem.poc_email || selectedItem.pocEmail}
                    </a>
                  )}
                </div>
              )}

              {/* Organization Info */}
              <div className="space-y-3">
                {(selectedItem as Opportunity).sponsor_organization && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-md bg-white border border-gray-200">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Sponsor Organization</p>
                      <p className="font-medium">
                        {(selectedItem as Opportunity).sponsor_organization}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 rounded-md bg-white border border-gray-200">
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{selectedItem.sourceType === 'Industry' ? 'Stage' : 'Type'}</p>
                    <p className="font-medium capitalize">
                      {selectedItem.sourceType === 'Industry' && (selectedItem as any).stage 
                        ? (selectedItem as any).stage 
                        : (selectedItem as Opportunity).type}
                    </p>
                  </div>
                </div>

                {(selectedItem as Opportunity).location && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-md bg-white border border-gray-200">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Location</p>
                      <p className="font-medium">{(selectedItem as Opportunity).location}</p>
                    </div>
                  </div>
                )}

                {(selectedItem as Opportunity).duration && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-md bg-white border border-gray-200">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Duration</p>
                      <p className="font-medium">{(selectedItem as Opportunity).duration}</p>
                    </div>
                  </div>
                )}

                {(selectedItem as Opportunity).deadline && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-md bg-white border border-gray-200">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Deadline</p>
                      <p className="font-medium">
                        {format(new Date((selectedItem as Opportunity).deadline!), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* DoD Alignment */}
              {(selectedItem as Opportunity).dod_alignment &&
                (selectedItem as Opportunity).dod_alignment!.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-3 block">DoD Alignment</Label>
                    <div className="flex flex-wrap gap-2">
                      {(selectedItem as Opportunity).dod_alignment!.map((area, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Requirements - Only show for non-Industry items */}
              {(selectedItem as Opportunity).requirements && selectedItem.sourceType !== 'Industry' && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Requirements</Label>
                  <p className="text-sm leading-relaxed">
                    {(selectedItem as Opportunity).requirements}
                  </p>
                </div>
              )}

              {/* Benefits */}
              {(selectedItem as Opportunity).benefits && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Benefits</Label>
                  <p className="text-sm leading-relaxed">
                    {(selectedItem as Opportunity).benefits}
                  </p>
                </div>
              )}
            </>
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
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Details</h2>
            <p className="text-sm text-muted-foreground">View opportunity info</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-8 w-8 text-primary/70" />
          </div>
          <p className="font-medium">Select an opportunity</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click on an opportunity to view details
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <DesktopShell>
      <div className="h-full flex flex-col">
        {/* Page Title */}
        <div className="px-6 py-4 border-b border-gray-200 bg-background flex-shrink-0">
          <h1 className="text-2xl font-bold">Collaborative Opportunities</h1>
        </div>

        <div className="flex-1 overflow-hidden">
          <ThreePanelLayout
            left={FiltersPanel}
            center={OpportunitiesListPanel}
            right={OpportunityDetailPanel}
            leftWidth="260px"
            equalCenterRight
            connectedPanels={!!selectedItem}
          />
        </div>
      </div>
    </DesktopShell>
  );
}
