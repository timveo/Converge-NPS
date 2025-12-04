import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Search, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    organization?: string;
  };
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
  lastMessageAt: string;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/conversations');
      setConversations(response.data.data);
    } catch (error) {
      console.error('Failed to fetch conversations', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayName = (user: { fullName: string; organization?: string }) => {
    return user.fullName;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
                <h1 className="text-lg md:text-xl font-bold">Messages</h1>
                <p className="text-sm md:text-sm text-tech-cyan-light">
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 md:px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          />
        </div>
      </div>

      {/* Conversations List */}
      <main className="container mx-auto px-4 md:px-4 space-y-3 md:space-y-4">
        {filteredConversations.length === 0 ? (
          <Card className="text-center py-12 md:py-16">
            <MessageCircle className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2">
              No conversations yet
            </h3>
            <p className="text-sm md:text-sm text-muted-foreground">
              Start connecting with people at the event!
            </p>
          </Card>
        ) : (
          filteredConversations.map((conversation) => {
            const isUnread = conversation.unreadCount > 0;
            return (
              <Card
                key={conversation.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md active:scale-[0.98]",
                  isUnread && "border-accent shadow-sm"
                )}
                onClick={() => navigate(`/messages/${conversation.id}`)}
              >
                <div className="p-3 md:p-4 flex items-start gap-3">
                  <Avatar className="h-12 w-12 md:h-14 md:w-14 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-base md:text-lg">
                      {getDisplayName(conversation.otherUser).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className={`font-semibold truncate text-sm md:text-base ${isUnread ? 'text-foreground' : 'text-foreground'}`}>
                        {getDisplayName(conversation.otherUser)}
                      </h3>
                      {conversation.lastMessage && (
                        <span className={`text-xs md:text-xs ${isUnread ? 'text-foreground font-semibold' : 'text-muted-foreground'} flex-shrink-0 ml-2`}>
                          {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm md:text-sm ${isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'} truncate`}>
                        {conversation.lastMessage?.content || "No messages yet"}
                      </p>
                      {isUnread && (
                        <Badge className="bg-accent flex-shrink-0 text-xs md:text-xs h-5 md:h-5 px-2 font-semibold">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
}
