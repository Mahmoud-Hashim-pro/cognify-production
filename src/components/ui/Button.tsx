import React from 'react';
import { Button as ReactAriaButton, type ButtonProps as ReactAriaButtonProps } from 'react-aria-components/Button';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'teal'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ReactAriaButtonProps {
  className?: string | ((values: { isHovered: boolean; isPressed: boolean; isFocused: boolean; isDisabled: boolean }) => string);
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-rafiqi-primary hover:bg-rafiqi-primary-dark text-white shadow-sm active:scale-[0.98]',
  teal: 'bg-rafiqi-primary hover:bg-rafiqi-primary-dark text-white shadow-sm active:scale-[0.98]',
  secondary: 'bg-rafiqi-primary-light hover:bg-[#DCE7F3] text-rafiqi-primary-dark dark:bg-rafiqi-surface-elevated dark:hover:bg-rafiqi-surface-dark dark:text-rafiqi-primary-muted border border-rafiqi-primary/20 dark:border-rafiqi-border-dark shadow-sm',
  outline: 'border border-rafiqi-primary/40 dark:border-rafiqi-border-dark bg-transparent hover:bg-rafiqi-primary-light dark:hover:bg-rafiqi-surface-elevated text-rafiqi-primary-dark dark:text-rafiqi-primary-muted',
  ghost: 'bg-transparent hover:bg-rafiqi-primary-light dark:hover:bg-rafiqi-surface-elevated text-cognify-text-secondary dark:text-cognify-text-dark-secondary',
  danger: 'bg-rafiqi-error hover:brightness-90 text-white shadow-sm active:scale-[0.98]',
  success: 'bg-rafiqi-success hover:brightness-90 text-white shadow-sm active:scale-[0.98]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl gap-2',
  md: 'min-h-[48px] px-5 py-2.5 text-sm font-bold rounded-2xl gap-2.5',
  lg: 'min-h-[56px] px-6 py-3.5 text-base font-black rounded-2xl gap-3',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      isDisabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <ReactAriaButton
        ref={ref}
        isDisabled={isDisabled || isLoading}
        aria-busy={isLoading}
        {...props}
        className={(renderProps) =>
          cn(
            'inline-flex items-center justify-center font-sans transition-all duration-150 cursor-pointer select-none motion-reduce:transition-none motion-reduce:active:scale-100',
            'outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-cognify-focus data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-cognify-surface-light dark:data-[focus-visible]:ring-offset-cognify-bg-dark',
            'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none',
            variantStyles[variant],
            sizeStyles[size],
            typeof className === 'function' ? className(renderProps) : className
          )
        }
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </ReactAriaButton>
    );
  }
);

Button.displayName = 'Button';
export default Button;
