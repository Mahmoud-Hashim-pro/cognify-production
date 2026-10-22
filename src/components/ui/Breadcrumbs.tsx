/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Accessible Breadcrumbs Component (Phase 5: Navigation & Information Architecture)
 * Supports screen readers (aria-label, aria-current="page"), RTL, keyboard navigation,
 * and minimum 44px/48px touch targets.
 */

import React from 'react';
import { ChevronRight, ArrowLeft, Home } from 'lucide-react';
import { BreadcrumbItem, DisabilityTab } from '../../lib/navigation';
import { AppView } from '../../lib/access';

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (view: AppView, tab?: DisabilityTab) => void;
  onNavigateBack?: () => void;
  showBackButton?: boolean;
  backLabel?: string;
  isDarkMode?: boolean;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  onNavigate,
  onNavigateBack,
  showBackButton = true,
  backLabel,
  isDarkMode = false,
  className = '',
}) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 flex-wrap text-xs font-medium ${className}`}
    >
      {showBackButton && onNavigateBack && (
        <button
          type="button"
          onClick={onNavigateBack}
          aria-label={backLabel || 'Go back to previous screen'}
          title={backLabel || 'Go back'}
          className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F59E0B] ${
            isDarkMode
              ? 'bg-[#162327] border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800'
              : 'bg-stone-100 border-stone-200 text-stone-700 hover:text-stone-950 hover:bg-stone-200'
          }`}
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          {backLabel && (
            <span className="hidden sm:inline font-bold text-xs">{backLabel}</span>
          )}
        </button>
      )}

      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.current;

          return (
            <li key={item.id} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-stone-400 rtl:rotate-180 shrink-0"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span
                  aria-current="page"
                  className={`min-h-[36px] flex items-center px-2 py-1 font-bold rounded-lg ${
                    isDarkMode ? 'text-teal-300' : 'text-teal-900'
                  }`}
                >
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(item.view, item.tab)}
                  className={`min-h-[44px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F59E0B] ${
                    isDarkMode
                      ? 'text-stone-400 hover:text-white hover:bg-stone-800/60'
                      : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/60'
                  }`}
                >
                  {item.id === 'hub' && <Home className="w-3.5 h-3.5" aria-hidden="true" />}
                  <span>{item.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
