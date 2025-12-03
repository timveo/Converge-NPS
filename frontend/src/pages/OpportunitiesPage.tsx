import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Bookmark, Star } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'all' | 'bookmarked'>('all');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Opportunities</h1>
          <p className="text-gray-600 mt-1">
            Browse funding, internships, and collaboration opportunities
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveTab('all')}
          >
            All Opportunities
          </Button>
          <Button
            variant={activeTab === 'bookmarked' ? 'default' : 'outline'}
            onClick={() => setActiveTab('bookmarked')}
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Bookmarked
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search opportunities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {mockOpportunities.map((opp) => (
            <Card key={opp.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{opp.title}</CardTitle>
                      {opp.featured && (
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <CardDescription>{opp.sponsor}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Bookmark className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge>{opp.type}</Badge>
                  <Badge variant="outline">
                    Deadline: {new Date(opp.deadline).toLocaleDateString()}
                  </Badge>
                  {'amount' in opp && (
                    <Badge variant="secondary">{opp.amount}</Badge>
                  )}
                  {'duration' in opp && (
                    <Badge variant="secondary">{opp.duration}</Badge>
                  )}
                </div>
                <Button>Express Interest</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
