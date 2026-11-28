import React from 'react';
import { cn } from '../../lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  label,
  className,
  ...props
}) => {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const variantBarStyles = {
    primary: 'bg-rafiqi-primary',
    success: 'bg-rafiqi-success',
    warning: 'bg-rafiqi-warning',
    error: 'bg-rafiqi-error',
  };

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full space-y-1.5 font-sans', className)} {...props}>
      {(label || showLabel) && (
        <div className="flex items-center justify-between text-xs font-semibold text-cognify-text-primary dark:text-cognify-text-dark-primary">
          {label && <span>{label}</span>}
          {showLabel && <span className="tabular-nums ms-auto">{percentage}%</span>}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
        className={cn(
          'w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800',
          heightStyles[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out motion-reduce:transition-none',
            variantBarStyles[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default Progress;
