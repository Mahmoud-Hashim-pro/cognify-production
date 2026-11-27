import React, { useId } from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      id: customId,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = customId || autoId;
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;
    const isInvalid = Boolean(errorMessage);

    return (
      <div className="w-full space-y-1.5 font-sans text-start">
        {label && (
          <label
            htmlFor={id}
            className="block text-xs sm:text-sm font-semibold text-rafiqi-text-primary dark:text-rafiqi-text-dark-primary"
          >
            {label}
            {required && <span className="text-rafiqi-error-text-light dark:text-rafiqi-error-text-dark ms-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute start-3.5 pointer-events-none text-rafiqi-text-secondary dark:text-rafiqi-text-dark-secondary flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-label={props['aria-label'] || (typeof label === 'string' ? label : undefined)}
            aria-invalid={isInvalid}
            aria-describedby={
              isInvalid ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              // Minimum touch ergonomics (WCAG 2.5.5)
              'w-full min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150',
              // Base colors
              'bg-rafiqi-surface-light dark:bg-rafiqi-surface-dark border text-rafiqi-text-primary dark:text-rafiqi-text-dark-primary placeholder:text-rafiqi-text-secondary dark:placeholder:text-rafiqi-text-dark-secondary',
              // Focus state: high contrast gold
              'outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-rafiqi-focus focus:border-transparent',
              // Normal vs Error border
              isInvalid
                ? 'border-rafiqi-error-text-light focus:ring-rafiqi-error-text-light dark:border-rafiqi-error-text-dark dark:focus:ring-rafiqi-error-text-dark'
                : 'border-rafiqi-border-light dark:border-rafiqi-border-dark hover:border-rafiqi-text-secondary dark:hover:border-rafiqi-text-dark-secondary',
              // Icon spacing adjustments
              leftIcon && 'ps-10',
              rightIcon && 'pe-10',
              // Disabled state
              disabled && 'opacity-50 cursor-not-allowed bg-rafiqi-bg-light dark:bg-rafiqi-bg-dark',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute end-3.5 pointer-events-none text-rafiqi-text-secondary dark:text-rafiqi-text-dark-secondary flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>

        {errorMessage ? (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-semibold text-rafiqi-error-text-light dark:text-rafiqi-error-text-dark flex items-center gap-1.5 mt-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        ) : helperText ? (
          <p
            id={helperId}
            className="text-xs text-rafiqi-text-secondary dark:text-rafiqi-text-dark-secondary mt-1"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
export default Input;
