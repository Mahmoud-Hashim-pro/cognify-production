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
  primary: 'bg-cognify-indigo hover:bg-cognify-indigo-dark text-white shadow-sm active:scale-[0.98]',
  teal: 'bg-cognify-teal hover:bg-cognify-teal-dark text-white shadow-sm active:scale-[0.98]',
  secondary: 'bg-cognify-bg-light hover:bg-cognify-border-light text-cognify-text-primary dark:bg-cognify-surface-elevated dark:hover:bg-cognify-surface-dark dark:text-cognify-text-dark-primary shadow-sm',
  outline: 'border border-cognify-border-light dark:border-cognify-border-dark bg-transparent hover:bg-cognify-bg-light dark:hover:bg-cognify-surface-elevated text-cognify-text-primary dark:text-cognify-text-dark-primary',
  ghost: 'bg-transparent hover:bg-cognify-bg-light dark:hover:bg-cognify-surface-elevated text-cognify-text-secondary dark:text-cognify-text-dark-secondary',
  danger: 'bg-cognify-error-text-light hover:bg-red-800 dark:bg-cognify-error-text-dark dark:hover:bg-red-500 text-white shadow-sm active:scale-[0.98]',
  success: 'bg-cognify-success-text-light hover:bg-emerald-800 dark:bg-cognify-success-text-dark dark:hover:bg-emerald-400 text-white shadow-sm active:scale-[0.98]',
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
