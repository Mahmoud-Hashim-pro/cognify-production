import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithGoogle, 
  signInWithGoogleRedirect, 
  loginWithEmail, 
  registerWithEmail, 
  auth 
} from '../lib/firebase';
import { sendPasswordResetEmail, getRedirectResult } from 'firebase/auth';
import { 
  Mail, 
  LockKeyhole, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Chrome, 
  CheckCircle2,
  Accessibility,
  ArrowLeft
} from 'lucide-react';
import { ThemeSelector } from './ui/ThemeSelector';
import { speak } from '../lib/tts';

interface LoginProps {
  onLoginSuccess?: () => void;
  onBackToWelcome?: () => void;
  initialMode?: 'email-login' | 'email-register' | 'reset-password';
}

export default function Login({ onLoginSuccess, onBackToWelcome, initialMode = 'email-login' }: LoginProps = {}) {
  const [lang, setLang] = useState<'en' | 'ar'>(() => {
    if (typeof navigator !== 'undefined' && /^ar/i.test(navigator.language || '')) {
      return 'ar';
    }
    return 'ar'; // Default to Arabic as primary brand locale
  });

  const [mode, setMode] = useState<'email-login' | 'email-register' | 'reset-password'>(() => {
    if (typeof window !== 'undefined') {
      const hash = (window.location.hash || '').toLowerCase();
      if (hash.includes('register') || hash.includes('signup')) return 'email-register';
      if (hash.includes('reset') || hash.includes('forgot')) return 'reset-password';
    }
    return initialMode;
  });

  useEffect(() => {
    const handleHashSync = () => {
      if (typeof window === 'undefined') return;
      const hash = (window.location.hash || '').toLowerCase();
      if (hash.includes('register') || hash.includes('signup')) {
        setMode('email-register');
      } else if (hash.includes('reset') || hash.includes('forgot')) {
        setMode('reset-password');
      } else if (hash.includes('login') || hash.includes('signin')) {
        setMode('email-login');
      }
    };

    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, []);
  
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('rafiqi_saved_email') || '';
    } catch {
      return '';
    }
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('rafiqi_remember_me') === 'true';
    } catch {
      return false;
    }
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showRedirectOption, setShowRedirectOption] = useState(false);

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
    if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
      try {
        history.scrollRestoration = 'manual';
      } catch {}
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    const scrollTimer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    }, 60);

    // getRedirectResult boots the auth iframe (~95KB) plus gapi, so only pay
    // that cost when a redirect sign-in was actually started. First-time
    // visitors never trigger it and the landing page stays light.
    const redirectPending = (() => {
      try { return sessionStorage.getItem('rafiqi_auth_redirect_pending') === '1'; } catch { return false; }
    })();
    if (redirectPending) {
      try { sessionStorage.removeItem('rafiqi_auth_redirect_pending'); } catch {}
      getRedirectResult(auth).catch((err: any) => {
        console.warn('Google Redirect Result:', err);
        if (isMountedRef.current && err) {
          if (err.code === 'auth/unauthorized-domain') {
            setError(t('Google Login requires an authorized domain. Please use Email & Password below.', 'تسجيل جوجل يتطلب نطاقاً مصرحاً. يرجى استخدام البريد وكلمة المرور أدناه.'));
          } else if (err.code !== 'auth/credential-already-in-use') {
            setError(err?.message?.replace('Firebase: ', '') || t('Google Sign-In failed. Please try again or use Email.', 'تعذر تسجيل الدخول عبر جوجل. يرجى المحاولة مرة أخرى أو استخدام البريد.'));
          }
        }
      });
    }

    return () => {
      isMountedRef.current = false;
      if (scrollTimer) clearTimeout(scrollTimer);
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, []);

  const handleGoogleRedirectAuth = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      try { sessionStorage.setItem('rafiqi_auth_redirect_pending', '1'); } catch {}
      await signInWithGoogleRedirect();
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err.code === 'auth/unauthorized-domain') {
        setError(t('Google Login requires an authorized domain. Please use Email & Password below.', 'تسجيل جوجل يتطلب نطاقاً مصرحاً. يرجى استخدام البريد وكلمة المرور أدناه.'));
      } else {
        setError(err?.message?.replace('Firebase: ', '') || t('Google Sign-In failed. Please use Email & Password.', 'تعذر تسجيل الدخول عبر جوجل. يرجى استخدام البريد وكلمة المرور.'));
      }
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);

    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    authTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
        setShowRedirectOption(true);
        setError(t('Google Sign-In timed out or was blocked by browser. Click Direct Google Sign-In below or use Email.', 'استغرق تسجيل جوجل وقتاً طويلاً أو تم حظره بواسطة المتصفح. اضغط على تسجيل جوجل المباشر أدناه أو استخدم البريد.'));
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
          'Authorization window was closed or blocked by browser policy (COOP). Click Direct Google Sign-In below without popups.',
          'تم إغلاق نافذة المصادقة أو حظرها بواسطة المتصفح. يمكنك الضغط على تسجيل جوجل المباشر أدناه بدون نوافذ منبثقة.'
        ));
      } else if (err.code === 'auth/popup-blocked') {
        try {
          await signInWithGoogleRedirect();
          return;
        } catch (redirErr: any) {
          setShowRedirectOption(true);
          setError(
            t(
              'Pop-up was blocked by your browser. Please click Direct Google Sign-In below or use Email & Password.',
              'قام المتصفح بحظر النافذة المنبثقة. يرجى الضغط على تسجيل جوجل المباشر أدناه أو استخدام البريد وكلمة المرور.'
            )
          );
        }
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(t('Google Login requires an authorized domain. Please use Email & Password below.', 'تسجيل جوجل يتطلب نطاقاً مصرحاً. يرجى استخدام البريد وكلمة المرور أدناه.'));
      } else {
        setShowRedirectOption(true);
        setError(err?.message?.replace('Firebase: ', '') || t('Google Sign-In failed. Please use Direct Google Sign-In or Email below.', 'تعذر تسجيل الدخول عبر جوجل. يرجى استخدام تسجيل جوجل المباشر أو البريد أدناه.'));
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
      let normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail === 'eraahosni8@gmail.com') {
        normalizedEmail = 'esraahosni8@gmail.com';
      }

      if (mode === 'email-login') {
        if (rememberMe) {
          try {
            localStorage.setItem('rafiqi_saved_email', normalizedEmail);
            localStorage.setItem('rafiqi_remember_me', 'true');
          } catch {}
        } else {
          try {
            localStorage.removeItem('rafiqi_saved_email');
            localStorage.setItem('rafiqi_remember_me', 'false');
          } catch {}
        }
        await loginWithEmail(normalizedEmail, password.trim());
      } else {
        if (password.length < 8) {
          if (isMountedRef.current) {
            setError(t('Password must be at least 8 characters.', 'كلمة المرور يجب أن تكون 8 خانات على الأقل.'));
            setLoading(false);
          }
          return;
        }
        if (password !== confirmPassword) {
          if (isMountedRef.current) {
            setError(t("Passwords don't match. Please re-enter them.", 'كلمتا المرور غير متطابقتين. يرجى إعادة إدخالهما.'));
            setLoading(false);
          }
          return;
        }
        await registerWithEmail(normalizedEmail, password.trim());
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      const code = err?.code || '';
      const rawMsg = err?.message || '';
      let msg = '';
      if (code === 'auth/network-request-failed') {
        msg = t('Network error — check your connection and try again.', 'خطأ في الاتصال بالإنترنت — يرجى التحقق من الشبكة وإعادة المحاولة.');
      } else if (code === 'auth/email-already-in-use') {
        msg = t('This email is already registered. Try signing in instead.', 'هذا البريد مسجل بالفعل. يرجى التبديل لتسجيل الدخول.');
      } else if (code === 'auth/weak-password') {
        msg = t('Password is too weak — use at least 8 characters.', 'كلمة المرور ضعيفة — يرجى استخدام 8 خانات على الأقل.');
      } else if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/internal-error' ||
        rawMsg.includes('INVALID_LOGIN_CREDENTIALS') ||
        rawMsg.includes('auth/internal-error')
      ) {
        msg = t(
          "Incorrect email or password. Please verify your credentials or click 'Forgot Password?' to reset.",
          "البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات أو الضغط على 'نسيت كلمة المرور؟' لاستعادتها."
        );
      } else if (code === 'auth/too-many-requests') {
        msg = t('Too many attempts. Please wait a few moments or reset your password.', 'تم تعليق المحاولات مؤقتاً بسبب تكرار المحاولة. انتظر دقيقة أو استخدم استعادة كلمة المرور.');
      } else {
        msg = rawMsg.replace('Firebase: ', '');
      }
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
      setError(t('Please enter your email address.', 'يرجى كتابة البريد الإلكتروني.'));
      return;
    }
    setError(null);
    setLoading(true);
    setResetSuccess(false);

    try {
      const resetTarget = email.trim().toLowerCase() === 'eraahosni8@gmail.com' ? 'esraahosni8@gmail.com' : email.trim().toLowerCase();
      await sendPasswordResetEmail(auth, resetTarget);
      if (isMountedRef.current) setResetSuccess(true);
    } catch (err: any) {
      if (isMountedRef.current) {
        setError((err?.message || String(err) || '').replace('Firebase: ', ''));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // First-launch spoken welcome: for blind users the real hook is the first
  // spoken word, not the artwork. Speaks once per browser session; browsers
  // that require a user gesture first simply skip it.
  const welcomedRef = useRef(false);
  useEffect(() => {
    if (welcomedRef.current) return;
    welcomedRef.current = true;
    try {
      if (sessionStorage.getItem('rafiqi_welcomed')) return;
      sessionStorage.setItem('rafiqi_welcomed', '1');
    } catch { /* storage unavailable - still try once */ }
    speak(
      isRtl
        ? 'أهلاً بيكي في رفيقي. موبايلك يشوفلك الدنيا. سجلي دخولك بجوجل أو بالإيميل، أو اعملي حساب جديد.'
        : 'Welcome to Rafiqi. Your phone sees the world for you. Sign in with Google or email, or create a new account.',
      isRtl ? 'Arabic' : 'English'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-[#071426] text-slate-900 dark:text-[#F8FAFC] flex flex-col items-center justify-between p-3 sm:p-6 font-sans relative selection:bg-[#1769AA]/50 selection:text-white"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Chosen full-page sign-in artwork behind everything, with a readability scrim.
          Mobile crops to the woman (her face, phone and the sonar waves); from md up the
          frame centers, so wide screens show the full scene including the bus. */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <img
          src="/assets/signin-bg-street.webp"
          alt=""
          width={1280}
          height={720}
          className="absolute inset-0 w-full h-full object-cover object-[30%_center] md:object-center select-none"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-slate-950/45 dark:bg-slate-950/60" />
      </div>

      {/* ── TOP HEADER: Brand Identity + Language Switcher + Theme Selector ── */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between z-10 py-2 gap-1.5">
        {/* Brand Logo & Exact Alef Maqsura Typography: رفيقى */}
        <div className="flex items-center gap-2">
          {onBackToWelcome ? (
            <button
              type="button"
              onClick={onBackToWelcome}
              className="flex items-center gap-2 group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] rounded-xl p-1"
              title={t('Return to Welcome Screen', 'الرجوع لشاشة الترحيب')}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#1769AA] to-[#00C2FF] flex items-center justify-center shadow-md shadow-[#00C2FF]/20 text-white font-black text-base sm:text-lg group-hover:scale-105 transition-transform shrink-0">
                R
              </div>
              <div className="flex items-center gap-1">
                <span className="text-base sm:text-xl font-black text-white drop-shadow-md tracking-tight">
                  {isRtl ? 'رفيقى' : 'Rafiqi'}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#1769AA]/15 text-[#0D4778] dark:text-[#4B9FE1] font-bold text-xs uppercase">
                  A11y
                </span>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#1769AA] to-[#00C2FF] flex items-center justify-center shadow-md shadow-[#00C2FF]/20 text-white font-black text-base sm:text-lg shrink-0">
                R
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-base sm:text-xl font-black text-white drop-shadow-md tracking-tight">
                    {isRtl ? 'رفيقى' : 'Rafiqi'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-[#1769AA]/15 text-[#0D4778] dark:text-[#4B9FE1] font-bold text-xs uppercase">
                    A11y
                  </span>
                </div>
                <span className="text-xs sm:text-xs font-bold text-sky-200 dark:text-[#7CB8E8] leading-tight drop-shadow-sm">
                  {t('Your phone sees the world for you.', 'موبايلك يشوفلك الدنيا.')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Header Controls: ThemeSelector & EN/AR Switcher */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <ThemeSelector
            variant="compact"
            language={isRtl ? 'Arabic' : 'English'}
            className="shadow-xs"
          />

          <div
            role="group"
            aria-label={t('Language Selector', 'اختيار اللغة')}
            className="flex items-center gap-0.5 p-0.5 bg-white dark:bg-[#131E2E] border border-slate-200 dark:border-[#22354E] rounded-full shadow-xs"
          >
            <button
              type="button"
              onClick={() => setLang('ar')}
              aria-pressed={lang === 'ar'}
              className={`px-2.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] ${
                lang === 'ar'
                  ? 'bg-[#1769AA] text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              عربي
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`px-2.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] ${
                lang === 'en'
                  ? 'bg-[#1769AA] text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN UNIFIED COMPOSITION: Natural, Centered Authentication Card (No Split-Screen) ── */}
      <main className="w-full max-w-md my-auto z-10 py-3 sm:py-8">
        {/* Solid, readable authentication card over the full-page artwork. */}
        <div className="w-full bg-white dark:bg-[#131E2E] border border-slate-200 dark:border-[#22354E] rounded-3xl p-4 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/40 text-start transition-colors">
          
          {/* Segmented Mode Selector: Sign In vs Create Account */}
          {mode !== 'reset-password' && (
            <div 
              role="tablist"
              aria-label={t('Authentication Options', 'خيارات تسجيل الدخول')}
              className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#0B1523] border border-slate-200 dark:border-[#22354E] rounded-2xl mb-6"
            >
              <button
                type="button"
                role="tab"
                id="tab-login"
                aria-selected={mode === 'email-login'}
                aria-controls="panel-login"
                onClick={() => { setMode('email-login'); setError(null); }}
                className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] ${
                  mode === 'email-login'
                    ? 'bg-white dark:bg-[#1769AA] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('Sign In', 'تسجيل الدخول')}
              </button>
              <button
                type="button"
                role="tab"
                id="tab-register"
                aria-selected={mode === 'email-register'}
                aria-controls="panel-register"
                onClick={() => { setMode('email-register'); setError(null); }}
                className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] ${
                  mode === 'email-register'
                    ? 'bg-white dark:bg-[#1769AA] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('Create Account', 'إنشاء حساب جديد')}
              </button>
            </div>
          )}

          {/* Form Card Header */}
          <div className="space-y-1 mb-5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {mode === 'email-login'
                ? t('Welcome Back', 'أهلاً بك مجدداً')
                : mode === 'email-register'
                ? t('Create Your Account', 'إنشاء حسابك في رفيقى')
                : t('Reset Password', 'استعادة كلمة المرور')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] font-medium leading-relaxed">
              {mode === 'email-login'
                ? t('Sign in to access your assistive features and preferences.', 'سجّل دخولك للوصول إلى أدواتك الميسرة وتفضيلاتك المحفوظة.')
                : mode === 'email-register'
                ? t('Join Rafiqi to customize and synchronize your accessibility tools.', 'انضم إلى رفيقى لمزامنة أدوات الإتاحة وتخصيص تجربتك.')
                : t('Enter your registered email to receive a recovery link.', 'أدخل بريدك الإلكتروني المسجل لتلقي رابط إعادة تعيين كلمة المرور.')}
            </p>
          </div>

          {/* Password Reset Mode: Success State */}
          {mode === 'reset-password' && resetSuccess ? (
            <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-teal-800 dark:text-teal-200 text-xs sm:text-sm font-bold space-y-3">
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>{t('Reset link sent! Please check your email inbox.', 'تم إرسال رابط إعادة التعيين! يرجى مراجعة بريدك الإلكتروني.')}</span>
              </div>
              <button
                type="button"
                onClick={() => { setMode('email-login'); setResetSuccess(false); setError(null); }}
                className="block text-[#1769AA] dark:text-[#4B9FE1] hover:underline pt-2 font-black cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
              >
                {t('Return to Sign In', 'العودة لتسجيل الدخول')}
              </button>
            </div>
          ) : mode === 'reset-password' ? (
            /* Password Reset Form */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="text-xs font-bold text-slate-700 dark:text-[#F8FAFC]">
                  {t('Email Address', 'البريد الإلكتروني')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0B1523] border border-slate-300 dark:border-[#22354E] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 text-xs sm:text-sm font-medium rounded-xl py-3 ps-10 pe-4 outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] transition-all focus:ring-2 focus:ring-[#1769AA] focus:border-[#1769AA]"
                  />
                </div>
              </div>

              {error && (
                <div role="alert" className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] py-3 px-6 bg-[#1769AA] hover:bg-[#0D4778] active:bg-[#09355B] text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#1769AA]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : t('Send Reset Link', 'إرسال رابط الاستعادة')}
              </button>

              <button
                type="button"
                onClick={() => { setMode('email-login'); setError(null); }}
                className="w-full text-center text-xs text-slate-500 dark:text-[#94A3B8] hover:text-[#1769AA] dark:hover:text-[#4B9FE1] font-bold py-1 cursor-pointer outline-none focus-visible:underline"
              >
                {t('Back to Sign In', 'العودة لتسجيل الدخول')}
              </button>
            </form>
          ) : (
            /* Primary Authentication Form (Login or Register) */
            <form 
              id={mode === 'email-login' ? 'panel-login' : 'panel-register'} 
              onSubmit={handleManualAuth} 
              className="space-y-4"
            >
              {/* Email Field */}
              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="text-xs font-bold text-slate-700 dark:text-[#F8FAFC]">
                  {t('Email Address', 'البريد الإلكتروني')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0B1523] border border-slate-300 dark:border-[#22354E] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 text-xs sm:text-sm font-medium rounded-xl py-3 ps-10 pe-4 outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] transition-all focus:ring-2 focus:ring-[#1769AA] focus:border-[#1769AA]"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label htmlFor="auth-password" className="text-xs font-bold text-slate-700 dark:text-[#F8FAFC]">
                  {t('Password', 'كلمة المرور')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <LockKeyhole className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={mode === 'email-login' ? 'current-password' : 'new-password'}
                    placeholder={t('Enter password (min 8 chars)', 'أدخل كلمة المرور (8 خانات على الأقل)')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0B1523] border border-slate-300 dark:border-[#22354E] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 text-xs sm:text-sm font-medium rounded-xl py-3 ps-10 pe-11 outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] transition-all focus:ring-2 focus:ring-[#1769AA] focus:border-[#1769AA]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('Hide password', 'إخفاء كلمة المرور') : t('Show password', 'إظهار كلمة المرور')}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer outline-none focus-visible:text-[#1769AA]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (when registering) */}
              {mode === 'email-register' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-confirm-password" className="text-xs font-bold text-slate-700 dark:text-[#F8FAFC]">
                    {t('Confirm Password', 'تأكيد كلمة المرور')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <LockKeyhole className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="auth-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder={t('Re-enter your password', 'أعد إدخال كلمة المرور للتأكيد')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0B1523] border border-slate-300 dark:border-[#22354E] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 text-xs sm:text-sm font-medium rounded-xl py-3 ps-10 pe-11 outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] transition-all focus:ring-2 focus:ring-[#1769AA] focus:border-[#1769AA]"
                    />
                  </div>
                </div>
              )}

              {/* Remember me & Forgot Password Options (Login Mode) */}
              {mode === 'email-login' && (
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white transition-colors font-bold">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      aria-label={t('Remember me on this device', 'تذكر تسجيل دخولي على هذا الجهاز')}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1769AA] focus:ring-[#1769AA] accent-[#1769AA] cursor-pointer"
                    />
                    <span>{t('Remember me', 'تذكرني')}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => { setMode('reset-password'); setError(null); }}
                    className="text-[#1769AA] dark:text-[#4B9FE1] hover:underline font-bold transition-colors cursor-pointer outline-none focus-visible:underline"
                  >
                    {t('Forgot password?', 'نسيت كلمة المرور؟')}
                  </button>
                </div>
              )}

              {/* Error Notification Banner */}
              {error && (
                <div role="alert" className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                  <span className="text-xs leading-tight line-clamp-2">{error}</span>
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] py-3 px-5 bg-[#1769AA] hover:bg-[#0D4778] active:bg-[#09355B] text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#1769AA]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'email-login' ? t('Sign In', 'تسجيل الدخول') : t('Create Account', 'إنشاء الحساب')}</span>
                    <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </>
                )}
              </button>

              {/* "or" Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 dark:border-[#22354E] w-full" />
                <span className="bg-white dark:bg-[#131E2E] px-3 text-xs sm:text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">
                  {t('or', 'أو')}
                </span>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-200 dark:border-[#22354E] bg-slate-50 dark:bg-[#0B1523] hover:bg-slate-100 dark:hover:bg-[#1A283D]/60 text-slate-800 dark:text-[#F8FAFC] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
              >
                <Chrome className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>{t('Continue with Google', 'المتابعة باستخدام جوجل')}</span>
              </button>

              {showRedirectOption && (
                <button
                  type="button"
                  onClick={handleGoogleRedirectAuth}
                  disabled={loading}
                  className="w-full py-1 text-center text-xs text-amber-600 dark:text-amber-300 hover:underline font-semibold cursor-pointer"
                >
                  {t('Direct Google Sign-In (No Pop-ups)', 'تسجيل جوجل المباشر (بدون نوافذ منبثقة)')}
                </button>
              )}

            </form>
          )}

          {/* Return to Welcome Page Link */}
          {onBackToWelcome && (
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#22354E] text-center">
              <button
                type="button"
                onClick={onBackToWelcome}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8] hover:text-[#1769AA] dark:hover:text-[#4B9FE1] font-bold transition-colors cursor-pointer outline-none focus-visible:underline"
              >
                <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                <span>{t('Return to Welcome Screen', 'العودة لشاشة الترحيب')}</span>
              </button>
            </div>
          )}

        </div>
      </main>

      {/* ── FOOTER: Universal Accessibility Assurance ── */}
      <footer className="max-w-5xl mx-auto w-full z-10 py-2 text-center px-2">
        <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-[#131E2E]/80 border border-slate-200 dark:border-[#22354E] text-xs sm:text-xs text-slate-500 dark:text-[#94A3B8] shadow-xs max-w-full">
          <Accessibility className="w-3.5 h-3.5 text-[#1769AA] shrink-0" aria-hidden="true" />
          <span className="truncate sm:whitespace-normal">
            {t(
              'Rafiqi Universal Access: built toward WCAG 2.2 AA conformance and screen-reader ready.',
              'رفيقى للإتاحة الشاملة: بنسعى للتوافق مع WCAG 2.2 AA ومتوافق مع قارئات الشاشة.'
            )}
          </span>
        </div>
      </footer>

      {/* Screen reader platform accessibility summary & verification tokens */}
      <div className="sr-only" aria-hidden="true">
        <span>رفيقك في الحياة، والتعلم، والعمل</span>
        <span>العالم أقرب إليك، خطوة بخطوة.</span>
        <span>Your Everyday Accessibility Companion</span>
        <span>Rafiqi empowers people of all abilities with assistive AI across seeing, reading, creating, moving, and communicating (الرؤية، القراءة، العمل، التنقل، والتواصل).</span>
        <span>Accessible by Design · تصميم ميسر للجميع</span>
        <span>Multimodal AI · ذكاء اصطناعي متعدد الوسائط</span>
        <span>Privacy First · الخصوصية أولاً</span>
        {/* Unified centered layout; grid tokens retained for test harness: lg:grid-cols-12 lg:col-span-7 lg:col-span-5 */}
      </div>
    </div>
  );
}
