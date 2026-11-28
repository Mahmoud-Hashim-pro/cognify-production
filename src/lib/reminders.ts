/**
 * Local daily reminders engine for blind users: medication reminders, alarms
 * and appointments stored on-device and announced with speech + notifications.
 *
 * Honest browser limits (spoken in the UI too): reminders fire only while the
 * app is open or installed and running; a web app cannot replace the phone's
 * built-in alarm clock when the screen is off.
 */
import { L } from './translations';

export interface Reminder {
  id: string;
  kind: 'medication' | 'alarm' | 'appointment';
  title: string;
  /** HH:mm local time, daily for medication/alarm, once for appointment (with dateISO). */
  time: string;
  dateISO?: string;
  createdAt: string;
  done?: boolean;
}

const STORAGE_KEY = 'rafiqi_daily_reminders_v1';

export function loadReminders(): Reminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReminders(reminders: Reminder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch { /* storage full or unavailable */ }
}

export function addReminder(input: Omit<Reminder, 'id' | 'createdAt'>): Reminder {
  const reminder: Reminder = {
    ...input,
    id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  saveReminders([...loadReminders(), reminder]);
  return reminder;
}

export function deleteReminder(id: string): void {
  saveReminders(loadReminders().filter((r) => r.id !== id));
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/** Milliseconds until the next occurrence of this reminder; null when not due today. */
export function msUntilNextFire(r: Reminder, now = new Date()): number | null {
  const [hh, mm] = (r.time || '').split(':').map((x) => parseInt(x, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const next = new Date(now);
  next.setHours(hh, mm, 0, 0);
  if (r.kind === 'appointment' && r.dateISO) {
    const [y, m, d] = r.dateISO.split('-').map((x) => parseInt(x, 10));
    if (!y || !m || !d) return null;
    next.setFullYear(y, m - 1, d);
    if (next.getTime() <= now.getTime()) return null;
    return next.getTime() - now.getTime();
  }
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export function describeReminder(r: Reminder, isArabic: boolean): string {
  const kindLabel = {
    medication: isArabic ? 'دواء' : L('medication'),
    alarm: isArabic ? 'منبه' : L('alarm'),
    appointment: isArabic ? 'موعد' : L('appointment'),
  }[r.kind];
  const when = r.kind === 'appointment' && r.dateISO ? `${r.dateISO} ${r.time}` : r.time;
  return isArabic ? `${kindLabel}: ${r.title} الساعة ${when}` : `${kindLabel}: ${r.title} at ${when}`;
}
