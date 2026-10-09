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
      const tab = selectedDisability === 'Hearing' ? 'deaf' : selectedDisability === 'Visual' ? 'vision' : 'hub';
      localStorage.setItem('cognify_default_disability_tab', tab);
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
      const tab = selectedDisability === 'Hearing' ? 'deaf' : selectedDisability === 'Visual' ? 'vision' : 'hub';
      localStorage.setItem('cognify_default_disability_tab', tab);
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
    <div className="min-h-screen bg-[#080409] text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 font-sans relative overflow-x-hidden selection:bg-[#E5A93C]/30 selection:text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Background ambient lighting - Royal Burgundy & Gold nebulae */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden md:block">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#4A1224]/25 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-[#E5A93C]/12 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-[#831843]/18 rounded-full blur-[140px]" />
      </div>

      {/* Top Navbar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between z-10 py-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#4A1224] via-[#831843] to-[#E5A93C] p-0.5 shadow-xl shadow-[#4A1224]/35 flex items-center justify-center">
            <div className="w-full h-full bg-[#0E0610] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#E5A93C]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white tracking-tight font-serif">Cognify A11y</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4A1224]/60 text-[#E5A93C] border border-[#E5A93C]/40">
                A11y Edition
              </span>
            </div>
            <span className="text-[11px] text-[#E5A93C]/80 font-medium">
              {t("Assistive Technology for People of Determination", "منظومة التقنيات المساعدة لأصحاب الهمم وذوي الإعاقة")}
            </span>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#150917]/90 border border-[#4A1224]/60 rounded-full shadow-inner">
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 rounded-full text-xs font-black transition-all ${lang === 'en' ? 'bg-[#4A1224]/80 text-[#E5A93C] border border-[#E5A93C]/40 shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('ar')}
            className={`px-3 py-1 rounded-full text-xs font-black transition-all ${lang === 'ar' ? 'bg-[#4A1224]/80 text-[#E5A93C] border border-[#E5A93C]/40 shadow-sm' : 'text-slate-400 hover:text-white'}`}
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
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-[#2D0B16] via-[#4A1224] to-[#2D0B16] border border-[#E5A93C]/40 text-[#E5A93C] shadow-sm">
                  <Accessibility className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span>{t("Dedicated Assistive Ecosystem · For People of Determination", "المنظومة المتخصصة للإتاحة والتقنيات المساعدة · لأصحاب الهمم")}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  {isRtl ? (
                    <>منظومة <span className="text-[#E5A93C]">كوجنيفاي</span> المتخصصة <span className="text-amber-300">لذوي الإعاقة</span> والتقنيات المساعدة.</>
                  ) : (
                    <>Cognify <span className="text-[#E5A93C]">Assistive Ecosystem</span> for <span className="text-amber-300">People of Determination</span>.</>
                  )}
                </h1>

                <p className="text-xs sm:text-[13px] text-slate-300 font-medium leading-relaxed">
                  {t(
                    "Empowering blind and deaf individuals with AI vision, 3D sign avatar, sound radar, and assistive learning.",
                    "تمكين ذوي الإعاقات البصرية والسمعية بأحدث تقنيات الرؤية الحاسوبية، لغة الإشارة 3D، ورادار الأصوات والمخاطر."
                  )}
                </p>
              </div>

              {/* Main Interactive Modality Card - Split View */}
              <div className="bg-[#0E0610]/95 border border-[#4A1224]/60 rounded-[28px] overflow-hidden shadow-2xl backdrop-blur-2xl ring-1 ring-[#E5A93C]/20">
                {/* Top Royal Burgundy & Gold Strip */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#2D0B16] via-[#831843] via-[#E5A93C] to-[#2D0B16]" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 p-4 sm:p-5 lg:p-6">
                  {/* Left Column: LIVE MODALITY OVERVIEW */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full animate-pulse bg-[#E5A93C]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#E5A93C]">
                            {t("LIVE MODALITY OVERVIEW", "معاينة إمكانيات المسار المختار")}
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-[#4A1224]/80 text-[#E5A93C] border-[#E5A93C]/40 shadow-sm">
                          {t("Assistive Technology Suite", "منظومة التقنيات المساعدة")}
                        </span>
                      </div>

                      {/* Dynamic Summary Card */}
                      <div className="bg-[#140816]/95 border border-[#4A1224]/60 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xl backdrop-blur-md">
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
                                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-md bg-gradient-to-br from-[#831843] via-[#4A1224] to-[#2D0B16] text-[#E5A93C] border border-[#E5A93C]/50 shadow-rose-950/40">
                                    <ModalityIcon className="w-5 h-5 text-[#E5A93C]" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm sm:text-base font-black text-white tracking-tight leading-snug flex items-center gap-2 flex-wrap">
                                      <span>{t(currentModality.titleEn, currentModality.titleAr)}</span>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-[#E5A93C]/20 text-[#E5A93C] border border-[#E5A93C]/40 shrink-0">
                                        {t(currentModality.badgeEn, currentModality.badgeAr)}
                                      </span>
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-slate-300 font-medium mt-0.5 leading-relaxed">
                                      {t(currentModality.descEn, currentModality.descAr)}
                                    </p>
                                  </div>
                                </div>

                                <div className="h-px bg-[#4A1224]/50 w-full" />

                                {/* Eye-catching Feature Highlights */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {getSpecialNeedsFeatures(activePreviewDisability, t).slice(0, 4).map((feature) => (
                                    <div
                                      key={feature.key}
                                      className={`p-2.5 sm:p-3 rounded-xl border flex items-start gap-2.5 transition-all shadow-md ${
                                        feature.isPrimary
                                          ? 'bg-[#2D0B16]/80 border-[#E5A93C]/50 ring-1 ring-[#E5A93C]/30'
                                          : 'bg-[#160A18]/80 border-[#4A1224]/50 hover:border-[#E5A93C]/30'
                                      }`}
                                    >
                                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                        feature.isPrimary ? 'bg-[#4A1224] border border-[#E5A93C]/60 text-[#E5A93C]' : 'bg-[#2D0B16] border border-[#4A1224] text-[#E5A93C]/80'
                                      }`}>
                                        <feature.Icon className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-white flex items-center gap-1.5 leading-snug">
                                          <span className="truncate">{feature.title}</span>
                                          {feature.isPrimary && (
                                            <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black tracking-wider bg-[#E5A93C]/20 text-[#E5A93C] border border-[#E5A93C]/40 shrink-0">
                                              {t('ACTIVE', 'نشط')}
                                            </span>
                                          )}
                                        </div>
                                        {feature.isPrimary && (
                                          <div className="text-[10px] sm:text-[11px] text-slate-300 leading-tight mt-0.5 line-clamp-2">{feature.description}</div>
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
                        <span className="inline-flex items-center gap-1.5 text-[#E5A93C]">
                          <Check className="w-3.5 h-3.5" /> {t("Universal Access:", "إتاحة قياسية شاملة:")}
                        </span>
                        <span className="text-slate-300 font-semibold text-[11px] sm:text-xs">
                          {t("WCAG 2.2 AAA Compliant · Screen Reader Compatible · Zero Ads · Free Forever", "معايير WCAG 2.2 AAA العالمية · توافق تام مع قارئات الشاشة · بدون إعلانات")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: CHOOSE YOUR ASSISTIVE FOCUS */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-4 lg:border-s lg:border-[#4A1224]/50 lg:ps-6">
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                          {t("Select Assistive Focus", "اختر المسار المساند الأساسي")}
                        </h2>
                        <p className="text-[10px] sm:text-[11px] text-[#E5A93C]/80 font-medium">
                          {t("All assistive modules remain unlocked and accessible.", "كافة الوحدات والأدوات المساندة تظل مفتوحة ومتاحة لك.")}
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
                                    ? 'bg-gradient-to-r from-[#2D0B16] via-[#4A1224]/90 to-[#120715]/95 border-[#E5A93C] shadow-xl shadow-[#4A1224]/40 ring-1 ring-[#E5A93C]/50 scale-[1.01]'
                                    : 'bg-[#140916]/70 border-[#4A1224]/40 hover:bg-[#2D0B16]/40 hover:border-[#E5A93C]/40 shadow-sm'
                                } ${isFocusVisible ? 'ring-2 ring-[#E5A93C] ring-offset-2 ring-offset-slate-950' : ''}`
                              }
                            >
                              {({ isSelected }) => (
                                <>
                                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                    isSelected
                                      ? 'bg-gradient-to-br from-[#831843] via-[#4A1224] to-[#2D0B16] text-[#E5A93C] border border-[#E5A93C]/60 shadow-md shadow-rose-950/50'
                                      : 'bg-[#1A0C1D] text-[#E5A93C]/70 border border-[#4A1224]/60'
                                  }`}>
                                    <ModalityIcon className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className={`text-xs sm:text-sm font-black transition-colors ${isSelected ? 'text-[#E5A93C]' : 'text-white'}`}>
                                        {t(modality.titleEn, modality.titleAr)}
                                      </span>
                                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                                        isSelected
                                          ? 'bg-[#E5A93C]/20 text-[#E5A93C] border-[#E5A93C]/40'
                                          : 'bg-[#1A0C1D] text-slate-400 border-[#4A1224]/50'
                                      }`}>
                                        {t(modality.badgeEn, modality.badgeAr)}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-300 font-medium mt-0.5 leading-snug">
                                      {t(modality.focusTagEn, modality.focusTagAr)}
                                    </p>
                                  </div>
                                  <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                    isSelected
                                      ? 'bg-[#E5A93C] text-slate-950 shadow-sm ring-4 ring-[#E5A93C]/20'
                                      : 'border border-[#4A1224]/60 bg-[#140916]/50'
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
                        className="w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-gradient-to-r from-[#2D0B16] via-[#4A1224] to-[#2D0B16] text-[#E5A93C] border border-[#E5A93C]/50 hover:brightness-125 shadow-lg active:scale-[0.98] transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#E5A93C] animate-pulse" />
                        <span>{t("Direct Hub Preview (No Sign-In Needed) ✦", "استكشاف المنظومة كزائر (بدون تسجيل) ✦")}</span>
                      </button>

                      <AriaButton
                        onPress={handleContinuePath}
                        className="w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] outline-none bg-gradient-to-r from-[#E5A93C] via-amber-400 to-[#E5A93C] text-slate-950 hover:brightness-110 shadow-[#E5A93C]/30 ring-1 ring-[#E5A93C]/50"
                      >
                        <span>{t("Continue to Sign In / Create Account", "المتابعة للتسجيل / تسجيل الدخول")}</span>
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
              className="max-w-md mx-auto w-full bg-[#0E0610]/95 border border-[#4A1224]/60 rounded-[28px] p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5 ring-1 ring-[#E5A93C]/20"
            >
              {/* Header with Selected Path & Back Button */}
              <div className="flex items-center justify-between pb-1">
                <button
                  onClick={() => { setMode('path-selection'); setError(null); }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-[#E5A93C] transition-colors"
                >
                  <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                  <span>{t("Back", "رجوع")}</span>
                </button>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#150917] border border-[#4A1224]/60 text-slate-300">
                  <span>{t("Assistive Suite:", "نوع الإتاحة:")}</span>
                  <strong className="text-[#E5A93C]">
                    {DISABILITY_LABEL_MAP[selectedDisability] || selectedDisability}
                  </strong>
                </div>
              </div>

              {mode === 'reset-password' ? (
                /* Reset Password View */
                <div className="space-y-4 text-start">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-white tracking-tight">{t("Reset Password", "إعادة تعيين كلمة المرور")}</h2>
                    <p className="text-xs text-slate-400">{t("Enter your email to receive recovery instructions.", "أدخل بريدك الإلكتروني لإرسال رابط الاستعادة.")}</p>
                  </div>

                  {resetSuccess ? (
                    <div className="p-4 bg-[#4A1224]/30 border border-[#E5A93C]/40 rounded-2xl text-[#E5A93C] text-xs font-bold space-y-2">
                      <p>{t("Reset link sent! Please check your inbox.", "تم إرسال رابط إعادة التعيين! يرجى التحقق من بريدك.")}</p>
                      <button
                        onClick={() => { setMode('email-login'); setResetSuccess(false); setError(null); }}
                        className="block text-[#E5A93C] hover:underline pt-2 font-black"
                      >
                        {t("Return to Sign In", "العودة لتسجيل الدخول")}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t("Email Address", "البريد الإلكتروني")}</label>
                        <input
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#150917] border border-[#4A1224]/60 text-white placeholder-slate-500 text-xs rounded-xl py-3 px-4 outline-none focus:border-[#E5A93C]"
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
                        className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-[#E5A93C] to-rose-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-95 transition-all shadow-lg shadow-[#E5A93C]/25 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t("Send Reset Link", "إرسال رابط الاستعادة")}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* Unified Tabs (Sign In / Create Account) */
                <div className="space-y-4 text-start">
                  <div className="space-y-1 text-center">
                    <h2 className="text-xl font-black text-white tracking-tight">
                      {mode === 'email-login' ? t("Welcome Back", "أهلاً بك مجدداً") : t("Create Your Profile", "إنشاء حسابك الجديد")}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {mode === 'email-login'
                        ? t("Sign in to access your personalized mentor.", "سجّل دخولك للوصول إلى مساعدك الدراسي المخصص.")
                        : t("Get started with your tailored learning calibration.", "ابدأ رحلتك التعليمية المخصصة لمعايرتك.")}
                    </p>
                  </div>

                  {/* Tab Selector */}
                  <div className="grid grid-cols-2 gap-1 p-1 bg-[#150917] border border-[#4A1224]/60 rounded-xl">
                    <button
                      type="button"
                      onClick={() => { setMode('email-login'); setError(null); }}
                      className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                        mode === 'email-login'
                          ? 'bg-gradient-to-r from-[#4A1224] to-[#831843] text-white shadow-sm border border-[#E5A93C]/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t("Sign In", "تسجيل الدخول")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode('email-register'); setError(null); }}
                      className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                        mode === 'email-register'
                          ? 'bg-gradient-to-r from-[#4A1224] to-[#831843] text-white shadow-sm border border-[#E5A93C]/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t("Create Account", "إنشاء حساب")}
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleManualAuth} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t("Email Address", "البريد الإلكتروني")}</label>
                      <div className="relative">
                        <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 ${isRtl ? 'right-3' : 'left-3'}`} />
                        <input
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`w-full bg-[#150917] border border-[#4A1224]/60 text-white placeholder-slate-500 text-xs rounded-xl py-2.5 outline-none focus:border-[#E5A93C] ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t("Password", "كلمة المرور")}</label>
                      <div className="relative">
                        <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 ${isRtl ? 'right-3' : 'left-3'}`} />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`w-full bg-[#150917] border border-[#4A1224]/60 text-white placeholder-slate-500 text-xs rounded-xl py-2.5 outline-none focus:border-[#E5A93C] ${isRtl ? 'pr-9 pl-9' : 'pl-9 pr-9'}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#E5A93C] ${isRtl ? 'left-3' : 'right-3'}`}
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
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t("Confirm Password", "تأكيد كلمة المرور")}</label>
                        <div className="relative">
                          <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 ${isRtl ? 'right-3' : 'left-3'}`} />
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full bg-[#150917] border border-[#4A1224]/60 text-white placeholder-slate-500 text-xs rounded-xl py-2.5 outline-none focus:border-[#E5A93C] ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                          />
                        </div>
                      </motion.div>
                    )}

                    {mode === 'email-login' && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => { setMode('reset-password'); setError(null); }}
                          className="text-[11px] font-bold text-[#E5A93C] hover:underline"
                        >
                          {t("Forgot Password?", "نسيت كلمة المرور؟")}
                        </button>
                      </div>
                    )}

                    {error && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                        {showRedirectOption && (
                          <button
                            type="button"
                            onClick={handleGoogleRedirectAuth}
                            disabled={loading}
                            className="w-full py-2 px-3 bg-[#4A1224] hover:bg-[#831843] text-[#E5A93C] border border-[#E5A93C]/40 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
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
                      className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-[#E5A93C] to-rose-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-95 transition-all shadow-lg shadow-[#E5A93C]/25 disabled:opacity-50"
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
                    <div className="h-px bg-[#4A1224]/50 flex-1" />
                    <span className="text-[10px] font-black text-[#E5A93C]/80 uppercase tracking-widest">{t("Or", "أو")}</span>
                    <div className="h-px bg-[#4A1224]/50 flex-1" />
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={loading}
                      className="w-full h-11 flex items-center justify-center gap-2 bg-white text-slate-950 rounded-xl hover:bg-slate-100 transition-all font-black uppercase tracking-wider text-xs shadow-md disabled:opacity-50 active:scale-[0.98]"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <Chrome className="w-4 h-4 text-slate-950" />
                      )}
                      <span>{t("Continue with Google", "المتابعة عبر جوجل")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGoogleRedirectAuth}
                      disabled={loading}
                      className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        showRedirectOption
                          ? 'bg-[#4A1224]/40 border-[#E5A93C]/50 text-[#E5A93C] hover:bg-[#4A1224]/60 shadow-sm'
                          : 'bg-[#150917] border-[#4A1224]/60 text-slate-300 hover:text-[#E5A93C] hover:border-[#E5A93C]/40'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("Direct Google Sign-In (No Popups)", "تسجيل جوجل المباشر (بدون نوافذ منبثقة)")}</span>
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
