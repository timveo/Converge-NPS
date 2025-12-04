import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Bookmark, Star, Calendar, ChevronLeft } from 'lucide-react';

const mockOpportunities = [
  {
    id: '1',
    title: 'SBIR Phase I Funding',
    sponsor: 'Department of Defense',
    type: 'funding',
    deadline: '2026-03-15',
    amount: '$150,000',
    featured: true,
  },
  {
    id: '2',
    title: 'Summer Research Internship',
    sponsor: 'Naval Research Laboratory',
    type: 'internship',
    deadline: '2026-02-28',
    duration: '10 weeks',
    featured: false,
  },
];

export default function OpportunitiesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

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
                <h1 className="text-lg md:text-xl font-bold">Opportunities</h1>
                <p className="text-sm md:text-sm text-tech-cyan-light">
                  Browse funding, internships, and collaboration opportunities
                </p>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 md:px-4 mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" className="text-xs md:text-sm">
              All Opportunities
            </TabsTrigger>
            <TabsTrigger value="bookmarked" className="text-xs md:text-sm">
              <Bookmark className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Bookmarked
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 md:px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Opportunities List */}
      <main className="container mx-auto px-4 md:px-4 space-y-3 md:space-y-4">
        {mockOpportunities.map((opp) => (
          <Card key={opp.id} className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]">
            <div className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base md:text-lg font-semibold truncate">{opp.title}</h3>
                    {opp.featured && (
                      <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm md:text-sm text-muted-foreground">{opp.sponsor}</p>
                </div>
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <Bookmark className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className="text-xs md:text-sm">{opp.type}</Badge>
                  <Badge variant="outline" className="text-xs md:text-sm">
                    <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    {new Date(opp.deadline).toLocaleDateString()}
                  </Badge>
                  {'amount' in opp && (
                    <Badge variant="secondary" className="text-xs md:text-sm">{opp.amount}</Badge>
                  )}
                  {'duration' in opp && (
                    <Badge variant="secondary" className="text-xs md:text-sm">{opp.duration}</Badge>
                  )}
                </div>
                <Button size="sm">Express Interest</Button>
              </div>
            </div>
          </Card>
        ))}
      </main>
    </div>
  );
}
