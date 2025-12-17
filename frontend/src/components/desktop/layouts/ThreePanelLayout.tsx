import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ThreePanelLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right?: ReactNode;
  leftWidth?: string;
  rightWidth?: string;
  equalCenterRight?: boolean;
  connectedPanels?: boolean;
  showRight?: boolean;
  className?: string;
}

export function ThreePanelLayout({
  left,
  center,
  right,
  leftWidth = '280px',
  rightWidth = '320px',
  equalCenterRight = false,
  connectedPanels = false,
  showRight = true,
  className,
}: ThreePanelLayoutProps) {
  return (
    <div className={cn('flex h-full w-full overflow-hidden', className)}>
      {/* Left Panel */}
      <div
        className="h-full overflow-y-auto overflow-x-hidden bg-card border-r border-border flex-shrink-0"
        style={{ width: leftWidth }}
      >
        {left}
      </div>

      {/* Center Panel */}
      <div
        className={cn(
          'h-full overflow-y-auto overflow-x-hidden bg-background min-w-0',
          equalCenterRight ? 'flex-1' : 'flex-1'
        )}
      >
        {center}
      </div>

      {/* Right Panel (optional) */}
      {showRight && right && (
        <div
          className={cn(
            'h-full overflow-y-auto overflow-x-hidden bg-card',
            !connectedPanels && 'border-l border-border',
            equalCenterRight ? 'flex-1' : 'flex-shrink-0'
          )}
          style={equalCenterRight ? undefined : { width: rightWidth }}
        >
          {right}
        </div>
      )}
    </div>
  );
}
