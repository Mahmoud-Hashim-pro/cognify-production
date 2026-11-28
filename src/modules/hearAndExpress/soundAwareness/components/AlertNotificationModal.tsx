import React from 'react';
import {
  AlertTriangle,
  Flame,
  Bell,
  DoorClosed,
  Volume2,
  Clock,
  X,
  ShieldAlert,
} from 'lucide-react';
import type { SoundAlert } from '../types';

interface AlertNotificationModalProps {
  alert: SoundAlert | null;
  onDismiss: (alertId: string) => void;
  onSnooze: (alert: SoundAlert, durationMinutes: number) => void;
  isArabic?: boolean;
}

export const AlertNotificationModal: React.FC<AlertNotificationModalProps> = ({
  alert,
  onDismiss,
  onSnooze,
  isArabic = true,
}) => {
  if (!alert || alert.isDismissed) return null;

  const isDanger = alert.severity === 'danger';
  const isWarning = alert.severity === 'warning';

  const getCategoryIcon = () => {
    switch (alert.category) {
      case 'fire_alarm':
      case 'smoke_alarm':
        return <Flame className="w-12 h-12 text-red-500 animate-pulse" />;
      case 'doorbell':
        return <Bell className="w-12 h-12 text-blue-500 animate-bounce" />;
      case 'knocking':
        return <DoorClosed className="w-12 h-12 text-amber-500" />;
      default:
        return <Volume2 className="w-12 h-12 text-indigo-500" />;
    }
  };

  const getSeverityBg = () => {
    if (isDanger) return 'bg-red-500/20 border-red-500 text-red-100';
    if (isWarning) return 'bg-amber-500/20 border-amber-500 text-amber-100';
    return 'bg-blue-500/20 border-blue-500 text-blue-100';
  };

  const formattedTime = new Date(alert.timestamp).toLocaleTimeString(
    isArabic ? 'ar-EG' : 'en-US',
    { hour: '2-digit', minute: '2-digit', second: '2-digit' }
  );

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
      aria-describedby="alert-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div
        className={`w-full max-w-lg p-6 rounded-3xl border-4 shadow-2xl transition-all ${getSeverityBg()} bg-slate-900`}
      >
        {/* Header with Severity Indicator */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <ShieldAlert
              className={`w-8 h-8 ${isDanger ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-blue-400'}`}
            />
            <span
              id="alert-modal-title"
              className="text-xl font-bold tracking-wide uppercase"
            >
              {isDanger
                ? isArabic
                  ? '⚠️ تحذير صوتي عالي الخطورة'
                  : '⚠️ High-Priority Acoustic Alert'
                : isArabic
                ? '🔔 تنبيه صوتي بيئي'
                : '🔔 Environmental Sound Alert'}
            </span>
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            aria-label={isArabic ? 'إغلاق التنبيه' : 'Dismiss Alert'}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors focus:ring-2 focus:ring-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col items-center text-center py-6 gap-4">
          <div className="p-4 rounded-full bg-white/5 border border-white/10 shadow-inner">
            {getCategoryIcon()}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">
              {isArabic ? alert.labelAr : alert.labelEn}
            </h2>
            <p id="alert-modal-desc" className="text-sm text-slate-300">
              {isArabic
                ? `الشدة المقدرة: ${alert.decibels} ديسيبل SPL | طريقة الرصد: ${alert.detectionMethod}`
                : `Estimated Level: ${alert.decibels} dB SPL | Method: ${alert.detectionMethod}`}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>{formattedTime}</span>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
          <button
            onClick={() => onDismiss(alert.id)}
            className="flex-1 py-3 px-6 rounded-2xl font-bold text-base text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-red-400"
          >
            {isArabic ? 'إلغاء التنبيه (فهمت)' : 'Dismiss Alert (Understood)'}
          </button>

          <button
            onClick={() => onSnooze(alert, 15)}
            className="py-3 px-5 rounded-2xl font-medium text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {isArabic ? 'إيقاف مؤقت 15 دقيقة' : 'Snooze (15m)'}
          </button>
        </div>
      </div>
    </div>
  );
};
