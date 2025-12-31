import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, ChevronDown, GraduationCap, Building2, Users, Sparkles, TrendingUp, Search, SlidersHorizontal, X, MessageSquare, Loader2, Mail, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevice } from "@/hooks/useDeviceType";
import { PageHeader } from "@/components/PageHeader";

// Lazy load desktop version
const OpportunitiesDesktopPage = lazy(() => import('./OpportunitiesPage.desktop'));
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { api } from "@/lib/api";
import { offlineDataCache } from '@/lib/offlineDataCache';
import { OfflineDataBanner } from '@/components/OfflineDataBanner';
import { toast } from "sonner";

// Source types
const SOURCE_TYPES = ["NPS", "Military/Gov", "Industry"];

// NPS Projects filters - match backend enum values
const PROJECT_STAGES = ["concept", "prototype", "pilot_ready", "deployed"];
const PROJECT_STAGE_LABELS: Record<string, string> = {
  concept: "Concept",
  prototype: "Prototype",
  pilot_ready: "Pilot Ready",
  deployed: "Deployed",
};
const SEEKING_TYPES = ["Industry Partnership", "Government Sponsor", "Research Collaboration", "Funding", "Test & Evaluation"];

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
  // POC fields - support both camelCase (API) and snake_case
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
  deadline?: string;
  featured?: boolean;
  dod_alignment?: string[];
  requirements?: string;
  benefits?: string;
  sponsor_contact_id?: string;
  stage?: string; // Optional stage field for filtering
  // POC fields - support both camelCase (API) and snake_case
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
  created_at: string;
}

type CombinedItem =
  | (Project & { sourceType: 'NPS' })
  | (Opportunity & { sourceType: 'Military/Gov' })
  | (Opportunity & { sourceType: 'Industry'; isProjectOrigin?: boolean });

function OpportunitiesSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function OpportunitiesPage() {
  const { isDesktop } = useDevice();

  // Render desktop version for desktop users
  if (isDesktop) {
    return (
      <Suspense fallback={<OpportunitiesSkeleton />}>
        <OpportunitiesDesktopPage />
      </Suspense>
    );
  }

  // Mobile/Tablet version
  return <OpportunitiesMobilePage />;
}

function OpportunitiesMobilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromAdmin = location.state?.fromAdmin === true;

  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Source type filter
  const [selectedSourceTypes, setSelectedSourceTypes] = useState<string[]>([]);

  // NPS filters
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedFunding, setSelectedFunding] = useState<string[]>([]);
  const [selectedSeeking, setSelectedSeeking] = useState<string[]>([]);

  const [sortBy, setSortBy] = useState("recent");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Favorites state
  const [projectFavorites, setProjectFavorites] = useState<Set<string>>(new Set());
  const [opportunityFavorites, setOpportunityFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const toggleCardExpanded = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

  const handleContact = async (e: React.MouseEvent, pocUserId?: string | null) => {
    e.stopPropagation();
    if (!pocUserId) {
      toast.error("POC is not registered in app");
      return;
    }

    try {
      const response = await api.post('/messages/conversations', { participantId: pocUserId });
      const conversation = (response as any).data?.data || (response as any).data;
      if (conversation?.id) {
        navigate(`/messages/${conversation.id}`);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error("Failed to start conversation");
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
      if (projects.length === 0 && opportunities.length === 0) {
        setLoading(true);
      }

      // Fetch NPS projects
      const [projectsRes, oppsRes] = await Promise.all([
        api.get('/projects'),
        api.get('/opportunities')
      ]);

      const projectsData = (projectsRes as any).data?.data || (projectsRes as any).data || [];
      const oppsData = (oppsRes as any).data?.data || (oppsRes as any).data || [];

      setProjects(projectsData);
      setOpportunities(oppsData);

      const writeCache = () => {
        void Promise.all([
          offlineDataCache.set('projects', projectsData),
          offlineDataCache.set('opportunities', oppsData),
        ]).catch((e) => console.error('Failed to write opportunities cache', e));
      };
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(writeCache);
      } else {
        setTimeout(writeCache, 0);
      }
    } catch (error) {
      console.error('Error loading data:', error);

      try {
        const [cachedProjects, cachedOpps] = await Promise.all([
          offlineDataCache.get<Project[]>('projects'),
          offlineDataCache.get<Opportunity[]>('opportunities'),
        ]);

        if (cachedProjects?.data || cachedOpps?.data) {
          setProjects(cachedProjects?.data ?? []);
          setOpportunities(cachedOpps?.data ?? []);
        }
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return selectedSourceTypes.length + selectedStages.length + selectedFunding.length + selectedSeeking.length;
  }, [selectedSourceTypes, selectedStages, selectedFunding, selectedSeeking]);

  // Filter NPS projects
  const isIndustryProject = (project: Project) =>
    (project.classification || '').toLowerCase() === 'industry';

  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.research_areas?.some((a: string) => a.toLowerCase().includes(q)) ||
        p.profiles?.full_name?.toLowerCase().includes(q) ||
        p.department?.toLowerCase().includes(q)
      );
    }

    if (selectedStages.length > 0) {
      filtered = filtered.filter(p => selectedStages.includes(p.stage));
    }

    // Note: funding_status field doesn't exist in database - removing this filter
    // if (selectedFunding.length > 0) {
    //   filtered = filtered.filter(p => selectedFunding.includes(p.funding_status || ''));
    // }

    if (selectedSeeking.length > 0) {
      filtered = filtered.filter(p => {
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
      filtered = filtered.filter(o =>
        o.title?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q) ||
        o.sponsor_organization?.toLowerCase().includes(q)
      );
    }

    // Apply stage filter to opportunities if they have a stage field
    if (selectedStages.length > 0) {
      filtered = filtered.filter(o => {
        const stage = o.stage;
        if (!stage) return true; // Keep opportunities without stage
        return selectedStages.includes(stage);
      });
    }

    return filtered;
  }, [opportunities, searchQuery, selectedStages]);

  const toggleArrayFilter = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSourceTypes([]);
    setSelectedStages([]);
    setSelectedFunding([]);
    setSelectedSeeking([]);
    setShowFavoritesOnly(false);
  };

  // Combined and filtered items
  const filteredItems = useMemo(() => {
    // Separate projects by classification
    const industryProjects = filteredProjects.filter(isIndustryProject);
    const militaryGovProjects = filteredProjects.filter(p =>
      (p.classification || '').toLowerCase() === 'military/gov'
    );
    const npsProjects = filteredProjects.filter(p =>
      !isIndustryProject(p) && (p.classification || '').toLowerCase() !== 'military/gov'
    );

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
      stage: project.stage, // Preserve stage for Industry projects
      poc_user_id: project.poc_user_id || project.pocUserId,
      poc_first_name: project.poc_first_name || project.pocFirstName,
      poc_last_name: project.poc_last_name || project.pocLastName,
      poc_email: project.poc_email || project.pocEmail,
      poc_rank: project.poc_rank || project.pocRank,
      pocUserId: project.pocUserId,
      pocFirstName: project.pocFirstName,
      pocLastName: project.pocLastName,
      pocEmail: project.pocEmail,
      pocRank: project.pocRank,
      created_at: project.created_at,
      isProjectOrigin: true, // Mark as originating from a project
    });

    const industryProjectOpportunities = industryProjects.map(mapProjectToOpportunity);

    // Convert Military/Gov projects to opportunity format
    const militaryGovProjectOpportunities = militaryGovProjects.map(project => ({
      ...mapProjectToOpportunity(project),
      type: 'Military/Gov' as any,
      sponsor_organization: project.department || 'Military/Government',
    }));

    const npsItems: CombinedItem[] = npsProjects.map(p => ({ ...p, sourceType: 'NPS' as const }));

    // Real industry opportunities (from opportunities table)
    const realIndustryOpportunities = filteredOpportunities
      .filter(o => o.type?.toLowerCase() === 'industry')
      .map(o => ({ ...o, isProjectOrigin: false as const }));

    const industryOpportunities = [
      ...realIndustryOpportunities,
      ...industryProjectOpportunities,
    ];

    const industryItems: CombinedItem[] = industryOpportunities.map(o => ({
      ...o,
      sourceType: 'Industry' as const,
      isProjectOrigin: (o as any).isProjectOrigin ?? false,
    }));

    // Combine Military/Gov opportunities from both sources
    const realMilitaryGovOpportunities = filteredOpportunities
      .filter(o => o.type?.toLowerCase() !== 'industry')
      .map(o => ({ ...o, sourceType: 'Military/Gov' as const, isProjectOrigin: false }));

    const militaryGovItems = [
      ...realMilitaryGovOpportunities,
      ...militaryGovProjectOpportunities.map(o => ({ ...o, sourceType: 'Military/Gov' as const, isProjectOrigin: true })),
    ];

    // When "Seeking" filter is active, only show Military/Gov items that originated from projects (have seeking field)
    const milItems: CombinedItem[] = selectedSeeking.length > 0
      ? militaryGovItems.filter(item => (item as any).isProjectOrigin === true)
      : militaryGovItems;

    // Filter out real Industry opportunities when seeking filter is active
    const filteredIndustryItems = selectedSeeking.length > 0
      ? industryItems.filter(item => (item as any).isProjectOrigin === true)
      : industryItems;

    let combined = [...npsItems, ...milItems, ...filteredIndustryItems];

    // Filter by organization type
    if (selectedSourceTypes.length > 0) {
      combined = combined.filter(item => selectedSourceTypes.includes(item.sourceType));
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
    if (sortBy === "recent") {
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "stage") {
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

    return combined;
  }, [filteredProjects, filteredOpportunities, selectedSourceTypes, selectedSeeking, sortBy, showFavoritesOnly, projectFavorites, opportunityFavorites]);

  const renderFilterPanel = () => {
    return (
      <div className="space-y-4">
        {/* Organization Type Filter */}
        <div>
          <div>
            <Label className="text-xs font-semibold">Organization Type</Label>
            <div className="flex gap-3 mt-2">
              {SOURCE_TYPES.map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`source-${type}`}
                    checked={selectedSourceTypes.includes(type)}
                    onCheckedChange={(checked) => {
                      setSelectedSourceTypes(prev =>
                        checked ? [...prev, type] : prev.filter(s => s !== type)
                      );
                    }}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`source-${type}`} className="text-xs cursor-pointer font-normal">{type}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* NPS Filters */}
          <div>
            <Label className="text-xs font-semibold">Project Stage</Label>
            <div className="space-y-1.5 mt-2">
              {PROJECT_STAGES.map((stage) => (
                <div key={stage} className="flex items-center space-x-2">
                  <Checkbox
                    id={`stage-${stage}`}
                    checked={selectedStages.includes(stage)}
                    onCheckedChange={() => toggleArrayFilter(setSelectedStages, stage)}
                  />
                  <Label htmlFor={`stage-${stage}`} className="text-xs">{PROJECT_STAGE_LABELS[stage]}</Label>
                </div>
              ))}
            </div>
          </div>
          {/* Funding Status Filters - Hidden since field doesn't exist in database */}
          {/* <div>
            <Label className="text-xs font-semibold">Funding Status</Label>
            <div className="space-y-1.5 mt-2">
              {FUNDING_STATUSES.map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`funding-${status}`}
                    checked={selectedFunding.includes(status)}
                    onCheckedChange={(checked) => {
                      setSelectedFunding(prev =>
                        checked ? [...prev, status] : prev.filter(s => s !== status)
                      );
                    }}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`funding-${status}`} className="text-xs cursor-pointer font-normal">{status}</Label>
                </div>
              ))}
            </div>
          </div> */}
          <div>
            <Label className="text-xs font-semibold">Seeking</Label>
            <div className="space-y-1.5 mt-2">
              {SEEKING_TYPES.map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`seeking-${type}`}
                    checked={selectedSeeking.includes(type)}
                    onCheckedChange={(checked) => {
                      setSelectedSeeking(prev =>
                        checked ? [...prev, type] : prev.filter(s => s !== type)
                      );
                    }}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`seeking-${type}`} className="text-xs cursor-pointer font-normal">{type}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveFilters = () => {
    const filters: { label: string; onRemove: () => void }[] = [];

    selectedSourceTypes.forEach(s => filters.push({ label: s, onRemove: () => setSelectedSourceTypes(prev => prev.filter(x => x !== s)) }));
    selectedStages.forEach(s => filters.push({ label: s, onRemove: () => setSelectedStages(prev => prev.filter(x => x !== s)) }));
    selectedFunding.forEach(s => filters.push({ label: s, onRemove: () => setSelectedFunding(prev => prev.filter(x => x !== s)) }));
    selectedSeeking.forEach(s => filters.push({ label: s, onRemove: () => setSelectedSeeking(prev => prev.filter(x => x !== s)) }));

    if (filters.length === 0 && !showFavoritesOnly) return null;

    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        {showFavoritesOnly && (
          <Badge variant="default" className="gap-1 text-xs py-1 px-2">
            <Star className="w-3 h-3 fill-current" />
            Favorites
            <button onClick={() => setShowFavoritesOnly(false)}>
              <X className="w-3 h-3 ml-1" />
            </button>
          </Badge>
        )}
        {filters.map((filter, idx) => (
          <Badge key={idx} variant="secondary" className="gap-1 text-xs py-1 px-2">
            {filter.label}
            <button onClick={filter.onRemove}>
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-6 text-xs px-2"
        >
          Clear
        </Button>
      </div>
    );
  };

  const isNPSItem = (item: CombinedItem): item is Project & { sourceType: 'NPS' } => {
    return item.sourceType === 'NPS';
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      <PageHeader
        title="Collaborative Opportunities"
        subtitle="Discover Collaboration Projects"
        onBack={() => navigate(fromAdmin ? '/admin' : '/')}
      />

      <main className="px-3 md:px-4 pt-3 md:pt-4 space-y-3 md:space-y-4">
        <OfflineDataBanner />

        {/* Search Input */}
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 md:h-10 text-base"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex items-start justify-between gap-2 md:gap-4">
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "h-11 md:h-10 text-sm",
                    showFilters
                      ? "bg-primary text-primary-foreground [@media(hover:hover)]:hover:bg-primary/90"
                      : "bg-white border-primary/30 text-foreground [@media(hover:hover)]:hover:bg-primary/10 [@media(hover:hover)]:hover:text-foreground active:bg-primary active:text-primary-foreground"
                  )}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className={cn(
                      "ml-2 text-xs",
                      showFilters ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                    )}>
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>

                <Button
                  variant={showFavoritesOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className="gap-2 text-sm h-11 md:h-10"
                >
                  <Star className={cn("w-4 h-4", showFavoritesOnly && "fill-current")} />
                  <span className="hidden sm:inline">Favorites</span>
                  {totalFavoritesCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{totalFavoritesCount}</Badge>
                  )}
                </Button>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[130px] md:w-[150px] h-11 md:h-10 text-sm">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="stage">By Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expandable Filter Panel */}
              {showFilters && (
                <Card>
                  <CardContent className="pt-4 pb-4">
                    {renderFilterPanel()}
                  </CardContent>
                </Card>
              )}

              {/* Active Filter Badges */}
              {renderActiveFilters()}
            </div>
          </div>

          {/* Submit Opportunity CTA */}
          <Card className="p-3 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Share your project or opportunity</p>
              <Button
                onClick={() => navigate('/opportunities/submit')}
                size="sm"
                className="gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Submit
              </Button>
            </div>
          </Card>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredItems.length} opportunities
          </div>

          {/* Unified List */}
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-4 md:p-6">
                    <div className="mb-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <Card className="p-12 text-center">
                {showFavoritesOnly ? (
                  <>
                    <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Favorites Yet</h3>
                    <p className="text-muted-foreground mb-6">Mark opportunities as favorites to easily find them later</p>
                    <Button onClick={() => setShowFavoritesOnly(false)} variant="outline">
                      Browse All Opportunities
                    </Button>
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Opportunities Found</h3>
                    <p className="text-muted-foreground mb-6">Try adjusting your filters or search</p>
                    <Button onClick={clearFilters} variant="outline">
                      Clear Filters
                    </Button>
                  </>
                )}
              </Card>
            ) : (
              filteredItems.map((item) => (
                isNPSItem(item) ? (
                  // NPS Project Card
                  <Collapsible
                    key={`nps-${item.id}`}
                    open={expandedCards.has(item.id)}
                    onOpenChange={() => toggleCardExpanded(item.id)}
                  >
                    <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
                      {/* NPS Badge and Star */}
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-blue-600 text-white text-xs">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          NPS
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-9 w-9 [@media(hover:hover)]:hover:bg-transparent active:bg-transparent"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id, true); }}
                        >
                          <Star className={cn(
                            "w-5 h-5 transition-colors",
                            isFavorite(item.id, true) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground [@media(hover:hover)]:hover:text-yellow-400"
                          )} />
                        </Button>
                      </div>

                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-semibold mb-1 line-clamp-1">{item.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 ml-3 shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {item.stage}
                          </Badge>
                          {item.funding_status && (
                            <Badge variant="outline" className="text-xs">
                              {item.funding_status}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {item.research_areas?.slice(0, 3).map((area: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                        {(item.research_areas?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(item.research_areas?.length || 0) - 3}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Users className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {(item.poc_rank || item.pocRank) && <span className="font-medium">{item.poc_rank || item.pocRank}</span>}
                              {(item.poc_rank || item.pocRank) && (item.poc_first_name || item.pocFirstName || item.poc_last_name || item.pocLastName) && ' '}
                              {(item.poc_first_name || item.pocFirstName || item.poc_last_name || item.pocLastName)
                                ? `${item.poc_first_name || item.pocFirstName || ''} ${item.poc_last_name || item.pocLastName || ''}`.trim()
                                : item.profiles?.full_name || 'Unknown'}
                            </span>
                            {item.department && (
                              <span className="text-xs hidden md:inline">• {item.department}</span>
                            )}
                          </div>
                          {(item.interested || 0) > 0 && (
                            <div className="flex items-center gap-1 shrink-0">
                              <TrendingUp className="h-4 w-4" />
                              <span>{item.interested}</span>
                            </div>
                          )}
                        </div>
                        {(item.poc_email || item.pocEmail) && (
                          <a
                            href={`mailto:${item.poc_email || item.pocEmail}`}
                            className="flex items-center gap-2 text-xs text-primary hover:underline ml-6"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="h-3 w-3" />
                            {item.poc_email || item.pocEmail}
                          </a>
                        )}
                      </div>

                      {/* Expandable Content */}
                      <CollapsibleContent className="space-y-3 pt-3 border-t">
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}

                        {item.seeking && item.seeking.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-xs text-muted-foreground font-medium">Seeking:</span>
                            {item.seeking.map((s: string, idx: number) => (
                              <Badge key={idx} className="text-xs bg-primary/10 text-primary border-0">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {item.classification && (
                            <div>
                              <span className="text-muted-foreground font-medium">Classification:</span>
                              <p className="text-foreground">{item.classification}</p>
                            </div>
                          )}

                          {item.funding_status && (
                            <div>
                              <span className="text-muted-foreground font-medium">Funding:</span>
                              <p className="text-foreground">{item.funding_status}</p>
                            </div>
                          )}

                          {item.department && (
                            <div>
                              <span className="text-muted-foreground font-medium">Department:</span>
                              <p className="text-foreground">{item.department}</p>
                            </div>
                          )}

                          {item.demo_schedule && (
                            <div>
                              <span className="text-muted-foreground font-medium">Demo Schedule:</span>
                              <p className="text-foreground">{item.demo_schedule}</p>
                            </div>
                          )}
                        </div>

                        {item.students && item.students.length > 0 && (
                          <div>
                            <span className="text-xs text-muted-foreground font-medium">Team Members:</span>
                            <p className="text-sm text-foreground">{item.students.join(', ')}</p>
                          </div>
                        )}

                        {item.keywords && item.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-xs text-muted-foreground font-medium">Keywords:</span>
                            {item.keywords.map((k: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {k}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CollapsibleContent>

                      {/* Footer with Message button and expand arrow */}
                      <div className="flex items-start gap-2 mt-3">
                        <div className="flex-1 flex flex-col">
                          <Button
                            className={cn(
                              "w-full h-11 md:h-10 text-sm gap-2",
                              (item.pocUserId || item.poc_user_id || item.pi_id)
                                ? "bg-primary [@media(hover:hover)]:hover:bg-primary/90"
                                : "bg-gray-400 cursor-not-allowed"
                            )}
                            onClick={(e) => handleContact(e, item.pocUserId || item.poc_user_id || item.pi_id)}
                            disabled={!(item.pocUserId || item.poc_user_id || item.pi_id)}
                          >
                            <MessageSquare className="h-4 w-4" />
                            Message
                          </Button>
                          {!(item.pocUserId || item.poc_user_id || item.pi_id) ? (
                            <span className="text-[10px] text-muted-foreground mt-1">POC is not registered</span>
                          ) : !(item.pocIsCheckedIn || item.poc_is_checked_in) ? (
                            <span className="text-[10px] text-amber-600 mt-1">POC registered but not at event</span>
                          ) : null}
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="icon" className="h-11 w-11 md:h-10 md:w-10 shrink-0">
                            <ChevronDown className={cn(
                              "h-5 w-5 text-muted-foreground transition-transform duration-200",
                              expandedCards.has(item.id) && "rotate-180"
                            )} />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </Card>
                  </Collapsible>
                ) : (
                  // Military/Gov or Industry Card
                  <Collapsible
                    key={`opp-${item.id}`}
                    open={expandedCards.has(item.id)}
                    onOpenChange={() => toggleCardExpanded(item.id)}
                  >
                    <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
                      {/* Badge and Star */}
                      <div className="flex items-center justify-between mb-3">
                        {item.sourceType === 'Industry' ? (
                          <Badge variant="outline" className="bg-slate-600 text-white text-xs border-slate-600">
                            <Users className="h-3 w-3 mr-1" />
                            Industry
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-700 text-white text-xs border-slate-700">
                            <Building2 className="h-3 w-3 mr-1" />
                            Military/Gov
                          </Badge>
                        )}
                        {(() => {
                          // Industry items from projects should use project bookmarks
                          const isProjectOrigin = item.sourceType === 'Industry' && (item as any).isProjectOrigin;
                          return (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-9 w-9 [@media(hover:hover)]:hover:bg-transparent active:bg-transparent"
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id, isProjectOrigin); }}
                            >
                              <Star className={cn(
                                "w-5 h-5 transition-colors",
                                isFavorite(item.id, isProjectOrigin) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground [@media(hover:hover)]:hover:text-yellow-400"
                              )} />
                            </Button>
                          );
                        })()}
                      </div>

                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base md:text-lg font-semibold line-clamp-1">{item.title}</h3>
                            {item.featured && (
                              <Badge className="bg-tech-cyan-DEFAULT text-background shrink-0">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          {item.sponsor_organization && (
                            <p className="text-sm text-primary font-medium">{item.sponsor_organization}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="ml-3 shrink-0 capitalize text-xs">
                          {item.sourceType === 'Industry' && (item as any).stage ? (item as any).stage : item.type}
                        </Badge>
                      </div>

                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {item.dod_alignment && item.dod_alignment.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {item.dod_alignment.slice(0, 3).map((area: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {(item.poc_rank || item.pocRank) && <span className="font-medium">{item.poc_rank || item.pocRank}</span>}
                            {(item.poc_rank || item.pocRank) && (item.poc_first_name || item.pocFirstName || item.poc_last_name || item.pocLastName) && ' '}
                            {(item.poc_first_name || item.pocFirstName || item.poc_last_name || item.pocLastName)
                              ? `${item.poc_first_name || item.pocFirstName || ''} ${item.poc_last_name || item.pocLastName || ''}`.trim()
                              : 'Unknown'}
                          </span>
                        </div>
                        {(item.poc_email || item.pocEmail) && (
                          <a
                            href={`mailto:${item.poc_email || item.pocEmail}`}
                            className="flex items-center gap-2 text-xs text-primary hover:underline ml-6"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="h-3 w-3" />
                            {item.poc_email || item.pocEmail}
                          </a>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-3">
                          {item.location && <span className="text-xs">{item.location}</span>}
                          {item.duration && <span className="text-xs">• {item.duration}</span>}
                        </div>
                        {item.deadline && (
                          <span className="text-xs">
                            Deadline: {new Date(item.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Expandable Content */}
                      <CollapsibleContent className="space-y-3 pt-3 border-t">
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}

                        {item.requirements && item.sourceType !== 'Industry' && (
                          <div className="text-sm">
                            <span className="font-medium text-xs text-muted-foreground">Requirements:</span>
                            <p className="text-sm mt-1">{item.requirements}</p>
                          </div>
                        )}

                        {item.benefits && (
                          <div className="text-sm">
                            <span className="font-medium text-xs text-muted-foreground">Benefits:</span>
                            <p className="text-sm mt-1">{item.benefits}</p>
                          </div>
                        )}
                      </CollapsibleContent>

                      {/* Footer with Message button and expand arrow */}
                      <div className="flex items-start gap-2 mt-3">
                        <div className="flex-1 flex flex-col">
                          <Button
                            className={cn(
                              "w-full h-11 md:h-10 text-sm gap-2",
                              (item.pocUserId || item.poc_user_id || item.sponsor_contact_id)
                                ? "bg-primary [@media(hover:hover)]:hover:bg-primary/90"
                                : "bg-gray-400 cursor-not-allowed"
                            )}
                            onClick={(e) => handleContact(e, item.pocUserId || item.poc_user_id || item.sponsor_contact_id)}
                            disabled={!(item.pocUserId || item.poc_user_id || item.sponsor_contact_id)}
                          >
                            <MessageSquare className="h-4 w-4" />
                            Message
                          </Button>
                          {!(item.pocUserId || item.poc_user_id || item.sponsor_contact_id) ? (
                            <span className="text-[10px] text-muted-foreground mt-1">POC is not registered</span>
                          ) : !(item.pocIsCheckedIn || item.poc_is_checked_in) ? (
                            <span className="text-[10px] text-amber-600 mt-1">POC registered but not at event</span>
                          ) : null}
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="icon" className="h-11 w-11 md:h-10 md:w-10 shrink-0">
                            <ChevronDown className={cn(
                              "h-5 w-5 text-muted-foreground transition-transform duration-200",
                              expandedCards.has(item.id) && "rotate-180"
                            )} />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </Card>
                  </Collapsible>
                )
              ))
            )}
          </div>
        </main>
    </div>
  );
}
