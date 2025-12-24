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
  Loader2,
  Filter,
  Briefcase,
  Clock,
  ChevronRight,
  Calendar,
  MapPin,
  Tag,
  DollarSign,
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
import { api } from '@/lib/api';
import { DesktopShell } from '@/components/desktop/DesktopShell';
import { ThreePanelLayout } from '@/components/desktop/layouts/ThreePanelLayout';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// NPS Projects filters
const PROJECT_STAGES = ['Concept', 'Prototype', 'Pilot Ready', 'Deployed'];
const FUNDING_STATUSES = ['Funded', 'Seeking Funding', 'Partially Funded'];
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

type CombinedItem =
  | (Project & { sourceType: 'NPS' })
  | (Opportunity & { sourceType: 'Military/Gov' })
  | (Opportunity & { sourceType: 'Industry' });

export default function OpportunitiesDesktopPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<CombinedItem | null>(null);

  // Source type filter
  const [activeTab, setActiveTab] = useState<'all' | 'nps' | 'military' | 'industry'>('all');

  // NPS filters
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedFunding, setSelectedFunding] = useState<string[]>([]);
  const [selectedSeeking, setSelectedSeeking] = useState<string[]>([]);

  const [sortBy, setSortBy] = useState('recent');

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
  }, []);

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

    if (selectedFunding.length > 0) {
      filtered = filtered.filter((p) => selectedFunding.includes(p.funding_status || ''));
    }

    if (selectedSeeking.length > 0) {
      filtered = filtered.filter((p) =>
        p.seeking?.some((s: string) => selectedSeeking.includes(s))
      );
    }

    if (sortBy === 'interest') {
      filtered.sort((a, b) => (b.interested || 0) - (a.interested || 0));
    } else if (sortBy === 'stage') {
      filtered.sort((a, b) => PROJECT_STAGES.indexOf(a.stage) - PROJECT_STAGES.indexOf(b.stage));
    }

    return filtered;
  }, [projects, searchQuery, selectedStages, selectedFunding, selectedSeeking, sortBy]);

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

    return filtered;
  }, [opportunities, searchQuery]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStages([]);
    setSelectedFunding([]);
    setSelectedSeeking([]);
  };

  // Combined and filtered items
  const filteredItems = useMemo(() => {
    const npsItems: CombinedItem[] = filteredProjects.map((p) => ({
      ...p,
      sourceType: 'NPS' as const,
    }));
    const milItems: CombinedItem[] = filteredOpportunities
      .filter((o) => o.type !== 'Industry')
      .map((o) => ({
        ...o,
        sourceType: 'Military/Gov' as const,
      }));
    const industryItems: CombinedItem[] = filteredOpportunities
      .filter((o) => o.type === 'Industry')
      .map((o) => ({
        ...o,
        sourceType: 'Industry' as const,
      }));

    let combined: CombinedItem[] = [];

    if (activeTab === 'all') {
      combined = [...npsItems, ...milItems, ...industryItems];
    } else if (activeTab === 'nps') {
      combined = npsItems;
    } else if (activeTab === 'military') {
      combined = milItems;
    } else {
      combined = industryItems;
    }

    // Sort
    if (sortBy === 'recent') {
      combined.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return combined;
  }, [filteredProjects, filteredOpportunities, activeTab, sortBy]);

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

  const npsCount = filteredProjects.length;
  const milCount = filteredOpportunities.filter((o) => o.type !== 'Industry').length;
  const industryCount = filteredOpportunities.filter((o) => o.type === 'Industry').length;

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
                <SelectItem value="interest">By Interest</SelectItem>
                <SelectItem value="stage">By Stage</SelectItem>
              </SelectContent>
            </Select>
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
                    {stage}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Funding Status Filters */}
          <div>
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
          </div>

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
    <div className="h-full flex flex-col bg-gray-50">
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
                {npsCount + milCount + industryCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="nps" className="flex-1 text-sm">
              <GraduationCap className="h-3 w-3 mr-1" />
              NPS
              <Badge variant="secondary" className="ml-2 text-xs">
                {npsCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="military" className="flex-1 text-sm">
              <Building2 className="h-3 w-3 mr-1" />
              Gov
              <Badge variant="secondary" className="ml-2 text-xs">
                {milCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="industry" className="flex-1 text-sm">
              <Briefcase className="h-3 w-3 mr-1" />
              Industry
              <Badge variant="secondary" className="ml-2 text-xs">
                {industryCount}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Opportunities List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
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
            </div>
          ) : (
            <div className="space-y-1 pr-0">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => {
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
                            isNPS ? 'bg-blue-100' : item.sourceType === 'Industry' ? 'bg-orange-100' : 'bg-green-100'
                          )}
                        >
                          {isNPS ? (
                            <GraduationCap className="h-4 w-4 text-blue-600" />
                          ) : item.sourceType === 'Industry' ? (
                            <Briefcase className="h-4 w-4 text-orange-600" />
                          ) : (
                            <Building2 className="h-4 w-4 text-green-700" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-medium text-sm truncate">{item.title}</h4>
                            {!isNPS && (item as Opportunity).featured && (
                              <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {isNPS
                              ? (item as Project).profiles?.full_name || 'Unknown PI'
                              : (item as Opportunity).sponsor_organization || 'Unknown Organization'}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] py-0 px-1.5',
                                isNPS ? 'border-blue-200 text-blue-700' : item.sourceType === 'Industry' ? 'border-orange-200 text-orange-700' : 'border-green-200 text-green-700'
                              )}
                            >
                              {isNPS ? (item as Project).stage : (item as Opportunity).type}
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
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() =>
            handleContact(
              isNPSItem(selectedItem)
                ? (selectedItem as Project).pi_id
                : (selectedItem as Opportunity).sponsor_contact_id
            )
          }
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Contact
        </Button>
      </div>

      {/* Title and Source Badge */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Badge
            className={cn(
              'text-xs',
              isNPSItem(selectedItem)
                ? 'bg-blue-600 text-white'
                : selectedItem.sourceType === 'Industry'
                ? 'bg-orange-600 text-white'
                : 'bg-green-700 text-white'
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
              {/* PI Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 rounded-md bg-white border border-gray-200">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Principal Investigator</p>
                    <p className="font-medium">
                      {(selectedItem as Project).profiles?.full_name || 'Unknown'}
                    </p>
                  </div>
                </div>

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
                    <p className="text-muted-foreground text-xs">Type</p>
                    <p className="font-medium capitalize">{(selectedItem as Opportunity).type}</p>
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

              {/* Requirements */}
              {(selectedItem as Opportunity).requirements && (
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
