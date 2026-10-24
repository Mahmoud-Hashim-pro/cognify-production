import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant = 'primary' | 'teal' | 'success' | 'warning' | 'danger' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-cognify-indigo/10 text-cognify-indigo border-cognify-indigo/30 dark:bg-cognify-indigo-light/20 dark:text-cognify-text-dark-primary dark:border-cognify-indigo-light/40',
  teal: 'bg-cognify-teal/10 text-cognify-teal border-cognify-teal/30 dark:bg-cognify-teal/20 dark:text-cognify-teal-light dark:border-cognify-teal/40',
  success: 'bg-cognify-success-light text-cognify-success-text-light border-cognify-success-text-light/20 dark:bg-cognify-success-dark dark:text-cognify-success-text-dark dark:border-cognify-success-text-dark/30',
  warning: 'bg-cognify-warning-light text-cognify-warning-text-light border-cognify-warning-text-light/20 dark:bg-cognify-warning-dark dark:text-cognify-warning-text-dark dark:border-cognify-warning-text-dark/30',
  danger: 'bg-cognify-error-light text-cognify-error-text-light border-cognify-error-text-light/20 dark:bg-cognify-error-dark dark:text-cognify-error-text-dark dark:border-cognify-error-text-dark/30',
  neutral: 'bg-cognify-bg-light text-cognify-text-secondary border-cognify-border-light dark:bg-cognify-surface-elevated dark:text-cognify-text-dark-secondary dark:border-cognify-border-dark',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[11px] font-semibold px-2 py-0.5 rounded-md gap-1',
  md: 'text-xs font-bold px-2.5 py-1 rounded-lg gap-1.5',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  icon,
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center border font-sans select-none tracking-tight leading-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0 flex items-center justify-center" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
