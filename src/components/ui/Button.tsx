import React from 'react';
import { Button as ReactAriaButton, type ButtonProps as ReactAriaButtonProps } from 'react-aria-components/Button';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 
  | 'primary'   // Deep Indigo (#243B73)
  | 'teal'      // Academic Teal (#087F8C)
  | 'secondary' // Neutral Slate / Elevated Surface
  | 'outline'   // Subtle 1px border
  | 'ghost'     // Transparent with gentle hover
  | 'danger'    // Error Crimson
  | 'success';  // Calm Emerald

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
  primary: 'bg-[#243B73] hover:bg-[#1B2D59] text-white shadow-sm active:scale-[0.98]',
  teal: 'bg-[#087F8C] hover:bg-[#06626C] text-white shadow-sm active:scale-[0.98]',
  secondary: 'bg-stone-200/80 hover:bg-stone-300/80 text-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-100 shadow-sm',
  outline: 'border border-stone-300 dark:border-stone-700 bg-transparent hover:bg-stone-100 dark:hover:bg-stone-800/60 text-stone-800 dark:text-stone-200',
  ghost: 'bg-transparent hover:bg-stone-100 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm active:scale-[0.98]',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-[0.98]',
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
            // Baseline flex layout & centering
            'inline-flex items-center justify-center font-sans transition-all duration-150 cursor-pointer select-none motion-reduce:transition-none motion-reduce:active:scale-100',
            // High-contrast WCAG 2.2 compliant focus ring
            'outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#F59E0B] data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-[#111622] dark:data-[focus-visible]:ring-offset-[#111622]',
            // Disabled & loading states
            'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none',
            // Variant & Size
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
