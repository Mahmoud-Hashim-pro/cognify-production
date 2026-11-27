import React, { useState, useRef, useEffect, useId } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'end';
  className?: string;
  'aria-label'?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'end',
  className,
  'aria-label': ariaLabel = 'Options menu',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn('relative inline-flex', className)}>
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cognify-focus rounded-xl"
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          className={cn(
            'absolute top-full mt-1.5 z-50 min-w-[200px] p-1.5 rounded-2xl shadow-xl font-sans',
            'bg-cognify-surface-light dark:bg-cognify-surface-elevated border border-cognify-border-light dark:border-cognify-border-dark',
            align === 'end' ? 'end-0' : 'start-0'
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onClick?.();
                setIsOpen(false);
              }}
              className={cn(
                'w-full min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-3 transition-colors cursor-pointer text-start outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]',
                'focus-visible:ring-2 focus-visible:ring-cognify-focus',
                item.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                item.destructive
                  ? 'text-rafiqi-error hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400'
                  : 'text-cognify-text-primary dark:text-cognify-text-dark-primary hover:bg-rafiqi-primary-light/60 dark:hover:bg-rafiqi-surface-dark'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {item.icon && <span className="w-4 h-4 shrink-0" aria-hidden="true">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </div>
              {item.shortcut && (
                <kbd className="text-xs text-cognify-text-muted dark:text-cognify-text-dark-secondary bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {item.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
