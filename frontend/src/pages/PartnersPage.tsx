import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Star, MapPin, Building2, ChevronLeft, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Partner {
  id: string;
  name: string;
  description?: string;
  partnership_type?: string;
  research_areas?: string[];
  website_url?: string;
  logo_url?: string;
  is_featured?: boolean;
  poc_user_id?: string;
  poc_first_name?: string;
  poc_last_name?: string;
  poc_email?: string;
  poc_rank?: string;
  isFavorited?: boolean;
}

export default function PartnersPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritingIds, setFavoritingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const response = await api.get('/partners');
      const data = (response as any).data?.data || (response as any).data || [];

      // Map backend camelCase to frontend snake_case
      const mappedPartners = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        partnership_type: p.organizationType,
        research_areas: p.researchAreas || [],
        website_url: p.websiteUrl,
        logo_url: p.logoUrl,
        is_featured: p.isFeatured,
        poc_user_id: p.pocUserId,
        poc_first_name: p.pocFirstName,
        poc_last_name: p.pocLastName,
        poc_email: p.pocEmail,
        poc_rank: p.pocRank,
        isFavorited: p.isFavorited || false,
      }));

      setPartners(mappedPartners);
    } catch (error) {
      console.error('Failed to load partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (partnerId: string, currentlyFavorited: boolean) => {
    if (!user) {
      toast.error('Please sign in to favorite partners');
      return;
    }

    if (favoritingIds.has(partnerId)) {
      return; // Prevent duplicate requests
    }

    setFavoritingIds(prev => new Set(prev).add(partnerId));

    try {
      if (currentlyFavorited) {
        await api.delete(`/partners/${partnerId}/favorite`);
        toast.success('Partner removed from favorites');
      } else {
        await api.post(`/partners/${partnerId}/favorite`);
        toast.success('Partner added to favorites');
      }

      // Update local state
      setPartners(prev =>
        prev.map(p =>
          p.id === partnerId ? { ...p, isFavorited: !currentlyFavorited } : p
        )
      );
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Failed to update favorite';
      toast.error(message);
    } finally {
      setFavoritingIds(prev => {
        const next = new Set(prev);
        next.delete(partnerId);
        return next;
      });
    }
  };

  const filteredPartners = partners.filter(partner =>
    partner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.research_areas?.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      {/* Header */}
      <div className="container mx-auto px-4 md:px-4 pt-3 md:pt-4">
        <header className="bg-gradient-navy text-primary-foreground shadow-lg rounded-lg mb-4">
          <div className="px-4 md:px-4 py-3 md:py-4">
            <div className="flex items-center gap-3 md:gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="h-11 w-11 md:h-10 md:w-10 text-primary-foreground hover:bg-primary/20">
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-lg md:text-xl font-bold">Industry Partners</h1>
                <p className="text-sm md:text-sm text-tech-cyan-light">
                  Connect with exhibiting companies and organizations
                </p>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 md:px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search partners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Partners List */}
      <main className="container mx-auto px-4 md:px-4 space-y-3 md:space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 md:p-6">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredPartners.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Partners Found</h3>
            <p className="text-muted-foreground">Try adjusting your search</p>
          </Card>
        ) : (
          filteredPartners.map((partner) => (
            <Card key={partner.id} className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]">
              <div className="p-4 md:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <h3 className="text-base md:text-lg font-semibold truncate">{partner.name}</h3>
                      {partner.is_featured && (
                        <Badge className="bg-tech-cyan-DEFAULT text-background shrink-0 text-xs">Featured</Badge>
                      )}
                    </div>
                    <p className="text-sm md:text-sm text-muted-foreground">{partner.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(partner.id, partner.isFavorited || false);
                    }}
                    disabled={favoritingIds.has(partner.id)}
                  >
                    <Star
                      className={cn(
                        "w-4 h-4 md:w-5 md:h-5 transition-colors",
                        partner.isFavorited
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {partner.poc_rank && <span className="font-medium">{partner.poc_rank}</span>}
                    {partner.poc_rank && (partner.poc_first_name || partner.poc_last_name) && ' '}
                    {partner.poc_first_name || partner.poc_last_name
                      ? `${partner.poc_first_name || ''} ${partner.poc_last_name || ''}`.trim()
                      : 'Unknown'}
                  </span>
                </div>

                {partner.website_url && (
                  <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-3">
                    <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                    <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                      {partner.website_url}
                    </a>
                  </div>
                )}

                {partner.research_areas && partner.research_areas.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs md:text-sm text-muted-foreground mb-2">Technology Focus:</p>
                    <div className="flex flex-wrap gap-1 md:gap-2">
                      {partner.research_areas.map((area) => (
                        <Badge key={area} variant="secondary" className="text-xs md:text-sm">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {partner.partnership_type && (
                  <Badge variant="outline" className="text-xs md:text-sm">{partner.partnership_type}</Badge>
                )}
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
