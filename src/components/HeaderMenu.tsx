import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, MoreHorizontal } from 'lucide-react';

export interface HeaderMenuItem {
  key: string;
  label: string;
  ariaLabel?: string;
  testId?: string;
  icon?: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

interface Props {
  items: HeaderMenuItem[];
  ariaLabel: string;
  /** Text shown on the trigger. When omitted the trigger is a "..." icon button. */
  label?: string;
  isDarkMode?: boolean;
  align?: 'start' | 'end';
  testId?: string;
}

/** One small button that opens a short list. Used for the "..." menu and the section tool switcher on every tool page. */
export default function HeaderMenu({ items, ariaLabel, label, isDarkMode = true, align = 'end', testId }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (items.length === 0) return null;
  const dark = isDarkMode;
  return (
    <div ref={ref} className="relative shrink-0" data-testid={testId}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={`min-h-[44px] ${label ? 'px-3.5' : 'min-w-[44px]'} rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] transition-colors ${
          dark
            ? 'bg-[#17355C] border-[#24476F] text-slate-100 hover:border-[#1769AA]'
            : 'bg-white border-slate-200 text-slate-700 hover:border-[#1769AA]'
        }`}
      >
        {label ? (
          <>
            <LayoutGrid className="w-4 h-4 shrink-0 sm:hidden" aria-hidden="true" />
            <span className="hidden sm:inline max-w-[9rem] truncate">{label}</span>
            <ChevronDown className="w-4 h-4 shrink-0" />
          </>
        ) : (
          <MoreHorizontal className="w-5 h-5" />
        )}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute top-full mt-2 z-[60] min-w-[13rem] max-w-[80vw] rounded-xl border p-1.5 shadow-2xl ${
            align === 'end' ? 'end-0' : 'start-0'
          } ${dark ? 'bg-[#0E2745] border-[#24476F]' : 'bg-white border-slate-200'}`}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              aria-label={it.ariaLabel}
              data-testid={it.testId}
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className={`w-full min-h-[44px] px-3 rounded-lg text-xs font-bold flex items-center gap-2.5 text-start cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] ${
                it.active
                  ? 'bg-[#1769AA] text-white'
                  : it.danger
                    ? dark
                      ? 'text-[#FFA4A4] hover:bg-[#C43D4D]/20'
                      : 'text-red-700 hover:bg-red-50'
                    : dark
                      ? 'text-slate-100 hover:bg-[#17355C]'
                      : 'text-slate-800 hover:bg-slate-100'
              }`}
            >
              {it.icon}
              <span className="flex-1">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Empty spot in a page header where the section tool switcher appears (see SectionToolBar). */
export function ToolSwitcherSlot() {
  return <div id="tool-switcher-slot" className="shrink-0 empty:hidden" />;
}
