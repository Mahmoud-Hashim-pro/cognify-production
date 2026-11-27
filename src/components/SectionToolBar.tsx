import React from 'react';
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
  if (!section || buttons.length < 2) return null;
  return (
    <nav
      aria-label={isAr ? section.titleAr : section.titleEn}
      data-testid="section-tool-bar"
      className={`shrink-0 w-full border-b px-3 py-2 ${isDarkMode ? 'bg-[#0A2342] border-[#24476F]' : 'bg-[#F5F9FD] border-slate-200'}`}
    >
      <div className="flex gap-2 overflow-x-auto custom-scrollbar" role="tablist">
        {buttons.map((f) => {
          const Icon = getSectionIconComponent(f.iconName);
          const short = FEATURE_SHORT_NAMES[f.id];
          const label = short ? (isAr ? short[1] : short[0]) : (isAr ? f.titleAr : f.titleEn);
          const active = isActive(f);
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={isAr ? f.titleAr : f.titleEn}
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
