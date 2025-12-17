import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  otherUser?: {
    id: string;
    fullName: string;
    organization?: string;
  };
  lastMessage?: {
    content: string;
    sentAt: string;
    senderId: string;
  };
  unreadCount: number;
}

export function RecentMessagesWidget() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConversations() {
      try {
        const response = await api.get<{ success: boolean; data: Conversation[] }>(
          '/messages/conversations'
        );
        if (response.success && response.data) {
          setConversations(response.data.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 shadow-sm">
          <MessageCircle className="h-8 w-8 text-primary/70" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">No messages yet</p>
        <p className="text-xs text-muted-foreground/70 mb-5">Connect with attendees to start conversations</p>
        <Link to="/connections">
          <Button size="sm" className="gap-2 shadow-sm hover:shadow-md transition-shadow">
            <MessageCircle className="h-4 w-4" />
            Find Connections
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation, index) => {
        const isUnread = conversation.unreadCount > 0;

        return (
          <motion.div
            key={conversation.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <button
              onClick={() => navigate(`/messages/${conversation.id}`)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border',
                'hover:shadow-md text-left',
                isUnread
                  ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-sm'
                  : 'border-border/50 hover:border-primary/20 hover:bg-muted/30'
              )}
            >
              <Avatar className={cn(
                'h-11 w-11 border-2 transition-all',
                isUnread ? 'border-primary ring-2 ring-primary/20' : 'border-muted'
              )}>
                <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                  {conversation.otherUser?.fullName
                    ? getInitials(conversation.otherUser.fullName)
                    : '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'text-sm truncate',
                      isUnread ? 'font-bold text-foreground' : 'font-medium'
                    )}
                  >
                    {conversation.otherUser?.fullName || 'Unknown'}
                  </span>
                  {isUnread && (
                    <Badge className="bg-primary text-white text-xs h-5 px-2">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
                <p
                  className={cn(
                    'text-xs truncate mt-0.5',
                    isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                >
                  {conversation.lastMessage?.content || 'No messages'}
                </p>
                {conversation.lastMessage && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(conversation.lastMessage.sentAt), {
                      addSuffix: true,
                    })}
                  </p>
                )}
              </div>
            </button>
          </motion.div>
        );
      })}

      <Link
        to="/messages"
        className="flex items-center justify-center gap-2 py-3 mt-2 text-sm font-medium text-primary hover:text-primary/80 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors"
      >
        View all messages
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
