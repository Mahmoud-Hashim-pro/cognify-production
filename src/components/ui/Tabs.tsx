import React, { useState, useRef } from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab?: string;
  defaultTab?: string;
  onChange?: (id: string) => void;
  variant?: 'pills' | 'underline' | 'contained';
  className?: string;
  'aria-label'?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab: controlledActiveTab,
  defaultTab,
  onChange,
  variant = 'pills',
  className,
  'aria-label': ariaLabel = 'Navigation tabs',
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<string>(
    controlledActiveTab || defaultTab || (tabs[0]?.id ?? '')
  );

  React.useEffect(() => {
    if (controlledActiveTab !== undefined) {
      setInternalActiveTab(controlledActiveTab);
    }
  }, [controlledActiveTab]);

  const activeId = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleSelect = (id: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(id);
    }
    onChange?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let targetIndex: number | null = null;
    const enabledTabs = tabs.filter((t) => !t.disabled);

    if (e.key === 'ArrowRight') {
      targetIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      targetIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = tabs.length - 1;
    }

    if (targetIndex !== null) {
      e.preventDefault();
      const targetTab = tabs[targetIndex];
      if (targetTab && !targetTab.disabled) {
        handleSelect(targetTab.id);
        tabRefs.current.get(targetTab.id)?.focus();
      }
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto no-scrollbar font-sans select-none',
        variant === 'contained' && 'p-1.5 rounded-2xl bg-rafiqi-primary-light/40 dark:bg-rafiqi-surface-dark border border-rafiqi-primary/20 dark:border-rafiqi-border-dark',
        variant === 'underline' && 'border-b border-cognify-border-light dark:border-cognify-border-dark gap-4',
        className
      )}
    >
      {tabs.map((tab, idx) => {
        const isSelected = activeId === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
              else tabRefs.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`tabpanel-${tab.id}`}
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => handleSelect(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              'min-h-[48px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 inline-flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] whitespace-nowrap',
              'focus-visible:ring-2 focus-visible:ring-cognify-focus focus-visible:ring-offset-2',
              tab.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
              variant === 'pills' && [
                isSelected
                  ? 'bg-rafiqi-primary text-white shadow-sm font-bold'
                  : 'text-cognify-text-secondary dark:text-cognify-text-dark-secondary hover:text-cognify-text-primary dark:hover:text-white hover:bg-rafiqi-primary-light/50 dark:hover:bg-rafiqi-surface-elevated',
              ],
              variant === 'contained' && [
                isSelected
                  ? 'bg-rafiqi-primary text-white shadow-sm font-bold'
                  : 'text-cognify-text-secondary dark:text-cognify-text-dark-secondary hover:text-cognify-text-primary dark:hover:text-white hover:bg-white/60 dark:hover:bg-rafiqi-surface-elevated',
              ],
              variant === 'underline' && [
                'rounded-none border-b-2 -mb-[1px]',
                isSelected
                  ? 'border-rafiqi-primary text-rafiqi-primary dark:text-rafiqi-primary-muted font-bold'
                  : 'border-transparent text-cognify-text-secondary dark:text-cognify-text-dark-secondary hover:border-slate-300 dark:hover:border-slate-700 hover:text-cognify-text-primary dark:hover:text-white',
              ]
            )}
          >
            {tab.icon && <span className="shrink-0" aria-hidden="true">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span className="shrink-0">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tabId: string;
  activeTab: string;
  children: React.ReactNode;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  tabId,
  activeTab,
  children,
  className,
  ...props
}) => {
  if (tabId !== activeTab) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      tabIndex={0}
      className={cn('outline-none focus-visible:ring-2 focus-visible:ring-cognify-focus rounded-xl', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default Tabs;
