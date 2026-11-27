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
    containerClass: 'bg-rafiqi-info-light dark:bg-rafiqi-info-dark border-rafiqi-info-text-light/20 dark:border-rafiqi-info-text-dark/30',
    icon: <Info className="w-5 h-5 text-rafiqi-info-text-light dark:text-rafiqi-info-text-dark shrink-0" aria-hidden="true" />,
    titleColor: 'text-rafiqi-info-text-light dark:text-rafiqi-info-text-dark',
    textColor: 'text-rafiqi-info-text-light dark:text-rafiqi-info-text-dark',
    role: 'status',
  },
  success: {
    containerClass: 'bg-rafiqi-success-light dark:bg-rafiqi-success-dark border-rafiqi-success-text-light/20 dark:border-rafiqi-success-text-dark/30',
    icon: <CheckCircle2 className="w-5 h-5 text-rafiqi-success-text-light dark:text-rafiqi-success-text-dark shrink-0" aria-hidden="true" />,
    titleColor: 'text-rafiqi-success-text-light dark:text-rafiqi-success-text-dark',
    textColor: 'text-rafiqi-success-text-light dark:text-rafiqi-success-text-dark',
    role: 'status',
  },
  warning: {
    containerClass: 'bg-rafiqi-warning-light dark:bg-rafiqi-warning-dark border-rafiqi-warning-text-light/20 dark:border-rafiqi-warning-text-dark/30',
    icon: <AlertTriangle className="w-5 h-5 text-rafiqi-warning-text-light dark:text-rafiqi-warning-text-dark shrink-0" aria-hidden="true" />,
    titleColor: 'text-rafiqi-warning-text-light dark:text-rafiqi-warning-text-dark',
    textColor: 'text-rafiqi-warning-text-light dark:text-rafiqi-warning-text-dark',
    role: 'alert',
  },
  error: {
    containerClass: 'bg-rafiqi-error-light dark:bg-rafiqi-error-dark border-rafiqi-error-text-light/20 dark:border-rafiqi-error-text-dark/30',
    icon: <AlertCircle className="w-5 h-5 text-rafiqi-error-text-light dark:text-rafiqi-error-text-dark shrink-0" aria-hidden="true" />,
    titleColor: 'text-rafiqi-error-text-light dark:text-rafiqi-error-text-dark',
    textColor: 'text-rafiqi-error-text-light dark:text-rafiqi-error-text-dark',
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
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-lg text-rafiqi-text-secondary hover:text-rafiqi-text-primary dark:text-rafiqi-text-dark-secondary dark:hover:text-rafiqi-text-dark-primary hover:bg-rafiqi-bg-light dark:hover:bg-rafiqi-surface-elevated transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-rafiqi-focus"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default Alert;
