import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, ChevronLeft, ChevronDown, GraduationCap, Building2, Users, Sparkles, TrendingUp, Search, SlidersHorizontal, X, MessageSquare, Loader2 } from "lucide-react";
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

// Source types
const SOURCE_TYPES = ["NPS", "Military/Gov"];

// NPS Projects filters
const PROJECT_STAGES = ["Concept", "Prototype", "Pilot Ready", "Deployed"];
const FUNDING_STATUSES = ["Funded", "Seeking Funding", "Partially Funded"];
const SEEKING_TYPES = ["Industry Partnership", "Government Sponsor", "Research Collaboration", "Funding", "Test & Evaluation"];

// Military/Government filters
const ORGANIZATION_TYPES = ["Department of War Command", "Military Branch", "Defense Agency", "Federal Agency"];

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
  created_at: string;
}

type CombinedItem = (Project & { sourceType: 'NPS' }) | (Opportunity & { sourceType: 'Military/Gov' });

export default function OpportunitiesPage() {
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

  // Military/Gov filters
  const [selectedOrgTypes, setSelectedOrgTypes] = useState<string[]>([]);

  const [sortBy, setSortBy] = useState("recent");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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

  const handleContact = async (e: React.MouseEvent, contactId?: string) => {
    e.stopPropagation();
    if (!contactId) {
      console.info("Contact information not available");
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
  }, []);

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
    return selectedSourceTypes.length + selectedStages.length + selectedFunding.length + selectedSeeking.length + selectedOrgTypes.length;
  }, [selectedSourceTypes, selectedStages, selectedFunding, selectedSeeking, selectedOrgTypes]);

  // Filter NPS projects
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

    if (selectedFunding.length > 0) {
      filtered = filtered.filter(p => selectedFunding.includes(p.funding_status || ''));
    }

    if (selectedSeeking.length > 0) {
      filtered = filtered.filter(p =>
        p.seeking?.some((s: string) => selectedSeeking.includes(s))
      );
    }

    if (sortBy === "interest") {
      filtered.sort((a, b) => (b.interested || 0) - (a.interested || 0));
    } else if (sortBy === "stage") {
      filtered.sort((a, b) => PROJECT_STAGES.indexOf(a.stage) - PROJECT_STAGES.indexOf(b.stage));
    }

    return filtered;
  }, [projects, searchQuery, selectedStages, selectedFunding, selectedSeeking, sortBy]);

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

    if (selectedOrgTypes.length > 0) {
      filtered = filtered.filter(o => selectedOrgTypes.includes(o.type));
    }

    return filtered;
  }, [opportunities, searchQuery, selectedOrgTypes]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSourceTypes([]);
    setSelectedStages([]);
    setSelectedFunding([]);
    setSelectedSeeking([]);
    setSelectedOrgTypes([]);
  };

  // Combined and filtered items
  const filteredItems = useMemo(() => {
    const npsItems: CombinedItem[] = filteredProjects.map(p => ({ ...p, sourceType: 'NPS' as const }));
    const milItems: CombinedItem[] = filteredOpportunities.map(o => ({ ...o, sourceType: 'Military/Gov' as const }));

    let combined = [...npsItems, ...milItems];

    // Filter by source type
    if (selectedSourceTypes.length > 0) {
      combined = combined.filter(item => selectedSourceTypes.includes(item.sourceType));
    }

    // Sort
    if (sortBy === "recent") {
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return combined;
  }, [filteredProjects, filteredOpportunities, selectedSourceTypes, sortBy]);

  const renderFilterPanel = () => {
    return (
      <div className="space-y-4">
        {/* Source Type Filter */}
        <div>
          <Label className="text-xs font-semibold">Source Type</Label>
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* NPS Filters */}
          <div>
            <Label className="text-xs font-semibold">Project Stage</Label>
            <div className="space-y-1.5 mt-2">
              {PROJECT_STAGES.map(stage => (
                <div key={stage} className="flex items-center space-x-2">
                  <Checkbox
                    id={`stage-${stage}`}
                    checked={selectedStages.includes(stage)}
                    onCheckedChange={(checked) => {
                      setSelectedStages(prev =>
                        checked ? [...prev, stage] : prev.filter(s => s !== stage)
                      );
                    }}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`stage-${stage}`} className="text-xs cursor-pointer font-normal">{stage}</Label>
                </div>
              ))}
            </div>
          </div>
          <div>
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
          </div>
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
          {/* Military/Gov Filters */}
          <div>
            <Label className="text-xs font-semibold">Organization Type</Label>
            <div className="space-y-1.5 mt-2">
              {ORGANIZATION_TYPES.map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`org-${type}`}
                    checked={selectedOrgTypes.includes(type)}
                    onCheckedChange={(checked) => {
                      setSelectedOrgTypes(prev =>
                        checked ? [...prev, type] : prev.filter(s => s !== type)
                      );
                    }}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`org-${type}`} className="text-xs cursor-pointer font-normal">{type}</Label>
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
    selectedOrgTypes.forEach(s => filters.push({ label: s, onRemove: () => setSelectedOrgTypes(prev => prev.filter(x => x !== s)) }));

    if (filters.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5 items-center">
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
      <div className="container mx-auto px-3 md:px-4 pt-2 md:pt-4">
        <header className="bg-gradient-navy text-primary-foreground shadow-lg sticky top-0 z-10 rounded-lg">
          <div className="px-3 md:px-4 py-2 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 md:h-10 md:w-10 text-primary-foreground hover:bg-primary/20"
                  onClick={() => navigate(fromAdmin ? '/admin' : '/')}
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
                <div>
                  <h1 className="text-lg md:text-xl font-bold">Collaborative Opportunities</h1>
                  <p className="text-sm md:text-base text-tech-cyan-light">Discover Collaboration Projects</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="pt-3 md:pt-4">
          <OfflineDataBanner />
        </div>

        <main className="py-3 md:py-6 space-y-4">
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
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-11 md:h-10 text-sm"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[130px] md:w-[150px] h-11 md:h-10 text-sm">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="interest">By Interest</SelectItem>
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
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Opportunities Found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your filters or search</p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
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
                      {/* NPS Badge */}
                      <div className="mb-3">
                        <Badge className="bg-blue-600 text-white text-xs">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          NPS
                        </Badge>
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

                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.profiles?.full_name || 'Unknown'}</span>
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

                      {/* Footer with Contact button and expand arrow */}
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          className="flex-1 h-11 md:h-10 text-sm gap-2"
                          onClick={(e) => handleContact(e, item.pi_id)}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Contact
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-11 w-11 md:h-10 md:w-10">
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedCards.has(item.id) ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </Card>
                  </Collapsible>
                ) : (
                  // Military/Gov Card
                  <Collapsible
                    key={`mil-${item.id}`}
                    open={expandedCards.has(item.id)}
                    onOpenChange={() => toggleCardExpanded(item.id)}
                  >
                    <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
                      {/* Military Badge */}
                      <div className="mb-3">
                        <Badge className="bg-green-700 text-white text-xs">
                          <Building2 className="h-3 w-3 mr-1" />
                          Military/Gov
                        </Badge>
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
                          {item.type}
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

                        {item.requirements && (
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

                      {/* Footer with Contact button and expand arrow */}
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          className="flex-1 h-11 md:h-10 text-sm gap-2"
                          onClick={(e) => handleContact(e, item.sponsor_contact_id)}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Contact
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-11 w-11 md:h-10 md:w-10">
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedCards.has(item.id) ? 'rotate-180' : ''}`} />
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
    </div>
  );
}
