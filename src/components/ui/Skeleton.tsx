import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className,
  style,
  ...props
}) => {
  const customStyle: React.CSSProperties = {
    width,
    height,
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      style={customStyle}
      className={cn(
        'animate-pulse motion-reduce:animate-none',
        'bg-slate-200 dark:bg-slate-800/80',
        variant === 'text' && 'h-4 w-full rounded-md',
        variant === 'circular' && 'rounded-full w-10 h-10',
        variant === 'rectangular' && 'rounded-xl w-full h-24',
        variant === 'card' && 'rounded-2xl w-full h-48 border border-slate-200 dark:border-slate-800',
        className
      )}
      {...props}
    />
  );
};

export default Skeleton;
