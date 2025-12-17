import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, ChevronRight, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Connection {
  id: string;
  connectedUser: {
    id: string;
    fullName: string;
    organization?: string;
  };
  collaborativeIntent?: string;
  connectedAt: string;
  isRecommendation?: boolean;
  matchScore?: number;
}

export function ConnectionsWidget() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConnections() {
      try {
        const response = await api.get<{ success: boolean; data: Connection[] }>('/connections');
        if (response.success && response.data) {
          // Sort by most recent and take first 5
          const sorted = response.data
            .sort((a, b) => new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime())
            .slice(0, 5);
          setConnections(sorted);
        }
      } catch (error) {
        console.error('Failed to fetch connections:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchConnections();
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 shadow-sm">
          <Users className="h-8 w-8 text-primary/70" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">No connections yet</p>
        <p className="text-xs text-muted-foreground/70">Scan badges to build your network</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {connections.map((connection, index) => (
        <motion.div
          key={connection.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <div
            className={cn(
              'flex flex-col items-center p-4 rounded-xl transition-all duration-200 border-2 border-border/50',
              'hover:shadow-lg hover:border-primary/30 cursor-pointer bg-gradient-to-b from-white to-muted/20',
              'group'
            )}
            onClick={() => navigate(`/connections?id=${connection.id}`)}
          >
            <Avatar className="h-14 w-14 mb-3 border-2 border-primary/20 group-hover:border-primary/40 transition-colors">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-lg font-semibold">
                {getInitials(connection.connectedUser.fullName)}
              </AvatarFallback>
            </Avatar>

            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-sm font-semibold truncate max-w-[120px]">
                  {connection.connectedUser.fullName}
                </span>
                {connection.isRecommendation && (
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                )}
              </div>
              {connection.connectedUser.organization && (
                <p className="text-xs text-muted-foreground truncate mb-2">
                  {connection.connectedUser.organization}
                </p>
              )}
              <div className="flex flex-col items-center gap-1.5">
                {connection.collaborativeIntent && (
                  <Badge variant="secondary" className="text-xs py-0.5 px-2">
                    {connection.collaborativeIntent}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground/70">
                  {formatDistanceToNow(new Date(connection.connectedAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full gap-1.5 h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => handleMessage(connection.connectedUser.id, e)}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Message
            </Button>
          </div>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: connections.length * 0.05 }}
      >
        <Link
          to="/connections"
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-all h-full min-h-[180px] group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
            <ChevronRight className="h-6 w-6 text-primary" />
          </div>
          <span className="text-sm font-medium text-primary">View All</span>
          <span className="text-xs text-primary/70">Connections</span>
        </Link>
      </motion.div>
    </div>
  );
}
