import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { DesktopProvider, useDesktop } from '@/contexts/DesktopContext';
import { EnhancedSidebar } from './EnhancedSidebar';
import { GlobalHeader } from './GlobalHeader';
import { CommandPalette } from './CommandPalette';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { ProfileModal } from './ProfileModal';
import { SettingsModal } from './SettingsModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

interface DesktopShellContentProps {
  children: ReactNode;
}

function DesktopShellContent({ children }: DesktopShellContentProps) {
  const {
    sidebarCollapsed,
    profileModalOpen,
    closeProfileModal,
    settingsModalOpen,
    closeSettingsModal
  } = useDesktop();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      {/* Global Header - Full Width */}
      <GlobalHeader />

      {/* Content Area - Sidebar + Main */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <EnhancedSidebar />

        {/* Main Content Area */}
        <motion.main
          initial={false}
          animate={{
            marginLeft: 0,
          }}
          className="flex-1 h-full overflow-hidden"
        >
          {children}
        </motion.main>
      </div>

      {/* Command Palette */}
      <CommandPalette />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal />

      {/* Profile Modal */}
      <ProfileModal open={profileModalOpen} onClose={closeProfileModal} />

      {/* Settings Modal */}
      <SettingsModal open={settingsModalOpen} onClose={closeSettingsModal} />
    </div>
  );
}

interface DesktopShellProps {
  children: ReactNode;
}

export function DesktopShell({ children }: DesktopShellProps) {
  return (
    <DesktopProvider>
      <DesktopShellContent>{children}</DesktopShellContent>
    </DesktopProvider>
  );
}

// Higher-order component for pages that want the desktop shell
interface WithDesktopShellOptions {
  fullWidth?: boolean;
  noPadding?: boolean;
}

export function withDesktopShell<P extends object>(
  Component: React.ComponentType<P>,
  options: WithDesktopShellOptions = {}
) {
  return function WrappedComponent(props: P) {
    return (
      <DesktopShell>
        <div
          className={cn(
            options.fullWidth ? '' : 'max-w-7xl mx-auto',
            options.noPadding ? '' : 'px-6 py-6'
          )}
        >
          <Component {...props} />
        </div>
      </DesktopShell>
    );
  };
}
