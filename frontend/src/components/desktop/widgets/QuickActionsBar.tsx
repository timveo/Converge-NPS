import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  QrCode,
  Calendar,
  Users,
  MessageCircle,
  Lightbulb,
  Building2,
  Shield,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface QuickAction {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  bgColor: string;
}

const baseActions: QuickAction[] = [
  {
    title: 'Scan',
    icon: QrCode,
    href: '/scanner',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 hover:bg-blue-200',
  },
  {
    title: 'Schedule',
    icon: Calendar,
    href: '/schedule',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 hover:bg-purple-200',
  },
  {
    title: 'Connections',
    icon: Users,
    href: '/connections',
    color: 'text-green-600',
    bgColor: 'bg-green-100 hover:bg-green-200',
  },
  {
    title: 'Messages',
    icon: MessageCircle,
    href: '/messages',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 hover:bg-cyan-200',
  },
  {
    title: 'Opportunities',
    icon: Lightbulb,
    href: '/opportunities',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 hover:bg-amber-200',
  },
  {
    title: 'Industry',
    icon: Building2,
    href: '/industry',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 hover:bg-slate-200',
  },
];

export function QuickActionsBar() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin') || false;
  const isStaff = user?.roles?.includes('staff') || false;

  const actions = [
    ...baseActions,
    ...(isStaff || isAdmin
      ? [
          {
            title: 'Check-In',
            icon: ClipboardCheck,
            href: '/staff/checkin',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-100 hover:bg-emerald-200',
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            title: 'Admin',
            icon: Shield,
            href: '/admin',
            color: 'text-red-600',
            bgColor: 'bg-red-100 hover:bg-red-200',
          },
        ]
      : []),
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {actions.map((action, index) => (
        <motion.div
          key={action.href}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link
            to={action.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl',
              'transition-all duration-200',
              'hover:shadow-md hover:scale-105',
              action.bgColor
            )}
          >
            <action.icon className={cn('h-5 w-5', action.color)} />
            <span className={cn('text-sm font-medium whitespace-nowrap', action.color)}>
              {action.title}
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
