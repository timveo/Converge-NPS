import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, MessageCircle, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface User {
  id: string;
  fullName: string;
  email: string;
  organization?: string;
  avatarUrl?: string;
}

interface Conversation {
  id: string;
  otherUser?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    organization?: string;
  };
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated?: (conversation: Conversation) => void;
}

export function NewConversationDialog({ open, onOpenChange, onConversationCreated }: NewConversationDialogProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const searchUsers = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setUsers([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: User[] }>(
        `/messages/users/search?q=${encodeURIComponent(query)}`
      );
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to search users:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchUsers]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setUsers([]);
    }
  }, [open]);

  const handleStartConversation = async (userId: string, user: User) => {
    setIsStartingChat(userId);
    try {
      const response = await api.post<{ success: boolean; data: { id: string } }>(
        '/messages/conversations',
        { recipientId: userId }
      );

      if (response.data?.id) {
        onOpenChange(false);
        
        // If callback provided (desktop), use it instead of navigating
        if (onConversationCreated) {
          onConversationCreated({
            id: response.data.id,
            otherUser: {
              id: user.id,
              fullName: user.fullName,
              avatarUrl: user.avatarUrl,
              organization: user.organization,
            },
          });
        } else {
          // Mobile: navigate to chat page
          navigate(`/messages/${response.data.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setIsStartingChat(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            New Conversation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Search className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No users found matching "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((user) => (
                  <button
                    key={user.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left"
                    onClick={() => handleStartConversation(user.id, user)}
                    disabled={isStartingChat === user.id}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.fullName}</p>
                      {user.organization && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          {user.organization}
                        </p>
                      )}
                    </div>
                    {isStartingChat === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
