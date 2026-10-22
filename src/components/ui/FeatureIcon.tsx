import React from 'react';
import { cn } from '../../lib/utils';

export type FeatureIconTone = 
  | 'indigo' 
  | 'teal' 
  | 'amber' 
  | 'emerald' 
  | 'purple' 
  | 'rose' 
  | 'neutral';

export type FeatureIconSize = 'sm' | 'md' | 'lg';

export interface FeatureIconProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  tone?: FeatureIconTone;
  size?: FeatureIconSize;
  rounded?: 'lg' | 'xl' | '2xl' | 'full';
}

const toneStyles: Record<FeatureIconTone, { bg: string; text: string }> = {
  indigo: {
    bg: 'bg-[#243B73]/10 dark:bg-[#34529B]/20 border border-[#243B73]/20 dark:border-[#34529B]/30',
    text: 'text-[#243B73] dark:text-[#93C5FD]',
  },
  teal: {
    bg: 'bg-[#087F8C]/10 dark:bg-[#087F8C]/20 border border-[#087F8C]/20 dark:border-[#087F8C]/30',
    text: 'text-[#087F8C] dark:text-[#5EEAD4]',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-300',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  purple: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 dark:border-purple-500/30',
    text: 'text-purple-700 dark:text-purple-300',
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 dark:border-rose-500/30',
    text: 'text-rose-700 dark:text-rose-300',
  },
  neutral: {
    bg: 'bg-stone-200/60 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700',
    text: 'text-stone-700 dark:text-stone-300',
  },
};

const sizeStyles: Record<FeatureIconSize, { container: string; icon: string }> = {
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { container: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { container: 'w-12 h-12', icon: 'w-6 h-6' },
};

const roundedMap = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

export const FeatureIcon: React.FC<FeatureIconProps> = ({
  icon,
  tone = 'teal',
  size = 'md',
  rounded = '2xl',
  className,
  ...props
}) => {
  const toneStyle = toneStyles[tone];
  const sizeStyle = sizeStyles[size];

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center shrink-0 transition-colors duration-150 select-none shadow-xs',
        toneStyle.bg,
        toneStyle.text,
        sizeStyle.container,
        roundedMap[rounded],
        className
      )}
      aria-hidden="true"
      {...props}
    >
      <span className={cn('flex items-center justify-center', sizeStyle.icon)}>
        {icon}
      </span>
    </div>
  );
};

export default FeatureIcon;
