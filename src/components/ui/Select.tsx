import React, { useId } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, AlertCircle } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      helperText,
      errorMessage,
      leftIcon,
      options,
      placeholder,
      id: customId,
      disabled,
      required,
      children,
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
            {required && (
              <span className="text-rafiqi-error-text-light dark:text-rafiqi-error-text-dark ms-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute start-3.5 pointer-events-none text-rafiqi-text-secondary dark:text-rafiqi-text-dark-secondary flex items-center justify-center" aria-hidden="true">
              {leftIcon}
            </div>
          )}

          <select
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? errorId : helperText ? helperId : undefined}
            className={cn(
              'w-full min-h-[48px] appearance-none rounded-2xl text-sm transition-all duration-150 cursor-pointer',
              'bg-rafiqi-surface-light dark:bg-rafiqi-surface-dark',
              'text-rafiqi-text-primary dark:text-rafiqi-text-dark-primary',
              'border',
              leftIcon ? 'ps-10' : 'ps-4',
              'pe-10 py-2.5',
              isInvalid
                ? 'border-rafiqi-error-text-light dark:border-rafiqi-error-text-dark focus:ring-rafiqi-error-text-light dark:focus:ring-rafiqi-error-text-dark'
                : 'border-rafiqi-border-light dark:border-rafiqi-border-dark hover:border-rafiqi-primary/50 dark:hover:border-rafiqi-primary/50 focus:border-rafiqi-primary dark:focus:border-rafiqi-primary',
              'outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-rafiqi-focus focus:ring-offset-2 focus:ring-offset-rafiqi-surface-light dark:focus:ring-offset-rafiqi-bg-dark',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled selected={!props.value && !props.defaultValue}>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute end-3.5 pointer-events-none text-rafiqi-text-secondary dark:text-rafiqi-text-dark-secondary flex items-center justify-center" aria-hidden="true">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {isInvalid && (
          <div id={errorId} className="flex items-center gap-1.5 text-xs text-rafiqi-error-text-light dark:text-rafiqi-error-text-dark font-medium" role="alert">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!isInvalid && helperText && (
          <p id={helperId} className="text-xs text-rafiqi-text-secondary dark:text-rafiqi-text-dark-secondary">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
