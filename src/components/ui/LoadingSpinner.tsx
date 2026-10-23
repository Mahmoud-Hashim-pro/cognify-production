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
  indigo: 'border-[#243B73]/20 border-t-[#243B73] dark:border-[#34529B]/30 dark:border-t-[#60A5FA]',
  teal: 'border-[#087F8C]/20 border-t-[#087F8C] dark:border-[#087F8C]/30 dark:border-t-[#2DD4BF]',
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
