import React, { useId } from 'react';
import { cn } from '../../lib/utils';

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}) => {
  const autoId = useId();
  const id = autoId;
  const descId = `${id}-desc`;

  const [internalChecked, setInternalChecked] = React.useState<boolean>(
    controlledChecked !== undefined ? controlledChecked : defaultChecked
  );

  React.useEffect(() => {
    if (controlledChecked !== undefined) {
      setInternalChecked(controlledChecked);
    }
  }, [controlledChecked]);

  const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked;

  const handleToggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (controlledChecked === undefined) {
      setInternalChecked(next);
    }
    onChange?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  const isSm = size === 'sm';

  return (
    <div
      className={cn(
        'group flex items-center justify-between gap-4 min-h-[48px] py-2 px-1 select-none font-sans text-start cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      onClick={handleToggle}
    >
      {(label || description) && (
        <div className="space-y-0.5 min-w-0 flex-1">
          {label && (
            <label
              id={`${id}-label`}
              className="block text-sm font-semibold text-cognify-text-primary dark:text-cognify-text-dark-primary leading-tight cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p id={descId} className="text-xs text-cognify-text-secondary dark:text-cognify-text-dark-secondary leading-normal">
              {description}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={isChecked}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-describedby={description ? descId : undefined}
        aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]',
          'focus-visible:ring-2 focus-visible:ring-cognify-focus focus-visible:ring-offset-2 focus-visible:ring-offset-cognify-surface-light dark:focus-visible:ring-offset-cognify-bg-dark',
          'motion-reduce:transition-none',
          isSm ? 'w-10 h-6' : 'w-12 h-7',
          isChecked
            ? 'bg-rafiqi-primary'
            : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
        )}
      >
        <span
          className={cn(
            'inline-block rounded-full bg-white shadow-md transform transition-transform duration-200 pointer-events-none',
            'motion-reduce:transition-none',
            isSm ? 'w-4 h-4' : 'w-5 h-5',
            isChecked
              ? isSm
                ? 'translate-x-5 rtl:-translate-x-5'
                : 'translate-x-6 rtl:-translate-x-6'
              : 'translate-x-1 rtl:-translate-x-1'
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
};

export default Toggle;
