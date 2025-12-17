import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesktopOptional } from '@/contexts/DesktopContext';
import { useDevice } from '@/hooks/useDeviceType';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  group: string;
}

export interface ShortcutGroup {
  name: string;
  shortcuts: {
    keys: string;
    description: string;
  }[];
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const desktop = useDesktopOptional();
  const { isDesktop } = useDevice();
  const pendingKey = useRef<string | null>(null);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shortcuts: ShortcutConfig[] = [
    // Command palette
    {
      key: 'k',
      meta: true,
      action: () => desktop?.toggleCommandPalette(),
      description: 'Open command palette',
      group: 'General',
    },
    // Help
    {
      key: '?',
      shift: true,
      action: () => desktop?.openShortcutsModal(),
      description: 'Show keyboard shortcuts',
      group: 'General',
    },
    // Sidebar toggle
    {
      key: '[',
      action: () => desktop?.toggleSidebar(),
      description: 'Toggle sidebar',
      group: 'General',
    },
  ];

  // Two-key navigation shortcuts (g + key)
  const goShortcuts: Record<string, { path: string; description: string }> = {
    h: { path: '/', description: 'Go to Home' },
    s: { path: '/schedule', description: 'Go to Schedule' },
    c: { path: '/connections', description: 'Go to Connections' },
    m: { path: '/messages', description: 'Go to Messages' },
    o: { path: '/opportunities', description: 'Go to Opportunities' },
    i: { path: '/industry', description: 'Go to Industry' },
    p: { path: '/profile', description: 'Go to Profile' },
    t: { path: '/settings', description: 'Go to Settings' },
    a: { path: '/admin', description: 'Go to Admin' },
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Handle two-key shortcuts (g + key)
    if (pendingKey.current === 'g') {
      const goShortcut = goShortcuts[event.key.toLowerCase()];
      if (goShortcut) {
        event.preventDefault();
        navigate(goShortcut.path);
      }
      pendingKey.current = null;
      if (pendingTimeout.current) {
        clearTimeout(pendingTimeout.current);
        pendingTimeout.current = null;
      }
      return;
    }

    // Check for 'g' to start navigation sequence
    if (event.key === 'g' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      pendingKey.current = 'g';
      // Clear pending key after 1 second
      pendingTimeout.current = setTimeout(() => {
        pendingKey.current = null;
      }, 1000);
      return;
    }

    // Check single-key shortcuts
    for (const shortcut of shortcuts) {
      const metaMatch = shortcut.meta ? event.metaKey || event.ctrlKey : !event.metaKey && !event.ctrlKey;
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey : true;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        metaMatch &&
        ctrlMatch &&
        shiftMatch &&
        altMatch
      ) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [navigate, desktop, shortcuts]);

  useEffect(() => {
    // Only enable keyboard shortcuts on desktop
    if (!isDesktop) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (pendingTimeout.current) {
        clearTimeout(pendingTimeout.current);
      }
    };
  }, [isDesktop, handleKeyDown]);

  // Return shortcut groups for display
  const getShortcutGroups = useCallback((): ShortcutGroup[] => {
    return [
      {
        name: 'General',
        shortcuts: [
          { keys: '⌘ K', description: 'Open command palette' },
          { keys: '?', description: 'Show keyboard shortcuts' },
          { keys: '[', description: 'Toggle sidebar' },
        ],
      },
      {
        name: 'Navigation',
        shortcuts: [
          { keys: 'g h', description: 'Go to Home' },
          { keys: 'g s', description: 'Go to Schedule' },
          { keys: 'g c', description: 'Go to Connections' },
          { keys: 'g m', description: 'Go to Messages' },
          { keys: 'g o', description: 'Go to Opportunities' },
          { keys: 'g i', description: 'Go to Industry' },
          { keys: 'g p', description: 'Go to Profile' },
          { keys: 'g t', description: 'Go to Settings' },
          { keys: 'g a', description: 'Go to Admin' },
        ],
      },
    ];
  }, []);

  return { getShortcutGroups };
}
