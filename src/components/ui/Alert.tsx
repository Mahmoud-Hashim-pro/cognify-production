import React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  children: React.ReactNode;
}

const variantConfig: Record<
  AlertVariant,
  {
    containerClass: string;
    icon: React.ReactNode;
    titleColor: string;
    textColor: string;
    role: 'alert' | 'status';
  }
> = {
  info: {
    containerClass: 'bg-blue-50 dark:bg-[#0B1E3B] border-blue-200 dark:border-blue-900/60',
    icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />,
    titleColor: 'text-blue-900 dark:text-blue-100',
    textColor: 'text-blue-800 dark:text-blue-200',
    role: 'status',
  },
  success: {
    containerClass: 'bg-emerald-50 dark:bg-[#062B21] border-emerald-200 dark:border-emerald-900/60',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />,
    titleColor: 'text-emerald-900 dark:text-emerald-100',
    textColor: 'text-emerald-800 dark:text-emerald-200',
    role: 'status',
  },
  warning: {
    containerClass: 'bg-amber-50 dark:bg-[#2E1A05] border-amber-200 dark:border-amber-900/60',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />,
    titleColor: 'text-amber-900 dark:text-amber-100',
    textColor: 'text-amber-800 dark:text-amber-200',
    role: 'alert',
  },
  error: {
    containerClass: 'bg-red-50 dark:bg-[#360909] border-red-200 dark:border-red-900/60',
    icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />,
    titleColor: 'text-red-900 dark:text-red-100',
    textColor: 'text-red-800 dark:text-red-200',
    role: 'alert',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  onDismiss,
  dismissLabel = 'Dismiss alert',
  className,
  children,
  ...props
}) => {
  const config = variantConfig[variant];

  return (
    <div
      role={config.role}
      className={cn(
        'w-full p-4 rounded-2xl border font-sans text-start flex items-start gap-3.5 transition-all duration-200',
        config.containerClass,
        className
      )}
      {...props}
    >
      <div className="mt-0.5">{config.icon}</div>

      <div className="flex-1 space-y-1 min-w-0">
        {title && (
          <h4 className={cn('text-sm font-bold leading-tight', config.titleColor)}>
            {title}
          </h4>
        )}
        <div className={cn('text-xs sm:text-sm leading-relaxed', config.textColor)}>
          {children}
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="p-1 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default Alert;
