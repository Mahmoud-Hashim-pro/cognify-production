/**
 * Attendance Tracker Panel
 * ---------------------------------------------------------------------------
 * Wires src/lib/attendance.ts into the productivity workspace. Tracks
 * attended/absent sessions per subject, the live attendance percentage, and
 * how many absences remain before the student drops below the required
 * threshold (الحرمان). Data is stored per signed-in user in Firestore
 * (users/{uid}/attendance) and syncs in real time. Guests are told honestly
 * that sign-in is required - no fake local data.
 */
import React, { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { auth } from '../lib/firebase';
import {
  subscribeToAttendance,
  saveSubject,
  deleteSubject,
  attendancePct,
  absencesRemaining,
  isDeprived,
} from '../lib/attendance';
import type { AttendanceSubject } from '../types';

interface AttendanceTrackerPanelProps {
  isArabic: boolean;
  isDarkMode: boolean;
}

export const AttendanceTrackerPanel: React.FC<AttendanceTrackerPanelProps> = ({
  isArabic,
  isDarkMode,
}) => {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [subjects, setSubjects] = useState<AttendanceSubject[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newThreshold, setNewThreshold] = useState('75');
  const [newTotal, setNewTotal] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => setUid(user?.uid ?? null));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!uid) {
      setSubjects([]);
      return;
    }
    const unsub = subscribeToAttendance(
      uid,
      (rows) => {
        setSubjects(rows);
        setLoadError(null);
      },
      () =>
        setLoadError(
          isArabic
            ? 'تعذر تحميل بيانات الحضور. تحقق من اتصالك وحاول مجدداً.'
            : 'Could not load attendance data. Check your connection and try again.'
        )
    );
    return () => unsub();
  }, [uid, isArabic]);

  const cardCls = isDarkMode ? 'bg-[#112C4F] border-[#24476F]' : 'bg-white border-stone-200';
  const textCls = isDarkMode ? 'text-[#F8FAFC]' : 'text-stone-900';
  const subCls = isDarkMode ? 'text-[#94A3B8]' : 'text-stone-500';

  const addSubject = async () => {
    if (!uid || !newName.trim()) return;
    const threshold = Math.min(100, Math.max(1, Number(newThreshold) || 75));
    const totalPlanned = Math.max(0, Number(newTotal) || 0);
    setBusy(true);
    try {
      await saveSubject(uid, {
        id: `subj_${Date.now()}`,
        name: newName.trim(),
        attended: 0,
        absent: 0,
        totalPlanned,
        threshold,
        createdAt: new Date().toISOString(),
      });
      setNewName('');
      setNewTotal('');
    } finally {
      setBusy(false);
    }
  };

  const mark = async (s: AttendanceSubject, kind: 'attended' | 'absent') => {
    if (!uid) return;
    await saveSubject(uid, { ...s, [kind]: s[kind] + 1 });
  };

  if (!uid) {
    return (
      <div className={`p-6 rounded-3xl border ${cardCls}`} data-testid="attendance-signin-note">
        <div className="flex items-center gap-2 mb-2">
          <CalendarCheck className="w-5 h-5 text-[#4B9FE1]" aria-hidden="true" />
          <h3 className={`text-sm font-black ${textCls}`}>
            {isArabic ? 'متتبع الحضور والغياب' : 'Attendance tracker'}
          </h3>
        </div>
        <p className={`text-xs leading-relaxed ${subCls}`}>
          {isArabic
            ? 'سجّل دخولك أولاً حتى نحفظ سجل حضورك بأمان في حسابك ويتزامن على كل أجهزتك. وضع الضيف لا يحتفظ ببيانات الحضور.'
            : 'Sign in first so we can safely store your attendance record in your account and sync it across your devices. Guest mode does not keep attendance data.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="attendance-tracker">
      {/* Add subject */}
      <div className={`p-5 rounded-3xl border space-y-3 ${cardCls}`}>
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#4B9FE1]" aria-hidden="true" />
          <h3 className={`text-sm font-black ${textCls}`}>
            {isArabic ? 'إضافة مادة' : 'Add a subject'}
          </h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            dir="auto"
            aria-label={isArabic ? 'اسم المادة' : 'Subject name'}
            placeholder={isArabic ? 'اسم المادة (مثال: فيزياء)' : 'Subject name (e.g., Physics)'}
            className={`p-3 rounded-2xl border text-xs ${
              isDarkMode ? 'bg-[#09101A] border-[#24476F] text-[#F8FAFC] placeholder:text-[#94A3B8]' : 'bg-stone-50 border-stone-300 text-stone-900 placeholder:text-stone-400'
            }`}
          />
          <input
            type="number"
            value={newThreshold}
            onChange={(e) => setNewThreshold(e.target.value)}
            min={1}
            max={100}
            aria-label={isArabic ? 'نسبة الحضور المطلوبة' : 'Required attendance percent'}
            placeholder={isArabic ? 'النسبة المطلوبة % (افتراضي 75)' : 'Required % (default 75)'}
            className={`p-3 rounded-2xl border text-xs ${
              isDarkMode ? 'bg-[#09101A] border-[#24476F] text-[#F8FAFC] placeholder:text-[#94A3B8]' : 'bg-stone-50 border-stone-300 text-stone-900 placeholder:text-stone-400'
            }`}
          />
          <input
            type="number"
            value={newTotal}
            onChange={(e) => setNewTotal(e.target.value)}
            min={0}
            aria-label={isArabic ? 'إجمالي المحاضرات المخططة' : 'Total planned sessions'}
            placeholder={isArabic ? 'إجمالي المحاضرات (اختياري)' : 'Total sessions (optional)'}
            className={`p-3 rounded-2xl border text-xs ${
              isDarkMode ? 'bg-[#09101A] border-[#24476F] text-[#F8FAFC] placeholder:text-[#94A3B8]' : 'bg-stone-50 border-stone-300 text-stone-900 placeholder:text-stone-400'
            }`}
          />
        </div>
        <button
          type="button"
          onClick={addSubject}
          disabled={busy || !newName.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          {isArabic ? 'أضف المادة' : 'Add subject'}
        </button>
      </div>

      {loadError && (
        <p className="text-xs text-rose-400" role="alert">
          {loadError}
        </p>
      )}

      {/* Subject list */}
      {subjects.length === 0 && !loadError ? (
        <p className={`text-xs ${subCls}`}>
          {isArabic ? 'لا توجد مواد بعد - أضف أول مادة بالأعلى.' : 'No subjects yet - add your first one above.'}
        </p>
      ) : (
        subjects.map((s) => {
          const pct = attendancePct(s);
          const remaining = absencesRemaining(s);
          const deprived = isDeprived(s);
          return (
            <div key={s.id} className={`p-5 rounded-3xl border space-y-3 ${cardCls}`}>
              <div className="flex items-center justify-between gap-2">
                <h4 className={`text-sm font-black ${textCls}`} dir="auto">
                  {s.name}
                </h4>
                <button
                  type="button"
                  onClick={() => uid && deleteSubject(uid, s.id)}
                  aria-label={isArabic ? `حذف مادة ${s.name}` : `Delete subject ${s.name}`}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-[#94A3B8] hover:text-rose-400' : 'text-stone-400 hover:text-rose-500'}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 rounded-full bg-stone-700/40 overflow-hidden">
                  <div
                    className={`h-full transition-all ${pct >= s.threshold ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={isArabic ? `نسبة الحضور ${pct}%` : `Attendance ${pct}%`}
                  />
                </div>
                <span className={`text-xs font-black shrink-0 ${pct >= s.threshold ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pct}%
                </span>
              </div>

              <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold ${subCls}`}>
                <span>
                  {isArabic ? `حضرت: ${s.attended}` : `Attended: ${s.attended}`}
                </span>
                <span>
                  {isArabic ? `غبت: ${s.absent}` : `Absent: ${s.absent}`}
                </span>
                <span>
                  {isArabic ? `المطلوب: ${s.threshold}%` : `Required: ${s.threshold}%`}
                </span>
                {remaining !== null && (
                  <span>
                    {isArabic
                      ? remaining > 0
                        ? `يمكنك الغياب ${remaining} مرة أخرى`
                        : 'لم يتبقَ أي غياب مسموح'
                      : remaining > 0
                        ? `${remaining} more absence${remaining > 1 ? 's' : ''} allowed`
                        : 'No absences left'}
                  </span>
                )}
              </div>

              {deprived && (
                <p className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5" role="alert">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  {isArabic
                    ? 'تجاوزت حد الغياب المسموح لهذه المادة (الحرمان). راجع إدارة الكلية.'
                    : 'You exceeded the allowed absences for this subject. Contact your faculty office.'}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => mark(s, 'attended')}
                  className="px-4 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isArabic ? '✓ حضرت اليوم' : '✓ Attended today'}
                </button>
                <button
                  type="button"
                  onClick={() => mark(s, 'absent')}
                  className="px-4 py-2 rounded-xl bg-rose-600/70 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isArabic ? '✗ غبت اليوم' : '✗ Absent today'}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default AttendanceTrackerPanel;
