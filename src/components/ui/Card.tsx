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
          'bg-rafiqi-surface-light dark:bg-rafiqi-surface-dark border border-rafiqi-border-light dark:border-rafiqi-border-dark text-rafiqi-text-primary dark:text-rafiqi-text-dark-primary',
          variant === 'default' && 'shadow-sm',
          variant === 'elevated' && 'shadow-md border-rafiqi-border-light dark:border-rafiqi-border-dark dark:bg-rafiqi-surface-elevated',
          variant === 'interactive' &&
            'cursor-pointer hover:border-rafiqi-primary/60 dark:hover:border-rafiqi-primary/60 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rafiqi-focus focus-visible:ring-offset-2 focus-visible:ring-offset-rafiqi-surface-light dark:focus-visible:ring-offset-rafiqi-bg-dark motion-reduce:transition-none motion-reduce:active:scale-100',
          variant === 'highlighted' &&
            'border-rafiqi-primary/40 dark:border-rafiqi-primary/60 bg-rafiqi-primary-light/40 dark:bg-rafiqi-surface-elevated shadow-sm',
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
      className={cn('text-base sm:text-lg font-bold tracking-tight text-rafiqi-text-primary dark:text-rafiqi-text-dark-primary', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-xs sm:text-sm text-rafiqi-text-secondary dark:text-rafiqi-text-dark-secondary leading-relaxed', className)}
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
      className={cn('p-5 sm:p-6 pt-0 border-t border-rafiqi-border-light dark:border-rafiqi-border-dark mt-4 flex items-center justify-between', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
