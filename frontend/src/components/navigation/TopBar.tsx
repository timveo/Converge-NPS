import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Menu, X } from 'lucide-react';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const deviceType = useDeviceType();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Fetch unread message count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { data } = await api.get('/messages/unread-count');
        setUnreadCount(data.data.count);
      } catch (error) {
        console.error('Failed to fetch unread count', error);
      }
    };

    fetchUnreadCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Search:', searchQuery);
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-50 bg-white dark:bg-card border-b border-border shadow-sm',
        deviceType === 'desktop' ? 'left-64' : 'left-0'
      )}
    >
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {deviceType !== 'desktop' && (
            <button
              onClick={onMenuClick}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg touch-target"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          {deviceType === 'desktop' && (
            <h2 className="text-xl font-semibold text-foreground">
              Welcome, {user?.fullName?.split(' ')[0]}
            </h2>
          )}

          {deviceType !== 'mobile' && !showSearch && (
            <div className="hidden md:block w-96">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search connections, sessions, projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Mobile Search Toggle */}
          {deviceType === 'mobile' && (
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg touch-target"
            >
              {showSearch ? (
                <X className="w-6 h-6" />
              ) : (
                <Search className="w-6 h-6" />
              )}
            </button>
          )}

          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg touch-target"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Profile Picture (Desktop only) */}
          {deviceType === 'desktop' && (
            <Link
              to="/profile"
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-semibold hover:bg-secondary/80 transition-colors"
            >
              {user?.fullName?.charAt(0).toUpperCase()}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showSearch && deviceType === 'mobile' && (
        <div className="px-4 pb-4 border-t border-border">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
