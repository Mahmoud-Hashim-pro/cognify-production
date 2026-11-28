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
  primary: 'bg-rafiqi-primary-light text-rafiqi-primary-dark border-rafiqi-primary/30 dark:bg-rafiqi-surface-elevated dark:text-rafiqi-primary-muted dark:border-rafiqi-primary/40',
  teal: 'bg-rafiqi-primary-light text-rafiqi-primary-dark border-rafiqi-primary/30 dark:bg-rafiqi-surface-elevated dark:text-rafiqi-primary-muted dark:border-rafiqi-primary/40',
  success: 'bg-[#EBF7F1] text-rafiqi-success border-rafiqi-success/30 dark:bg-[#0A261A] dark:text-[#22C55E] dark:border-rafiqi-success/40',
  warning: 'bg-[#FEF8EE] text-[#9A5B0B] border-rafiqi-warning/30 dark:bg-[#2D1B04] dark:text-[#FBBF24] dark:border-rafiqi-warning/40',
  danger: 'bg-[#FDF1F2] text-rafiqi-error border-rafiqi-error/30 dark:bg-[#2D0D12] dark:text-[#F87171] dark:border-rafiqi-error/40',
  neutral: 'bg-rafiqi-bg-light text-rafiqi-text-secondary border-rafiqi-border-light dark:bg-rafiqi-surface-elevated dark:text-rafiqi-text-dark-secondary dark:border-rafiqi-border-dark',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-xs font-semibold px-2 py-0.5 rounded-md gap-1',
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
