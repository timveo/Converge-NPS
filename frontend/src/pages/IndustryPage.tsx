import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Search, Building2, MapPin, ExternalLink, Filter, Loader2, X, Star, ChevronDown, MessageSquare, Plus, Sparkles, Mail, Phone, Users, ChevronRight } from "lucide-react";
import { useDevice } from "@/hooks/useDeviceType";
import { PageHeader } from "@/components/PageHeader";
import { useDismissedRecommendations } from "@/hooks/useDismissedRecommendations";
import { offlineDataCache } from "@/lib/offlineDataCache";
import { OfflineDataBanner } from "@/components/OfflineDataBanner";

// Lazy load desktop version
const IndustryDesktopPage = lazy(() => import('./IndustryPage.desktop'));
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { RecommendationCard } from "@/components/RecommendationCard";

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  reason: string;
  relevanceScore: number;
  tags: string[];
}

const TECHNOLOGY_AREAS = [
  "Additive Manufacturing",
  "Advanced Materials",
  "AI/ML",
  "AR/VR/XR",
  "Autonomous Systems",
  "Communications",
  "Contested Logistics",
  "Cybersecurity",
  "Data Analytics",
  "Digital Twins",
  "Directed Energy",
  "Future Generation Wireless Technology",
  "Electronic Warfare",
  "Human-Machine Interface",
  "Hypersonics",
  "Integrated Networks",
  "Modeling & Simulation",
  "Quantum",
  "Robotics",
  "Space",
  "Undersea Warfare",
];
const SEEKING_OPTIONS = [
  "Data Access/Sharing",
  "Funding Opportunities",
  "Research Partnership",
  "Tech Transfer",
  "Pilot Programs",
  "Prototyping & Experimentation",
  "Education Partnership",
  "Student Interns",
  "Tech Licensing",
];

interface IndustryPartner {
  id: string;
  company_name: string;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  primary_contact_name: string | null;
  primary_contact_title: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  technology_focus_areas: string[];
  dod_sponsors: string | null;
  seeking: string[];
  collaboration_pitch: string | null;
  booth_location: string | null;
  team_members: any;
  hide_contact_info: boolean | null;
  organization_type?: string | null;
  poc_user_id?: string | null;
  poc_first_name?: string | null;
  poc_last_name?: string | null;
  poc_email?: string | null;
  poc_rank?: string | null;
  poc_is_checked_in?: boolean | null;
  pocUserId?: string | null;
  pocFirstName?: string | null;
  pocLastName?: string | null;
  pocEmail?: string | null;
  pocRank?: string | null;
  pocIsCheckedIn?: boolean | null;
}

function IndustrySkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function IndustryPage() {
  const { isDesktop } = useDevice();

  // Render desktop version for desktop users
  if (isDesktop) {
    return (
      <Suspense fallback={<IndustrySkeleton />}>
        <IndustryDesktopPage />
      </Suspense>
    );
  }

  // Mobile/Tablet version
  return <IndustryMobilePage />;
}

function IndustryMobilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<IndustryPartner[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTechAreas, setSelectedTechAreas] = useState<string[]>([]);
  const [selectedSeeking, setSelectedSeeking] = useState<string[]>([]);
  const [selectedDodSponsor, setSelectedDodSponsor] = useState<string>("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>("alphabetical");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [expandedFilterSections, setExpandedFilterSections] = useState<Set<string>>(new Set());
  const [expandedPartners, setExpandedPartners] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const { dismiss, isDismissed } = useDismissedRecommendations('industry');

  const toggleExpanded = (partnerId: string) => {
    setExpandedPartners(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partnerId)) {
        newSet.delete(partnerId);
      } else {
        newSet.add(partnerId);
      }
      return newSet;
    });
  };

  const toggleFilterSection = (section: string) => {
    setExpandedFilterSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const toggleFavorite = (partnerId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partnerId)) {
        newSet.delete(partnerId);
      } else {
        newSet.add(partnerId);
      }
      return newSet;
    });
  };

  const isFavorite = (partnerId: string) => favorites.has(partnerId);

  const handleContact = async (partner: IndustryPartner) => {
    const pocUserId = partner.pocUserId || partner.poc_user_id;
    const fallbackEmail =
      partner.poc_email ||
      partner.primary_contact_email ||
      partner.primaryContactEmail ||
      undefined;

    if (pocUserId) {
      try {
        const response = await api.post('/messages/conversations', { participantId: pocUserId });
        const conversation = (response as any).data?.data || (response as any).data;
        if (conversation?.id) {
          navigate(`/messages/${conversation.id}`);
          return;
        }
      } catch (error) {
        console.error('Failed to start conversation:', error);
        if (fallbackEmail) {
          window.location.href = `mailto:${fallbackEmail}`;
          toast.info('Messaging unavailable—opening email instead.');
          return;
        }
        toast.error("Failed to start conversation");
        return;
      }
    }

    if (fallbackEmail) {
      window.location.href = `mailto:${fallbackEmail}`;
      return;
    }

    toast.error("POC is not registered in app");
  };

  // Extract unique DoD sponsors
  const dodSponsors = useMemo(() => {
    const sponsors = new Set<string>();
    partners.forEach(partner => {
      if (partner.dod_sponsors) {
        partner.dod_sponsors.split(',').map(s => s.trim()).filter(Boolean).forEach(s => sponsors.add(s));
      }
    });
    return Array.from(sponsors).sort();
  }, [partners]);

  useEffect(() => {
    fetchPartners();
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await api.post('/recommendations', { type: 'industry_partner' });
      const data = (response as any)?.recommendations || [];
      setRecommendations(data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const visibleRecommendations = recommendations
    .filter(rec => !isDismissed(rec.id))
    .slice(0, 3);

  const handleRecommendationClick = (rec: Recommendation) => {
    // Find the partner and scroll to it, or expand it
    const partner = partners.find(p =>
      p.company_name.toLowerCase() === rec.title.toLowerCase() ||
      p.id === rec.id
    );
    if (partner) {
      setExpandedPartners(prev => new Set([...prev, partner.id]));
      // Scroll to the partner card
      const element = document.getElementById(`partner-${partner.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const fetchPartners = async () => {
    try {
      if (partners.length === 0) {
        setLoading(true);
      }
      const response = await api.get('/partners');
      const data = (response as any).data?.data || (response as any).data || [];

      // Map API response to expected interface
      const mappedPartners: IndustryPartner[] = data.map((p: any) => ({
        id: p.id,
        company_name: p.companyName || p.company_name || p.name || 'Unknown',
        logo_url: p.logoUrl || p.logo_url,
        description: p.description,
        website_url: p.websiteUrl || p.website_url,
        primary_contact_name: p.primaryContactName || p.primary_contact_name,
        primary_contact_title: p.primaryContactTitle || p.primary_contact_title,
        primary_contact_email: p.primaryContactEmail || p.primary_contact_email,
        primary_contact_phone: p.primaryContactPhone || p.primary_contact_phone,
        technology_focus_areas: p.technologyFocusAreas || p.technology_focus_areas || p.researchAreas || p.research_areas || [],
        dod_sponsors: p.dodSponsors || p.dod_sponsors,
        seeking: p.seeking || [],
        collaboration_pitch: p.collaborationPitch || p.collaboration_pitch || null,
        booth_location: p.boothLocation || p.booth_location,
        team_members: p.teamMembers || p.team_members,
        hide_contact_info: p.hideContactInfo || p.hide_contact_info,
        organization_type: p.organizationType || p.organization_type || p.partnershipType || p.partnership_type,
        poc_user_id: p.pocUserId || p.poc_user_id,
        poc_first_name: p.pocFirstName || p.poc_first_name,
        poc_last_name: p.pocLastName || p.poc_last_name,
        poc_email: p.pocEmail || p.poc_email,
        poc_rank: p.pocRank || p.poc_rank,
        poc_is_checked_in: p.pocIsCheckedIn ?? p.poc_is_checked_in ?? false
      }));
      setPartners(mappedPartners);

      const writeCache = () => {
        void offlineDataCache.set('industry:partners', mappedPartners)
          .catch((e) => console.error('Failed to write partners cache', e));
      };
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(writeCache);
      } else {
        setTimeout(writeCache, 0);
      }
    } catch (error) {
      console.error('Error loading partners:', error);

      const cached = await offlineDataCache.get<IndustryPartner[]>('industry:partners');
      if (cached?.data) {
        setPartners(cached.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = useMemo(() => {
    let filtered = [...partners];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.company_name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.technology_focus_areas.some(a => a.toLowerCase().includes(q))
      );
    }

    if (selectedTechAreas.length > 0) {
      filtered = filtered.filter(p => 
        selectedTechAreas.some(t => 
          p.technology_focus_areas.some(area => area.toLowerCase() === t.toLowerCase())
        )
      );
    }

    if (selectedSeeking.length > 0) {
      filtered = filtered.filter(p => 
        selectedSeeking.some(s => 
          p.seeking.some(item => item.toLowerCase() === s.toLowerCase())
        )
      );
    }

    if (selectedDodSponsor) {
      filtered = filtered.filter(p => p.dod_sponsors?.split(',').map(s => s.trim()).includes(selectedDodSponsor));
    }

    if (showFavoritesOnly) {
      filtered = filtered.filter(p => isFavorite(p.id));
    }

    if (sortBy === "alphabetical") {
      filtered.sort((a, b) => a.company_name.localeCompare(b.company_name));
    } else if (sortBy === "booth") {
      filtered.sort((a, b) => (a.booth_location || "").localeCompare(b.booth_location || ""));
    }

    return filtered;
  }, [partners, searchQuery, selectedTechAreas, selectedSeeking, selectedDodSponsor, showFavoritesOnly, sortBy, favorites]);

  const toggleTechArea = (area: string) => setSelectedTechAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  const toggleSeeking = (seeking: string) => setSelectedSeeking(prev => prev.includes(seeking) ? prev.filter(s => s !== seeking) : [...prev, seeking]);
  const clearFilters = () => {
    setSelectedTechAreas([]);
    setSelectedSeeking([]);
    setSearchQuery("");
    setSelectedDodSponsor("");
    setShowFavoritesOnly(false);
  };

  const hasActiveFilters = selectedTechAreas.length > 0 || selectedSeeking.length > 0 || searchQuery.trim() !== "" || selectedDodSponsor !== "" || showFavoritesOnly;
  const activeFilterCount = selectedTechAreas.length + selectedSeeking.length + (selectedDodSponsor ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 md:pb-24">
      <PageHeader
        title="Meet Industry"
        subtitle={`${partners.length} Partners Present`}
      />

      {/* Main Content */}
      <main className="px-3 md:px-4 pt-3 md:pt-4 space-y-3 md:space-y-4">
        <OfflineDataBanner />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search companies, technologies..."
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
        {/* Filter buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Popover open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={activeFilterCount > 0 ? "default" : "outline"}
                size="sm"
                className={cn(
                  "gap-2 text-sm h-11 md:h-10",
                  activeFilterCount > 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-white border-primary/30 text-foreground hover:bg-primary/10 hover:text-foreground active:bg-primary active:text-primary-foreground"
                )}
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="default" className={cn(
                    "ml-1 text-xs",
                    "bg-primary-foreground text-primary"
                  )}>
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isFilterSheetOpen && "rotate-180"
                )} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[calc(100vw-1.5rem)] max-w-none p-0 mx-3"
              align="start"
              sideOffset={8}
            >
              <div className="flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="font-semibold text-sm">Filters</span>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Scrollable filter content */}
                <div className="max-h-[50vh] overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {/* Technology Filter - Collapsible */}
                    <Collapsible
                      open={expandedFilterSections.has('technology')}
                      onOpenChange={() => toggleFilterSection('technology')}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer">
                            Technology
                          </Label>
                          {selectedTechAreas.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {selectedTechAreas.length}
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          expandedFilterSections.has('technology') && "rotate-90"
                        )} />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-3 pl-2">
                          {TECHNOLOGY_AREAS.map(area => (
                            <div key={area} className="flex items-center space-x-2">
                              <Checkbox
                                id={`filter-tech-${area}`}
                                checked={selectedTechAreas.includes(area)}
                                onCheckedChange={() => toggleTechArea(area)}
                                className="h-5 w-5"
                              />
                              <Label htmlFor={`filter-tech-${area}`} className="text-sm cursor-pointer font-normal leading-tight">{area}</Label>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Seeking Filter - Collapsible */}
                    <Collapsible
                      open={expandedFilterSections.has('seeking')}
                      onOpenChange={() => toggleFilterSection('seeking')}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer">
                            Seeking
                          </Label>
                          {selectedSeeking.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {selectedSeeking.length}
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          expandedFilterSections.has('seeking') && "rotate-90"
                        )} />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-3 pl-2">
                          {SEEKING_OPTIONS.map(s => (
                            <div key={s} className="flex items-center space-x-2">
                              <Checkbox
                                id={`filter-seek-${s}`}
                                checked={selectedSeeking.includes(s)}
                                onCheckedChange={() => toggleSeeking(s)}
                                className="h-5 w-5"
                              />
                              <Label htmlFor={`filter-seek-${s}`} className="text-sm cursor-pointer font-normal leading-tight">{s}</Label>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 px-4 py-3 border-t bg-muted/30">
                  <Button
                    onClick={() => setIsFilterSheetOpen(false)}
                    className="flex-1 h-10"
                  >
                    Show {filteredPartners.length} results
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="gap-2 text-sm h-11 md:h-10"
          >
            <Star className={cn("w-4 h-4", showFavoritesOnly && "fill-current")} />
            <span className="hidden sm:inline">Favorites</span>
            {favorites.size > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{favorites.size}</Badge>
            )}
          </Button>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 md:w-40 h-11 md:h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="booth">By Booth</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filter badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {showFavoritesOnly && (
              <Badge variant="default" className="gap-1 bg-yellow-500 text-xs py-1.5">
                <Star className="w-3 h-3 fill-current" />
                Favorites
                <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => setShowFavoritesOnly(false)} />
              </Badge>
            )}
            {selectedDodSponsor && (
              <Badge variant="secondary" className="gap-1 text-xs py-1.5">
                DoD: {selectedDodSponsor}
                <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => setSelectedDodSponsor("")} />
              </Badge>
            )}
            {selectedTechAreas.map(area => (
              <Badge key={area} variant="secondary" className="gap-1 text-xs py-1.5">
                {area}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleTechArea(area)} />
              </Badge>
            ))}
            {selectedSeeking.map(s => (
              <Badge key={s} variant="outline" className="gap-1 text-xs py-1.5">
                {s}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSeeking(s)} />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs px-2">
              Clear
            </Button>
          </div>
        )}

        {/* Submit Industry Partner CTA */}
        <Card className="p-3 md:p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Share your project or opportunity</p>
            <Button
              onClick={() => navigate('/opportunities/submit', { state: { from: "industry" } })}
              size="sm"
              className="gap-2 shrink-0 h-11 md:h-10"
            >
              <Plus className="h-4 w-4" />
              Submit
            </Button>
          </div>
        </Card>

        {/* AI Recommendations */}
        {visibleRecommendations.length > 0 && !showFavoritesOnly && (
          <Card className="p-4 md:p-6 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/30 shadow-md">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Sparkles className="h-5 w-5 text-accent" />
              <h2 className="text-base md:text-lg font-semibold">Recommended Partners</h2>
            </div>
            <div className="space-y-2 md:space-y-3">
              {visibleRecommendations.map((rec) => {
                const partner = partners.find(p =>
                  p.company_name.toLowerCase() === rec.title.toLowerCase() || p.id === rec.id
                );
                return (
                  <RecommendationCard
                    key={rec.id}
                    title={rec.title}
                    reason={rec.reason}
                    matchScore={rec.relevanceScore / 10}
                    tags={partner?.technology_focus_areas || rec.tags}
                    maxTags={2}
                    onClick={() => handleRecommendationClick(rec)}
                    onDismiss={() => dismiss(rec.id)}
                    compact
                  />
                );
              })}
            </div>
          </Card>
        )}

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Showing {filteredPartners.length} of {partners.length} partners
        </p>

        {/* Partner list */}
        <div className="space-y-3 md:space-y-4">
        {loading ? (
          <div className="space-y-3 md:space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 md:p-6 shadow-md border-border/50">
                <div className="flex items-start gap-3 md:gap-4">
                  <Skeleton className="w-14 h-14 md:w-16 md:h-16 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredPartners.length === 0 ? (
          <Card className="p-8 md:p-12 text-center shadow-md border-border/50">
            {showFavoritesOnly ? (
              <>
                <Star className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <h3 className="text-base md:text-lg font-semibold mb-2">No Favorites Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Mark industry partners as favorites to easily find them later
                </p>
                <Button onClick={() => setShowFavoritesOnly(false)} variant="outline" size="sm" className="h-11 md:h-10">
                  Browse All Partners
                </Button>
              </>
            ) : (
              <>
                <Building2 className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <h3 className="text-base md:text-lg font-semibold mb-2">No partners found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters or search query
                </p>
                <Button onClick={clearFilters} variant="outline" size="sm" className="h-11 md:h-10">
                  Clear Filters
                </Button>
              </>
            )}
          </Card>
        ) : (
          filteredPartners.map((partner) => {
            const favorited = isFavorite(partner.id);
            const isExpanded = expandedPartners.has(partner.id);
            return (
              <Collapsible key={partner.id} open={isExpanded} onOpenChange={() => toggleExpanded(partner.id)}>
                <Card id={`partner-${partner.id}`} className="shadow-md border-border/50 hover:shadow-lg transition-all duration-300">
                  <div className="p-4 md:p-6">
                    {/* Header row with logo, name, tags, and favorite */}
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl overflow-hidden bg-card flex items-center justify-center flex-shrink-0 border">
                        {partner.logo_url ? (
                          <img src={partner.logo_url} alt={partner.company_name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base md:text-lg font-semibold text-foreground line-clamp-1 mb-1">
                          {partner.company_name}
                        </h3>
                        {partner.technology_focus_areas.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {partner.technology_focus_areas.slice(0, 2).map(a => (
                              <Badge key={a} variant="secondary" className="text-xs py-0.5">{a}</Badge>
                            ))}
                            {partner.technology_focus_areas.length > 2 && (
                              <Badge variant="outline" className="text-xs py-0.5">
                                +{partner.technology_focus_areas.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-11 w-11 md:h-10 md:w-10 hover:bg-transparent active:bg-transparent"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(partner.id); }}
                      >
                        <Star className={cn(
                          "w-5 h-5 transition-colors",
                          favorited ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"
                        )} />
                      </Button>
                    </div>

                    {/* POC Info */}
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground mt-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-accent" />
                        <span className="truncate">
                          {(partner.poc_rank || partner.pocRank) && <span className="font-medium">{partner.poc_rank || partner.pocRank}</span>}
                          {(partner.poc_rank || partner.pocRank) && (partner.poc_first_name || partner.pocFirstName || partner.poc_last_name || partner.pocLastName) && ' '}
                          {(partner.poc_first_name || partner.pocFirstName || partner.poc_last_name || partner.pocLastName)
                            ? `${partner.poc_first_name || partner.pocFirstName || ''} ${partner.poc_last_name || partner.pocLastName || ''}`.trim()
                            : 'Contact available'}
                        </span>
                      </div>
                      {(partner.poc_email || partner.pocEmail) && (
                        <a
                          href={`mailto:${partner.poc_email || partner.pocEmail}`}
                          className="flex items-center gap-2 text-xs text-primary hover:underline ml-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="h-3 w-3" />
                          {partner.poc_email || partner.pocEmail}
                        </a>
                      )}
                    </div>

                    {/* Expandable content */}
                    <CollapsibleContent>
                      <div className="pt-4 mt-4 border-t border-border/50">
                        {partner.description && (
                          <p className="text-sm text-muted-foreground mb-4">{partner.description}</p>
                        )}

                        {partner.technology_focus_areas.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Technology Focus</p>
                            <div className="flex flex-wrap gap-2">
                              {partner.technology_focus_areas.map(a => (
                                <Badge key={a} variant="secondary" className="text-xs py-1">{a}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {partner.seeking.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Seeking</p>
                            <div className="flex flex-wrap gap-2">
                              {partner.seeking.map(i => (
                                <Badge key={i} variant="outline" className="text-xs py-1 px-2">{i}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {partner.collaboration_pitch && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Collaboration Pitch</p>
                            <div className="p-3 rounded-lg bg-muted/40 border border-dashed border-border/60">
                              <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                                {partner.collaboration_pitch}
                              </p>
                            </div>
                          </div>
                        )}

                        {partner.dod_sponsors && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">DoD Sponsors</p>
                            <p className="text-sm text-foreground">{partner.dod_sponsors}</p>
                          </div>
                        )}

                        {partner.booth_location && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                            <MapPin className="h-4 w-4 text-accent" />
                            <span>Booth: {partner.booth_location}</span>
                          </div>
                        )}

                        {/* Primary Contact Section */}
                        {!partner.hide_contact_info && partner.primary_contact_name && (
                          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Primary Contact</p>
                            <p className="text-sm font-medium text-foreground">{partner.primary_contact_name}</p>
                            {partner.primary_contact_title && <p className="text-xs text-muted-foreground mb-2">{partner.primary_contact_title}</p>}

                            <div className="flex flex-col gap-1.5 mt-2">
                              {partner.primary_contact_email && (
                                <a
                                  href={`mailto:${partner.primary_contact_email}`}
                                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Mail className="h-3 w-3" />
                                  {partner.primary_contact_email}
                                </a>
                              )}
                              {partner.primary_contact_phone && (
                                <a
                                  href={`tel:${partner.primary_contact_phone}`}
                                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="h-3 w-3" />
                                  {partner.primary_contact_phone}
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Team Members */}
                        {partner.team_members && Array.isArray(partner.team_members) && partner.team_members.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Team Members</p>
                            <div className="grid gap-2">
                              {partner.team_members.map((member: any, idx: number) => (
                                <div key={idx} className="text-sm p-2 bg-muted/30 rounded">
                                  <p className="font-medium text-foreground">{member.name || member}</p>
                                  {member.title && <p className="text-xs text-muted-foreground">{member.title}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {partner.website_url && (
                          <a
                            href={partner.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Visit Website
                          </a>
                        )}
                      </div>
                    </CollapsibleContent>

                    {/* Always visible footer with Message button and expand arrow */}
                    <div className="flex items-center gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex-1 flex flex-col items-center">
                        <Button
                          className={cn(
                            "w-full h-11 md:h-10 text-sm gap-2",
                            (partner.poc_is_checked_in || partner.pocIsCheckedIn)
                              ? "bg-primary hover:bg-primary/90"
                              : "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                          )}
                          onClick={() => handleContact(partner)}
                          disabled={!(partner.poc_is_checked_in || partner.pocIsCheckedIn)}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </Button>
                        {!(partner.poc_is_checked_in || partner.pocIsCheckedIn) && (
                          <span className="text-[10px] text-muted-foreground mt-1">POC is not at the Event</span>
                        )}
                      </div>
                      {partner.website_url && (
                        <Button variant="outline" size="icon" className="h-11 w-11 md:h-10 md:w-10" asChild>
                          <a href={partner.website_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-11 w-11 md:h-10 md:w-10">
                          <ChevronDown className={cn(
                            "h-5 w-5 text-muted-foreground transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </Card>
              </Collapsible>
            );
          })
        )}
        </div>
      </main>
    </div>
  );
}
