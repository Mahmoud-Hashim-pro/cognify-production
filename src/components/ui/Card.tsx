import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'highlighted';
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl transition-all duration-200 font-sans',
          'bg-cognify-surface-light dark:bg-cognify-surface-dark border border-cognify-border-light dark:border-cognify-border-dark text-cognify-text-primary dark:text-cognify-text-dark-primary',
          variant === 'default' && 'shadow-sm',
          variant === 'elevated' && 'shadow-md border-cognify-border-light dark:border-cognify-border-dark dark:bg-cognify-surface-elevated',
          variant === 'interactive' &&
            'cursor-pointer hover:border-cognify-teal/60 dark:hover:border-cognify-teal/60 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cognify-focus focus-visible:ring-offset-2 focus-visible:ring-offset-cognify-surface-light dark:focus-visible:ring-offset-cognify-bg-dark motion-reduce:transition-none motion-reduce:active:scale-100',
          variant === 'highlighted' &&
            'border-cognify-indigo/40 dark:border-cognify-indigo/60 bg-cognify-bg-light dark:bg-cognify-surface-elevated shadow-sm',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 sm:p-6 pb-3 space-y-1.5', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-base sm:text-lg font-bold tracking-tight text-cognify-text-primary dark:text-cognify-text-dark-primary', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-xs sm:text-sm text-cognify-text-secondary dark:text-cognify-text-dark-secondary leading-relaxed', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 sm:p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-5 sm:p-6 pt-0 border-t border-cognify-border-light dark:border-cognify-border-dark mt-4 flex items-center justify-between', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
