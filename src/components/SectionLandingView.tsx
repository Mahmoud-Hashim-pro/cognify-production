/**
 * Rafiqi (رفيقي) — Standardized Section Landing View (Phase 6)
 *
 * Implements consistent, accessible landing pages for all Six Official Product Sections:
 * 1. See & Understand (الرؤية والفهم)
 * 2. Read & Learn (القراءة والتعلّم)
 * 3. Work & Create (العمل والإبداع)
 * 4. Move & Explore (الحركة والاستكشاف)
 * 5. Communicate (التواصل والتعبير)
 * 6. Personalize (التخصيص والإعدادات)
 */

import React from 'react';
import {
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  Info,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { UserProfile } from '../types';
import { isArabicLocale, localize } from '../lib/translations';
import {
  ProductSectionId,
  getProductSection,
  getSectionIconComponent,
  SectionFeatureItem,
} from '../lib/sections';

interface SectionLandingViewProps {
  sectionId: ProductSectionId;
  profile: UserProfile;
  onNavigateBack: () => void;
  onSelectFeature: (feature: SectionFeatureItem) => void;
  isDarkMode?: boolean;
}

export default function SectionLandingView({
  sectionId,
  profile,
  onNavigateBack,
  onSelectFeature,
  isDarkMode = true,
}: SectionLandingViewProps) {
  const isAr = isArabicLocale(profile.language);
  const section = getProductSection(sectionId);

  if (!section) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-slate-400">Section not found.</p>
        <button
          type="button"
          onClick={onNavigateBack}
          className="px-4 py-2 bg-[#1769AA] text-white rounded-xl text-xs font-bold"
        >
          {isAr ? 'الرجوع للرئيسية' : 'Return to Dashboard'}
        </button>
      </div>
    );
  }

  const SectionIcon = getSectionIconComponent(section.iconName);
  const primaryFeature = section.features.find((f) => f.isPrimaryAction) || section.features[0];

  return (
    <div
      className={`min-h-full flex flex-col p-4 sm:p-6 lg:p-8 space-y-8 select-none ${
        isDarkMode ? 'bg-[#0B131E] text-slate-100' : 'bg-[#F5F9FD] text-slate-900'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* ── 1. SECTION HEADER & HERO ── */}
      <section
        aria-label={`${isAr ? section.titleAr : section.titleEn}`}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#131E2E] via-[#1A283D] to-[#131E2E] border border-[#22354E] p-6 sm:p-8 shadow-xl"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl text-start">
            {/* Top Navigation Back + Section Order Badge */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateBack}
                aria-label={isAr ? 'الرجوع للوحة الميزات الرئيسية' : 'Back to main dashboard'}
                className="p-1.5 rounded-xl bg-[#0B131E] hover:bg-[#1769AA]/30 text-white border border-[#22354E] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                <span>{isAr ? 'الرئيسية' : 'Dashboard'}</span>
              </button>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1769AA]/15 text-[#4B9FE1] border border-[#1769AA]/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isAr
                    ? `القسم ${section.numericOrder} من 6`
                    : `Section ${section.numericOrder} of 6`}
                </span>
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#F8FAFC] tracking-tight flex items-center gap-3">
              <SectionIcon className="w-8 h-8 text-[#4B9FE1] shrink-0" />
              <span>{isAr ? section.titleAr : section.titleEn}</span>
            </h1>

            {/* Subtitle / Explanation */}
            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              {isAr ? section.shortExplanationAr : section.shortExplanationEn}
            </p>

            {/* Detailed Purpose */}
            <p className="text-xs text-[#94A3B8]/80 leading-relaxed max-w-xl">
              {isAr ? section.detailedPurposeAr : section.detailedPurposeEn}
            </p>
          </div>

          {/* Primary Quick Start Action */}
          {primaryFeature && (
            <div className="w-full md:w-auto shrink-0 pt-2 md:pt-0">
              <button
                type="button"
                onClick={() => onSelectFeature(primaryFeature)}
                aria-label={`${isAr ? 'تشغيل الميزة الأساسية:' : 'Launch primary feature:'} ${
                  isAr ? primaryFeature.titleAr : primaryFeature.titleEn
                }`}
                className="w-full md:w-auto px-6 py-4 rounded-2xl bg-[#1769AA] hover:bg-[#0D4778] active:bg-[#09355B] text-white font-bold text-sm shadow-xl shadow-[#1769AA]/30 flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-95"
              >
                <span>{isAr ? primaryFeature.titleAr : primaryFeature.titleEn}</span>
                <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── 2. FEATURE CARDS GRID ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#4B9FE1]" />
            <span>{isAr ? 'الأدوات والخدمات المتاحة في هذا القسم' : 'Features Available in this Section'}</span>
          </h2>
          <span className="text-xs font-bold text-[#4B9FE1]">
            {isAr ? `${section.features.length} أدوات` : `${section.features.length} Features`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {section.features.map((feature) => {
            const FeatIcon = getSectionIconComponent(feature.iconName);
            const isReady = feature.status === 'ready';

            return (
              <div
                key={feature.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectFeature(feature)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectFeature(feature);
                  }
                }}
                aria-label={`${isAr ? feature.titleAr : feature.titleEn} — ${
                  isAr ? feature.statusLabelAr : feature.statusLabelEn
                }`}
                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#1A283D] border border-[#22354E] hover:border-[#1769AA]/70 hover:-translate-y-1 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl hover:shadow-[#1769AA]/15 outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] text-start"
              >
                <div className="space-y-3.5">
                  {/* Top: Icon + Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-[#131E2E] border border-[#22354E] group-hover:border-[#1769AA] group-hover:bg-[#1769AA] text-[#4B9FE1] group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-xs">
                      <FeatIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isReady
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isReady && <CheckCircle2 className="w-3 h-3" />}
                      <span>{isAr ? feature.statusLabelAr : feature.statusLabelEn}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-[#F8FAFC] group-hover:text-[#4B9FE1] transition-colors leading-snug line-clamp-1">
                    {isAr ? feature.titleAr : feature.titleEn}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-[#94A3B8] leading-relaxed line-clamp-3 min-h-[3rem]">
                    {isAr ? feature.descAr : feature.descEn}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(isAr ? feature.tagsAr : feature.tagsEn).map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 rounded-md text-[10px] bg-[#131E2E] text-[#94A3B8] border border-[#22354E]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Hint */}
                <div className="pt-4 mt-4 border-t border-[#22354E] flex items-center justify-between text-xs font-bold text-[#4B9FE1]">
                  <span>{isAr ? 'فتح الأداة مباشرة' : 'Launch Feature'}</span>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      isAr ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. CONTEXTUAL ACCESSIBILITY GUIDE ── */}
      <section className="p-5 rounded-2xl bg-[#131E2E] border border-[#22354E] space-y-2">
        <div className="flex items-center gap-2 text-[#4B9FE1]">
          <Info className="w-4 h-4 shrink-0" />
          <h3 className="text-xs font-bold text-[#F8FAFC]">
            {isAr ? 'إرشادات الوصول السريع والتنقل' : 'Accessibility & Navigation Tips'}
          </h3>
        </div>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          {isAr
            ? 'يمكنك التنقل بين هذه الأدوات باستخدام لوحة المفاتيح عبر زر Tab والضغط على Enter لتشغيل الأداة. تدعم جميع الأدوات التوجيه الصوتي والتنبيهات الاهتزازية وقارئات الشاشة (NVDA / TalkBack).'
            : 'You can navigate these features using Tab and Enter on keyboard. All features are fully compatible with screen readers (NVDA, VoiceOver, TalkBack) and high-contrast color themes.'}
        </p>
      </section>
    </div>
  );
}
