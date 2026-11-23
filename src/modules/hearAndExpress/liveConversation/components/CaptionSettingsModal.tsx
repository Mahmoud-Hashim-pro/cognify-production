import React from 'react';
import { X, Sliders, Eye, Shield, Check } from 'lucide-react';
import type { CaptionVisualSettings, CaptionTextSize, CaptionTheme, CaptionFontFamily, PrivacySettings } from '../types';

interface CaptionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualSettings: CaptionVisualSettings;
  privacySettings: PrivacySettings;
  onUpdateVisual: (settings: Partial<CaptionVisualSettings>) => void;
  onUpdatePrivacy: (retention: PrivacySettings['retentionPolicy']) => void;
  language: string;
}

export const CaptionSettingsModal: React.FC<CaptionSettingsModalProps> = ({
  isOpen,
  onClose,
  visualSettings,
  privacySettings,
  onUpdateVisual,
  onUpdatePrivacy,
  language,
}) => {
  if (!isOpen) return null;

  const isAr = language === 'ar' || language === 'ar-SA' || language === 'ar-EG';

  const textSizes: { id: CaptionTextSize; labelAr: string; labelEn: string; sizeRem: string }[] = [
    { id: 'standard', labelAr: 'قياسي (18px)', labelEn: 'Standard (18px)', sizeRem: '1.125rem' },
    { id: 'large', labelAr: 'كبير (24px)', labelEn: 'Large (24px)', sizeRem: '1.5rem' },
    { id: 'extra_large', labelAr: 'كبير جداً (30px)', labelEn: 'Extra Large (30px)', sizeRem: '1.875rem' },
    { id: 'huge', labelAr: 'ضخم (36px)', labelEn: 'Huge (36px)', sizeRem: '2.25rem' },
  ];

  const themes: { id: CaptionTheme; nameAr: string; nameEn: string; previewBg: string; previewText: string; previewBorder: string }[] = [
    {
      id: 'blue_companion',
      nameAr: 'رفيقي الأزرق (افتراضي)',
      nameEn: 'Rafiqi Blue (Default)',
      previewBg: '#071B33',
      previewText: '#12CFE0',
      previewBorder: '#12CFE0',
    },
    {
      id: 'dark_high_contrast',
      nameAr: 'تباين عالي داكن (أسود وأصفر)',
      nameEn: 'Dark High Contrast (Black & Yellow)',
      previewBg: '#000000',
      previewText: '#FFE500',
      previewBorder: '#FFE500',
    },
    {
      id: 'light_high_contrast',
      nameAr: 'تباين عالي فاتح (أبيض وكحلي)',
      nameEn: 'Light High Contrast (White & Navy)',
      previewBg: '#FFFFFF',
      previewText: '#051329',
      previewBorder: '#051329',
    },
    {
      id: 'amber_on_black',
      nameAr: 'عنبري على أسود (ضعاف البصر)',
      nameEn: 'Amber on Black (Low Vision)',
      previewBg: '#000000',
      previewText: '#FFB800',
      previewBorder: '#FFB800',
    },
    {
      id: 'yellow_on_navy',
      nameAr: 'أصفر كهربائي على كحلي',
      nameEn: 'Electric Yellow on Navy',
      previewBg: '#0A192F',
      previewText: '#FFFF00',
      previewBorder: '#FFFF00',
    },
  ];

  const fontFamilies: { id: CaptionFontFamily; labelAr: string; labelEn: string }[] = [
    { id: 'system', labelAr: 'خط النظام المعتاد (Sans)', labelEn: 'System Sans' },
    { id: 'rounded', labelAr: 'خط واضح دائري (Rounded)', labelEn: 'Clean Rounded' },
    { id: 'monospace', labelAr: 'خط متساوي المسافات (عسر القراءة)', labelEn: 'Monospace (Dyslexia Friendly)' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="caption-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#071B33] border-2 border-[#12CFE0]/40 rounded-2xl p-6 shadow-2xl text-[#F4F7FB]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#12CFE0]/20 mb-5">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#12CFE0]" aria-hidden="true" />
            <h2 id="caption-settings-title" className="text-lg font-extrabold text-[#F4F7FB]">
              {isAr ? 'إعدادات الترجمة والخصوصية' : 'Caption & Privacy Settings'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={isAr ? 'إغلاق الإعدادات' : 'Close Settings'}
            className="p-2 rounded-xl text-[#A9BDD3] hover:text-white hover:bg-[#102D4D] transition-colors focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Section 1: Text Size */}
        <div className="space-y-3 mb-6">
          <label className="text-sm font-bold text-[#12CFE0] flex items-center gap-2">
            <Eye className="w-4 h-4" aria-hidden="true" />
            <span>{isAr ? 'حجم خط الترجمة (للقراءة السهلة)' : 'Caption Font Size (Readability)'}</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {textSizes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onUpdateVisual({ textSize: s.id })}
                className={`py-3 px-3.5 rounded-xl border text-left font-bold transition-all flex items-center justify-between min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#12CFE0] ${
                  visualSettings.textSize === s.id
                    ? 'bg-[#1769AA] border-[#12CFE0] text-white shadow-md'
                    : 'bg-[#102D4D] border-[#12CFE0]/20 text-[#A9BDD3] hover:bg-[#15385E]'
                }`}
              >
                <span className="text-sm">{isAr ? s.labelAr : s.labelEn}</span>
                {visualSettings.textSize === s.id && <Check className="w-4 h-4 text-white" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Contrast Theme */}
        <div className="space-y-3 mb-6">
          <label className="text-sm font-bold text-[#12CFE0]">
            {isAr ? 'سمة التباين اللوني (معايير WCAG 2.2 AA)' : 'Contrast Theme (WCAG 2.2 AA Standards)'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onUpdateVisual({ theme: t.id })}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all min-h-[52px] focus-visible:ring-2 focus-visible:ring-[#12CFE0] ${
                  visualSettings.theme === t.id
                    ? 'border-[#12CFE0] ring-2 ring-[#12CFE0]/50'
                    : 'border-white/10 hover:border-white/30'
                }`}
                style={{ backgroundColor: t.previewBg }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center font-black text-xs"
                  style={{ borderColor: t.previewBorder, color: t.previewText }}
                >
                  Aa
                </div>
                <span
                  className="text-xs font-extrabold truncate"
                  style={{ color: t.previewText }}
                >
                  {isAr ? t.nameAr : t.nameEn}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Font Family */}
        <div className="space-y-3 mb-6">
          <label className="text-sm font-bold text-[#12CFE0]">
            {isAr ? 'نوع الخط' : 'Font Family'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {fontFamilies.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onUpdateVisual({ fontFamily: f.id })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#12CFE0] ${
                  visualSettings.fontFamily === f.id
                    ? 'bg-[#1769AA] border-[#12CFE0] text-white'
                    : 'bg-[#102D4D] border-[#12CFE0]/20 text-[#A9BDD3] hover:bg-[#15385E]'
                }`}
              >
                {isAr ? f.labelAr : f.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Section 4: Display Toggles */}
        <div className="space-y-3 mb-6 border-t border-[#12CFE0]/20 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#F4F7FB]">
              {isAr ? 'عرض الطوابع الزمنية' : 'Show Timestamps'}
            </span>
            <input
              type="checkbox"
              checked={visualSettings.showTimestamps}
              onChange={(e) => onUpdateVisual({ showTimestamps: e.target.checked })}
              className="w-5 h-5 accent-[#12CFE0] rounded cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#F4F7FB]">
              {isAr ? 'عرض أسماء المتحدثين' : 'Show Speaker Labels'}
            </span>
            <input
              type="checkbox"
              checked={visualSettings.showSpeakerLabels}
              onChange={(e) => onUpdateVisual({ showSpeakerLabels: e.target.checked })}
              className="w-5 h-5 accent-[#12CFE0] rounded cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#F4F7FB]">
              {isAr ? 'تمرير تلقائي لأسفل مع الكلام الجديد' : 'Auto-scroll to latest captions'}
            </span>
            <input
              type="checkbox"
              checked={visualSettings.autoScroll}
              onChange={(e) => onUpdateVisual({ autoScroll: e.target.checked })}
              className="w-5 h-5 accent-[#12CFE0] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Section 5: Privacy & Audio Security Disclosure */}
        <div className="border-t border-[#12CFE0]/20 pt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
            <Shield className="w-4 h-4" aria-hidden="true" />
            <span>{isAr ? 'ضمان الخصوصية وعدم حفظ الصوت' : 'Privacy & Audio Security Policy'}</span>
          </div>
          <p className="text-xs text-[#A9BDD3] leading-relaxed">
            {isAr
              ? 'التعرف الصوتي يتم معالجته لحظياً عبر واجهة المتصفح المدعومة. رفيقي لا يسجل أو يخزن أي ملفات صوتية خام على خوادمه نهائياً.'
              : 'Speech recognition is processed in real time via the supported browser speech engine. Rafiqi never records or stores raw audio on any server.'}
          </p>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-[#A9BDD3]">
              {isAr ? 'سياسة الاحتفاظ بالنصوص المترجمة:' : 'Transcript Retention Policy:'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdatePrivacy('session_only')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  privacySettings.retentionPolicy === 'session_only'
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-[#102D4D] border-white/10 text-[#A9BDD3]'
                }`}
              >
                {isAr ? 'أثناء الجلسة فقط (تمسح عند الإغلاق)' : 'Session Only (Cleared on Exit)'}
              </button>
              <button
                type="button"
                onClick={() => onUpdatePrivacy('local_storage')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  privacySettings.retentionPolicy === 'local_storage'
                    ? 'bg-[#1769AA] border-[#12CFE0] text-white'
                    : 'bg-[#102D4D] border-white/10 text-[#A9BDD3]'
                }`}
              >
                {isAr ? 'حفظ محلي بالجهاز (مشفر في المتصفح)' : 'Save Locally on Device'}
              </button>
            </div>
          </div>
        </div>

        {/* Done Button */}
        <div className="mt-6 pt-4 border-t border-[#12CFE0]/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-[#1769AA] hover:bg-[#076D78] text-white font-bold text-sm transition-all focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
          >
            {isAr ? 'حفظ وتطبيق' : 'Apply & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
