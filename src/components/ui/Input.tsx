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
            className="block text-xs sm:text-sm font-semibold text-cognify-text-primary dark:text-cognify-text-dark-primary"
          >
            {label}
            {required && <span className="text-cognify-error-text-light dark:text-cognify-error-text-dark ms-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute start-3.5 pointer-events-none text-cognify-text-secondary dark:text-cognify-text-dark-secondary flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-invalid={isInvalid}
            aria-describedby={
              isInvalid ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              // Minimum touch ergonomics (WCAG 2.5.5)
              'w-full min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150',
              // Base colors
              'bg-cognify-surface-light dark:bg-cognify-surface-dark border text-cognify-text-primary dark:text-cognify-text-dark-primary placeholder:text-cognify-text-secondary dark:placeholder:text-cognify-text-dark-secondary',
              // Focus state: high contrast gold
              'outline-none focus:ring-2 focus:ring-cognify-focus focus:border-transparent',
              // Normal vs Error border
              isInvalid
                ? 'border-cognify-error-text-light focus:ring-cognify-error-text-light dark:border-cognify-error-text-dark dark:focus:ring-cognify-error-text-dark'
                : 'border-cognify-border-light dark:border-cognify-border-dark hover:border-cognify-text-secondary dark:hover:border-cognify-text-dark-secondary',
              // Icon spacing adjustments
              leftIcon && 'ps-10',
              rightIcon && 'pe-10',
              // Disabled state
              disabled && 'opacity-50 cursor-not-allowed bg-cognify-bg-light dark:bg-cognify-bg-dark',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute end-3.5 pointer-events-none text-cognify-text-secondary dark:text-cognify-text-dark-secondary flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>

        {errorMessage ? (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-semibold text-cognify-error-text-light dark:text-cognify-error-text-dark flex items-center gap-1.5 mt-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        ) : helperText ? (
          <p
            id={helperId}
            className="text-xs text-cognify-text-secondary dark:text-cognify-text-dark-secondary mt-1"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      helperText,
      errorMessage,
      id: customId,
      disabled,
      required,
      rows = 4,
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
            className="block text-xs sm:text-sm font-semibold text-cognify-text-primary dark:text-cognify-text-dark-primary"
          >
            {label}
            {required && <span className="text-cognify-error-text-light dark:text-cognify-error-text-dark ms-1" aria-hidden="true">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          disabled={disabled}
          required={required}
          aria-invalid={isInvalid}
          aria-describedby={
            isInvalid ? errorId : helperText ? helperId : undefined
          }
          className={cn(
            'w-full p-3.5 rounded-xl text-sm font-medium transition-all duration-150',
            'bg-cognify-surface-light dark:bg-cognify-surface-dark border text-cognify-text-primary dark:text-cognify-text-dark-primary placeholder:text-cognify-text-secondary dark:placeholder:text-cognify-text-dark-secondary',
            'outline-none focus:ring-2 focus:ring-cognify-focus focus:border-transparent',
            isInvalid
              ? 'border-cognify-error-text-light focus:ring-cognify-error-text-light dark:border-cognify-error-text-dark dark:focus:ring-cognify-error-text-dark'
              : 'border-cognify-border-light dark:border-cognify-border-dark hover:border-cognify-text-secondary dark:hover:border-cognify-text-dark-secondary',
            disabled && 'opacity-50 cursor-not-allowed bg-cognify-bg-light dark:bg-cognify-bg-dark',
            className
          )}
          {...props}
        />

        {errorMessage ? (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-semibold text-cognify-error-text-light dark:text-cognify-error-text-dark flex items-center gap-1.5 mt-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        ) : helperText ? (
          <p
            id={helperId}
            className="text-xs text-cognify-text-secondary dark:text-cognify-text-dark-secondary mt-1"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
