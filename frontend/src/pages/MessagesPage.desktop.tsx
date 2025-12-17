import { useState, useEffect, useCallback, useRef } from 'react';
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
import { cn } from '@/lib/utils';

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Handle URL-based conversation selection
  useEffect(() => {
    const conversationId = searchParams.get('id');
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [searchParams, conversations]);

  // Fetch messages when conversation selected
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
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

    fetchMessages();
    setSearchParams({ id: selectedConversation.id });
  }, [selectedConversation, setSearchParams]);

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

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

          <Separator />

          {/* Stats */}
          <div className="space-y-3">
            <Label className="text-sm font-medium block">Overview</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-gray-200 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{conversations.length}</p>
                <p className="text-xs text-muted-foreground">Conversations</p>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{totalUnread}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() =>
            navigate(`/connections?id=${selectedConversation.otherUser?.id}`)
          }
        >
          <User className="h-3 w-3 mr-1" />
          View Profile
        </Button>
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
                const showDate =
                  index === 0 ||
                  new Date(message.sentAt).toDateString() !==
                    new Date(messages[index - 1].sentAt).toDateString();

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
    </DesktopShell>
  );
}
