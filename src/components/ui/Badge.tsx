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
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  warning: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  danger: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60',
  neutral: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
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
