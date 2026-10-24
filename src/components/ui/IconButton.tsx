import React from 'react';
import { Button as ReactAriaButton, type ButtonProps as ReactAriaButtonProps } from 'react-aria-components/Button';
import { cn } from '../../lib/utils';

export type IconButtonVariant = 'default' | 'primary' | 'teal' | 'ghost' | 'outline' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<ReactAriaButtonProps, 'children'> {
  'aria-label': string;
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  className?: string | ((values: { isHovered: boolean; isPressed: boolean; isFocused: boolean; isDisabled: boolean }) => string);
  tooltip?: string;
}

const variantStyles: Record<IconButtonVariant, string> = {
  default: 'bg-cognify-bg-light hover:bg-cognify-border-light text-cognify-text-primary dark:bg-cognify-surface-elevated dark:hover:bg-cognify-surface-dark dark:text-cognify-text-dark-primary border border-cognify-border-light dark:border-cognify-border-dark',
  primary: 'bg-cognify-indigo hover:bg-cognify-indigo-dark text-white shadow-sm',
  teal: 'bg-cognify-teal hover:bg-cognify-teal-dark text-white shadow-sm',
  ghost: 'bg-transparent hover:bg-cognify-bg-light dark:hover:bg-cognify-surface-elevated text-cognify-text-secondary dark:text-cognify-text-dark-secondary',
  outline: 'border border-cognify-border-light dark:border-cognify-border-dark bg-transparent hover:bg-cognify-bg-light dark:hover:bg-cognify-surface-elevated text-cognify-text-primary dark:text-cognify-text-dark-primary',
  danger: 'bg-cognify-error-light hover:bg-red-100 text-cognify-error-text-light dark:bg-cognify-error-dark dark:hover:bg-red-900/60 dark:text-cognify-error-text-dark border border-cognify-error-light dark:border-cognify-error-dark',
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'w-[44px] h-[44px] rounded-xl text-sm',
  md: 'w-[48px] h-[48px] rounded-2xl text-base',
  lg: 'w-[56px] h-[56px] rounded-2xl text-lg',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      'aria-label': ariaLabel,
      icon,
      variant = 'default',
      size = 'md',
      className,
      tooltip,
      ...props
    },
    ref
  ) => {
    return (
      <ReactAriaButton
        ref={ref}
        aria-label={ariaLabel}
        {...props}
        className={(renderProps) =>
          cn(
            'inline-flex items-center justify-center shrink-0 cursor-pointer transition-all duration-150',
            'outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-cognify-focus data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-cognify-surface-light dark:data-[focus-visible]:ring-offset-cognify-bg-dark',
            'data-[pressed]:scale-[0.96] motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100',
            'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none',
            variantStyles[variant],
            sizeStyles[size],
            typeof className === 'function' ? className(renderProps) : className
          )
        }
      >
        <span
          className="shrink-0 flex items-center justify-center pointer-events-none"
          title={tooltip || ariaLabel}
          aria-hidden="true"
        >
          {icon}
        </span>
      </ReactAriaButton>
    );
  }
);

IconButton.displayName = 'IconButton';
export default IconButton;
