import React, { useId } from 'react';
import { cn } from '../../lib/utils';

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id: customId, disabled, checked, ...props }, ref) => {
    const autoId = useId();
    const id = customId || autoId;
    const descId = `${id}-desc`;

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
            ref={ref}
            id={id}
            type="radio"
            checked={checked}
            disabled={disabled}
            aria-label={typeof label === 'string' ? label : (props as any)['aria-label'] || 'Radio option'}
            aria-describedby={description ? descId : undefined}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-150',
              'bg-rafiqi-surface-light dark:bg-rafiqi-surface-dark border-rafiqi-border-light dark:border-rafiqi-border-dark',
              'peer-checked:border-rafiqi-primary peer-checked:bg-rafiqi-primary',
              'group-hover:border-rafiqi-primary/60 dark:group-hover:border-rafiqi-primary/60',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-rafiqi-focus peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-rafiqi-surface-light dark:peer-focus-visible:ring-offset-rafiqi-bg-dark'
            )}
            aria-hidden="true"
          >
            <div
              className={cn(
                'w-2 h-2 rounded-full bg-white transition-transform duration-150',
                checked ? 'scale-100' : 'scale-0'
              )}
            />
          </div>
        </div>

        {(label || description) && (
          <div className="space-y-0.5 min-w-0">
            {label && (
              <span className="block text-sm font-semibold text-rafiqi-text-primary dark:text-rafiqi-text-dark-primary leading-tight">
                {label}
              </span>
            )}
            {description && (
              <span id={descId} className="block text-xs text-rafiqi-text-secondary dark:text-rafiqi-text-dark-secondary leading-normal">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);
Radio.displayName = 'Radio';

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: string;
  errorMessage?: string;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  defaultValue,
  onChange,
  label,
  errorMessage,
  orientation = 'vertical',
  className,
}) => {
  const [internalValue, setInternalValue] = React.useState<string>(value || defaultValue || '');

  React.useEffect(() => {
    if (value !== undefined) setInternalValue(value);
  }, [value]);

  const handleChange = (val: string) => {
    if (value === undefined) setInternalValue(val);
    onChange?.(val);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('space-y-2 font-sans text-start', className)}
    >
      {label && (
        <span className="block text-xs sm:text-sm font-semibold text-rafiqi-text-primary dark:text-rafiqi-text-dark-primary mb-1">
          {label}
        </span>
      )}

      <div
        className={cn(
          orientation === 'horizontal' ? 'flex flex-wrap items-center gap-4' : 'space-y-1'
        )}
      >
        {options.map((opt) => (
          <Radio
            key={opt.value}
            name={name}
            value={opt.value}
            checked={internalValue === opt.value}
            disabled={opt.disabled}
            onChange={() => handleChange(opt.value)}
            label={opt.label}
            description={opt.description}
          />
        ))}
      </div>

      {errorMessage && (
        <p className="text-xs text-rafiqi-error-text-light dark:text-rafiqi-error-text-dark font-medium" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default Radio;
