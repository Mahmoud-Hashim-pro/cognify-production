import React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle, Clock, Disc } from 'lucide-react';

export type StatusType = 'active' | 'processing' | 'warning' | 'error' | 'idle';

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusType;
  label: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig: Record<
  StatusType,
  {
    icon: React.ReactNode;
    dotClass: string;
    textClass: string;
    containerClass: string;
  }
> = {
  active: {
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />,
    dotClass: 'bg-emerald-500 ring-2 ring-emerald-500/20',
    textClass: 'text-emerald-800 dark:text-emerald-300 font-semibold',
    containerClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
  },
  processing: {
    icon: <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin motion-reduce:animate-none" aria-hidden="true" />,
    dotClass: 'bg-blue-500 ring-2 ring-blue-500/20',
    textClass: 'text-blue-800 dark:text-blue-300 font-semibold',
    containerClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60',
  },
  warning: {
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
    dotClass: 'bg-amber-500 ring-2 ring-amber-500/20',
    textClass: 'text-amber-800 dark:text-amber-300 font-semibold',
    containerClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
  },
  error: {
    icon: <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />,
    dotClass: 'bg-red-500 ring-2 ring-red-500/20',
    textClass: 'text-red-800 dark:text-red-300 font-semibold',
    containerClass: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60',
  },
  idle: {
    icon: <Disc className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" aria-hidden="true" />,
    dotClass: 'bg-stone-400 ring-2 ring-stone-400/20',
    textClass: 'text-stone-700 dark:text-stone-300 font-medium',
    containerClass: 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700',
  },
};

/**
 * StatusIndicator enforces accessibility rule:
 * NEVER communicate important information through color alone.
 * Always renders both a distinct semantic icon and accessible label.
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  showIcon = true,
  size = 'md',
  className,
  ...props
}) => {
  const config = statusConfig[status];

  return (
    <div
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-sans select-none',
        config.containerClass,
        size === 'sm' && 'text-[11px] px-2 py-0.5',
        className
      )}
      {...props}
    >
      {showIcon ? (
        config.icon
      ) : (
        <span className={cn('w-2 h-2 rounded-full shrink-0', config.dotClass)} aria-hidden="true" />
      )}
      <span className={config.textClass}>{label}</span>
    </div>
  );
};

export default StatusIndicator;
