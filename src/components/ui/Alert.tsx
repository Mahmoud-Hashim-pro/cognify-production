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
    containerClass: 'bg-cognify-info-light dark:bg-cognify-info-dark border-cognify-info-text-light/20 dark:border-cognify-info-text-dark/30',
    icon: <Info className="w-5 h-5 text-cognify-info-text-light dark:text-cognify-info-text-dark shrink-0" aria-hidden="true" />,
    titleColor: 'text-cognify-info-text-light dark:text-cognify-info-text-dark',
    textColor: 'text-cognify-info-text-light dark:text-cognify-info-text-dark',
    role: 'status',
  },
  success: {
    containerClass: 'bg-cognify-success-light dark:bg-cognify-success-dark border-cognify-success-text-light/20 dark:border-cognify-success-text-dark/30',
    icon: <CheckCircle2 className="w-5 h-5 text-cognify-success-text-light dark:text-cognify-success-text-dark shrink-0" aria-hidden="true" />,
    titleColor: 'text-cognify-success-text-light dark:text-cognify-success-text-dark',
    textColor: 'text-cognify-success-text-light dark:text-cognify-success-text-dark',
    role: 'status',
  },
  warning: {
    containerClass: 'bg-cognify-warning-light dark:bg-cognify-warning-dark border-cognify-warning-text-light/20 dark:border-cognify-warning-text-dark/30',
    icon: <AlertTriangle className="w-5 h-5 text-cognify-warning-text-light dark:text-cognify-warning-text-dark shrink-0" aria-hidden="true" />,
    titleColor: 'text-cognify-warning-text-light dark:text-cognify-warning-text-dark',
    textColor: 'text-cognify-warning-text-light dark:text-cognify-warning-text-dark',
    role: 'alert',
  },
  error: {
    containerClass: 'bg-cognify-error-light dark:bg-cognify-error-dark border-cognify-error-text-light/20 dark:border-cognify-error-text-dark/30',
    icon: <AlertCircle className="w-5 h-5 text-cognify-error-text-light dark:text-cognify-error-text-dark shrink-0" aria-hidden="true" />,
    titleColor: 'text-cognify-error-text-light dark:text-cognify-error-text-dark',
    textColor: 'text-cognify-error-text-light dark:text-cognify-error-text-dark',
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
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-lg text-cognify-text-secondary hover:text-cognify-text-primary dark:text-cognify-text-dark-secondary dark:hover:text-cognify-text-dark-primary hover:bg-cognify-bg-light dark:hover:bg-cognify-surface-elevated transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cognify-focus"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default Alert;
