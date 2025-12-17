import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { useDesktop } from '@/contexts/DesktopContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';

export function KeyboardShortcutsModal() {
  const { shortcutsModalOpen, closeShortcutsModal } = useDesktop();
  const { getShortcutGroups } = useKeyboardShortcuts();

  const groups = getShortcutGroups();

  return (
    <AnimatePresence>
      {shortcutsModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={closeShortcutsModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          >
            <div className="bg-card rounded-xl border border-border shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Keyboard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                    <p className="text-sm text-muted-foreground">Navigate faster with your keyboard</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeShortcutsModal}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-6">
                  {groups.map((group) => (
                    <div key={group.name}>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        {group.name}
                      </h3>
                      <div className="space-y-2">
                        {group.shortcuts.map((shortcut) => (
                          <div
                            key={shortcut.keys}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm">{shortcut.description}</span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.split(' ').map((key, i) => (
                                <span key={i} className="flex items-center gap-1">
                                  <kbd className="px-2 py-1 rounded bg-muted border border-border text-xs font-mono font-medium min-w-[28px] text-center">
                                    {key}
                                  </kbd>
                                  {i < shortcut.keys.split(' ').length - 1 && (
                                    <span className="text-muted-foreground text-xs">then</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground text-center">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-xs">?</kbd> anytime to show this dialog
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
