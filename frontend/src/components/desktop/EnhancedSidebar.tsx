import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Calendar,
  Users,
  MessageCircle,
  Lightbulb,
  Building2,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  ClipboardCheck,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useDesktop } from '@/contexts/DesktopContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { title: 'Home', href: '/', icon: Home },
  { title: 'Schedule', href: '/schedule', icon: Calendar },
  { title: 'Connections', href: '/connections', icon: Users },
  { title: 'Messages', href: '/messages', icon: MessageCircle },
  { title: 'Opportunities', href: '/opportunities', icon: Lightbulb },
  { title: 'Industry', href: '/industry', icon: Building2 },
];


export function EnhancedSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { sidebarCollapsed, toggleSidebar, openCommandPalette, openProfileModal, openSettingsModal } = useDesktop();

  const isAdmin = user?.roles?.includes('admin') || false;
  const isStaff = user?.roles?.includes('staff') || false;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
          active
            ? 'bg-primary/10 text-primary font-medium border border-primary/20'
            : 'text-gray-600 hover:bg-white hover:text-gray-900',
          sidebarCollapsed && 'justify-center px-2'
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-primary')} />
        {!sidebarCollapsed && (
          <span className="text-sm">
            {item.title}
          </span>
        )}
        {!sidebarCollapsed && item.badge && item.badge > 0 && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {item.badge}
          </span>
        )}
      </Link>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'h-full flex-shrink-0 relative',
          'bg-gray-100 border-r border-gray-200',
          'flex flex-col'
        )}
      >
        {/* Command Palette Trigger */}
        <div className={cn('px-3 py-3', sidebarCollapsed && 'px-2')}>
          {sidebarCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={openCommandPalette}
                  className="w-full h-10 bg-white hover:bg-gray-50 text-gray-600 border-gray-300"
                >
                  <Command className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                Search (Cmd+K)
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="outline"
              onClick={openCommandPalette}
              className="w-full justify-start gap-2 bg-white hover:bg-gray-50 text-gray-600 border-gray-300"
            >
              <Command className="h-4 w-4" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-gray-300 bg-gray-100 px-1.5 font-mono text-[10px] font-medium text-gray-500 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {/* Staff Check-in */}
          {(isStaff || isAdmin) && (
            <>
              <div className={cn(
                'my-3 border-t border-gray-300',
                sidebarCollapsed && 'mx-2'
              )} />
              <NavLink
                item={{
                  title: 'Staff Check-In',
                  href: '/staff/checkin',
                  icon: ClipboardCheck,
                }}
              />
            </>
          )}

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className={cn(
                'my-3 border-t border-gray-300',
                sidebarCollapsed && 'mx-2'
              )} />
              <NavLink
                item={{
                  title: 'Admin',
                  href: '/admin',
                  icon: Shield,
                }}
              />
            </>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-gray-300">
          {/* Profile & Settings Buttons */}
          <div className="px-3 py-2 space-y-1">
            {/* Profile Button */}
            {sidebarCollapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={openProfileModal}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full',
                      'text-gray-600 hover:bg-white hover:text-gray-900',
                      'justify-center px-2'
                    )}
                  >
                    <User className="h-5 w-5 flex-shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  Profile
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={openProfileModal}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full',
                  'text-gray-600 hover:bg-white hover:text-gray-900'
                )}
              >
                <User className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">Profile</span>
              </button>
            )}

            {/* Settings Button */}
            {sidebarCollapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={openSettingsModal}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full',
                      'text-gray-600 hover:bg-white hover:text-gray-900',
                      'justify-center px-2'
                    )}
                  >
                    <Settings className="h-5 w-5 flex-shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  Settings
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={openSettingsModal}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full',
                  'text-gray-600 hover:bg-white hover:text-gray-900'
                )}
              >
                <Settings className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">Settings</span>
              </button>
            )}
          </div>

          {/* User Info */}
          <div className={cn(
            'px-3 py-3 border-t border-gray-300',
            sidebarCollapsed && 'px-2'
          )}>
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user?.fullName ? getInitials(user.fullName) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-900">{user?.fullName || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
            ) : (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {user?.fullName ? getInitials(user.fullName) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {user?.fullName || 'User'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

      </motion.aside>

      {/* Collapse Toggle - Outside aside to avoid overflow issues */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className={cn(
          'absolute top-8 z-50',
          'w-6 h-6 rounded-full',
          'bg-white border border-gray-300 shadow-sm',
          'hover:bg-gray-100 text-gray-600'
        )}
        style={{
          left: sidebarCollapsed ? 69 : 253,
          transition: 'left 0.2s ease-in-out',
        }}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </TooltipProvider>
  );
}
