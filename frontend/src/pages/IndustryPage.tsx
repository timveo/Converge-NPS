import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, Search, Building2, MapPin, ExternalLink, Filter, X, Star, ChevronDown, MessageSquare, Plus, Sparkles, Mail, Phone, Users } from "lucide-react";
import { useDismissedRecommendations } from "@/hooks/useDismissedRecommendations";
import { offlineDataCache } from "@/lib/offlineDataCache";
import { OfflineDataBanner } from "@/components/OfflineDataBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

const TECHNOLOGY_AREAS = ["AI/ML", "Autonomy", "Cybersecurity", "Quantum", "Space", "Biotechnology", "Energy", "Materials Science", "Communications", "Electronic Warfare", "Robotics", "Data Analytics"];
const SEEKING_OPTIONS = ["Research partnerships", "Student interns", "Pilot programs", "Data access", "Funding opportunities", "Technology licensing"];

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
  technology_focus_areas: string[];
  dod_sponsors: string | null;
  seeking_collaboration: string[];
  booth_location: string | null;
  team_members: any;
  hide_contact_info: boolean | null;
  organization_type?: string | null;
  poc_user_id?: string | null;
  poc_first_name?: string | null;
  poc_last_name?: string | null;
  poc_email?: string | null;
  poc_rank?: string | null;
  pocUserId?: string | null;
  pocFirstName?: string | null;
  pocLastName?: string | null;
  pocEmail?: string | null;
  pocRank?: string | null;
}

export default function IndustryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<IndustryPartner[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTechAreas, setSelectedTechAreas] = useState<string[]>([]);
  const [selectedSeeking, setSelectedSeeking] = useState<string[]>([]);
  const [selectedDodSponsor, setSelectedDodSponsor] = useState<string>("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>("alphabetical");
  const [showFilters, setShowFilters] = useState(false);
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
        seeking_collaboration: p.seekingCollaboration || p.seeking_collaboration || [],
        booth_location: p.boothLocation || p.booth_location,
        team_members: p.teamMembers || p.team_members,
        hide_contact_info: p.hideContactInfo || p.hide_contact_info,
        organization_type: p.organizationType || p.organization_type || p.partnershipType || p.partnership_type,
        poc_user_id: p.pocUserId || p.poc_user_id,
        poc_first_name: p.pocFirstName || p.poc_first_name,
        poc_last_name: p.pocLastName || p.poc_last_name,
        poc_email: p.pocEmail || p.poc_email,
        poc_rank: p.pocRank || p.poc_rank
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
      filtered = filtered.filter(p => selectedTechAreas.some(t => p.technology_focus_areas.includes(t)));
    }

    if (selectedSeeking.length > 0) {
      filtered = filtered.filter(p => selectedSeeking.some(s => p.seeking_collaboration.includes(s)));
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
    <div className="min-h-screen bg-gradient-subtle pb-24">
      <div className="container mx-auto px-3 md:px-4 pt-2 md:pt-4">
        <header className="bg-gradient-navy text-primary-foreground shadow-lg sticky top-0 z-10 rounded-lg">
          <div className="px-4 md:px-4 py-3 md:py-4">
            <div className="flex items-center gap-3 md:gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/20 h-11 w-11 md:h-10 md:w-10">
                  <ChevronLeft className="h-5 w-5 md:h-5 md:w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg md:text-xl font-bold">Meet Industry</h1>
                <p className="text-sm md:text-sm text-tech-cyan-light">{partners.length} Partners Present</p>
              </div>
            </div>
          </div>
        </header>
      </div>

      <div className="container mx-auto px-4 md:px-4 pt-3 md:pt-4">
        <OfflineDataBanner />
      </div>

      <div className="container mx-auto px-4 md:px-4 pt-3 md:pt-4 space-y-3 md:space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-4 md:w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search companies, technologies..."
            className="pl-10 md:pl-10 h-11 md:h-10 text-base"
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
      </div>

      <div className="container mx-auto px-4 md:px-4 py-3 md:py-4 space-y-3">
        {/* Filter buttons */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-sm h-11 md:h-10"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="gap-2 text-sm md:text-sm h-11 md:h-10"
          >
            <Star className={cn("w-4 h-4 md:w-4 md:h-4", showFavoritesOnly && "fill-current")} />
            <span className="hidden sm:inline">Favorites</span>
            {favorites.size > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs md:text-xs">{favorites.size}</Badge>
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

        {/* Expandable Inline Filter Panel */}
        {showFilters && (
          <Card className="mt-3">
            <CardContent className="pt-4 pb-4 space-y-4">
              <div>
                <Label className="text-xs font-semibold">Filter by DoD Sponsor</Label>
                <Select value={selectedDodSponsor || "all"} onValueChange={(val) => setSelectedDodSponsor(val === "all" ? "" : val)}>
                  <SelectTrigger className="mt-2 h-11 md:h-10">
                    <SelectValue placeholder="All Sponsors" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">All Sponsors</SelectItem>
                    {dodSponsors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Filter by Technology</Label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                  {TECHNOLOGY_AREAS.map(area => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tech-${area}`}
                        checked={selectedTechAreas.includes(area)}
                        onCheckedChange={() => toggleTechArea(area)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`tech-${area}`} className="text-xs cursor-pointer font-normal">{area}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Filter by Seeking</Label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                  {SEEKING_OPTIONS.map(s => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox
                        id={`seek-${s}`}
                        checked={selectedSeeking.includes(s)}
                        onCheckedChange={() => toggleSeeking(s)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`seek-${s}`} className="text-xs cursor-pointer font-normal">{s}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active filter badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 md:gap-2 mt-3 md:mt-3">
            {showFavoritesOnly && (
              <Badge variant="default" className="gap-1 bg-yellow-500 text-xs md:text-xs py-1.5">
                <Star className="w-3 h-3 md:w-3 md:h-3 fill-current" />
                Favorites
                <X className="h-3 w-3 md:h-3 md:w-3 cursor-pointer ml-1" onClick={() => setShowFavoritesOnly(false)} />
              </Badge>
            )}
            {selectedDodSponsor && (
              <Badge variant="secondary" className="gap-1 text-xs md:text-xs py-1.5">
                DoD: {selectedDodSponsor}
                <X className="h-3 w-3 md:h-3 md:w-3 cursor-pointer ml-1" onClick={() => setSelectedDodSponsor("")} />
              </Badge>
            )}
            {selectedTechAreas.map(area => (
              <Badge key={area} variant="secondary" className="gap-1 text-xs md:text-xs py-1.5">
                {area}
                <X className="h-3 w-3 md:h-3 md:w-3 cursor-pointer" onClick={() => toggleTechArea(area)} />
              </Badge>
            ))}
            {selectedSeeking.map(s => (
              <Badge key={s} variant="outline" className="gap-1 text-xs md:text-xs py-1.5">
                {s}
                <X className="h-3 w-3 md:h-3 md:w-3 cursor-pointer" onClick={() => toggleSeeking(s)} />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs px-2">
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Submit Industry Partner CTA */}
      <div className="container mx-auto px-4 md:px-4 mb-3 md:mb-4">
        <Card className="p-3 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Share your project or opportunity</p>
            <Button
              onClick={() => navigate('/opportunities/submit', { state: { from: "industry" } })}
              size="sm"
              className="gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Submit
            </Button>
          </div>
        </Card>
      </div>

      {/* AI Recommendations */}
      {visibleRecommendations.length > 0 && !showFavoritesOnly && (
        <div className="container mx-auto px-4 md:px-4 mb-3 md:mb-4">
          <Card className="p-4 md:p-6 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/30">
            <div className="flex items-center gap-2 md:gap-2 mb-3 md:mb-4">
              <Sparkles className="h-5 w-5 md:h-5 md:w-5 text-accent" />
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
        </div>
      )}

      {/* Results count */}
      <div className="container mx-auto px-4 md:px-4 mb-3 md:mb-4">
        <p className="text-sm md:text-sm text-muted-foreground">
          Showing {filteredPartners.length} of {partners.length} partners
        </p>
      </div>

      {/* Partner list */}
      <main className="container mx-auto px-4 md:px-4 space-y-3 md:space-y-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 md:p-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <Skeleton className="w-12 h-12 md:w-16 md:h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
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
          <Card className="p-8 md:p-12 text-center">
            {showFavoritesOnly ? (
              <>
                <Star className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 md:mb-4 text-muted-foreground" />
                <h3 className="text-sm md:text-lg font-semibold mb-2">No Favorites Yet</h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                  Mark industry partners as favorites to easily find them later
                </p>
                <Button onClick={() => setShowFavoritesOnly(false)} variant="outline" size="sm">
                  Browse All Partners
                </Button>
              </>
            ) : (
              <>
                <Building2 className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 md:mb-4 text-muted-foreground" />
                <h3 className="text-sm md:text-lg font-semibold mb-2">No partners found</h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                  Try adjusting your filters or search query
                </p>
                <Button onClick={clearFilters} variant="outline" size="sm">
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
                        className="shrink-0 h-11 w-11 md:h-10 md:w-10"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(partner.id); }}
                      >
                        <Star className={cn(
                          "w-5 h-5 transition-colors",
                          favorited ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"
                        )} />
                      </Button>
                    </div>

                    {/* POC Info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {(partner.poc_rank || partner.pocRank) && <span className="font-medium">{partner.poc_rank || partner.pocRank}</span>}
                        {(partner.poc_rank || partner.pocRank) && (partner.poc_first_name || partner.pocFirstName || partner.poc_last_name || partner.pocLastName) && ' '}
                        {(partner.poc_first_name || partner.pocFirstName || partner.poc_last_name || partner.pocLastName)
                          ? `${partner.poc_first_name || partner.pocFirstName || ''} ${partner.poc_last_name || partner.pocLastName || ''}`.trim()
                          : 'Unknown'}
                      </span>
                    </div>

                    {/* Expandable content */}
                    <CollapsibleContent>
                      <div className="pt-4 mt-4 border-t border-border/50">
                        {partner.description && (
                          <p className="text-sm text-muted-foreground mb-4">{partner.description}</p>
                        )}

                        {partner.organization_type && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Organization Type</p>
                            <Badge variant="default" className="text-xs">{partner.organization_type}</Badge>
                          </div>
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

                        {partner.seeking_collaboration.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Seeking</p>
                            <div className="flex flex-wrap gap-2">
                              {partner.seeking_collaboration.map(i => (
                                <Badge key={i} variant="outline" className="text-xs py-1">{i}</Badge>
                              ))}
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

                    {/* Always visible footer with Contact button and expand arrow */}
                    <div className="flex items-center gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      <Button className="flex-1 h-11 md:h-10 text-sm gap-2" onClick={() => handleContact(partner)}>
                        <MessageSquare className="h-4 w-4" />
                        Contact
                      </Button>
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
      </main>
    </div>
  );
}
