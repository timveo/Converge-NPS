import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Briefcase, Users, MessageCircle } from 'lucide-react';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  {
    path: '/',
    icon: Home,
    label: 'Home',
  },
  {
    path: '/schedule',
    icon: Calendar,
    label: 'Schedule',
  },
  {
    path: '/opportunities',
    icon: Briefcase,
    label: 'Opportunities',
  },
  {
    path: '/connections',
    icon: Users,
    label: 'Network',
  },
  {
    path: '/messages',
    icon: MessageCircle,
    label: 'Messages',
  },
];

export function BottomNav() {
  const location = useLocation();
  const deviceType = useDeviceType();
  const { unreadCount } = useUnreadCount();

  // Only show on mobile and tablet
  if (deviceType === 'desktop') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card border-t border-border shadow-md safe-bottom">
      <div className="flex items-center justify-evenly h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isMessages = item.path === '/messages';
          const showUnreadDot = isMessages && unreadCount > 0;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center min-w-[56px] py-2 px-1 transition-colors touch-target rounded-lg',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-accent'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5 mb-1" />
                {showUnreadDot && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full" />
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
