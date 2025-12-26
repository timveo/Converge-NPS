import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Users,
  Building2,
  Mail,
  Linkedin,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProjectInterest {
  id: string;
  createdAt: string;
  message?: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    organization?: string;
    department?: string;
    role?: string;
    linkedinUrl?: string;
  };
}

interface ProjectData {
  id: string;
  title: string;
  stage: string;
  interestedCount: number;
}

interface ProjectInterestsResponse {
  success: boolean;
  data: {
    project: ProjectData;
    interests: ProjectInterest[];
    count: number;
  };
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  faculty: '#3b82f6',
  student: '#10b981',
  industry: '#f59e0b',
  staff: '#8b5cf6',
};

export default function ProjectInterestsPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [interests, setInterests] = useState<ProjectInterest[]>([]);

  useEffect(() => {
    if (!user?.roles?.includes('admin')) {
      toast.error('Admin access required');
      navigate('/');
      return;
    }

    if (projectId) {
      fetchInterests();
    }
  }, [user, navigate, projectId]);

  const fetchInterests = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const response = await api.get<ProjectInterestsResponse>(
        `/admin/projects/${projectId}/interests`
      );
      if (response.success && response.data) {
        setProject(response.data.project);
        setInterests(response.data.interests);
      }
    } catch (error) {
      console.error('Failed to fetch project interests:', error);
      toast.error('Failed to load interested participants');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container mx-auto px-3 pt-2">
          <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-10 rounded-lg mb-4">
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-11 w-11 rounded bg-white/20" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 bg-white/20 mb-1" />
                  <Skeleton className="h-4 w-32 bg-white/20" />
                </div>
              </div>
            </div>
          </header>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="container mx-auto px-3 pt-2">
        <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-10 rounded-lg">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-white hover:bg-white/20 h-11 w-11"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Interested Participants
                </h1>
                {project && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-blue-200 truncate">{project.title}</p>
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white">
                      {project.stage}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-3 py-4 space-y-3">
        {/* Count summary */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {interests.length} participant{interests.length !== 1 ? 's' : ''} interested
          </span>
        </div>

        {interests.length > 0 ? (
          <div className="space-y-3">
            {interests.map((interest) => (
              <Card
                key={interest.id}
                className="p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback
                      className="text-white text-sm"
                      style={{
                        backgroundColor:
                          ROLE_COLORS[interest.user.role || ''] || '#6b7280',
                      }}
                    >
                      {getInitials(interest.user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {interest.user.fullName}
                      </span>
                      {interest.user.role && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: ROLE_COLORS[interest.user.role] || '#6b7280',
                            color: ROLE_COLORS[interest.user.role] || '#6b7280',
                          }}
                        >
                          {interest.user.role}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      {interest.user.organization && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {interest.user.organization}
                        </span>
                      )}
                      {interest.user.department && (
                        <span className="text-muted-foreground/70">
                          {interest.user.department}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <a
                        href={`mailto:${interest.user.email}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        Email
                      </a>
                      {interest.user.linkedinUrl && (
                        <a
                          href={interest.user.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <Linkedin className="h-3 w-3" />
                          LinkedIn
                        </a>
                      )}
                    </div>

                    {interest.message && (
                      <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded border">
                        "{interest.message}"
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground/70 mt-2">
                      Expressed interest: {getTimeAgo(interest.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                No participants interested in this project yet
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
