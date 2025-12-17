import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Calendar,
  Users,
  MessageCircle,
  Lightbulb,
  Building2,
  User,
  Settings,
  Shield,
  ClipboardCheck,
  Search,
  FileText,
  Keyboard,
} from 'lucide-react';
import { useDesktop } from '@/contexts/DesktopContext';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
  group: string;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { commandPaletteOpen, closeCommandPalette, openShortcutsModal } = useDesktop();
  const [search, setSearch] = useState('');

  const isAdmin = user?.roles?.includes('admin') || false;
  const isStaff = user?.roles?.includes('staff') || false;

  // Close on escape
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (commandPaletteOpen) {
          closeCommandPalette();
        }
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        closeCommandPalette();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandPaletteOpen, closeCommandPalette]);

  const runCommand = useCallback((command: () => void) => {
    closeCommandPalette();
    command();
  }, [closeCommandPalette]);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'home',
      title: 'Go to Home',
      subtitle: 'Dashboard overview',
      icon: Home,
      action: () => navigate('/'),
      keywords: ['dashboard', 'main'],
      group: 'Navigation',
    },
    {
      id: 'schedule',
      title: 'Go to Schedule',
      subtitle: 'Event sessions & workshops',
      icon: Calendar,
      action: () => navigate('/schedule'),
      keywords: ['events', 'sessions', 'workshops', 'calendar'],
      group: 'Navigation',
    },
    {
      id: 'connections',
      title: 'Go to Connections',
      subtitle: 'Your professional network',
      icon: Users,
      action: () => navigate('/connections'),
      keywords: ['network', 'contacts', 'people'],
      group: 'Navigation',
    },
    {
      id: 'messages',
      title: 'Go to Messages',
      subtitle: 'Conversations & chats',
      icon: MessageCircle,
      action: () => navigate('/messages'),
      keywords: ['chat', 'inbox', 'conversations'],
      group: 'Navigation',
    },
    {
      id: 'opportunities',
      title: 'Go to Opportunities',
      subtitle: 'Projects & research',
      icon: Lightbulb,
      action: () => navigate('/opportunities'),
      keywords: ['projects', 'research', 'collaborate'],
      group: 'Navigation',
    },
    {
      id: 'industry',
      title: 'Go to Industry',
      subtitle: 'Partner organizations',
      icon: Building2,
      action: () => navigate('/industry'),
      keywords: ['partners', 'companies', 'organizations'],
      group: 'Navigation',
    },
    {
      id: 'profile',
      title: 'Go to Profile',
      subtitle: 'View your profile',
      icon: User,
      action: () => navigate('/profile'),
      keywords: ['me', 'account'],
      group: 'Navigation',
    },
    {
      id: 'settings',
      title: 'Go to Settings',
      subtitle: 'App preferences',
      icon: Settings,
      action: () => navigate('/settings'),
      keywords: ['preferences', 'config'],
      group: 'Navigation',
    },
    // Actions
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      subtitle: 'View all shortcuts',
      icon: Keyboard,
      action: () => openShortcutsModal(),
      keywords: ['hotkeys', 'keys', 'help'],
      group: 'Actions',
    },
  ];

  // Add staff commands
  if (isStaff || isAdmin) {
    commands.push({
      id: 'staff-checkin',
      title: 'Staff Check-In',
      subtitle: 'Scan attendees',
      icon: ClipboardCheck,
      action: () => navigate('/staff/checkin'),
      keywords: ['scan', 'attendance'],
      group: 'Staff',
    });
  }

  // Add admin commands
  if (isAdmin) {
    commands.push(
      {
        id: 'admin',
        title: 'Admin Dashboard',
        subtitle: 'System overview',
        icon: Shield,
        action: () => navigate('/admin'),
        keywords: ['management', 'system'],
        group: 'Admin',
      },
      {
        id: 'admin-users',
        title: 'Manage Users',
        subtitle: 'User administration',
        icon: Users,
        action: () => navigate('/admin/users'),
        keywords: ['users', 'roles', 'permissions'],
        group: 'Admin',
      },
      {
        id: 'admin-sessions',
        title: 'Manage Sessions',
        subtitle: 'Session administration',
        icon: Calendar,
        action: () => navigate('/admin/sessions'),
        keywords: ['sessions', 'events'],
        group: 'Admin',
      },
      {
        id: 'admin-analytics',
        title: 'Event Analytics',
        subtitle: 'Real-time insights',
        icon: FileText,
        action: () => navigate('/admin/event-analytics'),
        keywords: ['stats', 'metrics', 'data'],
        group: 'Admin',
      }
    );
  }

  // Group commands
  const groupedCommands = commands.reduce((acc, cmd) => {
    const group = acc[cmd.group];
    if (!group) {
      acc[cmd.group] = [];
    }
    acc[cmd.group]!.push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={closeCommandPalette}
          />

          {/* Command Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[20%] -translate-x-1/2 z-50 w-full max-w-xl"
          >
            <Command
              className={cn(
                'rounded-xl border border-border bg-card shadow-2xl overflow-hidden',
                '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2',
                '[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold',
                '[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase',
                '[&_[cmdk-group-heading]]:tracking-wider'
              )}
              loop
            >
              {/* Search Input */}
              <div className="flex items-center border-b border-border px-4">
                <Search className="h-4 w-4 text-muted-foreground mr-3" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Type a command or search..."
                  className={cn(
                    'flex-1 h-14 bg-transparent outline-none',
                    'text-base placeholder:text-muted-foreground'
                  )}
                />
                <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium text-muted-foreground">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                {Object.entries(groupedCommands).map(([group, items]) => (
                  <Command.Group key={group} heading={group}>
                    {items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`${item.title} ${item.subtitle || ''} ${item.keywords?.join(' ') || ''}`}
                        onSelect={() => runCommand(item.action)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
                          'text-sm transition-colors',
                          'aria-selected:bg-accent aria-selected:text-accent-foreground',
                          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                        )}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer */}
              <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted">↑↓</kbd>
                    to navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted">↵</kbd>
                    to select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted">esc</kbd>
                  to close
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
