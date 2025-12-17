import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

// Widget color themes for visual variety
export type WidgetTheme = 'navy' | 'teal' | 'emerald' | 'purple' | 'amber' | 'rose' | 'default';

const themeStyles: Record<WidgetTheme, { gradient: string; iconBg: string; border: string; iconColor: string }> = {
  navy: {
    gradient: 'bg-gradient-to-r from-[hsl(216,100%,22%)] to-[hsl(216,80%,32%)]',
    iconBg: 'bg-white/20',
    border: 'border-[hsl(216,100%,22%)/0.2]',
    iconColor: 'text-white',
  },
  teal: {
    gradient: 'bg-gradient-to-r from-[hsl(190,90%,40%)] to-[hsl(195,90%,50%)]',
    iconBg: 'bg-white/20',
    border: 'border-[hsl(190,90%,40%)/0.2]',
    iconColor: 'text-white',
  },
  emerald: {
    gradient: 'bg-gradient-to-r from-[hsl(160,75%,38%)] to-[hsl(160,75%,48%)]',
    iconBg: 'bg-white/20',
    border: 'border-[hsl(160,75%,42%)/0.2]',
    iconColor: 'text-white',
  },
  purple: {
    gradient: 'bg-gradient-to-r from-[hsl(270,70%,45%)] to-[hsl(280,70%,55%)]',
    iconBg: 'bg-white/20',
    border: 'border-[hsl(270,70%,45%)/0.2]',
    iconColor: 'text-white',
  },
  amber: {
    gradient: 'bg-gradient-to-r from-[hsl(40,95%,50%)] to-[hsl(35,95%,55%)]',
    iconBg: 'bg-white/30',
    border: 'border-[hsl(40,95%,50%)/0.2]',
    iconColor: 'text-white',
  },
  rose: {
    gradient: 'bg-gradient-to-r from-[hsl(350,80%,50%)] to-[hsl(340,80%,55%)]',
    iconBg: 'bg-white/20',
    border: 'border-[hsl(350,80%,50%)/0.2]',
    iconColor: 'text-white',
  },
  default: {
    gradient: 'bg-gradient-to-r from-muted/50 to-muted/30',
    iconBg: 'bg-primary/10',
    border: 'border-border',
    iconColor: 'text-primary',
  },
};

interface DashboardWidgetProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  noPadding?: boolean;
  theme?: WidgetTheme;
  icon?: React.ComponentType<{ className?: string }>;
}

export function DashboardWidget({
  children,
  title,
  subtitle,
  action,
  className,
  noPadding = false,
  theme = 'default',
  icon: Icon,
}: DashboardWidgetProps) {
  const styles = themeStyles[theme];
  const hasColoredHeader = theme !== 'default';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300',
          'border-2',
          styles.border,
          className
        )}
      >
        {(title || action) && (
          <div
            className={cn(
              'flex items-center justify-between px-5 py-4',
              hasColoredHeader ? styles.gradient : 'border-b border-gray-200 bg-gray-100'
            )}
          >
            <div className="flex items-center gap-3">
              {Icon && (
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  hasColoredHeader ? styles.iconBg : 'bg-primary/10'
                )}>
                  <Icon className={cn('h-5 w-5', hasColoredHeader ? styles.iconColor : 'text-primary')} />
                </div>
              )}
              <div>
                {title && (
                  <h3 className={cn(
                    'font-semibold',
                    hasColoredHeader ? 'text-white' : 'text-foreground'
                  )}>
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className={cn(
                    'text-sm',
                    hasColoredHeader ? 'text-white/80' : 'text-muted-foreground'
                  )}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {action && (
              <div className={cn(
                'flex-shrink-0',
                hasColoredHeader && '[&_button]:text-white [&_button]:hover:bg-white/20'
              )}>
                {action}
              </div>
            )}
          </div>
        )}
        <div className={cn(noPadding ? '' : 'p-5')}>{children}</div>
      </Card>
    </motion.div>
  );
}

interface DashboardGridLayoutProps {
  children: ReactNode;
  className?: string;
}

export function DashboardGridLayout({ children, className }: DashboardGridLayoutProps) {
  return (
    <div
      className={cn(
        'grid gap-6',
        'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  );
}

// Pre-defined grid area layouts
export function DashboardFullWidthRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('col-span-full', className)}>
      {children}
    </div>
  );
}

export function DashboardTwoColumnRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('col-span-full grid grid-cols-1 lg:grid-cols-2 gap-6', className)}>
      {children}
    </div>
  );
}

export function DashboardThreeColumnRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('col-span-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6', className)}>
      {children}
    </div>
  );
}

// KPI Card specifically for stats
interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon?: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  icon: Icon,
  trend = 'neutral',
  className,
}: KPICardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-muted-foreground',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn('p-5', className)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {change && (
              <p className={cn('text-sm mt-2', trendColors[trend])}>
                {trend === 'up' && '↑ '}
                {trend === 'down' && '↓ '}
                {change.value > 0 ? '+' : ''}{change.value}% {change.label}
              </p>
            )}
          </div>
          {Icon && (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
