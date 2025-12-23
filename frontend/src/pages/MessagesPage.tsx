import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Search, ChevronLeft, Loader2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useDevice } from '@/hooks/useDeviceType';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { offlineDataCache } from '@/lib/offlineDataCache';
import { OfflineDataBanner } from '@/components/OfflineDataBanner';
import { NewConversationDialog } from '@/components/messages/NewConversationDialog';

// Lazy load desktop version
const MessagesDesktopPage = lazy(() => import('./MessagesPage.desktop'));

function MessagesSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

interface Conversation {
  id: string;
  otherUser?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    organization?: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    sentAt: string;
    senderId: string;
    isRead: boolean;
  };
  unreadCount: number;
  lastMessageAt: string;
}

export default function MessagesPage() {
  const { isDesktop } = useDevice();

  // Render desktop version for desktop users
  if (isDesktop) {
    return (
      <Suspense fallback={<MessagesSkeleton />}>
        <MessagesDesktopPage />
      </Suspense>
    );
  }

  // Mobile/Tablet version
  return <MessagesMobilePage />;
}

function MessagesMobilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { socket, isConnected } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);

  // Fast path: if we navigated here with a target user id, start/open the conversation and redirect.
  useEffect(() => {
    const state = location.state as any;
    const recipientId: string | undefined = state?.startConversationWithUserId;
    if (!recipientId) return;

    let isCanceled = false;

    (async () => {
      try {
        const res = await api.post<{ success: boolean; data?: { id: string } }>(
          '/messages/conversations',
          { recipientId }
        );

        const conversationId = res?.data?.id;
        if (!conversationId || isCanceled) return;

        navigate(`/messages/${conversationId}`, { replace: true });
      } catch (error) {
        console.error('Failed to start conversation', error);
      }
    })();

    return () => {
      isCanceled = true;
    };
  }, [location.state, navigate]);

  const fetchConversations = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const response = await api.get<{ success: boolean; data: Conversation[] }>('/messages/conversations');
      setConversations(response.data || []);

      void offlineDataCache.set('messages:conversations', response.data || [])
        .catch((e) => console.error('Failed to write conversations cache', e));
    } catch (error) {
      console.error('Failed to fetch conversations', error);
      const cached = await offlineDataCache.get<Conversation[]>('messages:conversations');
      setConversations(cached?.data ?? []);
    } finally {
      setIsLoading(false);
      setHasFetchedOnce(true);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!hasFetchedOnce) {
      fetchConversations(true);
    }
  }, [fetchConversations, hasFetchedOnce]);

  // Listen for new message notifications via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = () => {
      // Refresh conversations when a new message is received
      fetchConversations();
    };

    socket.on('message_notification', handleNewMessage);
    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('message_notification', handleNewMessage);
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, fetchConversations]);

  // Polling fallback when Socket.IO is not connected
  useEffect(() => {
    if (isConnected) return;

    // Poll every 5 seconds when socket is disconnected
    const pollInterval = setInterval(() => fetchConversations(false), 5000);

    return () => clearInterval(pollInterval);
  }, [isConnected, fetchConversations]);

  const getDisplayName = (user: { fullName: string; organization?: string } | undefined) => {
    return user?.fullName || 'Unknown User';
  };

  const getInitials = (user: { fullName: string } | undefined) => {
    if (!user?.fullName) return '?';
    return user.fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      {/* Header */}
      <div className="container mx-auto px-4 md:px-4 pt-3 md:pt-4">
        <header className="bg-gradient-navy text-primary-foreground shadow-lg sticky top-0 z-10 rounded-lg">
          <div className="px-4 md:px-4 py-3 md:py-4">
            <div className="flex items-center gap-3 md:gap-4">
              <Link to="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-primary/20"
                >
                  <ChevronLeft className="h-5 w-5 md:h-5 md:w-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-lg md:text-xl font-bold">Messages</h1>
                <p className="text-sm md:text-sm text-tech-cyan-light">
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary/20"
                onClick={() => setIsNewConversationOpen(true)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
      />

      {/* Offline Banner */}
      <div className="container mx-auto px-4 md:px-4 pt-3 md:pt-4">
        <OfflineDataBanner />
      </div>

      {/* Search Bar */}
      <div className="container mx-auto px-4 md:px-4 py-3 md:py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-4 md:w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 md:pl-10 h-11 md:h-10 text-base"
          />
        </div>
      </div>

      {/* Conversations List */}
      <main className="container mx-auto px-4 md:px-4 space-y-2 md:space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-2.5 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Skeleton className="h-9 w-9 md:h-12 md:w-12 rounded-full" />
                <div className="flex-1 space-y-1.5 md:space-y-2">
                  <Skeleton className="h-3 md:h-4 w-24 md:w-32" />
                  <Skeleton className="h-2.5 md:h-3 w-36 md:w-48" />
                </div>
              </div>
            </Card>
          ))
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Card className="p-8 md:p-12 text-center">
              <MessageCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg md:text-xl font-semibold text-muted-foreground">
                {searchQuery ? 'No conversations found' : 'No messages'}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Start a conversation from your connections!
              </p>
            </Card>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const isUnread = conversation.unreadCount > 0;

            return (
              <Card
                key={conversation.id}
                className={`p-3 md:p-4 hover:shadow-md transition-all cursor-pointer ${
                  isUnread
                    ? 'bg-accent/5 border-l-4 border-l-accent shadow-sm'
                    : 'border-l-4 border-l-transparent'
                }`}
                onClick={() => navigate(`/messages/${conversation.id}`)}
              >
                <div className="flex items-start gap-3 md:gap-3">
                  <Avatar className={`h-11 w-11 md:h-12 md:w-12 ${isUnread ? 'ring-2 ring-accent/30' : ''}`}>
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm md:text-sm">
                      {getInitials(conversation.otherUser)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 md:mb-1">
                      <h3 className={`${isUnread ? 'font-bold' : 'font-semibold'} text-foreground truncate text-base md:text-base`}>
                        {getDisplayName(conversation.otherUser)}
                      </h3>
                      <span className={`text-xs md:text-xs ${isUnread ? 'text-foreground font-semibold' : 'text-muted-foreground'} flex-shrink-0 ml-2`}>
                        {conversation.lastMessage
                          ? formatDistanceToNow(new Date(conversation.lastMessage.sentAt), {
                              addSuffix: true,
                            })
                          : 'Just now'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm md:text-sm ${isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'} truncate`}>
                        {conversation.lastMessage?.content || 'No messages yet'}
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
