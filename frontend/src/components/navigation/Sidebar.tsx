import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Calendar,
  MessageCircle,
  Users,
  Briefcase,
  FlaskConical,
  Building2,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useAuth } from '@/hooks/useAuth';
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
    path: '/connections',
    icon: Users,
    label: 'Connections',
  },
  {
    path: '/messages',
    icon: MessageCircle,
    label: 'Messages',
  },
  {
    path: '/opportunities',
    icon: Briefcase,
    label: 'Opportunities',
  },
  {
    path: '/projects',
    icon: FlaskConical,
    label: 'Research',
  },
  {
    path: '/partners',
    icon: Building2,
    label: 'Partners',
  },
];

const bottomNavItems: NavItem[] = [
  {
    path: '/profile',
    icon: User,
    label: 'Profile',
  },
  {
    path: '/settings',
    icon: Settings,
    label: 'Settings',
  },
];

export function Sidebar() {
  const location = useLocation();
  const deviceType = useDeviceType();
  const { user, logout } = useAuth();

  // Only show on desktop
  if (deviceType !== 'desktop') {
    return null;
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 shadow-sm z-40">
      <div className="flex flex-col h-full">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-600">Converge</h1>
          <p className="text-sm text-gray-600 mt-1">NPS Tech Accelerator</p>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.fullName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.organization}
              </p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Navigation */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-1 mb-4">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg w-full text-left text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
