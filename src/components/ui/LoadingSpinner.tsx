import React from 'react';
import { cn } from '../../lib/utils';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'indigo' | 'teal' | 'white' | 'current';

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  color?: SpinnerColor;
  label?: string; // Accessible announcement for screen readers
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

const colorClasses: Record<SpinnerColor, string> = {
  indigo: 'border-cognify-indigo/20 border-t-cognify-indigo dark:border-cognify-indigo-light/30 dark:border-t-cognify-info-text-dark',
  teal: 'border-cognify-teal/20 border-t-cognify-teal dark:border-cognify-teal/30 dark:border-t-cognify-teal-light',
  white: 'border-white/20 border-t-white',
  current: 'border-current/20 border-t-current',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'teal',
  label = 'Loading, please wait...',
  className,
  ...props
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center justify-center', className)}
      {...props}
    >
      <div
        className={cn(
          'rounded-full animate-spin motion-reduce:animate-none',
          sizeClasses[size],
          colorClasses[color]
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingSpinner;
