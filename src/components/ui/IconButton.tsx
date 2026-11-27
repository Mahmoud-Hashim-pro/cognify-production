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
  default: 'bg-rafiqi-bg hover:bg-rafiqi-primary-light text-rafiqi-text-primary dark:bg-rafiqi-surface-elevated dark:hover:bg-rafiqi-surface-dark dark:text-rafiqi-text-dark-primary border border-rafiqi-border-light dark:border-rafiqi-border-dark',
  primary: 'bg-rafiqi-primary hover:bg-rafiqi-primary-dark text-white shadow-sm',
  teal: 'bg-rafiqi-primary hover:bg-rafiqi-primary-dark text-white shadow-sm',
  ghost: 'bg-transparent hover:bg-rafiqi-primary-light dark:hover:bg-rafiqi-surface-elevated text-rafiqi-text-secondary dark:text-rafiqi-text-dark-secondary',
  outline: 'border border-rafiqi-border-light dark:border-rafiqi-border-dark bg-transparent hover:bg-rafiqi-primary-light dark:hover:bg-rafiqi-surface-elevated text-rafiqi-text-primary dark:text-rafiqi-text-dark-primary',
  danger: 'bg-[#FDF1F2] hover:brightness-95 text-rafiqi-error dark:bg-[#2D0D12] dark:hover:brightness-125 dark:text-[#F87171] border border-rafiqi-error/30 dark:border-rafiqi-error/40',
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
            'outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-rafiqi-focus data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-rafiqi-surface-light dark:data-[focus-visible]:ring-offset-rafiqi-bg-dark',
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
