import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Flame,
  Bell,
  DoorClosed,
  Volume2,
  AlertTriangle,
  Settings,
  ShieldAlert,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
} from 'lucide-react';
import type { SoundMeasurement } from '../../types';
import type {
  SoundAlert,
  SoundCategoryConfig,
  SoundAwarenessConfig,
  SoundEventCategory,
} from '../types';
import { SAFETY_LIMITATION_NOTICE } from '../types';
import { SoundAwarenessEngine } from '../soundEngine';
import { AlertNotificationModal } from './AlertNotificationModal';
import { SoundCategorySettingsModal } from './SoundCategorySettingsModal';

interface SoundAwarenessInterfaceProps {
  isArabic?: boolean;
}

export const SoundAwarenessInterface: React.FC<SoundAwarenessInterfaceProps> = ({
  isArabic = true,
}) => {
  const engineRef = useRef<SoundAwarenessEngine | null>(null);

  // Initialize engine once
  if (!engineRef.current) {
    engineRef.current = new SoundAwarenessEngine();
  }
  const engine = engineRef.current;

  // React state
  const [isListening, setIsListening] = useState(false);
  const [currentMeasurement, setCurrentMeasurement] = useState<SoundMeasurement | null>(null);
  const [activeAlert, setActiveAlert] = useState<SoundAlert | null>(null);
  const [alertHistory, setAlertHistory] = useState<SoundAlert[]>([]);
  const [config, setConfig] = useState<SoundAwarenessConfig>(engine.getConfig());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscribe to engine events
  useEffect(() => {
    const unsubMeasurement = engine.subscribeMeasurement((m) => {
      setCurrentMeasurement(m);
    });

    const unsubAlert = engine.subscribeAlert((alert) => {
      setActiveAlert(alert);
      setAlertHistory(engine.getAlertHistory());
    });

    const unsubDismiss = () => {
      setAlertHistory(engine.getAlertHistory());
    };
    const unsubDismissListener = engine.subscribeDismiss(unsubDismiss);

    return () => {
      unsubMeasurement();
      unsubAlert();
      unsubDismissListener();
      engine.stop();
    };
  }, [engine]);

  const handleToggleListening = async () => {
    if (isListening) {
      engine.stop();
      setIsListening(false);
      setCurrentMeasurement(null);
    } else {
      setErrorMessage(null);
      const success = await engine.start();
      if (success) {
        setIsListening(true);
      } else {
        setErrorMessage(
          isArabic
            ? 'تعذر الوصول إلى الميكروفون. يرجى التأكد من منح الإذن للمتصفح.'
            : 'Could not access microphone. Please ensure microphone permissions are granted.'
        );
      }
    }
  };

  const handleDismissAlert = (alertId: string) => {
    engine.dismissAlert(alertId);
    if (activeAlert?.id === alertId) {
      setActiveAlert(null);
    }
    setAlertHistory(engine.getAlertHistory());
  };

  const handleSnooze = (alert: SoundAlert, durationMinutes: number) => {
    engine.snoozeCategory(alert.category, durationMinutes);
    handleDismissAlert(alert.id);
  };

  const handleClearHistory = () => {
    engine.clearAlertHistory();
    setAlertHistory([]);
  };

  const handleUpdateCategory = (
    category: SoundEventCategory,
    updates: Partial<SoundCategoryConfig>
  ) => {
    engine.updateCategoryConfig(category, updates);
    setConfig(engine.getConfig());
  };

  const handleToggleVibration = (enabled: boolean) => {
    engine.setEnableVibration(enabled);
    setConfig(engine.getConfig());
  };

  // Visual dB bar helpers
  const db = currentMeasurement?.decibels || 0;
  const dbPercentage = Math.min(100, Math.max(0, (db / 110) * 100));

  const getMeterColor = (val: number) => {
    if (val >= 85) return 'bg-red-500 shadow-red-500/50';
    if (val >= 70) return 'bg-amber-500 shadow-amber-500/50';
    return 'bg-emerald-500 shadow-emerald-500/50';
  };

  const categoriesList = useMemo(() => Object.values(config.categories), [config]);

  const getCategoryIcon = (category: SoundEventCategory) => {
    switch (category) {
      case 'fire_alarm':
      case 'smoke_alarm':
        return <Flame className="w-5 h-5 text-red-400" />;
      case 'doorbell':
        return <Bell className="w-5 h-5 text-blue-400" />;
      case 'knocking':
        return <DoorClosed className="w-5 h-5 text-amber-400" />;
      default:
        return <Volume2 className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div
      className="flex flex-col w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6 text-slate-100"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Volume2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">
                {isArabic ? 'نظام الانتباه للأصوات البيئية' : 'Sound Awareness Engine'}
              </h1>
              <p className="text-sm text-slate-400">
                {isArabic
                  ? 'رصد ذكي للأصوات المهمة للأفراد الصم وضعاف السمع'
                  : 'Smart acoustic awareness for Deaf & Hard of Hearing individuals'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSettingsOpen(true)}
            aria-label={isArabic ? 'فتح الإعدادات' : 'Open Settings'}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all focus:ring-2 focus:ring-indigo-500"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={handleToggleListening}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg focus:outline-none focus:ring-4 ${
              isListening
                ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/50'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500/50'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5" />
                <span>{isArabic ? 'إيقاف الاستماع' : 'Stop Listening'}</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>{isArabic ? 'بدء الاستماع' : 'Start Listening'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Real-time Acoustic Visualizer Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isListening ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'
              }`}
            />
            <span className="font-bold text-base text-white">
              {isListening
                ? isArabic
                  ? 'مستوى الصوت البيئي المباشر'
                  : 'Live Environmental Sound Level'
                : isArabic
                ? 'الاستماع متوقف'
                : 'Listening Inactive'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              {isArabic ? 'الضجيج الأساسي:' : 'Noise Floor:'}{' '}
              <strong className="text-slate-200">
                {currentMeasurement ? `${Math.round(db - 15)} dB` : '--'}
              </strong>
            </span>
            <span>•</span>
            <span>
              {isArabic ? 'النمط:' : 'Pattern:'}{' '}
              <strong className="text-indigo-300">
                {currentMeasurement?.detectedPattern || (isArabic ? 'سكون' : 'Idle')}
              </strong>
            </span>
          </div>
        </div>

        {/* Big Decibel Meter */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
              {isListening ? `${db}` : '--'}{' '}
              <span className="text-base sm:text-lg font-normal text-slate-400">dB SPL</span>
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {db >= 85
                ? isArabic
                  ? 'صوت حرج / خطر 🚨'
                  : 'Critical / Loud 🚨'
                : db >= 70
                ? isArabic
                  ? 'صوت متوسط / تنبيه ⚠️'
                  : 'Moderate / Alert ⚠️'
                : isArabic
                ? 'صوت هادئ ومستقر 🟢'
                : 'Normal / Quiet 🟢'}
            </span>
          </div>

          {/* Visual Decibel Gauge Bar */}
          <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className={`h-full rounded-full transition-all duration-150 shadow-md ${getMeterColor(
                db
              )}`}
              style={{ width: `${isListening ? dbPercentage : 0}%` }}
            />
          </div>
        </div>

        {/* Frequency Band Breakdown */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center">
            <span className="text-slate-400 block mb-1">
              {isArabic ? 'التردد المنخفض (باس)' : 'Low Bass (<300Hz)'}
            </span>
            <span className="text-base font-bold text-white">
              {currentMeasurement ? `${Math.round(currentMeasurement.frequencyBand.low * 100)}%` : '--'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center">
            <span className="text-slate-400 block mb-1">
              {isArabic ? 'التردد المتوسط (صوت)' : 'Mid Vocal (300-2500Hz)'}
            </span>
            <span className="text-base font-bold text-white">
              {currentMeasurement ? `${Math.round(currentMeasurement.frequencyBand.mid * 100)}%` : '--'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center">
            <span className="text-slate-400 block mb-1">
              {isArabic ? 'التردد العالي (صفارات)' : 'High Pitch (>2500Hz)'}
            </span>
            <span className="text-base font-bold text-white">
              {currentMeasurement ? `${Math.round(currentMeasurement.frequencyBand.high * 100)}%` : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Sound Categories Status Grid */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {isArabic ? 'حالة الأصوات الـ 11 المدعومة' : 'Supported Sound Event Categories (11)'}
          </h2>
          <span className="text-xs text-slate-400">
            {isArabic ? 'شفافية منهجية الرصد' : 'Authentic Detection Disclosure'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categoriesList.map((cat) => {
            const isSnoozed = engine.isCategorySnoozed(cat.category);
            return (
              <div
                key={cat.category}
                className={`p-3.5 rounded-2xl border transition-all ${
                  cat.isEnabled
                    ? 'bg-slate-800/40 border-slate-700/80'
                    : 'bg-slate-900/30 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-slate-800 text-white">
                      {getCategoryIcon(cat.category)}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">
                        {isArabic ? cat.nameAr : cat.nameEn}
                      </span>
                      {isSnoozed && (
                        <span className="text-[10px] text-amber-400 font-semibold">
                          {isArabic ? 'موقوف مؤقتاً' : 'Snoozed'}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      cat.modelStatus === 'active_verified'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : cat.modelStatus === 'user_configured'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {cat.modelStatus === 'active_verified'
                      ? isArabic
                        ? 'توقيع معتمد'
                        : 'Verified Cadence'
                      : cat.modelStatus === 'user_configured'
                      ? isArabic
                        ? 'معايرة'
                        : 'Configured'
                      : isArabic
                      ? 'نموذج مطلوب'
                      : 'Weights Req'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {isArabic ? cat.descriptionAr : cat.descriptionEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Alert History Feed */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">
              {isArabic ? 'سجل التنبيهات الأخيرة' : 'Recent Alert History'}
            </h2>
          </div>
          {alertHistory.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isArabic ? 'مسح السجل' : 'Clear History'}</span>
            </button>
          )}
        </div>

        {alertHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            {isArabic
              ? 'لم يتم تسجيل أي تنبيهات صوتية حتى الآن.'
              : 'No acoustic alerts detected yet.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {alertHistory.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  alert.severity === 'danger'
                    ? 'bg-red-500/10 border-red-500/30'
                    : alert.severity === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-800/40 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5">{getCategoryIcon(alert.category)}</div>
                  <div>
                    <span className="text-sm font-bold text-white block">
                      {isArabic ? alert.labelAr : alert.labelEn}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(alert.timestamp).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')} •{' '}
                      {alert.decibels} dB SPL
                    </span>
                  </div>
                </div>

                {!alert.isDismissed && (
                  <button
                    onClick={() => handleDismissAlert(alert.id)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
                  >
                    {isArabic ? 'تم' : 'Dismiss'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Prominent Safety Disclaimer Notice */}
      <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-3">
        <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{isArabic ? 'إخلاء مسؤولية وتنبيه سلامة حرج' : 'Critical Safety Notice'}</span>
        </div>
        <p className="text-xs leading-relaxed text-amber-200/90">
          {isArabic ? SAFETY_LIMITATION_NOTICE.ar : SAFETY_LIMITATION_NOTICE.en}
        </p>
      </div>

      {/* Popups & Modals */}
      <AlertNotificationModal
        alert={activeAlert}
        onDismiss={handleDismissAlert}
        onSnooze={handleSnooze}
        isArabic={isArabic}
      />

      <SoundCategorySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onUpdateCategory={handleUpdateCategory}
        onToggleVibration={handleToggleVibration}
        isArabic={isArabic}
      />
    </div>
  );
};
