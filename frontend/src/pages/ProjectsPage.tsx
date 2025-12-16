import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Bookmark, FlaskConical } from 'lucide-react';

const mockProjects = [
  {
    id: '1',
    title: 'Autonomous Underwater Navigation',
    pi: 'Dr. Sarah Johnson',
    department: 'Mechanical Engineering',
    stage: 'active',
    researchAreas: ['Robotics', 'AI/ML'],
    seeking: ['Industry Partners', 'Funding'],
  },
  {
    id: '2',
    title: 'Cybersecurity for IoT Devices',
    pi: 'Dr. Michael Chen',
    department: 'Computer Science',
    stage: 'proposal',
    researchAreas: ['Cybersecurity', 'IoT'],
    seeking: ['Students', 'Funding'],
  },
];

export default function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Research Projects</h1>
          <p className="text-muted-foreground mt-1">
            Discover NPS research and collaboration opportunities
          </p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
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
          {mockProjects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FlaskConical className="w-5 h-5 text-purple-600" />
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                    </div>
                    <CardDescription>
                      {project.pi} • {project.department}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Bookmark className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Research Areas:</p>
                  <div className="flex flex-wrap gap-1">
                    {project.researchAreas.map((area) => (
                      <Badge key={area} variant="secondary">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Seeking:</p>
                  <div className="flex flex-wrap gap-1">
                    {project.seeking.map((item) => (
                      <Badge key={item} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button className="w-full">Express Interest</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
