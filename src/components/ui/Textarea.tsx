import React, { useId } from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle } from 'lucide-react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  showCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      helperText,
      errorMessage,
      showCount = false,
      maxLength,
      value,
      defaultValue,
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

    const currentLength = typeof value === 'string'
      ? value.length
      : typeof defaultValue === 'string'
      ? defaultValue.length
      : 0;

    return (
      <div className="w-full space-y-1.5 font-sans text-start">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={id}
              className="block text-xs sm:text-sm font-semibold text-cognify-text-primary dark:text-cognify-text-dark-primary"
            >
              {label}
              {required && (
                <span className="text-cognify-error-text-light dark:text-cognify-error-text-dark ms-1" aria-hidden="true">
                  *
                </span>
              )}
            </label>
            {showCount && maxLength && (
              <span className="text-xs text-cognify-text-muted dark:text-cognify-text-dark-secondary">
                {currentLength}/{maxLength}
              </span>
            )}
          </div>
        )}

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          aria-invalid={isInvalid}
          aria-describedby={
            isInvalid ? errorId : helperText ? helperId : undefined
          }
          className={cn(
            'w-full px-4 py-3 text-sm rounded-2xl transition-all duration-150',
            'bg-cognify-surface-light dark:bg-cognify-surface-dark',
            'text-cognify-text-primary dark:text-cognify-text-dark-primary',
            'placeholder:text-cognify-text-muted dark:placeholder:text-cognify-text-dark-secondary/60',
            'border resize-y min-h-[96px]',
            isInvalid
              ? 'border-cognify-error-text-light dark:border-cognify-error-text-dark focus:ring-cognify-error-text-light dark:focus:ring-cognify-error-text-dark'
              : 'border-cognify-border-light dark:border-cognify-border-dark hover:border-rafiqi-primary/50 dark:hover:border-rafiqi-primary/50 focus:border-rafiqi-primary dark:focus:border-rafiqi-primary',
            'outline-none focus:ring-2 focus:ring-cognify-focus focus:ring-offset-2 focus:ring-offset-cognify-surface-light dark:focus:ring-offset-cognify-bg-dark',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900',
            className
          )}
          {...props}
        />

        {isInvalid && (
          <div id={errorId} className="flex items-center gap-1.5 text-xs text-cognify-error-text-light dark:text-cognify-error-text-dark font-medium" role="alert">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!isInvalid && helperText && (
          <p id={helperId} className="text-xs text-cognify-text-secondary dark:text-cognify-text-dark-secondary">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
