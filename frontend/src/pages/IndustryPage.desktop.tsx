import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Building2,
  MapPin,
  ExternalLink,
  Filter,
  X,
  Star,
  MessageSquare,
  Sparkles,
  Mail,
  Phone,
  Clock,
  ChevronRight,
  Users,
  Tag,
  Globe,
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
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useDismissedRecommendations } from '@/hooks/useDismissedRecommendations';
import { DesktopShell } from '@/components/desktop/DesktopShell';
import { ThreePanelLayout } from '@/components/desktop/layouts/ThreePanelLayout';

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
  'AI/ML',
  'Autonomy',
  'Cybersecurity',
  'Quantum',
  'Space',
  'Biotechnology',
  'Energy',
  'Materials Science',
  'Communications',
  'Electronic Warfare',
  'Robotics',
  'Data Analytics',
];

const SEEKING_OPTIONS = [
  'Research partnerships',
  'Student interns',
  'Pilot programs',
  'Data access',
  'Funding opportunities',
  'Technology licensing',
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
  technology_focus_areas: string[];
  dod_sponsors: string | null;
  seeking_collaboration: string[];
  booth_location: string | null;
  team_members: any;
  hide_contact_info: boolean | null;
  organization_type?: string | null;
}

export default function IndustryDesktopPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<IndustryPartner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTechAreas, setSelectedTechAreas] = useState<string[]>([]);
  const [selectedSeeking, setSelectedSeeking] = useState<string[]>([]);
  const [selectedDodSponsor, setSelectedDodSponsor] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('alphabetical');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<IndustryPartner | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const { dismiss, isDismissed } = useDismissedRecommendations('industry');

  const toggleFavorite = (partnerId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites((prev) => {
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
    if (!partner.primary_contact_email || partner.hide_contact_info) {
      console.info('Contact information not available');
      return;
    }

    try {
      const response = await api.post('/conversations', {
        email: partner.primary_contact_email,
      });
      const conversation = (response as any).data?.data || (response as any).data;
      if (conversation?.id) {
        navigate(`/messages/${conversation.id}`);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  // Extract unique DoD sponsors
  const dodSponsors = useMemo(() => {
    const sponsors = new Set<string>();
    partners.forEach((partner) => {
      if (partner.dod_sponsors) {
        partner.dod_sponsors
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((s) => sponsors.add(s));
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
    .filter((rec) => !isDismissed(rec.id))
    .slice(0, 3);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await api.get('/partners');
      const data = (response as any).data?.data || (response as any).data || [];

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
        technology_focus_areas: p.technologyFocusAreas || p.technology_focus_areas || [],
        dod_sponsors: p.dodSponsors || p.dod_sponsors,
        seeking_collaboration: p.seekingCollaboration || p.seeking_collaboration || [],
        booth_location: p.boothLocation || p.booth_location,
        team_members: p.teamMembers || p.team_members,
        hide_contact_info: p.hideContactInfo || p.hide_contact_info,
        organization_type: p.organizationType || p.organization_type,
      }));

      setPartners(mappedPartners);
    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = useMemo(() => {
    let filtered = [...partners];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.company_name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.technology_focus_areas.some((a) => a.toLowerCase().includes(q))
      );
    }

    if (selectedTechAreas.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTechAreas.some((t) => p.technology_focus_areas.includes(t))
      );
    }

    if (selectedSeeking.length > 0) {
      filtered = filtered.filter((p) =>
        selectedSeeking.some((s) => p.seeking_collaboration.includes(s))
      );
    }

    if (selectedDodSponsor) {
      filtered = filtered.filter((p) =>
        p.dod_sponsors
          ?.split(',')
          .map((s) => s.trim())
          .includes(selectedDodSponsor)
      );
    }

    if (activeTab === 'favorites') {
      filtered = filtered.filter((p) => isFavorite(p.id));
    }

    if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => a.company_name.localeCompare(b.company_name));
    } else if (sortBy === 'booth') {
      filtered.sort((a, b) => (a.booth_location || '').localeCompare(b.booth_location || ''));
    }

    return filtered;
  }, [
    partners,
    searchQuery,
    selectedTechAreas,
    selectedSeeking,
    selectedDodSponsor,
    activeTab,
    sortBy,
    favorites,
  ]);

  const toggleTechArea = (area: string) =>
    setSelectedTechAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );

  const toggleSeeking = (seeking: string) =>
    setSelectedSeeking((prev) =>
      prev.includes(seeking) ? prev.filter((s) => s !== seeking) : [...prev, seeking]
    );

  const clearFilters = () => {
    setSelectedTechAreas([]);
    setSelectedSeeking([]);
    setSearchQuery('');
    setSelectedDodSponsor('');
  };

  const activeFilterCount =
    selectedTechAreas.length + selectedSeeking.length + (selectedDodSponsor ? 1 : 0);

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
                placeholder="Company, technology..."
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
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
                <SelectItem value="booth">By Booth</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DoD Sponsor Filter */}
          {dodSponsors.length > 0 && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium mb-2 block">DoD Sponsor</Label>
                <Select
                  value={selectedDodSponsor || 'all'}
                  onValueChange={(val) => setSelectedDodSponsor(val === 'all' ? '' : val)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Sponsors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sponsors</SelectItem>
                    {dodSponsors.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Separator />

          {/* Technology Areas */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Technology Focus</Label>
            <div className="space-y-2">
              {TECHNOLOGY_AREAS.map((area) => (
                <div key={area} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`tech-${area}`}
                    checked={selectedTechAreas.includes(area)}
                    onChange={() => toggleTechArea(area)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={`tech-${area}`} className="cursor-pointer text-sm">
                    {area}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Seeking */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Seeking</Label>
            <div className="space-y-2">
              {SEEKING_OPTIONS.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`seek-${option}`}
                    checked={selectedSeeking.includes(option)}
                    onChange={() => toggleSeeking(option)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={`seek-${option}`} className="cursor-pointer text-sm">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  // Center Panel - Partners List
  const PartnersListPanel = (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center justify-between border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Industry Partners</h2>
            <p className="text-sm text-muted-foreground">{partners.length} partners</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'all' | 'favorites')}
        >
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1 text-sm">
              All Partners
              <Badge variant="secondary" className="ml-2 text-xs">
                {partners.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1 text-sm">
              <Star className="h-3 w-3 mr-1" />
              Favorites
              {favorites.size > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {favorites.size}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Partners List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Recommendations Section */}
          {visibleRecommendations.length > 0 && !loading && activeTab === 'all' && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Sparkles className="h-4 w-4 text-sky-500" />
                <span className="text-sm font-semibold text-foreground">Recommended Partners</span>
              </div>
              <div className="grid gap-2">
                {visibleRecommendations.map((rec) => {
                  const partner = partners.find(
                    (p) =>
                      p.company_name.toLowerCase() === rec.title.toLowerCase() || p.id === rec.id
                  );
                  const isSelected = partner && selectedPartner?.id === partner.id;
                  return (
                    <motion.button
                      key={rec.id}
                      className={cn(
                        'w-full text-left p-3 rounded-xl transition-all border',
                        'bg-sky-50',
                        isSelected
                          ? 'border-sky-300 shadow-md bg-sky-100'
                          : 'border-sky-200 hover:border-sky-300 hover:shadow-sm'
                      )}
                      onClick={() => partner && setSelectedPartner(partner)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                            <h4 className="font-medium text-sm line-clamp-1">{rec.title}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 pl-5">
                            {rec.reason}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismiss(rec.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <Separator className="my-4" />
            </div>
          )}

          {loading ? (
            <div className="space-y-2 px-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                {activeTab === 'favorites' ? (
                  <Star className="h-8 w-8 text-primary/70" />
                ) : (
                  <Building2 className="h-8 w-8 text-primary/70" />
                )}
              </div>
              <p className="font-medium text-sm">
                {activeTab === 'favorites' ? 'No favorites yet' : 'No partners found'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTab === 'favorites'
                  ? 'Mark partners as favorites to see them here'
                  : 'Try adjusting your filters'}
              </p>
              {activeFilterCount > 0 && activeTab === 'all' && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1 pr-0">
              <AnimatePresence mode="popLayout">
                {filteredPartners.map((partner) => {
                  const isSelected = selectedPartner?.id === partner.id;
                  const favorited = isFavorite(partner.id);

                  return (
                    <motion.button
                      key={partner.id}
                      className={cn(
                        'w-full text-left p-3 transition-all',
                        isSelected
                          ? 'bg-gray-100 rounded-l-lg rounded-r-none -mr-3 pr-6 border-y border-l border-gray-200'
                          : 'hover:bg-accent/5 rounded-lg border border-transparent'
                      )}
                      onClick={() => setSelectedPartner(partner)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      layout
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                          {partner.logo_url ? (
                            <img
                              src={partner.logo_url}
                              alt={partner.company_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-medium text-sm truncate">{partner.company_name}</h4>
                            {favorited && (
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {partner.technology_focus_areas.slice(0, 2).join(', ') ||
                              'No technologies listed'}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {partner.booth_location && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                {partner.booth_location}
                              </Badge>
                            )}
                            {partner.organization_type && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                {partner.organization_type}
                              </Badge>
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

  // Right Panel - Partner Detail
  const PartnerDetailPanel = selectedPartner ? (
    <div className="h-full flex flex-col bg-gray-100 border-l border-gray-200">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center justify-between border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Partner Details</h2>
            <p className="text-sm text-muted-foreground">View and connect</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => toggleFavorite(selectedPartner.id, e)}
          >
            <Star
              className={cn(
                'h-4 w-4',
                isFavorite(selectedPartner.id)
                  ? 'fill-amber-500 text-amber-500'
                  : 'text-muted-foreground'
              )}
            />
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleContact(selectedPartner)}
            disabled={selectedPartner.hide_contact_info || !selectedPartner.primary_contact_email}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Contact
          </Button>
        </div>
      </div>

      {/* Company Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
            {selectedPartner.logo_url ? (
              <img
                src={selectedPartner.logo_url}
                alt={selectedPartner.company_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl text-foreground">{selectedPartner.company_name}</h3>
            {selectedPartner.organization_type && (
              <Badge variant="secondary" className="text-xs mt-1">
                {selectedPartner.organization_type}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Description */}
          {selectedPartner.description && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">About</Label>
              <p className="text-sm leading-relaxed">{selectedPartner.description}</p>
            </div>
          )}

          {/* Info */}
          <div className="space-y-3">
            {selectedPartner.booth_location && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-md bg-white border border-gray-200">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Booth Location</p>
                  <p className="font-medium">{selectedPartner.booth_location}</p>
                </div>
              </div>
            )}

            {selectedPartner.website_url && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-md bg-white border border-gray-200">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Website</p>
                  <a
                    href={selectedPartner.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    Visit Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {selectedPartner.dod_sponsors && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-md bg-white border border-gray-200">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">DoD Sponsors</p>
                  <p className="font-medium">{selectedPartner.dod_sponsors}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Technology Focus */}
          {selectedPartner.technology_focus_areas.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Technology Focus
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedPartner.technology_focus_areas.map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Seeking */}
          {selectedPartner.seeking_collaboration.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Seeking Collaboration</Label>
              <div className="flex flex-wrap gap-2">
                {selectedPartner.seeking_collaboration.map((item) => (
                  <Badge key={item} variant="outline" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Primary Contact */}
          {!selectedPartner.hide_contact_info && selectedPartner.primary_contact_name && (
            <div>
              <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Primary Contact
              </Label>
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <p className="font-medium text-sm">{selectedPartner.primary_contact_name}</p>
                {selectedPartner.primary_contact_title && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {selectedPartner.primary_contact_title}
                  </p>
                )}
                <div className="space-y-2">
                  {selectedPartner.primary_contact_email && (
                    <a
                      href={`mailto:${selectedPartner.primary_contact_email}`}
                      className="flex items-center gap-2 text-xs text-primary hover:underline"
                    >
                      <Mail className="h-3 w-3" />
                      {selectedPartner.primary_contact_email}
                    </a>
                  )}
                  {selectedPartner.primary_contact_phone && (
                    <a
                      href={`tel:${selectedPartner.primary_contact_phone}`}
                      className="flex items-center gap-2 text-xs text-primary hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {selectedPartner.primary_contact_phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Team Members */}
          {selectedPartner.team_members &&
            Array.isArray(selectedPartner.team_members) &&
            selectedPartner.team_members.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-3 block">Team Members</Label>
                <div className="space-y-2">
                  {selectedPartner.team_members.map((member: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg">
                      <p className="font-medium text-sm">{member.name || member}</p>
                      {member.title && (
                        <p className="text-xs text-muted-foreground">{member.title}</p>
                      )}
                    </div>
                  ))}
                </div>
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
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Partner Details</h2>
            <p className="text-sm text-muted-foreground">View and connect</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-primary/70" />
          </div>
          <p className="font-medium">Select a partner</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click on a partner to view details
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
          <h1 className="text-2xl font-bold">Industry Partnerships</h1>
        </div>

        <div className="flex-1 overflow-hidden">
          <ThreePanelLayout
            left={FiltersPanel}
            center={PartnersListPanel}
            right={PartnerDetailPanel}
            leftWidth="260px"
            equalCenterRight
            connectedPanels={!!selectedPartner}
          />
        </div>
      </div>
    </DesktopShell>
  );
}
