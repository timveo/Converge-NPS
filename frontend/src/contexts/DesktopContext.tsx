import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface DesktopState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  shortcutsModalOpen: boolean;
  profileModalOpen: boolean;
  settingsModalOpen: boolean;
}

interface DesktopContextValue extends DesktopState {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
}

const DesktopContext = createContext<DesktopContextValue | null>(null);

const STORAGE_KEY = 'converge-desktop-preferences';

interface StoredPreferences {
  sidebarCollapsed: boolean;
}

function loadPreferences(): StoredPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load desktop preferences:', e);
  }
  return { sidebarCollapsed: false };
}

function savePreferences(prefs: StoredPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save desktop preferences:', e);
  }
}

interface DesktopProviderProps {
  children: ReactNode;
}

export function DesktopProvider({ children }: DesktopProviderProps) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => loadPreferences().sidebarCollapsed);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    savePreferences({ sidebarCollapsed });
  }, [sidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState(prev => !prev);
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
  }, []);

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setCommandPaletteOpen(prev => !prev);
  }, []);

  const openShortcutsModal = useCallback(() => {
    setShortcutsModalOpen(true);
  }, []);

  const closeShortcutsModal = useCallback(() => {
    setShortcutsModalOpen(false);
  }, []);

  const openProfileModal = useCallback(() => {
    setProfileModalOpen(true);
  }, []);

  const closeProfileModal = useCallback(() => {
    setProfileModalOpen(false);
  }, []);

  const openSettingsModal = useCallback(() => {
    setSettingsModalOpen(true);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setSettingsModalOpen(false);
  }, []);

  const value: DesktopContextValue = {
    sidebarCollapsed,
    commandPaletteOpen,
    shortcutsModalOpen,
    profileModalOpen,
    settingsModalOpen,
    toggleSidebar,
    setSidebarCollapsed,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    openShortcutsModal,
    closeShortcutsModal,
    openProfileModal,
    closeProfileModal,
    openSettingsModal,
    closeSettingsModal,
  };

  return (
    <DesktopContext.Provider value={value}>
      {children}
    </DesktopContext.Provider>
  );
}

export function useDesktop(): DesktopContextValue {
  const context = useContext(DesktopContext);
  if (!context) {
    throw new Error('useDesktop must be used within a DesktopProvider');
  }
  return context;
}

export function useDesktopOptional(): DesktopContextValue | null {
  return useContext(DesktopContext);
}
