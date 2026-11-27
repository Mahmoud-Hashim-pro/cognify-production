import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Pill, Clock, PhoneCall, MessageCircle, Trash2, Plus, CalendarClock, Sun, BatteryMedium } from 'lucide-react';
import { UserProfile } from '../types';
import { speak } from '../lib/tts';
import { toast } from './Toast';
import {
  Reminder, addReminder, deleteReminder, describeReminder, ensureNotificationPermission,
  loadReminders, msUntilNextFire,
} from '../lib/reminders';
import { loadContacts, makePhoneCall, sendWhatsAppMessage, EmergencyContact } from '../lib/contacts';
import { answerQuickQuestion } from '../lib/locationAwareness';

export interface DailyAidsViewProps {
  profile: UserProfile;
  isArabic: boolean;
  onNavigateBack: () => void;
}

/**
 * Voice-first daily aids for blind users: medication reminders, alarms and
 * appointments (spoken + system notifications), time/date/battery/weather
 * quick answers, and one-tap call/WhatsApp to saved caregivers.
 */
const DailyAidsView: React.FC<DailyAidsViewProps> = ({ isArabic, onNavigateBack }) => {
  const [reminders, setReminders] = useState<Reminder[]>(() => loadReminders());
  const [contacts] = useState<EmergencyContact[]>(() => loadContacts());
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [kind, setKind] = useState<Reminder['kind']>('medication');
  const timersRef = useRef<number[]>([]);

  const say = useCallback((text: string) => speak(text, isArabic ? 'Arabic' : 'English'), [isArabic]);
  const sayRef = useRef(say);
  sayRef.current = say;

  // Schedule spoken + notification announcements for today's reminders.
  useEffect(() => {
    let cancelled = false;
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    void ensureNotificationPermission();
    for (const r of loadReminders()) {
      const ms = msUntilNextFire(r);
      if (ms === null || ms > 24 * 60 * 60 * 1000) continue;
      const id = window.setTimeout(() => {
        if (cancelled) return;
        const msg = isArabic ? `تذكير: ${describeReminder(r, true)}` : `Reminder: ${describeReminder(r, false)}`;
        sayRef.current(msg);
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try { new Notification(isArabic ? 'رفيقي — تذكير' : 'Rafiqi reminder', { body: msg }); } catch { /* noop */ }
        }
      }, ms);
      timersRef.current.push(id);
    }
    return () => {
      cancelled = true;
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, [reminders, isArabic]);

  const add = () => {
    if (!title.trim() || !time) {
      toast.error(isArabic ? 'اكتب الاسم والوقت' : 'Enter a name and a time');
      return;
    }
    const r = addReminder({ kind, title: title.trim(), time });
    setReminders(loadReminders());
    setTitle('');
    setTime('');
    const msg = isArabic ? `اتسجل التذكير: ${describeReminder(r, true)}` : `Reminder saved: ${describeReminder(r, false)}`;
    say(msg);
    toast.success(msg);
  };

  const remove = (id: string) => {
    deleteReminder(id);
    setReminders(loadReminders());
    say(isArabic ? 'اتمسح التذكير' : 'Reminder deleted');
  };

  const quick = (q: 'time' | 'date' | 'battery' | 'weather') => {
    void answerQuickQuestion(q, isArabic).then((a) => sayRef.current(a));
  };

  const kindOptions: Array<{ id: Reminder['kind']; ar: string; en: string; icon: React.ReactNode }> = [
    { id: 'medication', ar: 'دواء', en: 'Medication', icon: <Pill className="w-6 h-6" aria-hidden="true" /> },
    { id: 'alarm', ar: 'منبه', en: 'Alarm', icon: <Bell className="w-6 h-6" aria-hidden="true" /> },
    { id: 'appointment', ar: 'موعد', en: 'Appointment', icon: <CalendarClock className="w-6 h-6" aria-hidden="true" /> },
  ];

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-slate-950 text-white" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mx-auto w-full max-w-xl px-4 py-4 pb-24 flex flex-col gap-4">
        <header className="space-y-1">
          <h1 className="text-3xl font-black">{isArabic ? 'التذكيرات والمساعدات اليومية' : 'Daily reminders and aids'}</h1>
          <p className="text-base text-slate-300" role="note">
            {isArabic
              ? 'التذكيرات بتشتغل لما التطبيق مفتوح. المتصفح مش بيقدر يصحيك لو الشاشة مقفولة — للمنبه الأساسي استخدم منبه الموبايل.'
              : 'Reminders fire while the app is open. A browser cannot wake you with the screen off — use the phone alarm for critical wake-ups.'}
          </p>
        </header>

        {/* Quick answers */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { q: 'time' as const, ar: 'الوقت دلوقتي', en: 'Time now', icon: <Clock className="w-6 h-6" aria-hidden="true" /> },
            { q: 'date' as const, ar: 'تاريخ النهارده', en: "Today's date", icon: <CalendarClock className="w-6 h-6" aria-hidden="true" /> },
            { q: 'battery' as const, ar: 'البطارية', en: 'Battery', icon: <BatteryMedium className="w-6 h-6" aria-hidden="true" /> },
            { q: 'weather' as const, ar: 'الطقس', en: 'Weather', icon: <Sun className="w-6 h-6" aria-hidden="true" /> },
          ]).map((b) => (
            <button
              key={b.q}
              type="button"
              onClick={() => quick(b.q)}
              className="min-h-[88px] rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xl font-bold flex items-center justify-center gap-2"
            >
              {b.icon}
              {isArabic ? b.ar : b.en}
            </button>
          ))}
        </div>

        {/* Add reminder */}
        <section aria-label={isArabic ? 'إضافة تذكير' : 'Add a reminder'} className="rounded-3xl bg-slate-900 border-2 border-teal-700 p-5 space-y-4">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Plus className="w-7 h-7" aria-hidden="true" />
            {isArabic ? 'تذكير جديد' : 'New reminder'}
          </h2>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={isArabic ? 'نوع التذكير' : 'Reminder type'}>
            {kindOptions.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={kind === k.id}
                onClick={() => setKind(k.id)}
                className={`min-h-[72px] rounded-2xl text-lg font-bold flex flex-col items-center justify-center gap-1 border-2 ${
                  kind === k.id ? 'bg-teal-700 border-teal-400' : 'bg-slate-800 border-slate-600'
                }`}
              >
                {k.icon}
                {isArabic ? k.ar : k.en}
              </button>
            ))}
          </div>
          <label className="block text-lg font-bold">
            {isArabic ? 'اسم التذكير (مثال: دواء الضغط)' : 'Reminder name (e.g. blood pressure pills)'}
            <input
              aria-label={isArabic ? 'اسم التذكير' : 'Reminder name'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full min-h-[64px] rounded-2xl bg-slate-800 border-2 border-slate-600 px-4 text-xl font-normal"
            />
          </label>
          <label className="block text-lg font-bold">
            {isArabic ? 'الوقت' : 'Time'}
            <input
              aria-label={isArabic ? 'وقت التذكير' : 'Reminder time'}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-full min-h-[64px] rounded-2xl bg-slate-800 border-2 border-slate-600 px-4 text-xl font-normal"
            />
          </label>
          <button
            type="button"
            onClick={add}
            className="w-full min-h-[80px] rounded-3xl bg-teal-600 hover:bg-teal-500 text-2xl font-black active:scale-[0.98]"
          >
            {isArabic ? 'سجل التذكير' : 'Save reminder'}
          </button>
        </section>

        {/* Existing reminders */}
        <section aria-label={isArabic ? 'التذكيرات المسجلة' : 'Saved reminders'} className="space-y-3">
          <h2 className="text-2xl font-black">{isArabic ? 'تذكيراتي' : 'My reminders'}</h2>
          {reminders.length === 0 && (
            <p className="text-lg text-slate-400">{isArabic ? 'مفيش تذكيرات لسه' : 'No reminders yet'}</p>
          )}
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-slate-900 border border-slate-700 p-4">
              <p className="flex-1 text-xl font-bold">{describeReminder(r, isArabic)}</p>
              <button
                type="button"
                onClick={() => remove(r.id)}
                aria-label={isArabic ? `امسح ${r.title}` : `Delete ${r.title}`}
                className="min-w-[64px] min-h-[64px] rounded-2xl bg-red-800 hover:bg-red-700 flex items-center justify-center"
              >
                <Trash2 className="w-7 h-7" aria-hidden="true" />
              </button>
            </div>
          ))}
        </section>

        {/* Caregivers quick contact */}
        <section aria-label={isArabic ? 'الاتصال بالمرافقين' : 'Call caregivers'} className="space-y-3">
          <h2 className="text-2xl font-black">{isArabic ? 'مرافقيني' : 'My caregivers'}</h2>
          {contacts.length === 0 && (
            <p className="text-lg text-slate-400">
              {isArabic ? 'مفيش مرافقين محفوظين. ضيفهم من الإعدادات.' : 'No saved caregivers. Add them from settings.'}
          </p>
          )}
          {contacts.map((c) => (
            <div key={c.id} className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => makePhoneCall(c.phone)}
                className="min-h-[80px] rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-xl font-black flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-6 h-6" aria-hidden="true" />
                {isArabic ? `اتصل بـ${c.nameAr || c.nameEn}` : `Call ${c.nameEn || c.nameAr}`}
              </button>
              <button
                type="button"
                onClick={() => sendWhatsAppMessage(c.phone, isArabic ? 'سلام، محتاجك' : 'Hi, I need you')}
                className="min-h-[80px] rounded-2xl bg-green-800 hover:bg-green-700 text-xl font-black flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-6 h-6" aria-hidden="true" />
                {isArabic ? 'واتساب' : 'WhatsApp'}
              </button>
            </div>
          ))}
        </section>

        <button
          type="button"
          onClick={onNavigateBack}
          className="w-full min-h-[64px] rounded-2xl bg-slate-700 hover:bg-slate-600 text-xl font-bold"
        >
          {isArabic ? 'رجوع' : 'Back'}
        </button>
      </div>
    </div>
  );
};

export default DailyAidsView;
