import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { offlineDataCache } from '@/lib/offlineDataCache';
import { offlineQueue } from '@/lib/offlineQueue';

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

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    organization?: string;
  };
}

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Fetch conversation and messages
  useEffect(() => {
    if (!conversationId) return;
    const cid = conversationId;

    const fetchData = async () => {
      try {
        const messagesRes = await api.get<{ success: boolean; data: Message[]; conversation: Conversation }>(`/messages/conversations/${cid}/messages`);
        setMessages(messagesRes.data || []);
        if (messagesRes.conversation) {
          setConversation(messagesRes.conversation);
        }

        void offlineDataCache.setThread(cid, {
          conversation: messagesRes.conversation,
          messages: messagesRes.data || [],
        }).catch((e) => console.error('Failed to write message thread cache', e));

        await api.post(`/messages/conversations/${cid}/read`);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch conversation', error);

        const cached = await offlineDataCache.getThread<{ conversation: Conversation | null; messages: Message[] }>(cid);
        if (cached?.data) {
          setConversation(cached.data.conversation);
          setMessages(cached.data.messages || []);
        }
        setIsLoading(false);
      }
    };

    fetchData();
  }, [conversationId]);

  // Polling fallback when Socket.IO is not connected
  useEffect(() => {
    if (!conversationId || isConnected) return;

    const pollMessages = async () => {
      try {
        const messagesRes = await api.get<{ success: boolean; data: Message[]; conversation: Conversation }>(`/messages/conversations/${conversationId}/messages`);
        const serverMessages = messagesRes.data;
        if (serverMessages) {
          setMessages(prev => {
            // Keep temp messages that haven't been confirmed by server yet
            const tempMessages = prev.filter(m => m.id.startsWith('temp-'));
            const confirmedTempIds = new Set<string>();

            // Check which temp messages have been confirmed (same sender + content exists in server messages)
            for (const temp of tempMessages) {
              const confirmed = serverMessages.some(
                sm => sm.senderId === temp.senderId && sm.content === temp.content
              );
              if (confirmed) {
                confirmedTempIds.add(temp.id);
              }
            }

            // Filter out confirmed temp messages, keep unconfirmed ones
            const pendingTempMessages = tempMessages.filter(m => !confirmedTempIds.has(m.id));

            // Merge server messages with pending temp messages
            return [...serverMessages, ...pendingTempMessages];
          });
        }
      } catch (error) {
        console.error('Failed to poll messages', error);
      }
    };

    // Poll every 3 seconds when socket is disconnected
    const pollInterval = setInterval(pollMessages, 3000);

    return () => clearInterval(pollInterval);
  }, [conversationId, isConnected]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('join_conversation', conversationId);

    socket.on('new_message', (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => {
          // Remove any temp messages with matching content from sender, then add the real message
          const filtered = prev.filter(m =>
            !(m.id.startsWith('temp-') && m.senderId === message.senderId && m.content === message.content)
          );
          // Avoid duplicates if message already exists
          if (filtered.some(m => m.id === message.id)) {
            return filtered;
          }
          return [...filtered, message];
        });
        if (message.senderId !== user?.id) {
          socket.emit('mark_as_read', { conversationId });
        }
      }
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

    socket.on('messages_read', () => {
      setMessages(prev =>
        prev.map(msg =>
          msg.senderId === user?.id ? { ...msg, isRead: true } : msg
        )
      );
    });

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
      socket.off('messages_read');
    };
  }, [socket, conversationId, user?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !conversationId) return;

    const tempMessage: Message = {
      id: 'temp-' + Date.now(),
      conversationId,
      senderId: user!.id,
      content: newMessage,
      isRead: false,
      sentAt: new Date().toISOString(),
      sender: {
        id: user!.id,
        fullName: user!.fullName,
      },
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    if (socket && isConnected) {
      socket.emit('send_message', {
        conversationId,
        content: tempMessage.content,
      });
      socket.emit('typing_stop', { conversationId });
    } else {
      try {
        if (!navigator.onLine) {
          await offlineQueue.add(user!.id, 'message', {
            conversationId,
            content: tempMessage.content,
          });
          return;
        }
        await api.post('/messages', {
          conversationId,
          content: tempMessage.content,
        });
      } catch (error) {
        console.error('Failed to send message', error);
        // If offline or network error, keep the temp message and queue it
        if (!navigator.onLine || !((error as any)?.response)) {
          try {
            await offlineQueue.add(user!.id, 'message', {
              conversationId,
              content: tempMessage.content,
            });
            return;
          } catch {
            // fall through
          }
        }

        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      }
    }
  };

  const handleTyping = () => {
    if (!socket || !conversationId) return;

    socket.emit('typing_start', { conversationId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId });
    }, 2000);
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }) + ', ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-muted">
      {/* Header - Navy gradient matching the design */}
      <header className="bg-gradient-navy text-primary-foreground px-4 py-3 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/messages')}
            className="text-primary-foreground hover:bg-primary/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-sm font-semibold">
              {conversation?.otherUser?.fullName ? getInitials(conversation.otherUser.fullName) : '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">
              {conversation?.otherUser?.fullName || 'Unknown'}
            </h1>
            <p className="text-sm text-tech-cyan-light truncate">
              {conversation?.otherUser?.organization || ''}
            </p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === user?.id;

            return (
              <div
                key={message.id}
                className={cn(
                  'flex flex-col',
                  isOwn ? 'items-end' : 'items-start'
                )}
              >
                {/* Sender name for received messages */}
                {!isOwn && (
                  <span className="text-sm font-semibold text-primary mb-1 ml-1">
                    {message.sender?.fullName || conversation?.otherUser?.fullName}
                  </span>
                )}

                {/* Message bubble */}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-card text-foreground rounded-bl-md border border-border'
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>

                {/* Timestamp */}
                <div className={cn(
                  'flex items-center gap-1 mt-1 text-xs text-muted-foreground',
                  isOwn ? 'mr-1' : 'ml-1'
                )}>
                  <span>{formatMessageTime(message.sentAt)}</span>
                  {isOwn && message.isRead && (
                    <span className="text-primary">✓</span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start">
            <div className="bg-card rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-border">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Part of flex layout, moves with keyboard */}
      <div className="bg-card border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-screen-lg mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-muted border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
          />
          <Button
            type="submit"
            disabled={!newMessage.trim()}
            size="icon"
            className="h-11 w-11 rounded-full shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
