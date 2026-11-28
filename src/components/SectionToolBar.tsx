import React, { useEffect, useLayoutEffect, useState } from 'react';
import { L } from '../lib/translations';
import { createPortal } from 'react-dom';
import HeaderMenu from './HeaderMenu';
import { ProductSectionId, SectionFeatureItem, getProductSection, getSectionIconComponent } from '../lib/sections';
import { FEATURE_SHORT_NAMES } from '../lib/sectionShortNames';

/** One row of buttons with every tool of a section. Shown above any tool page that belongs to a section. */
export function featureKey(f: SectionFeatureItem): string {
  // Tools that live inside one page (for example the Work assistant tabs) share a key:
  // that page already has its own tool row.
  const view = f.targetView === 'communication' ? 'communicate' : f.targetView;
  return `${view}|${f.targetView === 'disability' ? f.targetTab || '' : ''}`;
}

export function sectionToolButtons(sectionId: ProductSectionId): SectionFeatureItem[] {
  const section = getProductSection(sectionId);
  if (!section) return [];
  const seen = new Set<string>();
  return section.features.filter((f) => {
    // These views have no screen yet (they would land on Home). Keep them out of the switcher.
    if (['planner', 'goals', 'analytics'].includes(f.targetView)) return false;
    const k = featureKey(f);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

interface Props {
  sectionId: ProductSectionId;
  isAr: boolean;
  isDarkMode: boolean;
  isActive: (f: SectionFeatureItem) => boolean;
  onSelect: (f: SectionFeatureItem) => void;
}

export default function SectionToolBar({ sectionId, isAr, isDarkMode, isActive, onSelect }: Props) {
  const section = getProductSection(sectionId);
  const buttons = sectionToolButtons(sectionId);
  // A tool page can host the switcher in its own header row (ToolSwitcherSlot).
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const el = document.getElementById('tool-switcher-slot');
    if (el !== slot) setSlot(el);
  });
  // The page loads lazily, so watch for its header slot appearing or going away.
  useEffect(() => {
    const root = document.getElementById('main-content') || document.body;
    const check = () => {
      const el = document.getElementById('tool-switcher-slot');
      setSlot((prev) => (prev === el ? prev : el));
    };
    const mo = new MutationObserver(check);
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  if (!section || buttons.length < 2) return null;
  if (slot) {
    const items = buttons.map((f) => {
      const Icon = getSectionIconComponent(f.iconName);
      const short = FEATURE_SHORT_NAMES[f.id];
      const label = short ? (isAr ? short[1] : L(short[0])) : (isAr ? f.titleAr : L(f.titleEn));
      return { key: f.id, label, icon: <Icon className="w-4 h-4 shrink-0" />, active: isActive(f), onSelect: () => onSelect(f) };
    });
    const current = items.find((i) => i.active);
    return createPortal(
      <HeaderMenu
        testId="section-tool-bar"
        items={items}
        label={current?.label || (isAr ? section.titleAr : L(section.titleEn))}
        ariaLabel={isAr ? `أدوات ${section.titleAr}` : `${section.titleEn} tools`}
        isDarkMode={isDarkMode}
        align="start"
      />,
      slot,
    );
  }
  return (
    <nav
      aria-label={isAr ? section.titleAr : L(section.titleEn)}
      data-testid="section-tool-bar"
      className={`shrink-0 w-full border-b px-3 py-2 ${isDarkMode ? 'bg-[#0A2342] border-[#24476F]' : 'bg-[#F5F9FD] border-slate-200'}`}
    >
      <div className="flex gap-2 overflow-x-auto custom-scrollbar" role="tablist">
        {buttons.map((f) => {
          const Icon = getSectionIconComponent(f.iconName);
          const short = FEATURE_SHORT_NAMES[f.id];
          const label = short ? (isAr ? short[1] : L(short[0])) : (isAr ? f.titleAr : L(f.titleEn));
          const active = isActive(f);
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={isAr ? f.titleAr : L(f.titleEn)}
              onClick={() => onSelect(f)}
              className={`shrink-0 min-h-[44px] px-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] transition-colors ${
                active
                  ? 'bg-[#1769AA] border-[#1769AA] text-white'
                  : isDarkMode
                    ? 'bg-[#112C4F] border-[#24476F] text-slate-200 hover:border-[#1769AA]'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-[#1769AA]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
