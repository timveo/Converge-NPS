import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight, MessageCircle, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  fullName: string;
  organization?: string;
  department?: string;
  role?: string;
  avatarUrl?: string;
}

interface ParticipantsResponse {
  success: boolean;
  data: Participant[];
  total: number;
}

export function EventParticipantsWidget() {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchParticipants() {
      try {
        const response = await api.get<ParticipantsResponse>('/users/participants?limit=10');
        if (response.success && response.data) {
          setParticipants(response.data);
          setTotal(response.total || response.data.length);
        }
      } catch (error) {
        console.error('Failed to fetch participants:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchParticipants();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleMessage = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/messages', { state: { startConversationWithUserId: userId } });
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 shadow-sm">
          <Users className="h-8 w-8 text-primary/70" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">No participants checked in yet</p>
        <p className="text-xs text-muted-foreground/70">Participants will appear here as they check in</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with count */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <Badge variant="secondary" className="text-xs">
          {total} checked in
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary hover:text-primary/80 h-7 px-2"
          onClick={() => navigate('/connections?tab=participants')}
        >
          View All
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>

      {/* Scrollable participant list */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-1 pr-2">
          <AnimatePresence mode="popLayout">
            {participants.map((participant, index) => (
              <motion.button
                key={participant.id}
                className={cn(
                  'w-full text-left p-3 transition-all rounded-lg',
                  'hover:bg-accent/50 border border-transparent hover:border-border/50',
                  'group'
                )}
                onClick={() => navigate(`/connections?userId=${participant.id}`)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: index * 0.03 }}
                layout
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-sm font-semibold">
                      {getInitials(participant.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-medium truncate">
                        {participant.fullName}
                      </h4>
                      {participant.role && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 flex-shrink-0">
                          {participant.role}
                        </Badge>
                      )}
                    </div>
                    {participant.organization && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Building2 className="h-3 w-3 flex-shrink-0" />
                        {participant.organization}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => handleMessage(participant.id, e)}
                  >
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
