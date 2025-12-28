import { useState, useEffect } from 'react';
import { Users, Building2, Mail, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface ProjectInterestsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectTitle?: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  faculty: '#3b82f6',
  student: '#10b981',
  industry: '#f59e0b',
  staff: '#8b5cf6',
};

export function ProjectInterestsModal({
  open,
  onOpenChange,
  projectId,
  projectTitle,
}: ProjectInterestsModalProps) {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [interests, setInterests] = useState<ProjectInterest[]>([]);

  useEffect(() => {
    if (open && projectId) {
      fetchInterests();
    }
  }, [open, projectId]);

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
      toast.error('Failed to load favorites');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Participants Who Favorited
          </DialogTitle>
          {(project || projectTitle) && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Project:</span>
              <span className="text-sm font-medium">{project?.title || projectTitle}</span>
              {project?.stage && (
                <Badge variant="outline" className="text-xs">
                  {project.stage}
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : interests.length > 0 ? (
            <div className="space-y-3">
              {interests.map((interest) => (
                <div
                  key={interest.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Avatar className="h-10 w-10">
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

                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
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

                    <div className="flex items-center gap-2 mt-2">
                      <a
                        href={`mailto:${interest.user.email}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {interest.user.email}
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
                      <p className="text-sm text-muted-foreground mt-2 p-2 bg-background rounded border">
                        "{interest.message}"
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground/70 mt-2">
                      Favorited: {getTimeAgo(interest.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No one has favorited this project yet</p>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {interests.length} participant{interests.length !== 1 ? 's' : ''} favorited
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
