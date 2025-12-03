import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Circle } from 'lucide-react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
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

  // Fetch conversation and messages
  useEffect(() => {
    if (!conversationId) return;

    const fetchData = async () => {
      try {
        // Fetch messages
        const messagesRes = await api.get(`/conversations/${conversationId}/messages`);
        setMessages(messagesRes.data.data);

        // Mark as read
        await api.post(`/conversations/${conversationId}/read`);

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch conversation', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [conversationId]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !conversationId) return;

    // Join conversation room
    socket.emit('join_conversation', conversationId);

    // Listen for new messages
    socket.on('new_message', (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => [...prev, message]);

        // Mark as read
        if (message.senderId !== user?.id) {
          socket.emit('mark_as_read', { conversationId });
        }
      }
    });

    // Listen for typing indicators
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

    // Listen for read receipts
    socket.on('messages_read', () => {
      setMessages(prev =>
        prev.map(msg =>
          msg.senderId === user?.id ? { ...msg, status: 'read' } : msg
        )
      );
    });

    // Cleanup
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
      status: 'sent',
      createdAt: new Date().toISOString(),
      sender: {
        id: user!.id,
        fullName: user!.fullName,
      },
    };

    // Optimistically add message
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    // Send via Socket.IO
    if (socket && isConnected) {
      socket.emit('send_message', {
        conversationId,
        content: tempMessage.content,
      });

      // Stop typing indicator
      socket.emit('typing_stop', { conversationId });
    } else {
      // Fallback to HTTP if socket not connected
      try {
        await api.post('/messages', {
          conversationId,
          content: tempMessage.content,
        });
      } catch (error) {
        console.error('Failed to send message', error);
        // Remove temp message on error
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      }
    }
  };

  const handleTyping = () => {
    if (!socket || !conversationId) return;

    socket.emit('typing_start', { conversationId });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId });
    }, 2000);
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = (now.getTime() - date.getTime()) / 1000;

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/messages')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
            {conversation?.otherUser.fullName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">
              {conversation?.otherUser.fullName}
            </h2>
            <p className="text-sm text-gray-500">
              {conversation?.otherUser.organization}
            </p>
          </div>

          {/* Online Status */}
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Circle className={cn('w-2 h-2', isConnected ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400')} />
            <span>{isConnected ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.senderId === user?.id;

          return (
            <div
              key={message.id}
              className={cn(
                'flex',
                isOwn ? 'justify-end' : 'justify-start'
              )}
            >
              <div className={cn('max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2',
                    isOwn
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
                <div className="flex items-center space-x-1 mt-1 px-2">
                  <span className="text-xs text-gray-500">
                    {formatMessageTime(message.createdAt)}
                  </span>
                  {isOwn && (
                    <span className="text-xs text-gray-500">
                      {message.status === 'read' ? '• Read' : '• Sent'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-2 text-gray-500 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
