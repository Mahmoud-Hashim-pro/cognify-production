import React, { useState, useEffect, useRef } from 'react';
import { L } from '../../../../lib/translations';
import {
  Sliders,
  Shield,
  Eye,
  Volume2,
  Bell,
  Trash2,
  Download,
  RotateCcw,
  Sparkles,
  Check,
  AlertTriangle,
  Info,
  Layers,
  Mic,
  Video,
  Lock,
  Heart,
  X,
} from 'lucide-react';
import { HearAndExpressPersonalizationEngine } from '../personalizationEngine';
import { HearAndExpressPrivacyManager } from '../privacyManager';
import type {
  HearAndExpressPreferences,
  CaptionSize,
  CaptionTheme,
  ContrastLevel,
  AlertPresentationMode,
  AlertPriorityThreshold,
  TranscriptRetentionPolicy,
  PrivacyConsentRecord,
  PermissionStateAudit,
} from '../types';

interface HearAndExpressPersonalizationCenterProps {
  isArabic?: boolean;
}

type TabKey = 'visuals' | 'speech_aac' | 'sound_alerts' | 'privacy';

export const HearAndExpressPersonalizationCenter: React.FC<HearAndExpressPersonalizationCenterProps> = ({
  isArabic = true,
}) => {
  const engineRef = useRef<HearAndExpressPersonalizationEngine | null>(null);
  const privacyRef = useRef<HearAndExpressPrivacyManager | null>(null);

  if (!engineRef.current) engineRef.current = new HearAndExpressPersonalizationEngine();
  if (!privacyRef.current) privacyRef.current = new HearAndExpressPrivacyManager();

  const engine = engineRef.current;
  const privacy = privacyRef.current;

  // ─── Reactive State ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('visuals');
  const [prefs, setPrefs] = useState<HearAndExpressPreferences>(engine.getPreferences());
  const [consent, setConsent] = useState<PrivacyConsentRecord>(privacy.getConsent());
  const [permissions, setPermissions] = useState<PermissionStateAudit>(privacy.getPermissionAudit());
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [confirmEraseModal, setConfirmEraseModal] = useState(false);

  useEffect(() => {
    const unsubPrefs = engine.subscribe((p) => setPrefs(p));
    const unsubConsent = privacy.subscribe((c) => {
      setConsent(c);
      setPermissions(privacy.getPermissionAudit());
    });
    return () => {
      unsubPrefs();
      unsubConsent();
    };
  }, [engine, privacy]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const updatePref = (partial: Partial<HearAndExpressPreferences>, announcementText?: string) => {
    const updated = engine.updatePreferences(partial);
    setPrefs(updated);
    if (announcementText) setLiveAnnouncement(announcementText);
  };

  const handleApplyPreset = (preset: 'high_visual' | 'acoustic_focus' | 'motor_scanning' | 'calm_minimal') => {
    const updated = engine.applyPreset(preset);
    setPrefs(updated);
    setLiveAnnouncement(isArabic ? 'تم تطبيق النمط الموصى به' : L('Preset profile applied'));
  };

  const handleExportData = () => {
    const pkg = engine.generateFullExportPackage(privacy);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pkg, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `rafiqi_privacy_profile_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
    setLiveAnnouncement(isArabic ? 'تم تنزيل حزمة البيانات الشخصية' : L('Data package downloaded'));
  };

  const handleExecuteErase = () => {
    const res = privacy.deleteAllUserData();
    engine.resetToDefaults();
    setConfirmEraseModal(false);
    setLiveAnnouncement(
      isArabic
        ? `تم مسح جميع البيانات المحلية بنجاح (${res.erasedKeys.length} مفتاح)`
        : `All local user data permanently erased (${res.erasedKeys.length} keys)`
    );
  };

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6"
    >
      {/* Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* ─── Top Header & Non-Disclosure Banner ────────────────────────────── */}
      <header className="mb-6 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Sliders className="w-7 h-7" />
              {isArabic ? 'مركز التخصيص والخصوصية والإتاحة الشاملة' : L('Personalization & Privacy Center')}
            </h1>
            <p className="text-xs opacity-75 mt-0.5">
              {isArabic
                ? 'تحكم كامل في التسميات، النطق، الوعي الصوتي، لوحات AAC، وسيادة البيانات وحفظها'
                : L('Complete control over captions, TTS, sound alerts, AAC, privacy & data sovereignty')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                engine.resetToDefaults();
                setLiveAnnouncement(isArabic ? 'تمت استعادة الإعدادات الافتراضية' : L('Reset to defaults'));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isArabic ? 'استعادة الافتراضي' : L('Reset Defaults')}
            </button>
          </div>
        </div>

        {/* Ethical Non-Disclosure Guarantee */}
        <div className="mt-3 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2.5 text-emerald-900 dark:text-emerald-300">
          <Shield className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>
            {isArabic
              ? 'مبدأ العدالة وعدم الإفصاح: لا يُطلب من أي مستخدم أبداً الإفصاح عن تشخيص طبي أو تسجيل إعاقة للوصول إلى كافة الميزات واستخدامها بحرية.'
              : L('Universal Equity Rule: Users are never required to disclose a clinical diagnosis or register a disability to access any feature.')}
          </span>
        </div>
      </header>

      {/* ─── Quick Presets Bar (No Medical Declaration Needed) ─────────────── */}
      <section aria-label={isArabic ? 'الأنماط السريعة' : L('Quick Ergonomic Presets')} className="mb-6">
        <div className="flex items-center justify-between mb-2 text-xs font-bold opacity-75">
          <span>{isArabic ? 'أنماط مريحة جاهزة للتطبيق بنقرة واحدة:' : L('One-Click Quick Presets:')}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: 'high_visual', labelAr: 'تباين عالي وحجم مكبّر', labelEn: 'High Visual Contrast', icon: Eye },
            { key: 'acoustic_focus', labelAr: 'تركيز التنبيهات الصوتية', labelEn: 'Acoustic Sound Focus', icon: Bell },
            { key: 'motor_scanning', labelAr: 'مفاتيح وصول حركي (AAC)', labelEn: 'Motor Switch Access', icon: Layers },
            { key: 'calm_minimal', labelAr: 'نمط هادئ ومبسّط', labelEn: 'Calm & Minimal', icon: Sparkles },
          ].map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                onClick={() => handleApplyPreset(p.key as any)}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 flex flex-col items-center justify-center gap-1.5 text-xs font-bold text-center shadow-xs transition-all active:scale-95"
              >
                <Icon className="w-4 h-4 text-indigo-600" />
                <span>{isArabic ? p.labelAr : p.labelEn}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Navigation Tabs ───────────────────────────────────────────────── */}
      <nav aria-label={isArabic ? 'أقسام الإعدادات' : L('Settings Categories')} className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { id: 'visuals', labelAr: 'التسميات والعرض البصري', labelEn: 'Captions & Visuals', icon: Eye },
            { id: 'speech_aac', labelAr: 'الصوت والنطق ولوحات AAC', labelEn: 'Speech, TTS & AAC', icon: Volume2 },
            { id: 'sound_alerts', labelAr: 'التنبيهات والوعي الصوتي', labelEn: 'Sound Alerts & Radar', icon: Bell },
            { id: 'privacy', labelAr: 'الخصوصية والسيادة ومسح البيانات', labelEn: 'Privacy & Data Deletion', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`min-h-[52px] p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-102'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{isArabic ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ─── Tab 1: Visuals & Captions ──────────────────────────────────────── */}
      {activeTab === 'visuals' && (
        <section aria-label={isArabic ? 'تفضيلات العرض والتسميات' : L('Captions and Visual Preferences')} className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              {isArabic ? 'حجم خط التسميات التوضيحية المباشرة' : L('Caption Text Size')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['normal', 'large', 'xl', 'xxl'] as CaptionSize[]).map((sz) => (
                <button
                  key={sz}
                  onClick={() => updatePref({ captionSize: sz }, isArabic ? `تم ضبط حجم الخط: ${sz}` : `Set caption size: ${sz}`)}
                  className={`p-3 rounded-xl border text-center font-bold text-xs uppercase ${
                    prefs.captionSize === sz
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            <h2 className="text-sm font-bold uppercase tracking-wider pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              {isArabic ? 'سمة الألوان والتباين (Theme & Contrast)' : L('Color Theme & Contrast')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'yellow_on_black', labelAr: 'أصفر على أسود (أعلى وضوح)', labelEn: 'Yellow on Black' },
                { id: 'high_contrast', labelAr: 'أبيض على أسود', labelEn: 'White on Black' },
                { id: 'blue_companion', labelAr: 'الأزرق المريح للعين', labelEn: 'Comfort Blue' },
                { id: 'dark', labelAr: 'داكن كلاسيكي', labelEn: 'Classic Dark' },
                { id: 'light', labelAr: 'فاتح نهاري', labelEn: 'Light Theme' },
              ].map((thm) => (
                <button
                  key={thm.id}
                  onClick={() => updatePref({ captionTheme: thm.id as CaptionTheme })}
                  className={`p-3 rounded-xl border text-xs font-bold text-center ${
                    prefs.captionTheme === thm.id
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {isArabic ? thm.labelAr : thm.labelEn}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">{isArabic ? 'تقليل الحركة (Reduced Motion):' : L('Reduced Motion:')}</span>
                <span className="text-xs opacity-70">
                  {isArabic ? 'إيقاف التحريكات والوميض المفرط لراحة المستخدم' : L('Disables excessive animations and flashing')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.reducedMotion}
                onChange={(e) => updatePref({ reducedMotion: e.target.checked })}
                className="w-5 h-5 rounded text-indigo-600"
              />
            </div>
          </div>
        </section>
      )}

      {/* ─── Tab 2: Speech, TTS & AAC ───────────────────────────────────────── */}
      {activeTab === 'speech_aac' && (
        <section aria-label={isArabic ? 'تفضيلات الصوت و AAC' : L('Speech and AAC Preferences')} className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-600" />
              {isArabic ? 'اللغة واللهجة المنطوقة المفضلة' : L('Language & Spoken Dialect')}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updatePref({ arabicDialect: 'Arabic' })}
                className={`p-3 rounded-xl border text-xs font-bold ${
                  prefs.arabicDialect === 'Arabic'
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                {isArabic ? 'العربية الفصحى (Modern Standard Arabic)' : L('Modern Standard Arabic')}
              </button>
              <button
                onClick={() => updatePref({ arabicDialect: 'Egyptian Ammiya' })}
                className={`p-3 rounded-xl border text-xs font-bold ${
                  prefs.arabicDialect === 'Egyptian Ammiya'
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                {isArabic ? 'العامية المصرية (Egyptian Ammiya)' : L('Egyptian Colloquial Arabic')}
              </button>
            </div>

            {/* TTS Speed */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between font-bold text-xs mb-1">
                <span>{isArabic ? 'سرعة نطق الصوت (TTS):' : L('Speech Speed (TTS):')}</span>
                <span>{prefs.ttsSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={prefs.ttsSpeed}
                onChange={(e) => updatePref({ ttsSpeed: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Confirm Critical Messages */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">
                  {isArabic ? 'تأكيد الرسائل الحرجة قبل النطق:' : L('Confirm Critical Messages:')}
                </span>
                <span className="text-xs opacity-70">
                  {isArabic ? 'طلب تأكيد صريح قبل نطق نداءات الطوارئ أو النصوص المعدلة' : L('Require confirmation before speaking emergency/altered messages')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.confirmCriticalMessages}
                onChange={(e) => updatePref({ confirmCriticalMessages: e.target.checked })}
                className="w-5 h-5 rounded text-indigo-600"
              />
            </div>

            {/* AAC Grid Size & Switch Scanning */}
            <h2 className="text-sm font-bold uppercase tracking-wider pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              {isArabic ? 'تخطيط شبكة لوحة AAC والمسح الحركي' : L('AAC Grid & Switch Scanning')}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(['2x3', '3x4', '4x6'] as const).map((grid) => (
                <button
                  key={grid}
                  onClick={() => updatePref({ aacGridSize: grid })}
                  className={`p-3 rounded-xl border text-xs font-bold ${
                    prefs.aacGridSize === grid
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {grid}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">
                  {isArabic ? 'تفعيل المسح بالمفتاح (Switch Scanning):' : L('Enable Switch Scanning:')}
                </span>
                <span className="text-xs opacity-70">
                  {isArabic ? 'مسح تلقائي عبر مفتاح المسافة Space ومفتاح Enter' : L('Auto scanning via Space & Enter keys')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.aacSwitchScanningEnabled}
                onChange={(e) => updatePref({ aacSwitchScanningEnabled: e.target.checked })}
                className="w-5 h-5 rounded text-indigo-600"
              />
            </div>
          </div>
        </section>
      )}

      {/* ─── Tab 3: Sound Alerts & Presentation ────────────────────────────── */}
      {activeTab === 'sound_alerts' && (
        <section aria-label={isArabic ? 'تفضيلات الوعي الصوتي' : L('Sound Alerts Preferences')} className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              {isArabic ? 'طريقة عرض التنبيهات الصوتية' : L('Alert Presentation Mode')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'banner', labelAr: 'شريط علوي مباشر', labelEn: 'Top Banner' },
                { id: 'modal', labelAr: 'نافذة تأكيدية فورية', labelEn: 'Immediate Modal' },
                { id: 'vibration_only', labelAr: 'اهتزاز فقط (صامت)', labelEn: 'Vibration Only' },
                { id: 'silent_visual', labelAr: 'إشارة بصرية صامتة', labelEn: 'Silent Visual' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => updatePref({ alertPresentation: mode.id as AlertPresentationMode })}
                  className={`p-3 rounded-xl border text-xs font-bold text-center ${
                    prefs.alertPresentation === mode.id
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {isArabic ? mode.labelAr : mode.labelEn}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="font-bold text-sm block mb-1">
                {isArabic ? 'حد أولوية التنبيهات المطلوبة:' : L('Alert Priority Filter:')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', labelAr: 'جميع الأصوات والأحداث' },
                  { id: 'warning_and_danger', labelAr: 'التحذيرات والطوارئ فقط' },
                  { id: 'danger_only', labelAr: 'الإنذارات الخطيرة فقط' },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => updatePref({ alertPriorityThreshold: th.id as AlertPriorityThreshold })}
                    className={`p-2.5 rounded-xl border text-xs font-bold ${
                      prefs.alertPriorityThreshold === th.id
                        ? 'bg-indigo-600 text-white border-indigo-700'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {th.labelAr}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">{isArabic ? 'تفعيل الاهتزاز (Haptic Vibration):' : L('Enable Vibration Alerts:')}</span>
                <span className="text-xs opacity-70">
                  {isArabic ? 'نبضات اهتزاز متناسبة مع نوع وخطورة الصوت' : L('Vibration patterns matching sound signature')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.enableVibrationAlerts}
                onChange={(e) => updatePref({ enableVibrationAlerts: e.target.checked })}
                className="w-5 h-5 rounded text-indigo-600"
              />
            </div>
          </div>
        </section>
      )}

      {/* ─── Tab 4: Privacy & Data Deletion ─────────────────────────────────── */}
      {activeTab === 'privacy' && (
        <section aria-label={isArabic ? 'الخصوصية وسيادة البيانات' : L('Privacy and Data Governance')} className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs sm:text-sm">
            {/* Transparent Processing Disclosure Banner */}
            <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
                <Info className="w-4 h-4 shrink-0" />
                <span>{isArabic ? 'إفصاح الشفافية الكامل لمعالجة البيانات' : L('Processing Transparency Disclosure')}</span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {privacy.getTransparencyDisclosure().disclosureStatementAr}
              </p>
            </div>

            {/* Permission Auditing Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Mic className="w-5 h-5 text-indigo-600" />
                  <div>
                    <div className="font-bold">{isArabic ? 'إذن الميكروفون' : L('Microphone Permission')}</div>
                    <div className="text-xs opacity-70 capitalize">{permissions.microphone}</div>
                  </div>
                </div>
                {permissions.microphone === 'granted' ? (
                  <button
                    onClick={() => privacy.revokeMicrophoneConsent()}
                    className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100"
                  >
                    {isArabic ? 'سحب الإذن' : L('Revoke')}
                  </button>
                ) : (
                  <button
                    onClick={() => privacy.grantMicrophoneConsent()}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                  >
                    {isArabic ? 'منح الإذن' : L('Grant')}
                  </button>
                )}
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Video className="w-5 h-5 text-indigo-600" />
                  <div>
                    <div className="font-bold">{isArabic ? 'إذن الكاميرا (للإشارة فقط)' : L('Camera Permission')}</div>
                    <div className="text-xs opacity-70 capitalize">{permissions.camera}</div>
                  </div>
                </div>
                {permissions.camera === 'granted' ? (
                  <button
                    onClick={() => privacy.revokeCameraConsent()}
                    className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100"
                  >
                    {isArabic ? 'سحب الإذن' : L('Revoke')}
                  </button>
                ) : (
                  <button
                    onClick={() => privacy.grantCameraConsent()}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                  >
                    {isArabic ? 'منح الإذن' : L('Grant')}
                  </button>
                )}
              </div>
            </div>

            {/* Retention Policy */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="font-bold text-xs uppercase block mb-1">
                {isArabic ? 'سياسة الاحتفاظ بنصوص المحادثات:' : L('Transcript Retention Policy:')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'session_only', labelAr: 'أثناء الجلسة الحالية فقط (محو فوري عند الإغلاق)' },
                  { id: 'ephemeral_15min', labelAr: 'مؤقتة (محو تلقائي بعد 15 دقيقة)' },
                  { id: 'local_persistent', labelAr: 'حفظ محلي دائم في المتصفح' },
                ].map((pol) => (
                  <button
                    key={pol.id}
                    onClick={() => privacy.setTranscriptRetention(pol.id as TranscriptRetentionPolicy)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center ${
                      consent.transcriptRetention === pol.id
                        ? 'bg-indigo-600 text-white border-indigo-700'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {pol.labelAr}
                  </button>
                ))}
              </div>
            </div>

            {/* Sovereign Data Export & Deletion */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
              <button
                onClick={handleExportData}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
              >
                <Download className="w-4 h-4" />
                {isArabic ? 'تصدير كامل الملف الشخصي والبيانات (JSON)' : L('Export Full Data Package')}
              </button>

              <button
                onClick={() => {
                  privacy.withdrawAllConsent();
                  setLiveAnnouncement(isArabic ? 'تم سحب جميع أذونات المعالجة' : L('All consents withdrawn'));
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold hover:bg-amber-100"
              >
                <Lock className="w-4 h-4" />
                {isArabic ? 'سحب كامل الأذونات والموافقات' : L('Withdraw All Consent')}
              </button>

              <button
                onClick={() => setConfirmEraseModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 ml-auto shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                {isArabic ? 'محو ومسح شامل لجميع البيانات' : L('Permanently Erase All Data')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── Modal: Confirm Permanent Data Erase ────────────────────────────── */}
      {confirmEraseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600 mb-3 font-bold">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold">
                {isArabic ? 'تأكيد المسح الشامل للبيانات' : L('Confirm Complete Data Erase')}
              </h3>
            </div>
            <p className="text-xs opacity-80 leading-relaxed mb-6">
              {isArabic
                ? 'سيتم محو جميع لوحات AAC المخصصة، والرموز الشخصية، والملاحظات المحفوظة، وتفضيلات الخط والألوان نهائياً من الذاكرة المحلية لجهازك. هذا الإجراء نهائي ولا يمكن التراجع عنه.'
                : L('All custom AAC boards, custom symbols, saved notes, and preferences will be permanently wiped from your local device storage. This action cannot be undone.')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmEraseModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                {isArabic ? 'إلغاء' : L('Cancel')}
              </button>
              <button
                onClick={handleExecuteErase}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md"
              >
                {isArabic ? 'تأكيد المحو النهائي' : L('Confirm Permanent Erase')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
