import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithGoogle, 
  signInWithGoogleRedirect, 
  loginWithEmail, 
  registerWithEmail, 
  auth, 
  clearPreLoginState 
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
  Accessibility, 
  Heart, 
  Users, 
  UserPlus, 
  LogIn, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';

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

  const [mode, setMode] = useState<'email-login' | 'email-register' | 'reset-password'>('email-login');
  
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('cognify_saved_email') || '';
    } catch {
      return '';
    }
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('cognify_remember_me') === 'true';
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
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });

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

    return () => {
      isMountedRef.current = false;
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, []);

  const handleDirectPreview = () => {
    clearPreLoginState();
    try {
      sessionStorage.removeItem('cognify_exit_preview');
      sessionStorage.setItem('cognify_guest_preview', 'disability');
      localStorage.setItem('preLoginAccountPath', 'Special Needs');
      localStorage.setItem('preLoginAccessibilityMode', 'Visual');
      localStorage.setItem('preLoginDisability', 'Visual Impairment');
      localStorage.setItem('cognify_default_disability_tab', 'hub');
      window.location.hash = '#disability/hub';
    } catch (err) {
      console.warn('Direct preview error:', err);
    }
    if (onDirectPreview) {
      onDirectPreview();
    } else {
      window.location.reload();
    }
  };

  const handleGoogleRedirectAuth = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
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
      if (mode === 'email-login') {
        if (rememberMe) {
          try {
            localStorage.setItem('cognify_saved_email', email.trim());
            localStorage.setItem('cognify_remember_me', 'true');
          } catch {}
        } else {
          try {
            localStorage.removeItem('cognify_saved_email');
            localStorage.setItem('cognify_remember_me', 'false');
          } catch {}
        }
        await loginWithEmail(email, password);
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
        await registerWithEmail(email, password);
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
      await sendPasswordResetEmail(auth, email);
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

  return (
    <div
      className="min-h-screen bg-[#071426] text-[#F7FAFF] flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans relative overflow-x-hidden selection:bg-[#087F8C]/40 selection:text-white"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Background ambient lighting — Deep Blue and Academic Teal Identity */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -start-40 w-[600px] h-[600px] bg-[#102F5B]/30 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -end-40 w-[550px] h-[550px] bg-[#087F8C]/15 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 start-1/4 w-[650px] h-[650px] bg-[#1E4D8F]/20 rounded-full blur-[180px]" />
      </div>

      {/* Top Navbar */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between z-10 py-2 sm:py-3 mb-4 sm:mb-8">
        {/* Cognify Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#087F8C] to-[#10B8B0] flex items-center justify-center shadow-lg shadow-[#087F8C]/30 text-white shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="6" cy="12" r="3" fill="currentColor" fillOpacity="0.25" />
              <circle cx="18" cy="6" r="3" fill="currentColor" fillOpacity="0.25" />
              <circle cx="18" cy="18" r="3" fill="currentColor" fillOpacity="0.25" />
              <path d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
              Cognify
            </span>
            <span className="text-[11px] sm:text-xs text-[#C1CCDA] font-semibold mt-1">
              {t('Inclusive Learning Platform', 'منصة التعلّم الشامل')}
            </span>
          </div>
        </div>

        {/* EN / AR Language Switcher */}
        <div
          role="group"
          aria-label={t('Language Selector', 'اختيار اللغة')}
          className="flex items-center gap-1 p-1 bg-[#071A36] border border-[#29466A] rounded-full shadow-md"
        >
          <button
            type="button"
            onClick={() => setLang('en')}
            aria-pressed={lang === 'en'}
            className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#10B8B0] ${
              lang === 'en'
                ? 'bg-[#087F8C] text-white shadow-sm'
                : 'text-[#C1CCDA] hover:text-white hover:bg-[#102F5B]/60'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang('ar')}
            aria-pressed={lang === 'ar'}
            className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#10B8B0] ${
              lang === 'ar'
                ? 'bg-[#087F8C] text-white shadow-sm'
                : 'text-[#C1CCDA] hover:text-white hover:bg-[#102F5B]/60'
            }`}
          >
            AR
          </button>
        </div>
      </header>

      {/* Main 3-Zone Composition: Branding/Headline + Illustration + Sign-in Card */}
      <main className="max-w-7xl mx-auto w-full z-10 my-auto py-2 sm:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ── ZONE A & B: WELCOME MESSAGE, BENEFITS & INCLUSIVE ILLUSTRATION ── */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6 sm:space-y-8 text-start">
            
            {/* Headline and Supporting Description */}
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.2]">
                {isRtl ? (
                  <>
                    طاقات حقيقية.<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10B8B0] via-[#5EEAD4] to-[#087F8C]">
                      تمكين بلا حدود.
                    </span>
                  </>
                ) : (
                  <>
                    Real People.<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10B8B0] via-[#5EEAD4] to-[#087F8C]">
                      Real Potential.
                    </span>
                  </>
                )}
              </h1>

              <p className="text-sm sm:text-base text-[#C1CCDA] font-medium leading-relaxed max-w-xl">
                {t(
                  'Cognify empowers learners of all abilities with personalized, accessible, and flexible learning experiences.',
                  'تمكّن كوجنيفاي المتعلمين بمختلف قدراتهم من خلال تجارب تعلّم مخصصة، ميسرة، ومرنة تواكب وتيرتك واحتياجاتك.'
                )}
              </p>
            </div>

            {/* Three Compact Benefit Items */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
              {/* Item 1: Accessible by Design */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#071A36]/80 border border-[#29466A]/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-[#102F5B] border border-[#29466A] flex items-center justify-center text-[#10B8B0] shrink-0">
                  <Accessibility className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs sm:text-[13px] font-bold text-[#F7FAFF] leading-snug">
                  {t('Accessible by Design', 'تصميم ميسر بالكامل')}
                </span>
              </div>

              {/* Item 2: Personalized Learning */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#071A36]/80 border border-[#29466A]/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-[#102F5B] border border-[#29466A] flex items-center justify-center text-[#10B8B0] shrink-0">
                  <Heart className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs sm:text-[13px] font-bold text-[#F7FAFF] leading-snug">
                  {t('Personalized Learning', 'تعلّم تكيفي مخصص')}
                </span>
              </div>

              {/* Item 3: A More Inclusive Future */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#071A36]/80 border border-[#29466A]/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-[#102F5B] border border-[#29466A] flex items-center justify-center text-[#10B8B0] shrink-0">
                  <Users className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs sm:text-[13px] font-bold text-[#F7FAFF] leading-snug">
                  {t('A More Inclusive Future', 'مستقبل أكثر شمولاً')}
                </span>
              </div>
            </div>

            {/* ── FLOATING SEAMLESS ILLUSTRATION WITH ATMOSPHERIC NAVY/TEAL GLOW ── */}
            <div className="relative mt-3 sm:mt-6 w-full max-w-xl flex items-center justify-center">
              {/* Subtle atmospheric navy and teal aura gradients behind the illustration (no cards or borders) */}
              <div 
                className="absolute inset-0 -m-4 sm:-m-8 bg-gradient-to-tr from-[#087F8C]/15 via-[#10B8B0]/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" 
                aria-hidden="true" 
              />
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-radial from-[#102F5B]/30 via-[#087F8C]/10 to-transparent rounded-full blur-2xl -z-10 pointer-events-none" 
                aria-hidden="true" 
              />
              
              {/* Floating Transparent Illustration (unframed, blends naturally into background) */}
              <img
                src="/assets/inclusive-learners-illustration.png"
                alt={t(
                  'Illustration of diverse learners with disabilities studying collaboratively using assistive technology',
                  'رسم تعبيري لمتعلمين ذوي قدرات متنوعة يدرسون بشكل تعاوني باستخدام التقنيات المساندة'
                )}
                className="w-full h-auto object-contain max-h-[260px] sm:max-h-[340px] drop-shadow-[0_12px_24px_rgba(7,20,38,0.7)] select-none transition-transform duration-700 hover:scale-[1.015]"
                loading="eager"
                width={1376}
                height={768}
              />
            </div>

          </div>

          {/* ── ZONE C: SIGN-IN CARD ── */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-[#0A1F3D] border border-[#29466A] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50 relative text-start">
              
              {/* Form Card Header */}
              <div className="space-y-1.5 mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {mode === 'email-login'
                    ? t('Welcome Back', 'أهلاً بك مجدداً')
                    : mode === 'email-register'
                    ? t('Create Your Profile', 'إنشاء حسابك الجديد')
                    : t('Reset Password', 'استعادة كلمة المرور')}
                </h2>
                <p className="text-xs sm:text-sm text-[#C1CCDA] font-medium leading-relaxed">
                  {mode === 'email-login'
                    ? t('Sign in to continue your learning journey', 'سجّل دخولك لمتابعة رحلتك التعليمية')
                    : mode === 'email-register'
                    ? t('Join our inclusive and accessible platform', 'انضم لمنصتنا التعليمية الميسرة والشاملة')
                    : t('Enter your email to receive recovery instructions', 'أدخل بريدك الإلكتروني لتلقي رابط الاستعادة')}
                </p>
              </div>

              {/* Password Reset Mode Success State */}
              {mode === 'reset-password' && resetSuccess ? (
                <div className="p-4 bg-teal-500/15 border border-teal-500/30 rounded-2xl text-teal-200 text-xs sm:text-sm font-bold space-y-3">
                  <div className="flex items-center gap-2 text-teal-300">
                    <CheckCircle2 className="w-5 h-5 text-teal-400" />
                    <span>{t('Reset link sent! Please check your inbox.', 'تم إرسال رابط إعادة التعيين! يرجى التحقق من بريدك.')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMode('email-login'); setResetSuccess(false); setError(null); }}
                    className="block text-[#10B8B0] hover:text-[#5EEAD4] pt-2 font-black cursor-pointer underline outline-none focus-visible:ring-2 focus-visible:ring-[#10B8B0]"
                  >
                    {t('Return to Sign In', 'العودة لتسجيل الدخول')}
                  </button>
                </div>
              ) : mode === 'reset-password' ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="reset-email" className="text-xs font-bold text-[#F7FAFF]">
                      {t('Email Address', 'البريد الإلكتروني')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
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
                        className="w-full bg-[#F8FAFD] border border-[#29466A] text-[#102542] placeholder-slate-400 text-xs sm:text-sm font-medium rounded-xl py-3 ps-10 pe-4 outline-none transition-all focus:ring-2 focus:ring-[#10B8B0] focus:border-[#10B8B0]"
                      />
                    </div>
                  </div>

                  {error && (
                    <div role="alert" className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 bg-[#087F8C] hover:bg-[#10B8B0] active:bg-[#06626C] text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#087F8C]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-3 focus-visible:ring-[#F59E0B]"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : t('Send Reset Link', 'إرسال رابط الاستعادة')}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMode('email-login'); setError(null); }}
                    className="w-full text-center text-xs text-[#C1CCDA] hover:text-[#10B8B0] font-bold py-1 cursor-pointer outline-none focus-visible:underline"
                  >
                    {t('Back to Sign In', 'العودة لتسجيل الدخول')}
                  </button>
                </form>
              ) : (
                /* Primary Authentication Form (Login or Register) */
                <form onSubmit={handleManualAuth} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label htmlFor="auth-email" className="text-xs font-bold text-[#F7FAFF]">
                      {t('Email Address', 'البريد الإلكتروني')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
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
                        className="w-full bg-[#F8FAFD] border border-[#29466A] text-[#102542] placeholder-slate-400 text-xs sm:text-sm font-medium rounded-xl py-3 ps-10 pe-4 outline-none transition-all focus:ring-2 focus:ring-[#10B8B0] focus:border-[#10B8B0]"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <label htmlFor="auth-password" className="text-xs font-bold text-[#F7FAFF]">
                      {t('Password', 'كلمة المرور')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                        <LockKeyhole className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete={mode === 'email-login' ? 'current-password' : 'new-password'}
                        placeholder={t('Enter your password', 'أدخل كلمة المرور')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#F8FAFD] border border-[#29466A] text-[#102542] placeholder-slate-400 text-xs sm:text-sm font-medium rounded-xl py-3 ps-10 pe-11 outline-none transition-all focus:ring-2 focus:ring-[#10B8B0] focus:border-[#10B8B0]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('Hide password', 'إخفاء كلمة المرور') : t('Show password', 'إظهار كلمة المرور')}
                        aria-pressed={showPassword}
                        className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer outline-none focus-visible:text-[#087F8C]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password (when registering) */}
                  {mode === 'email-register' && (
                    <div className="space-y-1.5">
                      <label htmlFor="auth-confirm-password" className="text-xs font-bold text-[#F7FAFF]">
                        {t('Confirm Password', 'تأكيد كلمة المرور')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                          <LockKeyhole className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <input
                          id="auth-confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          placeholder={t('Confirm your password', 'أعد إدخال كلمة المرور')}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-[#F8FAFD] border border-[#29466A] text-[#102542] placeholder-slate-400 text-xs sm:text-sm font-medium rounded-xl py-3 ps-10 pe-11 outline-none transition-all focus:ring-2 focus:ring-[#10B8B0] focus:border-[#10B8B0]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Remember me & Forgot Password Options (Login Mode) */}
                  {mode === 'email-login' && (
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-[#C1CCDA] hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded text-[#087F8C] focus:ring-[#10B8B0] accent-[#087F8C] cursor-pointer"
                        />
                        <span>{t('Remember me', 'تذكرني')}</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => { setMode('reset-password'); setError(null); }}
                        className="text-[#10B8B0] hover:text-[#5EEAD4] font-bold transition-colors cursor-pointer outline-none focus-visible:underline"
                      >
                        {t('Forgot password?', 'نسيت كلمة المرور؟')}
                      </button>
                    </div>
                  )}

                  {/* Error Notification */}
                  {error && (
                    <div role="alert" className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Primary Teal Sign-in / Create Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 bg-[#087F8C] hover:bg-[#10B8B0] active:bg-[#06626C] text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-[#087F8C]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-3 focus-visible:ring-[#F59E0B]"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>{mode === 'email-login' ? t('Sign In', 'تسجيل الدخول') : t('Create Account', 'إنشاء الحساب')}</span>
                        <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </>
                    )}
                  </button>

                  {/* "or" Divider */}
                  <div className="relative flex items-center justify-center my-3">
                    <div className="border-t border-[#29466A] w-full" />
                    <span className="bg-[#0A1F3D] px-3 text-[11px] font-bold text-[#C1CCDA] uppercase tracking-wider">
                      {t('or', 'أو')}
                    </span>
                  </div>

                  {/* Secondary Action: Create Account / Switch to Login */}
                  {mode === 'email-login' ? (
                    <button
                      type="button"
                      onClick={() => { setMode('email-register'); setError(null); }}
                      className="w-full py-3 px-6 rounded-xl border border-[#29466A] hover:border-[#10B8B0] bg-[#102F5B]/30 hover:bg-[#102F5B]/60 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#10B8B0]"
                    >
                      <UserPlus className="w-4 h-4 text-[#10B8B0]" aria-hidden="true" />
                      <span>{t('Create Account', 'إنشاء حساب جديد')}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setMode('email-login'); setError(null); }}
                      className="w-full py-3 px-6 rounded-xl border border-[#29466A] hover:border-[#10B8B0] bg-[#102F5B]/30 hover:bg-[#102F5B]/60 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#10B8B0]"
                    >
                      <LogIn className="w-4 h-4 text-[#10B8B0]" aria-hidden="true" />
                      <span>{t('Back to Sign In', 'العودة لتسجيل الدخول')}</span>
                    </button>
                  )}

                  {/* Secondary Social Login & Direct Guest Preview */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-[#29466A]/60 mt-4">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={loading}
                      className="w-full py-2.5 px-4 rounded-xl border border-[#29466A] bg-[#071A36] hover:bg-[#102F5B]/50 text-[#F7FAFF] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#10B8B0]"
                    >
                      <Chrome className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      <span>{t('Continue with Google', 'المتابعة بحساب جوجل')}</span>
                    </button>

                    {showRedirectOption && (
                      <button
                        type="button"
                        onClick={handleGoogleRedirectAuth}
                        disabled={loading}
                        className="w-full py-2 px-3 text-[11px] text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer"
                      >
                        {t('Direct Google Sign-In (No Pop-ups)', 'تسجيل جوجل المباشر (بدون نوافذ منبثقة)')}
                      </button>
                    )}

                    {onDirectPreview && (
                      <button
                        type="button"
                        onClick={handleDirectPreview}
                        className="text-[11px] text-[#C1CCDA] hover:text-[#10B8B0] transition-colors py-1 cursor-pointer underline text-center outline-none focus-visible:ring-1 focus-visible:ring-[#10B8B0]"
                      >
                        {t('Explore Cognify as Guest (Direct Preview)', 'استكشف كوجنيفاي كزائر (معاينة مباشرة)')}
                      </button>
                    )}
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* ── ZONE 3: ACCESSIBILITY ASSURANCE FOOTER ── */}
      <footer className="max-w-7xl mx-auto w-full z-10 pt-6 pb-2 text-start">
        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#071A36]/90 border border-[#29466A] text-xs sm:text-[13px] text-[#F7FAFF] shadow-sm backdrop-blur-xs">
          <div className="w-6 h-6 rounded-full bg-[#087F8C] flex items-center justify-center text-white shrink-0">
            <Accessibility className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <span className="font-medium">
            {t(
              'Cognify supports assistive technologies and is built with accessibility in mind.',
              'كوجنيفاي تدعم التقنيات المساندة ومصممة بأعلى معايير الإتاحة العالمية.'
            )}
          </span>
        </div>
      </footer>
    </div>
  );
}
