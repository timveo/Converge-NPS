import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Star, MapPin, Building2 } from 'lucide-react';

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
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Industry Partners</h1>
          <p className="text-muted-foreground mt-1">
            Connect with exhibiting companies and organizations
          </p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search partners..."
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mockPartners.map((partner) => (
            <Card key={partner.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{partner.name}</CardTitle>
                    </div>
                    <CardDescription>{partner.description}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Star className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{partner.boothLocation}</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Technology Focus:</p>
                  <div className="flex flex-wrap gap-1">
                    {partner.techFocus.map((tech) => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Badge variant="outline">{partner.type}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
