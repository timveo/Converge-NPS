import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Search,
  Send,
  User,
  Building2,
  ChevronRight,
  Loader2,
  X,
  Clock,
  Inbox,
  Filter,
  Plus,
  UserPlus,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';
import { DesktopShell } from '@/components/desktop/DesktopShell';
import { ThreePanelLayout } from '@/components/desktop/layouts/ThreePanelLayout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { NewConversationDialog } from '@/components/messages/NewConversationDialog';

interface Conversation {
  id: string;
  otherUser?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    organization?: string;
    role?: string;
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

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  sentAt: string;
  sender: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export default function MessagesDesktopPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'unread'>('recent');
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [isConnectedToSelected, setIsConnectedToSelected] = useState<boolean | null>(null);
  const [isAddingConnection, setIsAddingConnection] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialScrollRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionStatusCache = useRef<Map<string, boolean>>(new Map());

  // Helpers
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; data: Conversation[] }>(
        '/messages/conversations'
      );
      setConversations(response.data || []);
    } catch (error) {
      console.error('Failed to fetch conversations', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle URL-based conversation selection (only on initial load or URL change)
  useEffect(() => {
    const conversationId = searchParams.get('id');
    // Only select from URL if we don't already have a selection
    if (conversationId && conversations.length > 0 && !selectedConversation) {
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, conversations.length]);

  // Fetch messages when conversation selected
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setIsConnectedToSelected(null);
      isInitialScrollRef.current = true;
      prevMessageCountRef.current = 0;
      return;
    }

    // Check cache first for instant update, then verify with API
    const otherUserId = selectedConversation.otherUser?.id;
    if (otherUserId && connectionStatusCache.current.has(otherUserId)) {
      setIsConnectedToSelected(connectionStatusCache.current.get(otherUserId)!);
    } else {
      setIsConnectedToSelected(null);
    }

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const response = await api.get<{ success: boolean; data: Message[] }>(
          `/messages/conversations/${selectedConversation.id}/messages`
        );
        setMessages(response.data || []);
        await api.post(`/messages/conversations/${selectedConversation.id}/read`);

        // Update unread count locally
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch (error) {
        console.error('Failed to fetch messages', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    const checkConnectionStatus = async () => {
      const otherUserId = selectedConversation.otherUser?.id;
      if (!otherUserId) return;
      try {
        const response = await api.get<{ isConnected: boolean }>(
          `/connections/check/${otherUserId}`
        );
        connectionStatusCache.current.set(otherUserId, response.isConnected);
        setIsConnectedToSelected(response.isConnected);
      } catch (error) {
        console.error('Failed to check connection status', error);
        connectionStatusCache.current.set(otherUserId, false);
        setIsConnectedToSelected(false);
      }
    };

    fetchMessages();
    checkConnectionStatus();
    setSearchParams({ id: selectedConversation.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id]);

  const getScrollContainer = () =>
    (messagesEndRef.current?.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null) ?? null;

  // Scroll to bottom immediately when a conversation finishes loading
  useLayoutEffect(() => {
    if (!selectedConversation || isLoadingMessages || messages.length === 0) return;
    if (!isInitialScrollRef.current) return;

    const container = getScrollContainer();
    if (container) {
      container.scrollTop = container.scrollHeight;
      isInitialScrollRef.current = false;
      prevMessageCountRef.current = messages.length;
    }
  }, [selectedConversation?.id, isLoadingMessages, messages.length]);

  // Scroll on new incoming messages similar to mobile behavior
  useEffect(() => {
    if (!selectedConversation || messages.length === 0) return;

    const container = getScrollContainer();
    const hasNewMessages = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (isInitialScrollRef.current) return;
    if (hasNewMessages && container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, selectedConversation?.id]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = () => {
      fetchConversations();
    };

    socket.on('message_notification', handleNewMessage);
    socket.on('new_message', (message: Message) => {
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        setMessages((prev) => {
          const filtered = prev.filter(
            (m) =>
              !(
                m.id.startsWith('temp-') &&
                m.senderId === message.senderId &&
                m.content === message.content
              )
          );
          if (filtered.some((m) => m.id === message.id)) {
            return filtered;
          }
          return [...filtered, message];
        });
      }
      fetchConversations();
    });

    socket.on('user_typing', ({ userId }: { userId: string }) => {
      if (userId !== user?.id) {
        setIsTyping(true);
      }
    });

    socket.on('user_stopped_typing', ({ userId }: { userId: string }) => {
      if (userId !== user?.id) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.off('message_notification', handleNewMessage);
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [socket, selectedConversation, user?.id, fetchConversations]);

  // Join/leave conversation room
  useEffect(() => {
    if (!socket || !selectedConversation) return;

    socket.emit('join_conversation', selectedConversation.id);

    return () => {
      socket.emit('leave_conversation', selectedConversation.id);
    };
  }, [socket, selectedConversation]);


  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const tempMessage: Message = {
      id: 'temp-' + Date.now(),
      conversationId: selectedConversation.id,
      senderId: user!.id,
      content: newMessage,
      isRead: false,
      sentAt: new Date().toISOString(),
      sender: {
        id: user!.id,
        fullName: user!.fullName,
      },
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage('');

    if (socket && isConnected) {
      socket.emit('send_message', {
        conversationId: selectedConversation.id,
        content: tempMessage.content,
      });
      socket.emit('typing_stop', { conversationId: selectedConversation.id });
    } else {
      try {
        await api.post('/messages', {
          conversationId: selectedConversation.id,
          content: tempMessage.content,
        });
      } catch (error) {
        console.error('Failed to send message', error);
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      }
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (!socket || !selectedConversation) return;

    socket.emit('typing_start', { conversationId: selectedConversation.id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId: selectedConversation.id });
    }, 2000);
  };

  // Handle adding connection
  const handleAddConnection = async () => {
    const otherUserId = selectedConversation?.otherUser?.id;
    if (!otherUserId) return;
    setIsAddingConnection(true);
    try {
      await api.post('/connections', { connectedUserId: otherUserId });
      connectionStatusCache.current.set(otherUserId, true);
      setIsConnectedToSelected(true);
    } catch (error) {
      console.error('Failed to add connection', error);
    } finally {
      setIsAddingConnection(false);
    }
  };

  // Filter and sort conversations
  const filteredConversations = conversations
    .filter((conv) => {
      const matchesSearch = conv.otherUser?.fullName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'all' || conv.unreadCount > 0;
      return matchesSearch && matchesTab;
    })
    .sort((a, b) => {
      if (sortBy === 'unread') {
        return b.unreadCount - a.unreadCount;
      }
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // Left Panel - Filters
  const FiltersPanel = (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Filter className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Filters</h2>
            <p className="text-sm text-muted-foreground">Search messages</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Search */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Sort Options */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Sort By</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="sort-recent"
                  name="sort"
                  checked={sortBy === 'recent'}
                  onChange={() => setSortBy('recent')}
                  className="h-4 w-4"
                />
                <Label htmlFor="sort-recent" className="cursor-pointer text-sm">
                  Most Recent
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="sort-unread"
                  name="sort"
                  checked={sortBy === 'unread'}
                  onChange={() => setSortBy('unread')}
                  className="h-4 w-4"
                />
                <Label htmlFor="sort-unread" className="cursor-pointer text-sm">
                  Unread First
                </Label>
              </div>
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );

  // Center Panel - Conversation List
  const ConversationListPanel = (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center justify-between border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Inbox className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Conversations</h2>
            <p className="text-sm text-muted-foreground">Your messages</p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-8"
          onClick={() => setIsNewConversationOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1 text-sm">
              All Messages
              <Badge variant="secondary" className="ml-2 text-xs">
                {conversations.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex-1 text-sm">
              Unread
              {totalUnread > 0 && (
                <Badge className="ml-2 text-xs bg-primary">
                  {totalUnread}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {isLoadingConversations ? (
            <div className="space-y-2 px-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-primary/70" />
              </div>
              <p className="font-medium text-sm">No conversations found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery
                  ? 'Try adjusting your search'
                  : activeTab === 'unread'
                  ? 'No unread messages'
                  : 'Start a conversation from your connections'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 pr-0">
              <AnimatePresence mode="popLayout">
                {filteredConversations.map((conversation) => {
                  const isSelected = selectedConversation?.id === conversation.id;
                  const isUnread = conversation.unreadCount > 0;

                  return (
                    <motion.button
                      key={conversation.id}
                      className={cn(
                        'w-full text-left p-3 transition-all',
                        isSelected
                          ? 'bg-gray-100 rounded-l-lg rounded-r-none -mr-3 pr-6 border-y border-l border-gray-200'
                          : 'hover:bg-accent/5 rounded-lg border border-transparent'
                      )}
                      onClick={() => setSelectedConversation(conversation)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      layout
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className={cn('h-10 w-10', isUnread && 'ring-2 ring-primary/30')}>
                          <AvatarFallback className="bg-gradient-navy text-primary-foreground text-sm">
                            {conversation.otherUser?.fullName
                              ? getInitials(conversation.otherUser.fullName)
                              : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h4
                              className={cn(
                                'text-sm truncate',
                                isUnread ? 'font-semibold' : 'font-medium'
                              )}
                            >
                              {conversation.otherUser?.fullName || 'Unknown'}
                            </h4>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {conversation.lastMessage
                                ? formatDistanceToNow(new Date(conversation.lastMessage.sentAt), {
                                    addSuffix: false,
                                  })
                                : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                'text-xs truncate flex-1',
                                isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                              )}
                            >
                              {conversation.lastMessage?.content || 'No messages yet'}
                            </p>
                            {isUnread && (
                              <Badge className="bg-primary text-[10px] h-5 px-1.5">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isSelected ? 'text-gray-400' : 'text-muted-foreground'
                          )}
                        />
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Right Panel - Chat
  const ChatPanel = selectedConversation ? (
    <div className="h-full flex flex-col bg-gray-100 border-l border-gray-200">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center justify-between border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Chat</h2>
            <p className="text-sm text-muted-foreground">
              {selectedConversation.otherUser?.fullName || 'Unknown'}
            </p>
          </div>
        </div>
        {isConnectedToSelected === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : isConnectedToSelected ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => navigate(`/connections`)}
          >
            <User className="h-3 w-3 mr-1" />
            View Profile
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleAddConnection}
            disabled={isAddingConnection}
          >
            {isAddingConnection ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <UserPlus className="h-3 w-3 mr-1" />
            )}
            Add Connection
          </Button>
        )}
      </div>

      {/* Contact Info Bar */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-navy text-primary-foreground">
              {selectedConversation.otherUser?.fullName
                ? getInitials(selectedConversation.otherUser.fullName)
                : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">
              {selectedConversation.otherUser?.fullName || 'Unknown'}
            </h3>
            {selectedConversation.otherUser?.organization && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {selectedConversation.otherUser.organization}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-4 space-y-4">
          {isLoadingMessages ? (
            <div className="space-y-3 px-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={cn("flex flex-col", i % 2 === 0 ? "items-start" : "items-end")}>
                  <Skeleton className={cn("h-12 rounded-2xl", i % 2 === 0 ? "w-3/4" : "w-2/3")} />
                  <Skeleton className="h-3 w-12 mt-1" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <MessageCircle className="h-6 w-6 text-primary/70" />
              </div>
              <p className="text-sm text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((message, index) => {
                const isOwn = message.senderId === user?.id;
                const prevMessage = messages[index - 1];
                const showDate =
                  index === 0 ||
                  (prevMessage && new Date(message.sentAt).toDateString() !==
                    new Date(prevMessage.sentAt).toDateString());

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="text-xs text-muted-foreground bg-gray-200 px-3 py-1 rounded-full">
                          {format(new Date(message.sentAt), 'EEEE, MMMM d')}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm',
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-white text-foreground rounded-bl-md border border-gray-200'
                        )}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                      <div
                        className={cn(
                          'flex items-center gap-1 mt-1 text-xs text-muted-foreground',
                          isOwn ? 'mr-1' : 'ml-1'
                        )}
                      >
                        <span>{formatMessageTime(message.sentAt)}</span>
                        {isOwn && message.isRead && (
                          <span className="text-primary">✓</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start">
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-200">
                <div className="flex space-x-1">
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <Button type="submit" disabled={!newMessage.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-[72px] px-4 flex items-center border-b border-gray-200 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Chat</h2>
            <p className="text-sm text-muted-foreground">Select a conversation</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-primary/70" />
          </div>
          <p className="font-medium">Select a conversation</p>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a conversation to start chatting
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <DesktopShell>
      <div className="h-full flex flex-col">
        {/* Page Title */}
        <div className="px-6 py-4 border-b border-gray-200 bg-background flex-shrink-0">
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>

        <div className="flex-1 overflow-hidden">
          <ThreePanelLayout
            left={FiltersPanel}
            center={ConversationListPanel}
            right={ChatPanel}
            leftWidth="260px"
            equalCenterRight
            connectedPanels={!!selectedConversation}
          />
        </div>
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        onConversationCreated={(conversation) => {
          // Add to conversations list if not already there
          setConversations((prev) => {
            const exists = prev.some((c) => c.id === conversation.id);
            if (exists) return prev;
            return [{ ...conversation, unreadCount: 0, lastMessageAt: new Date().toISOString() } as Conversation, ...prev];
          });
          // Select the conversation
          setSelectedConversation(conversation as Conversation);
        }}
      />
    </DesktopShell>
  );
}
