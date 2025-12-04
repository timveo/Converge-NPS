import { Link, useLocation } from 'react-router-dom';
import { Home, QrCode, Calendar, MessageCircle, User } from 'lucide-react';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useFeature } from '@/hooks/useFeature';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  feature?: string;
}

const navItems: NavItem[] = [
  {
    path: '/',
    icon: Home,
    label: 'Home',
  },
  {
    path: '/scanner',
    icon: QrCode,
    label: 'Scan',
    feature: 'qrScanner',
  },
  {
    path: '/schedule',
    icon: Calendar,
    label: 'Schedule',
  },
  {
    path: '/messages',
    icon: MessageCircle,
    label: 'Messages',
  },
  {
    path: '/profile',
    icon: User,
    label: 'Profile',
  },
];

export function BottomNav() {
  const location = useLocation();
  const deviceType = useDeviceType();
  const isQRAvailable = useFeature('qr_scanner');

  // Only show on mobile and tablet
  if (deviceType === 'desktop') {
    return null;
  }

  const filteredNavItems = navItems.filter(item => {
    if (item.feature === 'qrScanner') {
      return isQRAvailable;
    }
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card border-t border-border shadow-md safe-bottom">
      <div className="flex items-center justify-around h-16">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors touch-target',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-accent'
              )}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
