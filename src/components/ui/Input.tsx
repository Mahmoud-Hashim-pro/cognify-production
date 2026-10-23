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
            className="block text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300"
          >
            {label}
            {required && <span className="text-red-500 ms-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute start-3.5 pointer-events-none text-stone-400 dark:text-stone-500 flex items-center justify-center">
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
              'bg-white dark:bg-[#121B27] border text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600',
              // Focus state: high contrast gold
              'outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent',
              // Normal vs Error border
              isInvalid
                ? 'border-red-500 focus:ring-red-500'
                : 'border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600',
              // Icon spacing adjustments
              leftIcon && 'ps-10',
              rightIcon && 'pe-10',
              // Disabled state
              disabled && 'opacity-50 cursor-not-allowed bg-stone-100 dark:bg-stone-900',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute end-3.5 pointer-events-none text-stone-400 dark:text-stone-500 flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>

        {errorMessage ? (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 mt-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        ) : helperText ? (
          <p
            id={helperId}
            className="text-xs text-stone-500 dark:text-stone-400 mt-1"
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
            className="block text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300"
          >
            {label}
            {required && <span className="text-red-500 ms-1" aria-hidden="true">*</span>}
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
            'bg-white dark:bg-[#121B27] border text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600',
            'outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent',
            isInvalid
              ? 'border-red-500 focus:ring-red-500'
              : 'border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600',
            disabled && 'opacity-50 cursor-not-allowed bg-stone-100 dark:bg-stone-900',
            className
          )}
          {...props}
        />

        {errorMessage ? (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 mt-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        ) : helperText ? (
          <p
            id={helperId}
            className="text-xs text-stone-500 dark:text-stone-400 mt-1"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
