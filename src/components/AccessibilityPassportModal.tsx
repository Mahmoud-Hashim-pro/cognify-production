import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  X,
  Check,
  Type,
  Sliders,
  Eye,
  Ear,
  Globe,
} from 'lucide-react';
import { UserProfile, AccessibilityPassport, AccessibilityMode } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db, cleanDataForFirestore } from '../lib/firebase';
import { isArabicLocale } from '../lib/translations';
import { toast } from './Toast';

interface AccessibilityPassportModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  setProfile?: (profile: UserProfile) => void;
}

export default function AccessibilityPassportModal({
  profile,
  isOpen,
  onClose,
  setProfile,
}: AccessibilityPassportModalProps) {
  const lang = profile.language || 'Arabic';
  const isAr = isArabicLocale(lang);
  const isFr = lang === 'French';

  const initialPassport: AccessibilityPassport = profile.accessibilityPassport || {
    primaryMode: profile.accessibilityMode || 'None',
    primaryCategory: profile.accessibilityMode || 'Multiple',
    highContrast: false,
    dyslexiaFont: false,
    fontSizeScale: 'normal',
    reduceMotion: false,
    hapticFeedback: true,
    autoSpeak: true,
    audioSpeed: 1,
    allowCameraTriggers: true,
    visualSupport: {
      highContrast: false,
      autoSpeechReadout: true,
      hapticAssistance: true,
    },
    hearingSupport: {
      visualAcousticRadar: true,
      reverseSignToSpeech: true,
      flashingAlerts: true,
    },
    neurodiversitySupport: {
      dyslexiaFont: false,
      readingRuler: false,
      sensoryRegulation: true,
    },
  };

  const [passport, setPassport] = useState<AccessibilityPassport>(initialPassport);
  const [isSaving, setIsSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Focus trap, Escape listener, and focus restoration
  useEffect(() => {
    if (!isOpen) {
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
      return;
    }

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on open
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector<HTMLElement>('button, [tabindex="0"]');
        firstFocusable?.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  // Reset form to the latest saved profile data every time the modal opens.
  // Without this, if the user opens, closes, changes their mode externally, and
  // opens again, the stale initialPassport (captured at first mount) is shown.
  useEffect(() => {
    if (isOpen) {
      setPassport(
        profile.accessibilityPassport || {
          primaryMode: profile.accessibilityMode || 'None',
          primaryCategory: profile.accessibilityMode || 'Multiple',
          highContrast: false,
          dyslexiaFont: false,
          fontSizeScale: 'normal',
          reduceMotion: false,
          hapticFeedback: true,
          autoSpeak: true,
          audioSpeed: 1,
          allowCameraTriggers: true,
          visualSupport: { highContrast: false, autoSpeechReadout: true, hapticAssistance: true },
          hearingSupport: { visualAcousticRadar: true, reverseSignToSpeech: true, flashingAlerts: true },
          neurodiversitySupport: { dyslexiaFont: false, readingRuler: false, sensoryRegulation: true },
        }
      );
    }
  }, [isOpen]);
 // eslint-disable-line react-hooks/exhaustive-deps

  const t = (en: string, ar: string, fr?: string) => {
    if (isAr) return ar;
    if (isFr && fr) return fr;
    return en;
  };

  const handleSave = async () => {
    setIsSaving(true);
    let cat = passport.primaryCategory as string;
    let resolvedMode: AccessibilityMode = profile.accessibilityMode;
    if (cat === 'Deaf') resolvedMode = 'Vocal-Deaf';
    else if (cat === 'Visual') resolvedMode = 'Visual';
    else if (cat === 'None') resolvedMode = 'None';
    else if (passport.primaryMode && passport.primaryMode !== 'None') resolvedMode = passport.primaryMode;

    try {
      const mappedTab = resolvedMode === 'Vocal-Deaf' ? 'deaf' : 'vision';
      localStorage.setItem('cognify_default_disability_tab', mappedTab);
      localStorage.setItem('cognify_font_scale', passport.fontSizeScale || 'normal');
      localStorage.setItem('cognify_high_contrast', String(passport.highContrast || false));
      localStorage.setItem('cognify_reduce_motion', String(passport.reduceMotion || false));
    } catch {}

    const updatedProfile: UserProfile = {
      ...profile,
      accessibilityPassport: passport,
      accessibilityMode: resolvedMode,
    };

    if (setProfile) setProfile(updatedProfile);

    if (profile.uid) {
      try {
        await setDoc(
          doc(db, `users/${profile.uid}`),
          cleanDataForFirestore({
            accessibilityPassport: passport,
            accessibilityMode: resolvedMode,
          }),
          { merge: true }
        );
      } catch (err) {
        console.warn('Failed to sync passport to firestore:', err);
      }
    }

    setIsSaving(false);
    toast.success(t('Accessibility Passport saved successfully', 'تم حفظ وتفعيل جواز السفر الميسر بنجاح'));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md" dir={isAr ? 'rtl' : 'ltr'}>
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="passport-modal-title"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="w-full max-w-2xl bg-[#150917] border-2 border-indigo-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-5 max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#4A1224]/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-lg">
              <Shield className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="passport-modal-title" className="font-black text-base sm:text-lg flex items-center gap-2">
                <span>{t('Universal Accessibility Passport', 'جواز السفر الميسر الشامل', 'Passeport Universel d\'Accessibilité')}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-bold">
                  v2.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t('Your cross-platform profile adapting all features automatically to your needs', 'ملفك الشخصي الموحد لضبط وتكييف كل خصائص المنظومة تلقائياً')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Close', 'إغلاق', 'Fermer')}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all focus-visible:ring-3 focus-visible:ring-[#F59E0B] focus:outline-none cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-sm">
          {/* 1. Primary Category */}
          <div className="space-y-2">
            <span id="passport-focus-label" className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              {t('1. Primary Accessibility Focus:', '1. النمط الأساسي للاحتياج والوصول:', '1. Profil Principal :')}
            </span>
            <div role="radiogroup" aria-labelledby="passport-focus-label" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'Visual', Icon: Eye, label: t('Vision & Perception', 'الرؤية والإدراك', 'Vision & Perception') },
                { id: 'Deaf', Icon: Ear, label: t('Hearing & Communication', 'السمع والتواصل', 'Audition & Communication') },
                { id: 'None', Icon: Globe, label: t('Standard Experience', 'الواجهة القياسية', 'Standard') },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={passport.primaryCategory === item.id}
                  onClick={() => setPassport({ ...passport, primaryCategory: item.id as AccessibilityMode })}
                  className={`p-3 rounded-2xl border transition-all text-start flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-teal-400 focus:outline-none ${
                    passport.primaryCategory === item.id
                      ? 'bg-teal-700 border-teal-500 text-white font-bold shadow-sm'
                      : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-teal-700/60'
                  }`}
                >
                  <item.Icon className="w-5 h-5 text-teal-400 shrink-0" aria-hidden="true" />
                  <span className="text-xs leading-tight font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Universal System-Wide Accommodations (Font Scaling, High Contrast, Motion Reduction) */}
          <div className="p-4 rounded-3xl bg-[#080409] border border-[#4A1224]/60 space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
              <Sliders className="w-4 h-4" aria-hidden="true" />
              <span>{t('Universal Display & Sensory Settings', 'إعدادات العرض والحواس الشاملة للمنظومة')}</span>
            </div>

            {/* Font Size Scaling */}
            <div className="space-y-1.5">
              <span id="font-scale-group-label" className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
                <span>{t('System-Wide Font Size Scale:', 'حجم الخط العام لجميع الشاشات:')}</span>
              </span>
              <div role="radiogroup" aria-labelledby="font-scale-group-label" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'normal', label: t('100% Normal', '100% عادي') },
                  { id: 'medium', label: t('115% Large', '115% كبير') },
                  { id: 'large', label: t('130% X-Large', '130% كبير جداً') },
                  { id: 'extra-large', label: t('150% Max', '150% أقصى حجم') },
                ].map((s) => {
                  const isCurrent = (passport.fontSizeScale || 'normal') === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={isCurrent}
                      onClick={() => {
                        const newScale = s.id as any;
                        setPassport({ ...passport, fontSizeScale: newScale });
                        const root = document.documentElement;
                        root.classList.remove('font-scale-normal', 'font-scale-medium', 'font-scale-large', 'font-scale-extra-large');
                        root.classList.add(`font-scale-${newScale}`);
                        try { localStorage.setItem('cognify_font_scale', newScale); } catch {}
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-amber-400 focus:outline-none ${
                        isCurrent
                          ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md font-black'
                          : 'bg-[#150917] border-[#4A1224]/60 text-slate-300 hover:border-[#4A1224]/50'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#4A1224]/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all focus-visible:ring-2 focus-visible:ring-slate-400 focus:outline-none"
          >
            {t('Cancel', 'إلغاء', 'Annuler')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-400 focus:outline-none"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>{isSaving ? t('Saving...', 'جاري الحفظ...') : t('Save & Activate Passport', 'حفظ وتفعيل الجواز')}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
