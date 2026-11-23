import React, { useState, useEffect } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RAFIQI_COLORS } from '../../config/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSelectorProps {
  currentTheme?: ThemeMode;
  onChange?: (mode: ThemeMode) => void;
  language?: string;
  variant?: 'segmented' | 'dropdown' | 'compact';
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onChange,
  language = 'English',
  variant = 'segmented',
  className,
}) => {
  const isAr = language?.toLowerCase().startsWith('ar');

  const [activeMode, setActiveMode] = useState<ThemeMode>(() => {
    if (currentTheme) return currentTheme;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') return saved;
        return 'system';
      } catch {}
    }
    return 'system';
  });

  useEffect(() => {
    if (currentTheme && currentTheme !== activeMode) {
      setActiveMode(currentTheme);
    }
  }, [currentTheme]);

  const handleSelect = (mode: ThemeMode) => {
    setActiveMode(mode);
    if (typeof window !== 'undefined') {
      try {
        if (mode === 'system') {
          localStorage.removeItem('theme');
          const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (systemIsDark) document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        } else {
          localStorage.setItem('theme', mode);
          if (mode === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }
      } catch {}
    }
    onChange?.(mode);
  };

  const options: Array<{ id: ThemeMode; labelEn: string; labelAr: string; icon: React.ReactNode }> = [
    {
      id: 'light',
      labelEn: 'Light',
      labelAr: 'نهاري',
      icon: <Sun className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'dark',
      labelEn: 'Dark',
      labelAr: 'ليلي',
      icon: <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'system',
      labelEn: 'System',
      labelAr: 'تلقائي',
      icon: <Laptop className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
  ];

  if (variant === 'compact') {
    return (
      <div
        role="group"
        aria-label={isAr ? 'اختيار مظهر التطبيق' : 'Theme mode selector'}
        className={cn('inline-flex items-center gap-1 p-1 rounded-xl bg-rafiqi-primary-light/40 dark:bg-rafiqi-surface-elevated border border-rafiqi-primary/20 dark:border-rafiqi-border-dark', className)}
      >
        {options.map((opt) => {
          const isSelected = activeMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              aria-pressed={isSelected}
              title={isAr ? opt.labelAr : opt.labelEn}
              className={cn(
                'min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center transition-all cursor-pointer outline-none select-none',
                'focus-visible:ring-2 focus-visible:ring-cognify-focus focus-visible:ring-offset-2',
                isSelected
                  ? 'bg-rafiqi-primary text-white shadow-xs font-bold'
                  : 'text-cognify-text-secondary dark:text-cognify-text-dark-secondary hover:text-cognify-text-primary dark:hover:text-white hover:bg-rafiqi-primary-light/60 dark:hover:bg-rafiqi-surface-dark'
              )}
            >
              {opt.icon}
              <span className="sr-only">{isAr ? opt.labelAr : opt.labelEn}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={isAr ? 'اختيار مظهر التطبيق' : 'Theme mode selector'}
      className={cn(
        'grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-rafiqi-primary-light/30 dark:bg-rafiqi-surface-dark border border-rafiqi-primary/20 dark:border-rafiqi-border-dark select-none font-sans',
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = activeMode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => handleSelect(opt.id)}
            className={cn(
              'min-h-[48px] px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer outline-none',
              'focus-visible:ring-2 focus-visible:ring-cognify-focus focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#131E2E]',
              isSelected
                ? 'bg-rafiqi-primary text-white shadow-sm font-bold scale-[1.02]'
                : 'text-cognify-text-secondary dark:text-cognify-text-dark-secondary hover:text-cognify-text-primary dark:hover:text-white hover:bg-rafiqi-primary-light/60 dark:hover:bg-rafiqi-surface-elevated'
            )}
          >
            {opt.icon}
            <span>{isAr ? opt.labelAr : opt.labelEn}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSelector;
