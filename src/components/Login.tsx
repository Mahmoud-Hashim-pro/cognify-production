import React, { useState, useEffect, useRef } from 'react';
import { RadioGroup, Radio } from 'react-aria-components/RadioGroup';
import { AriaButton } from './ui/AriaButton';
import { signInWithGoogle, signInWithGoogleRedirect, loginWithEmail, registerWithEmail, auth, clearPreLoginState } from '../lib/firebase';
import { sendPasswordResetEmail, getRedirectResult } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Chrome, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, 
  ArrowLeft, ArrowRight, 
  Sparkles, Tag, ChevronDown, LockKeyhole, Globe,
  Brain, GraduationCap, Heart, Check, Ear, Activity, Zap, Compass, Accessibility
} from 'lucide-react';
import type { AccessibilityMode } from '../types';

type AccountPath = 'Normal' | 'Graduation Project' | 'Special Needs';
type DisabilityOption = 'Visual' | 'Hearing';

const DISABILITY_MODE_MAP: Record<DisabilityOption, AccessibilityMode> = {
  'Visual': 'Visual',
  'Hearing': 'Vocal-Deaf',
};

const DISABILITY_LABEL_MAP: Record<DisabilityOption, string> = {
  'Visual': 'Visual Impairment',
  'Hearing': 'Hearing Impairment',
};

// Each Special Needs accessibility feature, tagged with which disability chip(s) it's the primary match for.
// Selecting a chip brings its matching feature(s) to the top and marks them as the "FOCUS" for that mode,
// instead of the panel always defaulting to showing Vision Companion first regardless of selection.
// Kept in sync with the real modules in DisabilityModeView.tsx's MODULES array —
// titles/descriptions here must match what the user actually lands in, not a
// generic marketing paraphrase, or the onboarding preview misrepresents the app.
const SPECIAL_NEEDS_FEATURES: {
  key: string;
  Icon: typeof Sparkles;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  matches: DisabilityOption[];
}[] = [
  {
    key: 'vision',
    Icon: Eye,
    title: { en: 'Visual Companion (AI Eyes)', ar: 'الرفيق البصري الذكي (عيون الذكاء الاصطناعي)' },
    description: { en: 'Audio description, currency reader (EGP & global), color matcher, and spatial obstacle guidance', ar: 'وصف صوتي فوري، قراءة العملات والجنيه المصري، تنسيق ألوان الملابس، وحفظ الذاكرة المكانية' },
    matches: ['Visual'],
  },
  {
    key: 'chat',
    Icon: Brain,
    title: { en: 'Accessible AI Tutor', ar: 'المساعد التعليمي المهيأ للإتاحة' },
    description: { en: 'Adaptive multi-modal tutor tailored to your pace, with high contrast & screen-reader support', ar: 'مساعد تعليمي ذكي مهيأ بالكامل لقارئات الشاشة، تباين لوني فائق، وتدرج معرفي مرن' },
    matches: ['Visual', 'Hearing'],
  },
  {
    key: 'sign-language',
    Icon: Ear,
    title: { en: 'Unified Deaf & Hearing Center', ar: 'منظومة الصم وضعاف السمع الشاملة' },
    description: { en: '3D sign language avatar, live speech captions, express AAC cards, and sound hazard radar', ar: 'أفاتار إشارة 3D، تفريغ كلام مباشر، بطاقات تواصل سريعة، ورادار بيئي للأصوات والمخاطر' },
    matches: ['Hearing'],
  },
  {
    key: 'video',
    Icon: Sparkles,
    title: { en: 'Sign Video Studio', ar: 'استوديو ترجمة الفيديو للغة الإشارة' },
    description: { en: 'Convert educational videos and speech into continuous 3D sign language animations', ar: 'تحويل الفيديوهات والشروح الصوتية إلى لغة إشارة ثلاثية الأبعاد متزامنة' },
    matches: ['Hearing'],
  },
  {
    key: 'settings',
    Icon: Globe,
    title: { en: 'Accessibility Passport & Dialects', ar: 'جواز الإتاحة واللغات' },
    description: { en: '11 languages & dialects including Egyptian Ammiya, plus sensory profiles', ar: '11 لغة ولهجة ومنها المصري، مع ضبط جواز الإتاحة وملفات الحواس الشخصية' },
    matches: [],
  },
];

function getSpecialNeedsFeatures(
  selected: DisabilityOption,
  t: (en: string, ar: string) => string
) {
  return SPECIAL_NEEDS_FEATURES
    .map((f) => ({
      key: f.key,
      Icon: f.Icon,
      title: t(f.title.en, f.title.ar),
      description: t(f.description.en, f.description.ar),
      isPrimary: f.matches.includes(selected),
    }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

const DISABILITY_MODALITIES: {
  id: DisabilityOption;
  titleEn: string;
  titleAr: string;
  badgeEn: string;
  badgeAr: string;
  descEn: string;
  descAr: string;
  icon: typeof Eye;
  focusTagEn: string;
  focusTagAr: string;
}[] = [
  {
    id: 'Visual',
    titleEn: 'Visual Impairment & Blind',
    titleAr: 'المكفوفين وضعاف البصر',
    badgeEn: 'AI Eyes & Audio',
    badgeAr: 'عيون اصطناعية وصوت',
    descEn: 'Conversational audio eyes: currency reader (EGP & global), clothes color matching, face memory, and obstacle avoidance.',
    descAr: 'رفيق صوتي فوري، قراءة العملات الورقية والجنيه، تنسيق ألوان الملابس، التعرف على الوجوه، والملاحة اللمسية.',
    icon: Eye,
    focusTagEn: 'Currency · Colors · Faces · Haptics',
    focusTagAr: 'قارئ العملات · الملابس · الوجوه · الاهتزاز',
  },
  {
    id: 'Hearing',
    titleEn: 'Deaf & Hard of Hearing',
    titleAr: 'الصم وضعاف السمع',
    badgeEn: '3D Sign & Radar',
    badgeAr: 'إشارة 3D ورادار',
    descEn: 'Unified hearing center: 3D sign avatar, live speech captions, express AAC cards, and hazard sound radar.',
    descAr: 'المركز السمعي الموحد: أفاتار إشارة ثلاثي الأبعاد، تفريغ كلام مباشر، بطاقات تواصل، ورادار للأصوات والمخاطر.',
    icon: Ear,
    focusTagEn: '3D Sign · Captions · Radar · Studio',
    focusTagAr: 'إشارة 3D · كابشن فوري · رادار مخاطر · استوديو',
  },
];

interface LoginProps {
  onDirectPreview?: () => void;
}

export default function Login({ onDirectPreview }: LoginProps = {}) {
  const [lang, setLang] = useState<'en' | 'ar'>(() => {
    if (typeof navigator !== 'undefined' && /^ar/i.test(navigator.language || '')) {
      return 'ar';
    }
    return 'en';
  });

  const [mode, setMode] = useState<'path-selection' | 'email-login' | 'email-register' | 'reset-password'>('path-selection');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showRedirectOption, setShowRedirectOption] = useState(false);

  const [accountPath, setAccountPath] = useState<AccountPath>('Special Needs');
  const [hoveredDisability, setHoveredDisability] = useState<DisabilityOption | null>(null);
  const [selectedDisability, setSelectedDisability] = useState<DisabilityOption>('Visual');
  const activePreviewDisability = hoveredDisability || selectedDisability;

  const [showHelp, setShowHelp] = useState(false);
  const [isInIframe] = useState(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  });

  const isRtl = lang === 'ar';
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  const isMountedRef = useRef(true);
  const authTimeoutRef = useRef<any>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [lang, isRtl]);

  useEffect(() => {
    isMountedRef.current = true;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });

    // Catch any redirect result or domain error when returning from signInWithRedirect
    getRedirectResult(auth).catch((err: any) => {
      console.warn("Google Redirect Result:", err);
      if (isMountedRef.current && err) {
        if (err.code === 'auth/unauthorized-domain') {
          setError(t("Google Login requires an authorized domain. Please use Email & Password below.", "تسجيل جوجل يتطلب نطاقاً مصرحاً. يرجى استخدام الإيميل وكلمة المرور بالأسفل."));
        } else if (err.code !== 'auth/credential-already-in-use') {
          setError(err?.message?.replace("Firebase: ", "") || t("Google Sign-In failed. Please try again or use Email.", "تعذر تسجيل الدخول عبر جوجل. يرجى المحاولة مرة أخرى أو استخدام البريد."));
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, []);

  const handleContinuePath = () => {
    clearPreLoginState();
    try {
      localStorage.setItem('preLoginAccountPath', 'Special Needs');
      localStorage.setItem('preLoginDisability', DISABILITY_LABEL_MAP[selectedDisability] || 'Visual Impairment');
      localStorage.setItem('preLoginAccessibilityMode', DISABILITY_MODE_MAP[selectedDisability] || 'Visual');
      localStorage.setItem('cognify_default_disability_tab', 'hub');
    } catch (err) {
      console.warn("LocalStorage unavailable in current context:", err);
    }
    setMode('email-login');
  };

  const handleDirectPreview = () => {
    try {
      sessionStorage.setItem('cognify_guest_preview', 'disability');
      localStorage.setItem('preLoginAccountPath', 'Special Needs');
      localStorage.setItem('preLoginAccessibilityMode', DISABILITY_MODE_MAP[selectedDisability] || 'Visual');
      localStorage.setItem('preLoginDisability', DISABILITY_LABEL_MAP[selectedDisability] || 'Visual Impairment');
      localStorage.setItem('cognify_default_disability_tab', 'hub');
      window.location.hash = '#disability';
    } catch (err) {
      console.warn("Direct preview error:", err);
    }
    if (onDirectPreview) {
      onDirectPreview();
    } else {
      window.location.reload();
    }
  };

  const validateUniversityEmail = (e: string) => {
    return !!e && /^[^\s@]+@[^\s@]+\.edu(\.[^\s@]+)?$/i.test(e.trim());
  };

  const handleGoogleRedirectAuth = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    setShowHelp(false);
    try {
      await signInWithGoogleRedirect();
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err.code === 'auth/unauthorized-domain') {
        setError(t("Google Login requires an authorized domain. Please use Email & Password below.", "تسجيل جوجل يتطلب نطاقاً مصرحاً. يرجى استخدام الإيميل وكلمة المرور بالأسفل."));
      } else {
        setError(err?.message?.replace("Firebase: ", "") || t("Google Sign-In failed. Please use Email & Password.", "تعذر تسجيل الدخول عبر جوجل. يرجى استخدام البريد وكلمة المرور."));
      }
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    setShowHelp(false);

    // Strict 10s watchdog so Google popup never hangs the UI if blocked by browser or network
    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    authTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
        setShowRedirectOption(true);
        setError(t("Google Sign-In timed out or was blocked by browser. Click Direct Google Sign-In below or use Email.", "استغرق تسجيل جوجل وقتاً طويلاً أو تم حظره بواسطة المتصفح. اضغط على تسجيل جوجل المباشر بالأسفل أو استخدم البريد."));
      }
    }, 10000);

    try {
      await signInWithGoogle();
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    } catch (err: any) {
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
      if (!isMountedRef.current) return;
      if (err.code === 'auth/cancelled-popup-request') {
        /* another popup open */
      } else if (err.code === 'auth/popup-closed-by-user') {
        setShowRedirectOption(true);
        setError(t(
          "Authorization window was closed or blocked by browser policy (COOP). Click Direct Google Sign-In below without popups.",
          "تم إغلاق نافذة المصادقة أو حظرها بواسطة سياسة المتصفح (COOP). يمكنك الضغط على تسجيل جوجل المباشر بالأسفل بدون نوافذ منبثقة."
        ));
      } else if (err.code === 'auth/popup-blocked') {
        // Popups are blocked by the browser. Seamlessly fallback to redirect flow!
        try {
          await signInWithGoogleRedirect();
          return;
        } catch (redirErr: any) {
          setShowRedirectOption(true);
          setError(
            t(
              "Pop-up was blocked by your browser. Please click Direct Google Sign-In below or use Email & Password.",
              "قام المتصفح بحظر النافذة المنبثقة (Pop-up Blocked). يرجى الضغط على تسجيل جوجل المباشر بالأسفل أو استخدام البريد وكلمة المرور."
            )
          );
        }
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(t("Google Login requires an authorized domain. Please use Email & Password below.", "تسجيل جوجل يتطلب نطاقاً مصرحاً. يرجى استخدام الإيميل وكلمة المرور بالأسفل."));
      } else {
        setShowRedirectOption(true);
        setError(err?.message?.replace("Firebase: ", "") || t("Google Sign-In failed. Please use Direct Google Sign-In or Email below.", "تعذر تسجيل الدخول عبر جوجل. يرجى استخدام تسجيل جوجل المباشر أو البريد أدناه."));
      }
    } finally {
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'email-login') {
        await loginWithEmail(email, password);
      } else {
        if (password.length < 8) {
          if (isMountedRef.current) {
            setError(t("Password must be at least 8 characters.", "كلمة المرور يجب أن تكون 8 أحرف على الأقل."));
            setLoading(false);
          }
          return;
        }
        if (password !== confirmPassword) {
          if (isMountedRef.current) {
            setError(t("Passwords don't match. Please re-enter them.", "كلمتا المرور غير متطابقتين."));
            setLoading(false);
          }
          return;
        }
        await registerWithEmail(email, password);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      const code = err?.code || '';
      const msg = code === 'auth/network-request-failed'
        ? t("Network error — check your connection and try again.", "خطأ في الشبكة — تحقق من الاتصال وحاول مجدداً.")
        : code === 'auth/email-already-in-use'
          ? t("This email is already registered. Try signing in instead.", "هذا البريد مسجل بالفعل. حاول تسجيل الدخول بدلاً من ذلك.")
          : code === 'auth/weak-password'
            ? t("Password is too weak — use at least 8 characters.", "كلمة المرور ضعيفة — استخدم 8 خانات على الأقل.")
            : (err.message || '').replace("Firebase: ", "");
      setError(msg);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t("Please enter your email address.", "يرجى كتابة البريد الإلكتروني."));
      return;
    }
    setError(null);
    setLoading(true);
    setResetSuccess(false);

    try {
      await sendPasswordResetEmail(auth, email);
      if (isMountedRef.current) setResetSuccess(true);
    } catch (err: any) {
      if (isMountedRef.current) {
        setError((err?.message || String(err) || '').replace("Firebase: ", ""));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#09050B] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 font-sans relative overflow-x-hidden selection:bg-amber-400/30 selection:text-slate-950 transition-colors" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Background ambient lighting - Warm serene glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden md:block">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-amber-300/10 dark:bg-amber-400/5 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-amber-500/10 dark:bg-amber-600/5 rounded-full blur-[140px]" />
      </div>

      {/* Top Navbar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between z-10 py-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 p-0.5 shadow-md flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Cognify</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300/60">
                {t("Inclusive Platform", "منصة التعلّم الشامل")}
              </span>
            </div>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              {t("Empowering autonomous & accessible learning", "تعلّم ذكي يتكيف مع قدراتك وأسلوبك المعرفي")}
            </span>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#150917] border border-stone-200 dark:border-stone-800 rounded-full shadow-sm">
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 rounded-full text-xs font-black transition-all ${lang === 'en' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('ar')}
            className={`px-3 py-1 rounded-full text-xs font-black transition-all ${lang === 'ar' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            AR
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full z-10 space-y-4">
        <AnimatePresence mode="wait">
          {mode === 'path-selection' ? (
            <motion.div
              key="path-selection"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              {/* Hero Title Header */}
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-300/50 text-amber-900 dark:text-amber-300 shadow-sm">
                  <Accessibility className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{t("Adaptive Learning Ecosystem · Inclusive Design", "بيئة التعلّم التكيفية الشاملة · استقلالية كاملة")}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {isRtl ? (
                    <>أهلاً بك في <span className="text-amber-600 dark:text-amber-400">كوجنيفاي</span> — تعلّم بأسلوبك ووفق وتيرتك الخاصة.</>
                  ) : (
                    <>Welcome to <span className="text-amber-600 dark:text-amber-400">Cognify</span> — Learn independently, your way.</>
                  )}
                </h1>

                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {t(
                    "An inclusive, humane digital platform designed around your strengths, pacing, and sensory preferences.",
                    "منصة تعليمية إنسانية مصممة لتلائم وتيرتك واحتياجاتك المعرفية، وتضع أدوات الإتاحة والراحة في متناولك من أول نظرة."
                  )}
                </p>
              </div>

              {/* Main Interactive Modality Card - Split View */}
              <div className="bg-white dark:bg-[#120815] border border-stone-200 dark:border-stone-800 rounded-[28px] overflow-hidden shadow-xl dark:shadow-2xl">
                {/* Top Strip */}
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 p-4 sm:p-5 lg:p-6">
                  {/* Left Column: LIVE MODALITY OVERVIEW */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full animate-pulse bg-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                            {t("INCLUSIVE LEARNING SUITE", "معاينة إمكانيات المسار المختار")}
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-300/40">
                          {t("Assistive Suite Unlocked", "منظومة التقنيات المفتوحة")}
                        </span>
                      </div>

                      {/* Dynamic Summary Card */}
                      <div className="bg-stone-50 dark:bg-[#180C1C] border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
                        <AnimatePresence mode="wait">
                          {(() => {
                            const currentModality = DISABILITY_MODALITIES.find((m) => m.id === activePreviewDisability) || DISABILITY_MODALITIES[0];
                            const ModalityIcon = currentModality.icon;
                            return (
                              <motion.div
                                key={currentModality.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                              >
                                {/* Modality Title & Header Badge */}
                                <div className="flex items-start gap-3">
                                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm bg-amber-400 text-slate-950 font-black">
                                    <ModalityIcon className="w-5 h-5" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-snug flex items-center gap-2 flex-wrap">
                                      <span>{t(currentModality.titleEn, currentModality.titleAr)}</span>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300/40 shrink-0">
                                        {t(currentModality.badgeEn, currentModality.badgeAr)}
                                      </span>
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5 leading-relaxed">
                                      {t(currentModality.descEn, currentModality.descAr)}
                                    </p>
                                  </div>
                                </div>

                                <div className="h-px bg-stone-200 dark:bg-stone-800 w-full" />

                                {/* Eye-catching Feature Highlights */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {getSpecialNeedsFeatures(activePreviewDisability, t).slice(0, 4).map((feature) => (
                                    <div
                                      key={feature.key}
                                      className={`p-2.5 sm:p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
                                        feature.isPrimary
                                          ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-300/60 dark:border-amber-500/30'
                                          : 'bg-white dark:bg-[#120815] border-stone-200 dark:border-stone-800/80'
                                      }`}
                                    >
                                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                        feature.isPrimary ? 'bg-amber-400 text-slate-950' : 'bg-stone-100 dark:bg-stone-800 text-slate-700 dark:text-slate-300'
                                      }`}>
                                        <feature.Icon className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 leading-snug">
                                          <span className="truncate">{feature.title}</span>
                                          {feature.isPrimary && (
                                            <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black tracking-wider bg-amber-400 text-slate-950 shrink-0">
                                              {t('ACTIVE', 'نشط')}
                                            </span>
                                          )}
                                        </div>
                                        {feature.isPrimary && (
                                          <div className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 leading-tight mt-0.5 line-clamp-2">{feature.description}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            );
                          })()}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Bottom Feature Pill Indicator */}
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                          <Check className="w-3.5 h-3.5" /> {t("Accessibility Standard:", "معايير الإتاحة:")}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 font-semibold text-[11px] sm:text-xs">
                          {t("WCAG 2.2 AA Compliant · Keyboard Navigable · Screen Reader Optimized", "معايير WCAG 2.2 AA العالمية · تنقل كامل بلوحة المفاتيح · متوافق مع قارئات الشاشة")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: CHOOSE YOUR ASSISTIVE FOCUS */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-4 lg:border-s lg:border-stone-200 dark:lg:border-stone-800 lg:ps-6">
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                          {t("Select Learning Focus", "اختر المسار المساند الأساسي")}
                        </h2>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {t("All assistive modules remain unlocked and accessible.", "كافة الأدوات المساندة تظل مفتوحة ومتاحة لك دائماً.")}
                        </p>
                      </div>

                      {/* Modality Selector Cards */}
                      <RadioGroup
                        value={selectedDisability}
                        onChange={(val) => setSelectedDisability(val as DisabilityOption)}
                        aria-label={t("Select Assistive Focus", "اختر المسار المساند")}
                        className="space-y-2.5 relative outline-none"
                      >
                        {DISABILITY_MODALITIES.map((modality) => {
                          const ModalityIcon = modality.icon;
                          return (
                            <Radio
                              key={modality.id}
                              value={modality.id}
                              onMouseEnter={() => setHoveredDisability(modality.id)}
                              onMouseLeave={() => setHoveredDisability(null)}
                              className={({ isSelected, isFocusVisible }) =>
                                `relative z-10 w-full flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all duration-200 outline-none ${
                                  isSelected
                                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 ring-2 ring-amber-400/40 shadow-sm scale-[1.01]'
                                    : 'bg-white dark:bg-[#160B18] border-stone-200 dark:border-stone-800 hover:border-amber-300'
                                } ${isFocusVisible ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950' : ''}`
                              }
                            >
                              {({ isSelected }) => (
                                <>
                                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                    isSelected
                                      ? 'bg-amber-400 text-slate-950 font-black'
                                      : 'bg-stone-100 dark:bg-stone-800 text-slate-700 dark:text-slate-300'
                                  }`}>
                                    <ModalityIcon className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className={`text-xs sm:text-sm font-black transition-colors ${isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
                                        {t(modality.titleEn, modality.titleAr)}
                                      </span>
                                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                                        isSelected
                                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                                          : 'bg-stone-100 dark:bg-stone-800 text-slate-600 dark:text-slate-400 border-stone-200 dark:border-stone-700'
                                      }`}>
                                        {t(modality.badgeEn, modality.badgeAr)}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5 leading-snug">
                                      {t(modality.focusTagEn, modality.focusTagAr)}
                                    </p>
                                  </div>
                                  <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                    isSelected
                                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/30'
                                      : 'border border-stone-300 dark:border-stone-700'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                </>
                              )}
                            </Radio>
                          );
                        })}
                      </RadioGroup>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDirectPreview}
                        className="w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{t("Direct Student Access (No Sign-In Needed) ✦", "دخول فوري كطالب (بدون تسجيل) ✦")}</span>
                      </button>

                      <AriaButton
                        onPress={handleContinuePath}
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] outline-none bg-stone-100 hover:bg-stone-200 dark:bg-stone-800/80 dark:hover:bg-stone-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <span>{t("Sign In / Create Account", "تسجيل الدخول / إنشاء حساب")}</span>
                        <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
                      </AriaButton>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Unified Direct Auth Screen */
            <motion.div
              key="auth-flow"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="max-w-md mx-auto w-full bg-white dark:bg-[#120815] border border-stone-200 dark:border-stone-800 text-slate-900 dark:text-slate-100 rounded-[28px] p-6 sm:p-8 shadow-xl space-y-5"
            >
              {/* Header with Selected Path & Back Button */}
              <div className="flex items-center justify-between pb-1">
                <button
                  onClick={() => { setMode('path-selection'); setError(null); }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                  <span>{t("Back", "رجوع")}</span>
                </button>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-stone-100 dark:bg-[#180C1C] border border-stone-200 dark:border-stone-800 text-slate-700 dark:text-slate-300">
                  <span>{t("Assistive Suite:", "نوع الإتاحة:")}</span>
                  <strong className="text-amber-700 dark:text-amber-300">
                    {DISABILITY_LABEL_MAP[selectedDisability] || selectedDisability}
                  </strong>
                </div>
              </div>

              {mode === 'reset-password' ? (
                /* Reset Password View */
                <div className="space-y-4 text-start">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t("Reset Password", "إعادة تعيين كلمة المرور")}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("Enter your email to receive recovery instructions.", "أدخل بريدك الإلكتروني لإرسال رابط الاستعادة.")}</p>
                  </div>

                  {resetSuccess ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold space-y-2">
                      <p>{t("Reset link sent! Please check your inbox.", "تم إرسال رابط إعادة التعيين! يرجى التحقق من بريدك.")}</p>
                      <button
                        onClick={() => { setMode('email-login'); setResetSuccess(false); setError(null); }}
                        className="block text-emerald-700 dark:text-emerald-400 hover:underline pt-2 font-black cursor-pointer"
                      >
                        {t("Return to Sign In", "العودة لتسجيل الدخول")}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("Email Address", "البريد الإلكتروني")}</label>
                        <input
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-stone-50 dark:bg-[#180C1C] border border-stone-300 dark:border-stone-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-xl py-3 px-4 outline-none focus:border-amber-400 focus:bg-white dark:focus:bg-[#180C1C]"
                        />
                      </div>

                      {error && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-slate-950" /> : t("Send Reset Link", "إرسال رابط الاستعادة")}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* Unified Tabs (Sign In / Create Account) */
                <div className="space-y-4 text-start">
                  <div className="space-y-1 text-center">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {mode === 'email-login' ? t("Welcome Back", "أهلاً بك مجدداً") : t("Create Your Profile", "إنشاء حسابك الجديد")}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {mode === 'email-login'
                        ? t("Sign in to access your personalized mentor.", "سجّل دخولك للوصول إلى مساعدك الدراسي المخصص.")
                        : t("Get started with your tailored learning calibration.", "ابدأ رحلتك التعليمية المخصصة لمعايرتك.")}
                    </p>
                  </div>

                  {/* Tab Selector */}
                  <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 dark:bg-[#180C1C] border border-stone-200 dark:border-stone-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => { setMode('email-login'); setError(null); }}
                      className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        mode === 'email-login'
                          ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t("Sign In", "تسجيل الدخول")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode('email-register'); setError(null); }}
                      className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        mode === 'email-register'
                          ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t("Create Account", "إنشاء حساب")}
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleManualAuth} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("Email Address", "البريد الإلكتروني")}</label>
                      <div className="relative">
                        <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                        <input
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`w-full bg-stone-50 dark:bg-[#180C1C] border border-stone-300 dark:border-stone-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-xl py-2.5 outline-none focus:border-amber-400 focus:bg-white dark:focus:bg-[#180C1C] ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("Password", "كلمة المرور")}</label>
                      <div className="relative">
                        <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`w-full bg-stone-50 dark:bg-[#180C1C] border border-stone-300 dark:border-stone-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-xl py-2.5 outline-none focus:border-amber-400 focus:bg-white dark:focus:bg-[#180C1C] ${isRtl ? 'pr-9 pl-9' : 'pl-9 pr-9'}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ${isRtl ? 'left-3' : 'right-3'}`}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {mode === 'email-register' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-1"
                      >
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("Confirm Password", "تأكيد كلمة المرور")}</label>
                        <div className="relative">
                          <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full bg-stone-50 dark:bg-[#180C1C] border border-stone-300 dark:border-stone-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-xl py-2.5 outline-none focus:border-amber-400 focus:bg-white dark:focus:bg-[#180C1C] ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                          />
                        </div>
                      </motion.div>
                    )}

                    {mode === 'email-login' && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => { setMode('reset-password'); setError(null); }}
                          className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                        >
                          {t("Forgot Password?", "نسيت كلمة المرور؟")}
                        </button>
                      </div>
                    )}

                    {error && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                        {showRedirectOption && (
                          <button
                            type="button"
                            onClick={handleGoogleRedirectAuth}
                            disabled={loading}
                            className="w-full py-2 px-3 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300/40 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>{t("Click Here for Direct Google Sign-In", "اضغط هنا لتسجيل الدخول المباشر")}</span>
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-slate-950" />
                      ) : mode === 'email-login' ? (
                        t("Sign In", "تسجيل الدخول")
                      ) : (
                        t("Create Profile", "إنشاء الحساب")
                      )}
                    </button>
                  </form>

                  {/* Or Continue With Google */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Or", "أو")}</span>
                    <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1" />
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={loading}
                      className="w-full h-11 flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-slate-900 dark:text-white rounded-xl transition-all font-black uppercase tracking-wider text-xs shadow-sm border border-stone-200 dark:border-stone-700 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <Chrome className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      )}
                      <span>{t("Continue with Google", "المتابعة عبر جوجل")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGoogleRedirectAuth}
                      disabled={loading}
                      className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        showRedirectOption
                          ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-300 hover:bg-amber-200'
                          : 'bg-white dark:bg-[#150917] border-stone-200 dark:border-stone-800 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("Direct Google Sign-In (No Popups)", "تسجيل الدخول المباشر بجوجل")}</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center py-4 z-10">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <LockKeyhole className="w-3.5 h-3.5 text-slate-600" />
          <span>{t("Secure access · Firebase Auth", "تسجيل دخول آمن ومشفّر · Firebase Auth")}</span>
        </div>
      </footer>
    </div>
  );
}
