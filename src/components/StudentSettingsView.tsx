import { localize, isArabicLocale } from '../lib/translations';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, AccessibilityPassport, LanguagePreference, PedagogyStyle } from '../types';
import { 
  Settings, UserCheck, BookOpen, Volume2, ShieldCheck, 
  Globe, MessageSquare, SlidersHorizontal, User, Play, 
  RotateCcw, LogOut, CheckCircle2, ChevronDown, Check,
  AlertCircle, Loader2, Gauge, Activity, Sun, Moon, Contrast, 
  EyeOff, Monitor, Save, Sparkles, VolumeX, Eye
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, cleanDataForFirestore } from '../lib/firebase';
import { logout } from '../lib/firebase';
import { toast } from './Toast';
import { speak } from '../lib/tts';

export interface StudentSettingsViewProps {
  profile: UserProfile;
  setProfile?: (profile: UserProfile) => void;
  onNavigateBack?: () => void;
  onNavigate?: (view: any) => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

function formatSavedTime(date: Date, isAr: boolean): string {
  try {
    const day = date.getDate();
    const monthsAr = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const month = isAr ? monthsAr[date.getMonth()] : date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = isAr ? (hours >= 12 ? 'م' : 'ص') : (hours >= 12 ? 'PM' : 'AM');
    hours = hours % 12 || 12;

    return isAr 
      ? `${day} ${month} ${year} - ${hours}:${minutes} ${period}`
      : `${month} ${day}, ${year} - ${hours}:${minutes} ${period}`;
  } catch {
    return isAr ? '25 أكتوبر 2024 - 12:30 م' : 'Oct 25, 2024 - 12:30 PM';
  }
}

export default function StudentSettingsView({
  profile,
  setProfile,
  onNavigateBack,
  onNavigate,
  isDarkMode = true,
  toggleTheme
}: StudentSettingsViewProps) {
  const isAr = isArabicLocale(profile.language);

  // ── Settings State ──
  // Card A: Accessibility
  const [fontSizeScale, setFontSizeScale] = useState<'normal' | 'medium' | 'large' | 'extra-large'>(
    () => profile.accessibilityPassport?.fontSizeScale || 'medium'
  );
  const [contrastMode, setContrastMode] = useState<'dark' | 'light' | 'contrast'>(() => {
    if (profile.accessibilityPassport?.highContrast) return 'contrast';
    return isDarkMode ? 'dark' : 'light';
  });
  const [screenReader, setScreenReader] = useState<boolean>(
    () => profile.accessibilityPassport?.autoSpeak ?? true
  );
  const [reduceMotion, setReduceMotion] = useState<boolean>(
    () => profile.accessibilityPassport?.reduceMotion ?? true
  );

  // Card B: Learning Preferences
  const [interfaceLanguage, setInterfaceLanguage] = useState<LanguagePreference>(
    () => profile.language || 'Arabic'
  );
  const [explanationLanguage, setExplanationLanguage] = useState<string>(
    () => (profile as any).explanationLanguage || profile.language || 'Arabic'
  );
  const [explanationDetail, setExplanationDetail] = useState<'concise' | 'balanced' | 'detailed'>(() => {
    if (profile.preferredPedagogyStyle === 'simplified') return 'concise';
    if (profile.preferredPedagogyStyle === 'socratic' || profile.preferredPedagogyStyle === 'technical') return 'detailed';
    return 'balanced';
  });
  const [experienceLevel, setExperienceLevel] = useState<'Basic' | 'Intermediate' | 'Advanced'>(
    () => (profile.level === 'Basic' || profile.level === 'Intermediate' || profile.level === 'Advanced') ? profile.level : 'Basic'
  );

  // Card C: Audio & Reading
  const [audioSpeed, setAudioSpeed] = useState<number>(
    () => profile.accessibilityPassport?.audioSpeed ?? 1.0
  );
  const [voiceSelection, setVoiceSelection] = useState<string>(() => {
    try {
      return localStorage.getItem('cognify_settings_voice') || 'female_ar';
    } catch {
      return 'female_ar';
    }
  });
  const [audioQuality, setAudioQuality] = useState<string>(() => {
    try {
      return localStorage.getItem('cognify_settings_audio_quality') || 'high';
    } catch {
      return 'high';
    }
  });
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Card D: Account & Preferences
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('cognify_auto_save_settings');
      return val !== 'false';
    } catch {
      return true;
    }
  });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedStr, setLastSavedStr] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('cognify_settings_last_saved');
      if (saved) return saved;
    } catch {}
    return formatSavedTime(new Date(), isAr);
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync contrast mode when isDarkMode prop changes
  useEffect(() => {
    if (contrastMode !== 'contrast') {
      setContrastMode(isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode, contrastMode]);

  // Apply root font scale & motion reduction
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      switch (fontSizeScale) {
        case 'normal': root.style.fontSize = '95%'; break;
        case 'medium': root.style.fontSize = '100%'; break;
        case 'large': root.style.fontSize = '108%'; break;
        case 'extra-large': root.style.fontSize = '116%'; break;
      }
      if (reduceMotion) {
        root.classList.add('reduce-motion');
      } else {
        root.classList.remove('reduce-motion');
      }
    }
  }, [fontSizeScale, reduceMotion]);

  // Debounced auto-save handler
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const executeSave = useCallback((
    newFontSize: 'normal' | 'medium' | 'large' | 'extra-large',
    newContrast: 'dark' | 'light' | 'contrast',
    newScreenReader: boolean,
    newReduceMotion: boolean,
    newInterfaceLang: LanguagePreference,
    newExplLang: string,
    newDetail: 'concise' | 'balanced' | 'detailed',
    newLevel: 'Basic' | 'Intermediate' | 'Advanced',
    newSpeed: number,
    newVoice: string,
    newQuality: string,
    newAutoSave: boolean
  ) => {
    if (!newAutoSave) return;
    setSaveStatus('saving');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const pedStyle: PedagogyStyle = newDetail === 'concise' ? 'simplified' : newDetail === 'detailed' ? 'socratic' : 'scaffolded';
        
        const existingPassport = profile.accessibilityPassport || {
          primaryMode: profile.accessibilityMode || 'None',
          primaryCategory: profile.accessibilityMode || 'Multiple',
          highContrast: false,
          dyslexiaFont: false,
          fontSizeScale: 'medium',
          reduceMotion: false,
          hapticFeedback: true,
          autoSpeak: true,
          audioSpeed: 1,
          allowCameraTriggers: true,
        };

        const updatedPassport: AccessibilityPassport = {
          ...existingPassport,
          fontSizeScale: newFontSize,
          highContrast: newContrast === 'contrast',
          autoSpeak: newScreenReader,
          reduceMotion: newReduceMotion,
          audioSpeed: newSpeed,
        };

        const updatedProfile: UserProfile = {
          ...profile,
          language: newInterfaceLang,
          level: newLevel,
          preferredPedagogyStyle: pedStyle,
          accessibilityPassport: updatedPassport,
          ...(newExplLang ? { explanationLanguage: newExplLang } : {}),
        };

        if (setProfile) setProfile(updatedProfile);

        if (profile.uid && profile.uid !== 'guest-explorer') {
          await setDoc(doc(db, `users/${profile.uid}`), cleanDataForFirestore(updatedProfile), { merge: true });
        }

        const now = new Date();
        const formatted = formatSavedTime(now, isAr);
        setLastSavedStr(formatted);
        try {
          localStorage.setItem('cognify_settings_last_saved', formatted);
          localStorage.setItem('cognify_settings_voice', newVoice);
          localStorage.setItem('cognify_settings_audio_quality', newQuality);
          localStorage.setItem('cognify_font_scale', newFontSize);
          localStorage.setItem('cognify_high_contrast', String(newContrast === 'contrast'));
          localStorage.setItem('cognify_reduce_motion', String(newReduceMotion));
          localStorage.setItem('cognify_auto_save_settings', String(newAutoSave));
        } catch {}

        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save settings:', err);
        setSaveStatus('error');
      }
    }, 500);
  }, [profile, setProfile, isAr]);

  const handleVoicePreview = () => {
    if (isPlayingPreview) return;
    setIsPlayingPreview(true);
    const phrase = isAr
      ? 'مرحباً بك في كوجنيفاي، تم ضبط إعدادات الصوت والقراءة بنجاح.'
      : 'Welcome to Cognify. Your audio and reading settings are configured successfully.';

    speak(phrase, interfaceLanguage === 'English' ? 'English' : 'Arabic', {
      rate: audioSpeed,
      onEnd: () => setIsPlayingPreview(false),
      onError: () => setIsPlayingPreview(false)
    });
  };

  const handleResetDefaults = async () => {
    setShowResetConfirm(false);
    setSaveStatus('saving');

    const defaultScale = 'medium';
    const defaultContrast = 'dark';
    const defaultScreenReader = true;
    const defaultMotion = false;
    const defaultLang: LanguagePreference = 'Arabic';
    const defaultDetail = 'balanced';
    const defaultLevel = 'Basic';
    const defaultSpeed = 1.0;
    const defaultVoice = 'female_ar';
    const defaultQuality = 'high';
    const defaultAutoSave = true;

    setFontSizeScale(defaultScale);
    setContrastMode(defaultContrast);
    setScreenReader(defaultScreenReader);
    setReduceMotion(defaultMotion);
    setInterfaceLanguage(defaultLang);
    setExplanationLanguage('Arabic');
    setExplanationDetail(defaultDetail);
    setExperienceLevel(defaultLevel);
    setAudioSpeed(defaultSpeed);
    setVoiceSelection(defaultVoice);
    setAudioQuality(defaultQuality);
    setAutoSave(defaultAutoSave);

    if (toggleTheme && !isDarkMode) toggleTheme();

    const defaultPassport: AccessibilityPassport = {
      primaryMode: profile.accessibilityMode || 'None',
      primaryCategory: profile.accessibilityMode || 'Multiple',
      highContrast: false,
      dyslexiaFont: false,
      fontSizeScale: defaultScale,
      reduceMotion: defaultMotion,
      hapticFeedback: true,
      autoSpeak: defaultScreenReader,
      audioSpeed: defaultSpeed,
      allowCameraTriggers: true,
      visualSupport: { highContrast: false, autoSpeechReadout: true, hapticAssistance: true },
      hearingSupport: { visualAcousticRadar: true, reverseSignToSpeech: true, flashingAlerts: true },
      neurodiversitySupport: { dyslexiaFont: false, readingRuler: false, sensoryRegulation: false },
    };

    const resetProfile: UserProfile = {
      ...profile,
      language: defaultLang,
      level: defaultLevel,
      preferredPedagogyStyle: 'scaffolded',
      accessibilityPassport: defaultPassport,
    };

    if (setProfile) setProfile(resetProfile);
    if (profile.uid && profile.uid !== 'guest-explorer') {
      await setDoc(doc(db, `users/${profile.uid}`), cleanDataForFirestore(resetProfile), { merge: true });
    }

    const now = new Date();
    const formatted = formatSavedTime(now, isAr);
    setLastSavedStr(formatted);
    try {
      localStorage.setItem('cognify_settings_last_saved', formatted);
      localStorage.setItem('cognify_settings_voice', defaultVoice);
      localStorage.setItem('cognify_settings_audio_quality', defaultQuality);
      localStorage.setItem('cognify_font_scale', defaultScale);
      localStorage.setItem('cognify_high_contrast', 'false');
      localStorage.setItem('cognify_reduce_motion', 'false');
      localStorage.setItem('cognify_auto_save_settings', 'true');
    } catch {}

    setSaveStatus('saved');
    toast.success(localize(profile.language, 'Preferences restored to defaults', 'تمت استعادة الإعدادات الافتراضية بنجاح'));
  };

  return (
    <div 
      dir={isAr ? 'rtl' : 'ltr'}
      className="flex-1 w-full min-h-full bg-[#071B33] text-[#F4F7FB] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-300 custom-scrollbar relative"
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-20">

        {/* ── PAGE HEADER (Exact Match with Reference) ── */}
        <div className="space-y-1 text-start">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-[#F4F7FB] tracking-tight">
              {localize(profile.language, 'Settings', 'الإعدادات')}
            </h1>
            <div className="w-8 h-8 rounded-xl bg-[#087F8C]/20 border border-[#087F8C]/40 flex items-center justify-center text-[#00AEB8] shrink-0">
              <Settings className="w-4 h-4 text-[#00AEB8]" />
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#A9C4DD] font-medium leading-relaxed">
            {localize(
              profile.language,
              'Personalize your learning experience to match your needs and preferences.',
              'خصص تجربتك التعليمية حسب احتياجاتك وتفضيلاتك الشخصية.'
            )}
          </p>
        </div>

        {/* ── 4 CARDS (2x2 GRID MATCHING REFERENCE) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ═════════════════════════════════════════════════════════════════
              CARD A: ACCESSIBILITY SETTINGS (إعدادات الوصول)
             ═════════════════════════════════════════════════════════════════ */}
          <div className="bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="border-b border-[#16395E] pb-4 mb-6">
                <div className="flex items-center gap-2.5 text-[#00AEB8]">
                  <UserCheck className="w-5 h-5 text-[#00AEB8]" />
                  <h2 className="text-lg font-bold text-[#F4F7FB]">
                    {localize(profile.language, 'Accessibility Settings', 'إعدادات الوصول')}
                  </h2>
                </div>
                <p className="text-xs text-[#A9C4DD] mt-1 font-medium">
                  {localize(
                    profile.language,
                    'Improve usability and simplify access to content.',
                    'لتحسين تجربة الاستخدام وتسهيل الوصول للمحتوى.'
                  )}
                </p>
              </div>

              {/* Rows */}
              <div className="space-y-6">

                {/* Row 1: Text Size */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#F4F7FB] font-black text-sm shrink-0">
                      Aa
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="setting-font-size" className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Text Size', 'حجم الخط')}
                      </label>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Choose text size for your comfort.', 'اختر حجم النص المناسب لراحتك.')}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0">
                    <select
                      id="setting-font-size"
                      value={fontSizeScale}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setFontSizeScale(val);
                        executeSave(val, contrastMode, screenReader, reduceMotion, interfaceLanguage, explanationLanguage, explanationDetail, experienceLevel, audioSpeed, voiceSelection, audioQuality, autoSave);
                      }}
                      className="bg-[#082344] border border-[#16395E] rounded-xl px-3.5 py-2.5 text-xs text-[#F4F7FB] font-semibold pe-8 focus:outline-none focus:border-[#00AEB8] cursor-pointer appearance-none min-w-[120px] sm:min-w-[140px] text-center"
                    >
                      <option value="normal">{localize(profile.language, 'Small', 'صغير')}</option>
                      <option value="medium">{localize(profile.language, 'Medium', 'متوسط')}</option>
                      <option value="large">{localize(profile.language, 'Large', 'كبير')}</option>
                      <option value="extra-large">{localize(profile.language, 'Extra Large', 'كبير جداً')}</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#A9C4DD] absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Row 2: Contrast / Theme */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#A9C4DD] shrink-0">
                      <Contrast className="w-5 h-5 text-[#A9C4DD]" />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="setting-contrast" className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Contrast / Appearance', 'التباين / المظهر')}
                      </label>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Choose mode that suits your vision.', 'اختر النمط الذي يناسب رؤيتك.')}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0">
                    <select
                      id="setting-contrast"
                      value={contrastMode}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setContrastMode(val);
                        if (val === 'dark' && !isDarkMode && toggleTheme) toggleTheme();
                        if (val === 'light' && isDarkMode && toggleTheme) toggleTheme();
                        executeSave(fontSizeScale, val, screenReader, reduceMotion, interfaceLanguage, explanationLanguage, explanationDetail, experienceLevel, audioSpeed, voiceSelection, audioQuality, autoSave);
                      }}
                      className="bg-[#082344] border border-[#16395E] rounded-xl px-3.5 py-2.5 text-xs text-[#F4F7FB] font-semibold pe-8 focus:outline-none focus:border-[#00AEB8] cursor-pointer appearance-none min-w-[120px] sm:min-w-[140px] text-center"
                    >
                      <option value="dark">{localize(profile.language, 'Dark Mode', 'الوضع الداكن')}</option>
                      <option value="light">{localize(profile.language, 'Light Mode', 'الوضع الفاتح')}</option>
                      <option value="contrast">{localize(profile.language, 'High Contrast', 'تباين عالي')}</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#A9C4DD] absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Row 3: Screen Reader */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#A9C4DD] shrink-0">
                      <Monitor className="w-5 h-5 text-[#A9C4DD]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Screen Reader', 'قارئ الشاشة')}
                      </span>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Enable screen reader enhancements.', 'تفعيل تحسينات قارئ الشاشة.')}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-[#F4F7FB]">
                      {screenReader ? localize(profile.language, 'Enabled', 'مفعل') : localize(profile.language, 'Disabled', 'معطل')}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={screenReader}
                      onClick={() => {
                        const next = !screenReader;
                        setScreenReader(next);
                        executeSave(fontSizeScale, contrastMode, next, reduceMotion, interfaceLanguage, explanationLanguage, explanationDetail, experienceLevel, audioSpeed, voiceSelection, audioQuality, autoSave);
                      }}
                      className={`w-12 h-6.5 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                        screenReader ? 'bg-[#00AEB8]' : 'bg-[#082344] border border-[#16395E]'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform shadow-xs ${
                        screenReader 
                          ? (isAr ? '-translate-x-5' : 'translate-x-5')
                          : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Row 4: Reduce Motion */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#A9C4DD] shrink-0">
                      <EyeOff className="w-5 h-5 text-[#A9C4DD]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Reduce Motion', 'تقليل الحركة')}
                      </span>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Reduces movements and animations.', 'يقلل من الحركات والرسوم المتحركة.')}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-[#F4F7FB]">
                      {reduceMotion ? localize(profile.language, 'Enabled', 'مفعل') : localize(profile.language, 'Disabled', 'معطل')}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={reduceMotion}
                      onClick={() => {
                        const next = !reduceMotion;
                        setReduceMotion(next);
                        executeSave(fontSizeScale, contrastMode, screenReader, next, interfaceLanguage, explanationLanguage, explanationDetail, experienceLevel, audioSpeed, voiceSelection, audioQuality, autoSave);
                      }}
                      className={`w-12 h-6.5 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                        reduceMotion ? 'bg-[#00AEB8]' : 'bg-[#082344] border border-[#16395E]'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform shadow-xs ${
                        reduceMotion 
                          ? (isAr ? '-translate-x-5' : 'translate-x-5')
                          : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              CARD B: LEARNING PREFERENCES (تفضيلات التعلم)
             ═════════════════════════════════════════════════════════════════ */}
          <div className="bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="border-b border-[#16395E] pb-4 mb-6">
                <div className="flex items-center gap-2.5 text-[#00AEB8]">
                  <BookOpen className="w-5 h-5 text-[#00AEB8]" />
                  <h2 className="text-lg font-bold text-[#F4F7FB]">
                    {localize(profile.language, 'Learning Preferences', 'تفضيلات التعلم')}
                  </h2>
                </div>
                <p className="text-xs text-[#A9C4DD] mt-1 font-medium">
                  {localize(
                    profile.language,
                    'Tailor learning method to fit your style and needs.',
                    'اجعل طريقة التعلم تناسب أسلوبك واحتياجاتك.'
                  )}
                </p>
              </div>

              {/* Rows */}
              <div className="space-y-6">

                {/* Row 1: Interface Language */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#A9C4DD] shrink-0">
                      <Globe className="w-5 h-5 text-[#A9C4DD]" />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="setting-ui-lang" className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Interface Language', 'اللغة المفضلة للواجهة')}
                      </label>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Language you want the app to be in', 'اللغة التي تريد استخدام التطبيق بها')}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0">
                    <select
                      id="setting-ui-lang"
                      value={interfaceLanguage}
                      onChange={(e) => {
                        const val = e.target.value as LanguagePreference;
                        setInterfaceLanguage(val);
                        executeSave(fontSizeScale, contrastMode, screenReader, reduceMotion, val, explanationLanguage, explanationDetail, experienceLevel, audioSpeed, voiceSelection, audioQuality, autoSave);
                      }}
                      className="bg-[#082344] border border-[#16395E] rounded-xl px-3.5 py-2.5 text-xs text-[#F4F7FB] font-semibold pe-8 focus:outline-none focus:border-[#00AEB8] cursor-pointer appearance-none min-w-[120px] sm:min-w-[140px] text-center"
                    >
                      <option value="Arabic">العربية</option>
                      <option value="English">English</option>
                      <option value="Egyptian Ammiya">اللهجة المصرية</option>
                      <option value="French">Français</option>
                      <option value="Spanish">Español</option>
                      <option value="German">Deutsch</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#A9C4DD] absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Row 2: Explanation Language */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#A9C4DD] shrink-0">
                      <MessageSquare className="w-5 h-5 text-[#A9C4DD]" />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="setting-expl-lang" className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Explanation Language', 'لغة الشرح والتوضيح')}
                      </label>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Language used in internal explanations.', 'اللغة المستخدمة في الشروحات الداخلية.')}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0">
                    <select
                      id="setting-expl-lang"
                      value={explanationLanguage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExplanationLanguage(val);
                        executeSave(fontSizeScale, contrastMode, screenReader, reduceMotion, interfaceLanguage, val, explanationDetail, experienceLevel, audioSpeed, voiceSelection, audioQuality, autoSave);
                      }}
                      className="bg-[#082344] border border-[#16395E] rounded-xl px-3.5 py-2.5 text-xs text-[#F4F7FB] font-semibold pe-8 focus:outline-none focus:border-[#00AEB8] cursor-pointer appearance-none min-w-[120px] sm:min-w-[140px] text-center"
                    >
                      <option value="Arabic">العربية</option>
                      <option value="English">English</option>
                      <option value="Egyptian Ammiya">اللهجة المصرية</option>
                      <option value="French">Français</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#A9C4DD] absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Row 3: Detail Level */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#A9C4DD] shrink-0">
                      <SlidersHorizontal className="w-5 h-5 text-[#A9C4DD]" />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="setting-detail-level" className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Detail Level', 'مستوى التفاصيل')}
                      </label>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Depth of explanation in lessons & content.', 'مدى عمق الشرح في الدروس والمحتوى.')}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0">
                    <select
                      id="setting-detail-level"
                      value={explanationDetail}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setExplanationDetail(val);
                        executeSave(fontSizeScale, contrastMode, screenReader, reduceMotion, interfaceLanguage, explanationLanguage, val, experienceLevel, audioSpeed, voiceSelection, audioQuality, autoSave);
                      }}
                      className="bg-[#082344] border border-[#16395E] rounded-xl px-3.5 py-2.5 text-xs text-[#F4F7FB] font-semibold pe-8 focus:outline-none focus:border-[#00AEB8] cursor-pointer appearance-none min-w-[120px] sm:min-w-[140px] text-center"
                    >
                      <option value="concise">{localize(profile.language, 'Concise', 'موجز')}</option>
                      <option value="balanced">{localize(profile.language, 'Medium', 'متوسط')}</option>
                      <option value="detailed">{localize(profile.language, 'Detailed', 'مفصل')}</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#A9C4DD] absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Row 4: Experience Level */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#A9C4DD] shrink-0">
                      <User className="w-5 h-5 text-[#A9C4DD]" />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="setting-experience-level" className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Experience Level', 'مستوى الخبرة')}
                      </label>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Determines foundational difficulty for you.', 'تحديد مستوى الأساسيات التي تناسبك.')}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0">
                    <select
                      id="setting-experience-level"
                      value={experienceLevel}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setExperienceLevel(val);
                        executeSave(fontSizeScale, contrastMode, screenReader, reduceMotion, interfaceLanguage, explanationLanguage, explanationDetail, val, audioSpeed, voiceSelection, audioQuality, autoSave);
                      }}
                      className="bg-[#082344] border border-[#16395E] rounded-xl px-3.5 py-2.5 text-xs text-[#F4F7FB] font-semibold pe-8 focus:outline-none focus:border-[#00AEB8] cursor-pointer appearance-none min-w-[120px] sm:min-w-[140px] text-center"
                    >
                      <option value="Basic">{localize(profile.language, 'Beginner', 'مبتدئ')}</option>
                      <option value="Intermediate">{localize(profile.language, 'Intermediate', 'متوسط')}</option>
                      <option value="Advanced">{localize(profile.language, 'Advanced', 'متقدم')}</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#A9C4DD] absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              CARD C: AUDIO AND READING (الصوت والقراءة)
             ═════════════════════════════════════════════════════════════════ */}
          <div className="bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="border-b border-[#16395E] pb-4 mb-6">
                <div className="flex items-center gap-2.5 text-[#00AEB8]">
                  <Volume2 className="w-5 h-5 text-[#00AEB8]" />
                  <h2 className="text-lg font-bold text-[#F4F7FB]">
                    {localize(profile.language, 'Audio & Reading', 'الصوت والقراءة')}
                  </h2>
                </div>
                <p className="text-xs text-[#A9C4DD] mt-1 font-medium">
                  {localize(
                    profile.language,
                    'Control how audio and spoken content is read.',
                    'تحكم في طريقة قراءة المحتوى الصوتي.'
                  )}
                </p>
              </div>

              {/* Rows */}
              <div className="space-y-6">

                {/* Row 1: Reading Speed */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#A9C4DD] shrink-0">
                      <Gauge className="w-5 h-5 text-[#A9C4DD]" />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="setting-speech-rate" className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Reading Speed', 'سرعة القراءة')}
                      </label>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Set voice readout speed.', 'حدد سرعة الصوت عند القراءة.')}
                      </p>
                    </div>
                  </div>

                  {/* Slider Control with Numeric Value */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto w-full sm:w-auto">
                    <input
                      id="setting-speech-rate"
                      type="range"
                      min="0.75"
                      max="1.75"
                      step="0.05"
                      value={audioSpeed}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setAudioSpeed(val);
                        executeSave(fontSizeScale, contrastMode, screenReader, reduceMotion, interfaceLanguage, explanationLanguage, explanationDetail, experienceLevel, val, voiceSelection, audioQuality, autoSave);
                      }}
                      className="w-32 sm:w-36 h-2 bg-[#102C4D] rounded-lg appearance-none cursor-pointer accent-[#00AEB8]"
                    />
                    <span className="text-xs font-bold text-[#F4F7FB] font-mono min-w-[36px] text-center">
                      {audioSpeed.toFixed(1)}x
                    </span>
                  </div>
                </div>

                {/* Row 2: Voice Selection */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#A9C4DD] shrink-0">
                      <User className="w-5 h-5 text-[#A9C4DD]" />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="setting-voice" className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Voice Used', 'الصوت المستخدم')}
                      </label>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Choose your preferred voice.', 'اختر الصوت المفضل لديك.')}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0">
                    <select
                      id="setting-voice"
                      value={voiceSelection}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVoiceSelection(val);
                        executeSave(fontSizeScale, contrastMode, screenReader, reduceMotion, interfaceLanguage, explanationLanguage, explanationDetail, experienceLevel, audioSpeed, val, audioQuality, autoSave);
                      }}
                      className="bg-[#082344] border border-[#16395E] rounded-xl px-3.5 py-2.5 text-xs text-[#F4F7FB] font-semibold pe-8 focus:outline-none focus:border-[#00AEB8] cursor-pointer appearance-none min-w-[130px] sm:min-w-[150px] text-center"
                    >
                      <option value="female_ar">{localize(profile.language, 'Female Voice (Arabic)', 'صوت أنثوي (عربي)')}</option>
                      <option value="male_ar">{localize(profile.language, 'Male Voice (Arabic)', 'صوت ذكوري (عربي)')}</option>
                      <option value="standard_en">{localize(profile.language, 'Standard Voice (English)', 'صوت قياسي (إنجليزي)')}</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#A9C4DD] absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Row 3: Audio Quality */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#A9C4DD] shrink-0">
                      <Activity className="w-5 h-5 text-[#A9C4DD]" />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="setting-quality" className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Audio Quality', 'جودة الصوت')}
                      </label>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Choose audio quality during readout.', 'اختر جودة الصوت عند القراءة.')}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0">
                    <select
                      id="setting-quality"
                      value={audioQuality}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAudioQuality(val);
                        executeSave(fontSizeScale, contrastMode, screenReader, reduceMotion, interfaceLanguage, explanationLanguage, explanationDetail, experienceLevel, audioSpeed, voiceSelection, val, autoSave);
                      }}
                      className="bg-[#082344] border border-[#16395E] rounded-xl px-3.5 py-2.5 text-xs text-[#F4F7FB] font-semibold pe-8 focus:outline-none focus:border-[#00AEB8] cursor-pointer appearance-none min-w-[120px] sm:min-w-[140px] text-center"
                    >
                      <option value="high">{localize(profile.language, 'High Quality', 'جودة عالية')}</option>
                      <option value="saver">{localize(profile.language, 'Data Saver', 'وضع توفير البيانات')}</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#A9C4DD] absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Action Button: Voice Preview */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleVoicePreview}
                    disabled={isPlayingPreview}
                    className="w-full py-3 px-4 rounded-2xl border border-[#00AEB8]/60 bg-[#082344] hover:bg-[#00AEB8]/15 text-[#00AEB8] hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    {isPlayingPreview ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#00AEB8]" />
                        <span>{localize(profile.language, 'Speaking preview...', 'جاري الاستماع للمعاينة...')}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current text-[#00AEB8]" />
                        <span>{localize(profile.language, 'Listen to Voice Preview', 'استمع إلى معاينة الصوت')}</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              CARD D: ACCOUNT AND PREFERENCES (الحساب والتفضيلات)
             ═════════════════════════════════════════════════════════════════ */}
          <div className="bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="border-b border-[#16395E] pb-4 mb-6">
                <div className="flex items-center gap-2.5 text-[#00AEB8]">
                  <ShieldCheck className="w-5 h-5 text-[#00AEB8]" />
                  <h2 className="text-lg font-bold text-[#F4F7FB]">
                    {localize(profile.language, 'Account & Preferences', 'الحساب والتفضيلات')}
                  </h2>
                </div>
                <p className="text-xs text-[#A9C4DD] mt-1 font-medium">
                  {localize(
                    profile.language,
                    'Manage your account settings and general preferences.',
                    'إدارة إعدادات حسابك وتفضيلاتك العامة.'
                  )}
                </p>
              </div>

              {/* Rows */}
              <div className="space-y-6">

                {/* Row 1: Auto-Save Preferences */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#A9C4DD] shrink-0">
                      <Save className="w-5 h-5 text-[#A9C4DD]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Auto-Save Preferences', 'حفظ التفضيلات تلقائياً')}
                      </span>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Your settings will be saved automatically', 'سيتم حفظ إعداداتك تلقائياً')}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-[#F4F7FB]">
                      {autoSave ? localize(profile.language, 'Enabled', 'مفعل') : localize(profile.language, 'Disabled', 'معطل')}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoSave}
                      onClick={() => {
                        const next = !autoSave;
                        setAutoSave(next);
                        try {
                          localStorage.setItem('cognify_auto_save_settings', String(next));
                        } catch {}
                        if (next) {
                          executeSave(fontSizeScale, contrastMode, screenReader, reduceMotion, interfaceLanguage, explanationLanguage, explanationDetail, experienceLevel, audioSpeed, voiceSelection, audioQuality, true);
                        }
                      }}
                      className={`w-12 h-6.5 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                        autoSave ? 'bg-[#00AEB8]' : 'bg-[#082344] border border-[#16395E]'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform shadow-xs ${
                        autoSave 
                          ? (isAr ? '-translate-x-5' : 'translate-x-5')
                          : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Row 2: Restore Defaults */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082344] border border-[#16395E] flex items-center justify-center text-[#A9C4DD] shrink-0">
                      <RotateCcw className="w-5 h-5 text-[#A9C4DD]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Restore Default Settings', 'استعادة الإعدادات الافتراضية')}
                      </span>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {localize(profile.language, 'Reset all preferences to default values.', 'إعادة تعيين جميع الإعدادات إلى قيمها الافتراضية.')}
                      </p>
                    </div>
                  </div>

                  {/* Reset Button */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="px-5 py-2 rounded-xl bg-[#082344] border border-[#16395E] hover:border-[#00AEB8]/60 text-xs font-bold text-[#F4F7FB] hover:text-[#00AEB8] transition-all cursor-pointer active:scale-95"
                    >
                      {localize(profile.language, 'Restore', 'استعادة')}
                    </button>
                  </div>
                </div>

                {/* Row 3: Account Sign Out / Log Out */}
                <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#16395E]/60">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                      <LogOut className="w-5 h-5 text-rose-400 rtl:rotate-180" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-[#F4F7FB] block truncate">
                        {localize(profile.language, 'Sign Out / Log Out', 'تسجيل الخروج من الحساب')}
                      </span>
                      <p className="text-xs text-[#A9C4DD] mt-0.5 line-clamp-1">
                        {profile.email || localize(profile.language, 'Sign out safely from your active session', 'إنهاء الجلسة الحالية والرجوع لشاشة الدخول')}
                      </p>
                    </div>
                  </div>

                  {/* Sign Out Button */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        await logout();
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-bold text-rose-300 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5 rtl:rotate-180" />
                      <span>{localize(profile.language, 'Log Out', 'تسجيل الخروج')}</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom: Save Status Banner (Exact Reference Match) */}
            <div className="pt-4 border-t border-[#16395E]">
              {saveStatus === 'saving' && (
                <div className="p-4 rounded-2xl bg-[#082344]/80 border border-[#00AEB8]/30 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#00AEB8] shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-[#F4F7FB]">
                      {localize(profile.language, 'Saving changes...', 'جارٍ حفظ التغييرات...')}
                    </h4>
                    <p className="text-[11px] text-[#A9C4DD] mt-0.5">
                      {localize(profile.language, 'Synchronizing preferences with profile', 'مزامنة التفضيلات مع ملفك الشخصي')}
                    </p>
                  </div>
                </div>
              )}

              {saveStatus === 'saved' && (
                <div className="p-4 rounded-2xl bg-[#082344]/80 border border-[#00AEB8]/30 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#00AEB8] shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-[#F4F7FB]">
                      {localize(profile.language, 'Settings saved successfully', 'تم حفظ الإعدادات بنجاح')}
                    </h4>
                    <p className="text-[11px] text-[#A9C4DD] mt-0.5">
                      {localize(profile.language, `Last saved: ${lastSavedStr}`, `آخر حفظ: ${lastSavedStr}`)}
                    </p>
                  </div>
                </div>
              )}

              {saveStatus === 'error' && (
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-300">
                      {localize(profile.language, 'Could not save settings. Please try again.', 'تعذّر حفظ الإعدادات. حاول مرة أخرى.')}
                    </h4>
                    <p className="text-[11px] text-rose-400/80 mt-0.5">
                      {localize(profile.language, 'Check your connection or storage permissions.', 'تحقق من اتصال الشبكة وصلاحيات التخزين.')}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Confirmation Modal for Resetting Defaults */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 text-start shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-[#F4F7FB]">
                {localize(profile.language, 'Restore Default Settings?', 'استعادة الإعدادات الافتراضية؟')}
              </h3>
            </div>

            <p className="text-xs text-[#A9C4DD] leading-relaxed">
              {localize(
                profile.language,
                'Are you sure you want to reset all customized preferences to their standard defaults? This will recalibrate font size, contrast, voice, and learning modes.',
                'هل أنت متأكد من رغبتك في إعادة تعيين جميع التفضيلات المخصصة إلى الوضع الافتراضي؟ ستتم إعادة ضبط حجم الخط والتباين والصوت ونمط التعلم.'
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-[#082344] border border-[#16395E] text-xs font-semibold text-[#A9C4DD] hover:text-white transition-all cursor-pointer"
              >
                {localize(profile.language, 'Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-5 py-2.5 rounded-xl bg-[#00AEB8] hover:bg-[#10B8B0] text-xs font-bold text-[#061A33] transition-all cursor-pointer shadow-md"
              >
                {localize(profile.language, 'Yes, Restore Defaults', 'نعم، استعادة الافتراضي')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
