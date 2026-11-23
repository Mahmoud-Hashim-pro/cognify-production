import React, { useId } from 'react';
import { cn } from '../../lib/utils';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  indeterminate?: boolean;
  errorMessage?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      indeterminate = false,
      errorMessage,
      id: customId,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = customId || autoId;
    const descId = `${id}-desc`;

    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const setRefs = React.useCallback(
      (element: HTMLInputElement | null) => {
        inputRef.current = element;
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = element;
        }
      },
      [ref]
    );

    return (
      <label
        htmlFor={id}
        className={cn(
          'group relative flex items-start gap-3 min-h-[48px] py-2 px-1 select-none font-sans text-start cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
      >
        <div className="relative flex items-center justify-center pt-0.5">
          <input
            ref={setRefs}
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            aria-label={typeof label === 'string' ? label : (props as any)['aria-label'] || 'Checkbox'}
            aria-describedby={description ? descId : undefined}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-150',
              'bg-cognify-surface-light dark:bg-cognify-surface-dark border-cognify-border-light dark:border-cognify-border-dark',
              'peer-checked:bg-rafiqi-primary peer-checked:border-rafiqi-primary peer-checked:text-white',
              'peer-indeterminate:bg-rafiqi-primary peer-indeterminate:border-rafiqi-primary peer-indeterminate:text-white',
              'group-hover:border-rafiqi-primary/60 dark:group-hover:border-rafiqi-primary/60',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-cognify-focus peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-cognify-surface-light dark:peer-focus-visible:ring-offset-cognify-bg-dark',
              errorMessage && 'border-cognify-error-text-light dark:border-cognify-error-text-dark'
            )}
            aria-hidden="true"
          >
            {indeterminate ? (
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
            ) : (
              <Check className={cn('w-3.5 h-3.5 stroke-[3] transition-transform duration-150', checked ? 'scale-100' : 'scale-0')} />
            )}
          </div>
        </div>

        {(label || description) && (
          <div className="space-y-0.5 min-w-0">
            {label && (
              <span className="block text-sm font-semibold text-cognify-text-primary dark:text-cognify-text-dark-primary leading-tight">
                {label}
              </span>
            )}
            {description && (
              <span id={descId} className="block text-xs text-cognify-text-secondary dark:text-cognify-text-dark-secondary leading-normal">
                {description}
              </span>
            )}
            {errorMessage && (
              <span className="block text-xs text-cognify-error-text-light dark:text-cognify-error-text-dark font-medium pt-0.5" role="alert">
                {errorMessage}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;
