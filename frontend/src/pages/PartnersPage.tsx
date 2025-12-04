import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Star, MapPin, Building2, ChevronLeft } from 'lucide-react';

const mockPartners = [
  {
    id: '1',
    name: 'Lockheed Martin',
    description: 'Global security and aerospace company',
    type: 'Large Defense Contractor',
    techFocus: ['AI/ML', 'Autonomous Systems'],
    boothLocation: 'Booth A-12',
  },
  {
    id: '2',
    name: 'Shield AI',
    description: 'AI-powered autonomous systems for defense',
    type: 'Startup',
    techFocus: ['AI/ML', 'Robotics'],
    boothLocation: 'Booth B-8',
  },
];

export default function PartnersPage() {
  const [searchTerm, setSearchTerm] = useState('');

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
        {mockPartners.map((partner) => (
          <Card key={partner.id} className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]">
            <div className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="text-base md:text-lg font-semibold truncate">{partner.name}</h3>
                  </div>
                  <p className="text-sm md:text-sm text-muted-foreground">{partner.description}</p>
                </div>
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <Star className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-3">
                <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                <span>{partner.boothLocation}</span>
              </div>

              <div className="mb-3">
                <p className="text-xs md:text-sm text-muted-foreground mb-2">Technology Focus:</p>
                <div className="flex flex-wrap gap-1 md:gap-2">
                  {partner.techFocus.map((tech) => (
                    <Badge key={tech} variant="secondary" className="text-xs md:text-sm">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>

              <Badge variant="outline" className="text-xs md:text-sm">{partner.type}</Badge>
            </div>
          </Card>
        ))}
      </main>
    </div>
  );
}
