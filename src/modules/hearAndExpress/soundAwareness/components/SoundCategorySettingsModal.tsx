import React from 'react';
import {
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Vibrate,
  ShieldAlert,
} from 'lucide-react';
import type {
  SoundEventCategory,
  SoundCategoryConfig,
  SoundAwarenessConfig,
  AlertSeverity,
} from '../types';

interface SoundCategorySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SoundAwarenessConfig;
  onUpdateCategory: (category: SoundEventCategory, updates: Partial<SoundCategoryConfig>) => void;
  onToggleVibration: (enabled: boolean) => void;
  isArabic?: boolean;
}

export const SoundCategorySettingsModal: React.FC<SoundCategorySettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateCategory,
  onToggleVibration,
  isArabic = true,
}) => {
  if (!isOpen) return null;

  const categories = Object.values(config.categories);

  const getStatusBadge = (status: SoundCategoryConfig['modelStatus']) => {
    switch (status) {
      case 'active_verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isArabic ? 'متحقق منه' : 'Active Verified'}
          </span>
        );
      case 'model_weights_required':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            {isArabic ? 'يتطلب نموذجاً' : 'Model Required'}
          </span>
        );
      case 'user_configured':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <HelpCircle className="w-3.5 h-3.5" />
            {isArabic ? 'معايرة مستخدم' : 'User Configured'}
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sound-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-col w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 id="sound-settings-title" className="text-xl font-bold text-white">
                {isArabic ? 'إعدادات رصد الأصوات البيئية' : 'Environmental Sound Awareness Settings'}
              </h2>
              <p className="text-xs text-slate-400">
                {isArabic
                  ? 'ضبط الحساسية، والأولويات، واختيار الأصوات المفعلة'
                  : 'Configure sensitivity, alert priorities, and active categories'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={isArabic ? 'إغلاق' : 'Close'}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Global Controls & Notice */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/40 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
            <div className="flex items-center gap-3">
              <Vibrate className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-sm font-semibold text-white block">
                  {isArabic ? 'الاهتزاز اللمسي (Haptic Vibration)' : 'Haptic Vibration Feedback'}
                </span>
                <span className="text-xs text-slate-400 block">
                  {isArabic
                    ? 'اهتزاز الهاتف بأنماط مميزة عند حدوث التنبيهات'
                    : 'Vibrate device with distinct patterns upon sound detection'}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableVibration}
                onChange={(e) => onToggleVibration(e.target.checked)}
                className="sr-only peer"
                aria-label={isArabic ? 'تفعيل الاهتزاز' : 'Enable vibration'}
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <span>
              {isArabic
                ? 'إفصاح هندسي: الفئات التي تتطلب نماذج تعلم عميق (مثل بكاء الأطفال ونباح الكلاب) موضحة بصدق، ولن يتم إطلاق تنبيهات زائفة مبنية على عتبات ترددية عشوائية.'
                : 'Engineering Transparency: Categories requiring deep learning models (baby crying, dog barking) are honestly labeled. We never fake AI classification using arbitrary FFT thresholds.'}
            </span>
          </div>
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {categories.map((cat) => (
            <div
              key={cat.category}
              className={`p-4 rounded-2xl border transition-all ${
                cat.isEnabled
                  ? 'bg-slate-800/40 border-slate-700'
                  : 'bg-slate-900/30 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-base text-white">
                    {isArabic ? cat.nameAr : cat.nameEn}
                  </span>
                  {getStatusBadge(cat.modelStatus)}
                </div>

                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cat.isEnabled}
                      onChange={(e) =>
                        onUpdateCategory(cat.category, { isEnabled: e.target.checked })
                      }
                      className="sr-only peer"
                      aria-label={`${isArabic ? cat.nameAr : cat.nameEn} toggle`}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                {isArabic ? cat.descriptionAr : cat.descriptionEn}
              </p>

              {/* Sensitivity and Priority controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-700/50 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    {isArabic ? 'الحساسية الصوتية:' : 'Acoustic Sensitivity:'}
                  </label>
                  <select
                    value={cat.sensitivity}
                    onChange={(e) =>
                      onUpdateCategory(cat.category, {
                        sensitivity: e.target.value as 'low' | 'medium' | 'high',
                      })
                    }
                    disabled={!cat.isEnabled}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="low">{isArabic ? 'منخفضة (أصوات مرتفعة فقط)' : 'Low (Loud only)'}</option>
                    <option value="medium">{isArabic ? 'متوسطة (متوازنة)' : 'Medium (Balanced)'}</option>
                    <option value="high">{isArabic ? 'عالية (أصوات هادئة وحساسة)' : 'High (Sensitive)'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    {isArabic ? 'مستوى خطورة التنبيه:' : 'Alert Priority Level:'}
                  </label>
                  <select
                    value={cat.userPriority}
                    onChange={(e) =>
                      onUpdateCategory(cat.category, {
                        userPriority: e.target.value as AlertSeverity,
                      })
                    }
                    disabled={!cat.isEnabled}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="info">{isArabic ? 'معلوماتي (أزرق)' : 'Informational (Blue)'}</option>
                    <option value="warning">{isArabic ? 'تحذيري (أصفر)' : 'Warning (Amber)'}</option>
                    <option value="danger">{isArabic ? 'خطر حرج (أحمر)' : 'Critical Danger (Red)'}</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all focus:ring-4 focus:ring-indigo-500/50"
          >
            {isArabic ? 'حفظ وإغلاق' : 'Save & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
