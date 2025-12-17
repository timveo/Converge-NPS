import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MasterDetailLayoutProps {
  master: ReactNode;
  detail: ReactNode;
  masterWidth?: string;
  className?: string;
  emptyState?: ReactNode;
  showDetail?: boolean;
}

export function MasterDetailLayout({
  master,
  detail,
  masterWidth = '380px',
  className,
  emptyState,
  showDetail = true,
}: MasterDetailLayoutProps) {
  return (
    <div className={cn('flex h-full w-full overflow-hidden', className)}>
      {/* Master Panel */}
      <div
        className="h-full overflow-y-auto overflow-x-hidden bg-card border-r border-border flex-shrink-0"
        style={{ width: masterWidth }}
      >
        {master}
      </div>

      {/* Detail Panel */}
      <div className="h-full flex-1 overflow-y-auto overflow-x-hidden bg-background min-w-0">
        {showDetail ? detail : emptyState}
      </div>
    </div>
  );
}

// Default empty state component
export function DefaultEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center p-8">
        {Icon && (
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">{description}</p>
        )}
      </div>
    </div>
  );
}
