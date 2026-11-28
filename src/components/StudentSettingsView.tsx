import { localize, isArabicLocale, L } from '../lib/translations';
import HeaderMenu, { ToolSwitcherSlot } from './HeaderMenu';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, AccessibilityPassport, LanguagePreference, PedagogyStyle } from '../types';
import { 
  Settings, Key, ArrowLeft, UserCheck, BookOpen, Volume2, ShieldCheck, 
  Globe, MessageSquare, SlidersHorizontal, User, Play, 
  RotateCcw, LogOut, CheckCircle2, ChevronDown, Check,
  AlertCircle, Loader2, Gauge, Activity, Sun, Moon, Contrast, 
  EyeOff, Monitor, Save, Sparkles, VolumeX, Eye,
  Keyboard, History, Wifi, Layers, Lock, Trash2, Plus, Search,
  Pause, PlayCircle, Compass, FileText, Headphones, Book, RefreshCw, X
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, cleanDataForFirestore, logout } from '../lib/firebase';
import { toast } from './Toast';
import { speak, cancelSpeech } from '../lib/tts';
import { secureLoadKeySync, secureSaveKey } from '../lib/cryptoShield';
import {
  SupportedInterfaceLanguage,
  SpeechLanguage,
  ReadingVerbosity,
  NumeralPronunciation,
  ReadingModeDefault,
  PreferredCurrency,
  MeasurementSystem,
  VoicePreferences,
  DescriptionPreferences,
  PersonalShortcutItem,
  ReadingHistoryItem,
  AssistantMemoryEntry,
  OfflineCapabilityItem,
  DEFAULT_SHORTCUTS,
  DEFAULT_PERSONALIZE_PREFERENCES,
  PERSONALIZE_STORAGE_KEYS,
  getLayoutDirection,
  preserveUserContentOnLanguageSwitch,
  detectBrowserVoiceSupport,
  explainUnsupportedVoiceSetting,
  formatNumeralSpoken,
  formatCurrencySpoken,
  formatMeasurementSpoken,
  validateShortcutConflict,
  announceShortcutAction,
  getReadingHistoryStorageExplanation,
  parseReadingHistory,
  addReadingHistoryItem,
  removeReadingHistoryItem,
  clearAllReadingHistory,
  getMemoryPrivacyNotice,
  getMemoryErasureDisclaimer,
  sanitizeMemoryContent,
  createAssistantMemoryEntry,
  OFFLINE_CAPABILITY_MATRIX,
  getOfflineCapabilities,
  isFeatureAvailableOffline,
} from '../lib/personalizeEngine';

export type SettingsTabId = 'general' | 'voice' | 'descriptions' | 'shortcuts' | 'history' | 'memory' | 'offline';

export interface StudentSettingsViewProps {
  profile: UserProfile;
  setProfile?: (profile: UserProfile) => void;
  onNavigateBack?: () => void;
  onNavigate?: (view: any) => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  initialTab?: SettingsTabId;
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
    return isAr ? 'تم الحفظ' : L('Saved');
  }
}

export default function StudentSettingsView({
  profile,
  setProfile,
  onNavigateBack,
  onNavigate,
  isDarkMode = true,
  toggleTheme,
  initialTab
}: StudentSettingsViewProps) {
  const isAr = isArabicLocale(profile.language);

  // ── Tab Management ──
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
    if (initialTab) return initialTab;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('voice')) return 'voice';
      if (hash.includes('desc') || hash.includes('read')) return 'descriptions';
      if (hash.includes('shortcut') || hash.includes('command')) return 'shortcuts';
      if (hash.includes('history')) return 'history';
      if (hash.includes('memory')) return 'memory';
      if (hash.includes('offline') || hash.includes('network')) return 'offline';
      if (hash.includes('general') || hash.includes('passport')) return 'general';
    }
    return 'general';
  });

  // ── Live Network Connectivity Status ──
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Browser Voice Support Detection ──
  const [voiceSupport, setVoiceSupport] = useState(() => detectBrowserVoiceSupport());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        setVoiceSupport(detectBrowserVoiceSupport());
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // ── CARD E: AI API Key (Bring Your Own Key) ──
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => {
    try {
      return secureLoadKeySync('gemini') || '';
    } catch {
      return '';
    }
  });
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [savedApiKey, setSavedApiKey] = useState<string>(() => {
    try {
      return secureLoadKeySync('gemini') || '';
    } catch {
      return '';
    }
  });
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);

  const handleSaveApiKey = async () => {
    setIsSavingKey(true);
    try {
      const trimmed = apiKeyInput.trim();
      await secureSaveKey('gemini', trimmed);
      setSavedApiKey(trimmed);
      if (trimmed) {
        toast.success(
          isAr ? 'تم تشفير وحفظ مفتاح Gemini بنجاح' : L('Gemini API Key encrypted and saved securely'),
          isAr ? 'حفظ المفتاح' : L('API Key Saved')
        );
      } else {
        toast.info(
          isAr ? 'تم مسح مفتاح Gemini' : L('Gemini API Key removed'),
          isAr ? 'إلغاء المفتاح' : L('API Key Removed')
        );
      }
    } catch (err) {
      console.error('Failed to save API key:', err);
      toast.error(
        isAr ? 'تعذر حفظ المفتاح، يرجى المحاولة ثانية' : L('Failed to save API key securely'),
        isAr ? 'خطأ في الحفظ' : L('Save Error')
      );
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleClearApiKey = async () => {
    setIsSavingKey(true);
    try {
      await secureSaveKey('gemini', '');
      setApiKeyInput('');
      setSavedApiKey('');
      toast.info(
        isAr ? 'تمت إزالة المفتاح الخاص' : L('Personal API key removed'),
        isAr ? 'إزالة المفتاح' : L('Key Removed')
      );
    } catch (err) {
      console.error('Failed to clear API key:', err);
    } finally {
      setIsSavingKey(false);
    }
  };

  // ── General Accessibility Settings ──
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

  // ── Interface & Explanation Language ──
  const [interfaceLanguage, setInterfaceLanguage] = useState<LanguagePreference>(
    () => (isArabicLocale(profile.language) ? 'Arabic' : profile.language === 'French' ? 'French' : 'English')
  );

  // Single source of truth: follow the global header language switcher.
  // Without this sync the page kept (and on save re-wrote) its own stale value,
  // which made the header toggle look broken on this page.
  useEffect(() => {
    const lang: LanguagePreference = isArabicLocale(profile.language) ? 'Arabic' : profile.language === 'French' ? 'French' : 'English';
    setInterfaceLanguage((prev) => (prev === lang ? prev : lang));
  }, [profile.language]);
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

  // ── Voice Preferences (Phase 12 Domain 2) ──
  const [speechLanguage, setSpeechLanguage] = useState<SpeechLanguage>('ar-SA');
  const [voiceSelection, setVoiceSelection] = useState<string>(() => {
    try {
      return localStorage.getItem('rafiqi_settings_voice') || 'default';
    } catch {
      return 'default';
    }
  });
  const [audioSpeed, setAudioSpeed] = useState<number>(
    () => profile.accessibilityPassport?.audioSpeed ?? 1.0
  );
  const [audioVolume, setAudioVolume] = useState<number>(1.0);
  const [audioPitch, setAudioPitch] = useState<number>(1.0);
  const [readingVerbosity, setReadingVerbosity] = useState<ReadingVerbosity>('normal');
  const [pronounceTashkeel, setPronounceTashkeel] = useState<boolean>(false);
  const [numeralPronunciation, setNumeralPronunciation] = useState<NumeralPronunciation>('arabic_words');
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  // ── Description Preferences (Phase 12 Domain 3) ──
  const [visualDetail, setVisualDetail] = useState<'concise' | 'detailed'>('concise');
  const [descLanguage, setDescLanguage] = useState<'Arabic' | 'Egyptian Ammiya' | 'English'>('Arabic');
  const [defaultReadingMode, setDefaultReadingMode] = useState<ReadingModeDefault>('plain_text');
  const [preferredCurrency, setPreferredCurrency] = useState<PreferredCurrency>('EGP');
  const [measurementUnits, setMeasurementUnits] = useState<MeasurementSystem>('metric');

  // ── Shortcuts & Personal Commands (Phase 12 Domain 4) ──
  const [personalVoiceCommandPhrase, setPersonalVoiceCommandPhrase] = useState<string>('رفيقي استمع');
  const [shortcutsList, setShortcutsList] = useState<PersonalShortcutItem[]>(() => {
    try {
      const saved = localStorage.getItem('rafiqi_personal_shortcuts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SHORTCUTS;
  });
  const [shortcutWarning, setShortcutWarning] = useState<string | null>(null);

  // ── Reading History Manager (Phase 12 Domain 6) ──
  const [readingHistoryEnabled, setReadingHistoryEnabled] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem(PERSONALIZE_STORAGE_KEYS.READING_HISTORY_ENABLED);
      return val !== 'false';
    } catch {
      return true;
    }
  });
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(PERSONALIZE_STORAGE_KEYS.READING_HISTORY);
      if (raw) return parseReadingHistory(raw);
    } catch {}
    return [
      {
        id: 'hist_lecture_1',
        title: 'محاضرة التشريح العصبي — مقدمة الجهاز الحركي',
        type: 'audio_lecture',
        lastPosition: 1420,
        totalLength: 3600,
        progressPercent: 39,
        timestamp: Date.now() - 1000 * 60 * 60 * 4,
        storageProvenance: 'local_browser_only',
      },
      {
        id: 'hist_book_1',
        title: 'كتاب تاريخ الحضارات القديمة — الفصل الثالث',
        type: 'epub_book',
        lastPosition: 45,
        totalLength: 120,
        progressPercent: 38,
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
        storageProvenance: 'local_browser_only',
      },
    ];
  });
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState<boolean>(false);

  // ── Assistant Memory & Privacy (Phase 12 Domain 7) ──
  const [memoryOptIn, setMemoryOptIn] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem(PERSONALIZE_STORAGE_KEYS.MEMORY_OPT_IN);
      return val === 'true';
    } catch {
      return false;
    }
  });
  const [isMemoryPaused, setIsMemoryPaused] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem(PERSONALIZE_STORAGE_KEYS.MEMORY_PAUSED);
      return val === 'true';
    } catch {
      return false;
    }
  });
  const [memoryEntries, setMemoryEntries] = useState<AssistantMemoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(PERSONALIZE_STORAGE_KEYS.ASSISTANT_MEMORY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'mem_1',
        category: 'topic_interest',
        content: 'يفضل المستخدم الاستماع لتسجيلات المحاضرات بسرعة 1.25x مع التركيز على المصطلحات الطبية',
        timestamp: Date.now() - 1000 * 60 * 60 * 72,
        source: 'explicit_setting',
        isUserVerified: true,
      },
      {
        id: 'mem_2',
        category: 'room_landmark',
        content: 'مكتب العمل يقع مباشرة على يمين باب الغرفة الرئيسي مع وجود إضاءة طبيعية',
        timestamp: Date.now() - 1000 * 60 * 60 * 48,
        source: 'user_provided',
        isUserVerified: true,
      },
    ];
  });
  const [newMemoryInput, setNewMemoryInput] = useState<string>('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<'topic_interest' | 'room_landmark' | 'voice_preference' | 'companion_contact' | 'custom'>('topic_interest');
  const [memoryValidationError, setMemoryValidationError] = useState<string | null>(null);
  const [showClearMemoryConfirm, setShowClearMemoryConfirm] = useState<boolean>(false);

  // ── General Preferences & Persistence ──
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('rafiqi_auto_save_settings');
      return val !== 'false';
    } catch {
      return true;
    }
  });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedStr, setLastSavedStr] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('rafiqi_settings_last_saved');
      if (saved) return saved;
    } catch {}
    return formatSavedTime(new Date(), isAr);
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Sync contrast mode when isDarkMode prop changes
  useEffect(() => {
    if (contrastMode !== 'contrast') {
      setContrastMode(isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode]);

  // Synchronize CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    const fontScaleMap = {
      normal: '100%',
      medium: '115%',
      large: '130%',
      'extra-large': '145%'
    };
    root.style.fontSize = fontScaleMap[fontSizeScale] || '115%';

    if (reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [fontSizeScale, reduceMotion]);

  // Debounced auto-save handler
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const executeSave = useCallback(() => {
    if (!autoSave) return;
    setSaveStatus('saving');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const currentProfile = profileRef.current;
        const pedStyle: PedagogyStyle = explanationDetail === 'concise' ? 'simplified' : explanationDetail === 'detailed' ? 'socratic' : 'scaffolded';
        
        const existingPassport = currentProfile.accessibilityPassport || {
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
          fontSizeScale,
          highContrast: contrastMode === 'contrast',
          autoSpeak: screenReader,
          reduceMotion,
          audioSpeed,
        };

        const updatedProfile: UserProfile = {
          ...currentProfile,
          language: interfaceLanguage,
          level: experienceLevel,
          preferredPedagogyStyle: pedStyle,
          accessibilityPassport: updatedPassport,
          ...(explanationLanguage ? { explanationLanguage } : {}),
        };

        if (setProfile) setProfile(updatedProfile);

        if (currentProfile.uid) {
          await setDoc(doc(db, `users/${currentProfile.uid}`), cleanDataForFirestore(updatedProfile), { merge: true });
        }

        const now = new Date();
        const formatted = formatSavedTime(now, isAr);
        setLastSavedStr(formatted);
        try {
          localStorage.setItem('rafiqi_settings_last_saved', formatted);
          localStorage.setItem('rafiqi_settings_voice', voiceSelection);
          localStorage.setItem('rafiqi_font_scale', fontSizeScale);
          localStorage.setItem('rafiqi_high_contrast', String(contrastMode === 'contrast'));
          localStorage.setItem('rafiqi_reduce_motion', String(reduceMotion));
          localStorage.setItem('rafiqi_auto_save_settings', String(autoSave));
          localStorage.setItem('rafiqi_personal_shortcuts', JSON.stringify(shortcutsList));
          localStorage.setItem(PERSONALIZE_STORAGE_KEYS.READING_HISTORY, JSON.stringify(readingHistory));
          localStorage.setItem(PERSONALIZE_STORAGE_KEYS.ASSISTANT_MEMORY, JSON.stringify(memoryEntries));
          localStorage.setItem(PERSONALIZE_STORAGE_KEYS.MEMORY_OPT_IN, String(memoryOptIn));
          localStorage.setItem(PERSONALIZE_STORAGE_KEYS.MEMORY_PAUSED, String(isMemoryPaused));
          localStorage.setItem(PERSONALIZE_STORAGE_KEYS.READING_HISTORY_ENABLED, String(readingHistoryEnabled));
        } catch {}

        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save settings:', err);
        setSaveStatus('error');
      }
    }, 500);
  }, [
    autoSave, explanationDetail, fontSizeScale, contrastMode, screenReader, reduceMotion,
    audioSpeed, interfaceLanguage, experienceLevel, explanationLanguage, isAr, setProfile,
    voiceSelection, shortcutsList, readingHistory, memoryEntries, memoryOptIn, isMemoryPaused,
    readingHistoryEnabled
  ]);

  // Trigger executeSave when core parameters change
  useEffect(() => {
    executeSave();
  }, [
    fontSizeScale, contrastMode, screenReader, reduceMotion, interfaceLanguage,
    explanationLanguage, explanationDetail, experienceLevel, audioSpeed, voiceSelection,
    speechLanguage, audioVolume, audioPitch, readingVerbosity, pronounceTashkeel,
    numeralPronunciation, visualDetail, descLanguage, defaultReadingMode, preferredCurrency,
    measurementUnits, personalVoiceCommandPhrase, memoryOptIn, isMemoryPaused,
    readingHistoryEnabled, executeSave
  ]);

  // ── Voice Preview Function ──
  const handleVoicePreview = () => {
    if (isPlayingPreview) {
      cancelSpeech();
      setIsPlayingPreview(false);
      return;
    }
    setIsPlayingPreview(true);
    const phrase = isAr
      ? 'مرحباً بك في رفيقي. إعدادات الصوت والقراءة الشخصية تعمل بنجاح وبوضوح.'
      : L('Welcome to Rafiqi. Your personal voice and reading settings are active and calibrated.');

    speak(phrase, interfaceLanguage === 'English' ? 'English' : interfaceLanguage === 'French' ? 'French' : 'Arabic', {
      rate: audioSpeed,
      onEnd: () => setIsPlayingPreview(false),
      onError: () => setIsPlayingPreview(false)
    });
  };

  // ── Memory Entry Handlers ──
  const handleAddMemoryEntry = () => {
    if (!newMemoryInput.trim()) return;
    const sanitized = sanitizeMemoryContent(newMemoryInput);
    if (!sanitized.isValid) {
      setMemoryValidationError(
        isAr 
          ? `حماية الخصوصية: ${sanitized.blockedReasonAr}` 
          : `Privacy Guard: ${sanitized.blockedReasonEn}`
      );
      toast.error(
        isAr ? 'تم منع حفظ بيانات حساسة لحمايتك' : L('Sensitive data blocked for your security')
      );
      return;
    }
    setMemoryValidationError(null);

    const newEntry = createAssistantMemoryEntry(
      newMemoryCategory,
      sanitized.sanitizedText,
      'user_added'
    );
    const updated = [newEntry, ...memoryEntries];
    setMemoryEntries(updated);
    setNewMemoryInput('');
    try {
      localStorage.setItem(PERSONALIZE_STORAGE_KEYS.ASSISTANT_MEMORY, JSON.stringify(updated));
    } catch {}
    toast.success(
      isAr ? 'تمت إضافة الذاكرة بأمان' : L('Memory entry saved safely')
    );
  };

  const handleDeleteMemoryEntry = (id: string) => {
    const updated = memoryEntries.filter(m => m.id !== id);
    setMemoryEntries(updated);
    try {
      localStorage.setItem(PERSONALIZE_STORAGE_KEYS.ASSISTANT_MEMORY, JSON.stringify(updated));
    } catch {}
    toast.info(isAr ? 'تم حذف الإدخال' : L('Memory entry deleted'));
  };

  const handleClearAllMemory = () => {
    setMemoryEntries([]);
    try {
      localStorage.removeItem(PERSONALIZE_STORAGE_KEYS.ASSISTANT_MEMORY);
    } catch {}
    setShowClearMemoryConfirm(false);
    toast.info(isAr ? 'تم مسح كامل الذاكرة بنجاح' : L('All assistant memory erased'));
  };

  // ── Reading History Handlers ──
  const handleDeleteHistoryItem = (id: string) => {
    const updated = removeReadingHistoryItem(readingHistory, id);
    setReadingHistory(updated);
    try {
      localStorage.setItem(PERSONALIZE_STORAGE_KEYS.READING_HISTORY, JSON.stringify(updated));
    } catch {}
    toast.info(isAr ? 'تم حذف السجل' : L('Reading item removed'));
  };

  const handleClearAllHistory = () => {
    clearAllReadingHistory();
    setReadingHistory([]);
    setShowClearHistoryConfirm(false);
    toast.info(isAr ? 'تم مسح سجل القراءة كاملاً' : L('Reading history cleared'));
  };

  // ── Shortcuts Handlers ──
  const handleRestoreDefaultShortcuts = () => {
    setShortcutsList(DEFAULT_SHORTCUTS);
    setPersonalVoiceCommandPhrase('رفيقي استمع');
    try {
      localStorage.setItem('rafiqi_personal_shortcuts', JSON.stringify(DEFAULT_SHORTCUTS));
    } catch {}
    toast.success(isAr ? 'تمت استعادة الاختصارات الافتراضية' : L('Default shortcuts restored'));
  };

  // ── Reset All Defaults Handler ──
  const handleResetDefaults = async () => {
    setShowResetConfirm(false);
    setSaveStatus('saving');

    const defaultScale = 'medium';
    const defaultContrast = 'dark';
    const defaultScreenReader = true;
    const defaultReduceMotion = true;
    const defaultLang: LanguagePreference = 'Arabic';
    const defaultPedagogy: PedagogyStyle = 'scaffolded';
    const defaultSpeed = 1.0;
    const defaultVoice = 'default';

    setFontSizeScale(defaultScale);
    setContrastMode(defaultContrast);
    setScreenReader(defaultScreenReader);
    setReduceMotion(defaultReduceMotion);
    setInterfaceLanguage(defaultLang);
    setExplanationLanguage('Arabic');
    setExplanationDetail('balanced');
    setExperienceLevel('Basic');
    setAudioSpeed(defaultSpeed);
    setAudioVolume(1.0);
    setAudioPitch(1.0);
    setSpeechLanguage('ar-SA');
    setVoiceSelection(defaultVoice);
    setVisualDetail('concise');
    setDescLanguage('Arabic');
    setDefaultReadingMode('plain_text');
    setPreferredCurrency('EGP');
    setMeasurementUnits('metric');
    setShortcutsList(DEFAULT_SHORTCUTS);
    setPersonalVoiceCommandPhrase('رفيقي استمع');
    setMemoryOptIn(false);
    setIsMemoryPaused(false);
    setReadingHistoryEnabled(true);

    try {
      const resetPassport: AccessibilityPassport = {
        primaryMode: profile.accessibilityMode || 'None',
        primaryCategory: profile.accessibilityMode || 'Multiple',
        highContrast: false,
        dyslexiaFont: false,
        fontSizeScale: defaultScale,
        reduceMotion: false,
        hapticFeedback: true,
        autoSpeak: defaultScreenReader,
        audioSpeed: defaultSpeed,
        allowCameraTriggers: true,
      };

      const resetProfile: UserProfile = {
        ...profile,
        language: defaultLang,
        level: 'Basic',
        preferredPedagogyStyle: defaultPedagogy,
        accessibilityPassport: resetPassport,
      };

      if (setProfile) setProfile(resetProfile);

      const activeUid = profile.uid;
      if (activeUid) {
        await setDoc(doc(db, `users/${activeUid}`), cleanDataForFirestore(resetProfile), { merge: true });
      }

      const now = new Date();
      const formatted = formatSavedTime(now, isAr);
      setLastSavedStr(formatted);
      try {
        localStorage.setItem('rafiqi_settings_last_saved', formatted);
        localStorage.setItem('rafiqi_settings_voice', defaultVoice);
        localStorage.setItem('rafiqi_font_scale', defaultScale);
        localStorage.setItem('rafiqi_high_contrast', 'false');
        localStorage.setItem('rafiqi_reduce_motion', 'false');
        localStorage.setItem('rafiqi_auto_save_settings', 'true');
        localStorage.setItem('rafiqi_personal_shortcuts', JSON.stringify(DEFAULT_SHORTCUTS));
        localStorage.removeItem(PERSONALIZE_STORAGE_KEYS.ASSISTANT_MEMORY);
        localStorage.setItem(PERSONALIZE_STORAGE_KEYS.MEMORY_OPT_IN, 'false');
      } catch {}

      setSaveStatus('saved');
      toast.success(localize(profile.language, 'Preferences restored to defaults', 'تمت استعادة الإعدادات الافتراضية بنجاح'));
    } catch (err) {
      console.error('Failed to restore defaults:', err);
      setSaveStatus('error');
      toast.error(localize(profile.language, 'Failed to restore default settings', 'فشل استعادة الإعدادات الافتراضية'));
    }
  };

  const tabsConfig: { id: SettingsTabId; labelAr: string; labelEn: string; icon: any }[] = [
    { id: 'general', labelAr: 'العام والجواز', labelEn: 'General & Passport', icon: SlidersHorizontal },
    { id: 'voice', labelAr: 'الصوت والنطق', labelEn: 'Voice & Speech', icon: Volume2 },
    { id: 'descriptions', labelAr: 'الأوصاف والقراءة', labelEn: 'Descriptions & Reading', icon: BookOpen },
    { id: 'shortcuts', labelAr: 'الأوامر والاختصارات', labelEn: 'Shortcuts & Commands', icon: Keyboard },
    { id: 'history', labelAr: 'سجل القراءة', labelEn: 'Reading History', icon: History },
    { id: 'memory', labelAr: 'الذاكرة والخصوصية', labelEn: 'Memory & Privacy', icon: ShieldCheck },
    { id: 'offline', labelAr: 'العمل دون إنترنت', labelEn: 'Offline Capabilities', icon: Wifi },
  ];

  return (
    <div 
      dir={isAr ? 'rtl' : 'ltr'}
      className="flex-1 w-full min-h-full bg-[#F5F9FD] dark:bg-[#0A2342] text-slate-900 dark:text-[#F4F7FB] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-300 custom-scrollbar relative"
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-20">

        {/* ── PAGE HEADER (Exact Match with Reference & Canonical Requirements) ── */}
        <div className="space-y-3 text-start">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              {onNavigateBack && (
                <button
                  type="button"
                  onClick={onNavigateBack}
                  aria-label={localize(profile.language, 'Back to Dashboard Hub', 'الرجوع للوحة الميزات الرئيسية')}
                  title={localize(profile.language, 'Back to Dashboard Hub', 'الرجوع للوحة الميزات الرئيسية')}
                  className="shrink-0 whitespace-nowrap min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#082344] hover:bg-white hover:dark:bg-[#0D2542] border border-slate-200 dark:border-[#16395E] hover:border-[#1769AA]/50 text-slate-700 dark:text-[#C4D3E5] hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
                >
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180 text-[#1769AA] dark:text-[#4B9FE1]" />
                  <span className="text-xs font-bold">{localize(profile.language, 'Back', 'رجوع')}</span>
                </button>
              )}
              <div className="flex items-center gap-2.5 min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F4F7FB] tracking-tight truncate">
                  <span>{localize(profile.language, 'Personalize', 'التخصيص')}</span>
                  <span className="hidden">{localize(profile.language, 'Personalize & Accommodation Passport', 'التخصيص وجواز التيسير')}</span>
                </h1>
              </div>
            </div>

            {/* Switcher, online dot and "..." menu (Reset All Defaults) */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                role="status"
                title={isOnline ? (isAr ? 'متصل بالإنترنت' : L('Online')) : (isAr ? 'وضع عدم الاتصال' : L('Offline Mode'))}
                className={`inline-flex items-center gap-1.5 text-xs font-bold ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
                <span className="sr-only">{isOnline ? (isAr ? 'متصل بالإنترنت' : L('Online')) : (isAr ? 'وضع عدم الاتصال' : L('Offline Mode'))}</span>
              </span>
              <ToolSwitcherSlot />
              <HeaderMenu
                ariaLabel={localize(profile.language, 'More actions', 'المزيد')}
                isDarkMode={isDarkMode}
                items={[
                  {
                    key: 'reset',
                    label: localize(profile.language, 'Reset All Defaults', 'استعادة الافتراضي'),
                    icon: <RotateCcw className="w-4 h-4" />,
                    danger: true,
                    onSelect: () => setShowResetConfirm(true),
                  },
                ]}
              />
            </div>
          </div>

          <p className="hidden text-xs sm:text-sm text-slate-600 dark:text-[#A9C4DD] font-medium leading-relaxed">
            {localize(
              profile.language,
              'Personalize Rafiqi to match your vision, hearing, speech speed, language preferences, shortcuts, and privacy.',
              'خصص رفيقي بالكامل ليلائم بصرك، سمعك، سرعة النطق، تفضيلات اللغة، اختصارات لوحة المفاتيح والخصوصية.'
            )}
          </p>

          {/* ── 7-TAB NAVIGATION BAR ── */}
          <div 
            role="tablist"
            aria-label={localize(profile.language, 'Personalization Sections', 'أقسام التخصيص والإعدادات')}
            className="flex items-center gap-2 flex-nowrap overflow-x-auto custom-scrollbar pb-2 pt-2 border-b border-slate-200 dark:border-[#16395E]"
          >
            {tabsConfig.map((t) => {
              const TabIcon = t.icon;
              const isSelected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={isSelected}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  type="button"
                  onClick={() => {
                    setActiveTab(t.id);
                    if (typeof window !== 'undefined') {
                      window.location.hash = t.id === 'general' ? '#settings' : `#settings/${t.id}`;
                    }
                  }}
                  className={`shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] ${
                    isSelected 
                      ? 'bg-[#1769AA] text-white shadow-md' 
                      : 'bg-slate-100 dark:bg-[#082344] text-slate-600 dark:text-[#A9C4DD] hover:text-slate-900 hover:dark:text-[#F4F7FB] hover:bg-white hover:dark:bg-[#0D2542] border border-slate-200 dark:border-[#16395E]'
                  }`}
                >
                  <TabIcon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#1769AA] dark:text-[#4B9FE1]'}`} />
                  <span>{isAr ? t.labelAr : L(t.labelEn)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════
            TAB 1: GENERAL & ACCOMMODATION PASSPORT (العام وجواز التيسير)
           ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'general' && (
          <div 
            id="panel-general" 
            role="tabpanel" 
            aria-labelledby="tab-general"
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* CARD A: ACCESSIBILITY SETTINGS (إعدادات الوصول) */}
              <div className="bg-white dark:bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start flex flex-col justify-between">
                <div>
                  <div className="border-b border-slate-200 dark:border-[#16395E] pb-4 mb-6">
                    <div className="flex items-center gap-2.5 text-[#1769AA] dark:text-[#4B9FE1]">
                      <UserCheck className="w-5 h-5 text-[#1769AA] dark:text-[#4B9FE1]" />
                      <h2 className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
                        {localize(profile.language, 'Accessibility Settings', 'إعدادات الوصول')}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#A9C4DD] mt-1 font-medium">
                      {localize(
                        profile.language,
                        'Improve usability and simplify access to content.',
                        'لتحسين تجربة الاستخدام وتسهيل الوصول للمحتوى.'
                      )}
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Font Scaling */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                        {localize(profile.language, 'Font Size Scale', 'حجم الخط في الواجهة')}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['normal', 'medium', 'large', 'extra-large'] as const).map((scale) => (
                          <button
                            key={scale}
                            type="button"
                            onClick={() => setFontSizeScale(scale)}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                              fontSizeScale === scale
                                ? 'bg-[#1769AA] border-[#4B9FE1] text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-[#082344] border-slate-200 dark:border-[#16395E] text-slate-600 dark:text-[#A9C4DD] hover:border-[#1769AA]/40'
                            }`}
                          >
                            {scale === 'normal' && (isAr ? 'عادي (100%)' : L('Normal'))}
                            {scale === 'medium' && (isAr ? 'متوسط (115%)' : L('Medium'))}
                            {scale === 'large' && (isAr ? 'كبير (130%)' : L('Large'))}
                            {scale === 'extra-large' && (isAr ? 'أكبر (145%)' : L('Extra Large'))}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* High Contrast Mode */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                        {localize(profile.language, 'Display Theme & Contrast', 'السمة وتباين الألوان')}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['dark', 'light', 'contrast'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              setContrastMode(mode);
                              if (toggleTheme && ((mode === 'dark' && !isDarkMode) || (mode === 'light' && isDarkMode))) {
                                toggleTheme();
                              }
                            }}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                              contrastMode === mode
                                ? 'bg-[#1769AA] border-[#4B9FE1] text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-[#082344] border-slate-200 dark:border-[#16395E] text-slate-600 dark:text-[#A9C4DD] hover:border-[#1769AA]/40'
                            }`}
                          >
                            {mode === 'dark' && (isAr ? 'داكن أزرق' : L('Dark Blue'))}
                            {mode === 'light' && (isAr ? 'فاتح' : L('Light'))}
                            {mode === 'contrast' && (isAr ? 'عالي التباين' : L('High Contrast'))}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reduce Motion & Screen Reader Auto-Speak */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reduceMotion}
                          aria-label={localize(profile.language, 'Reduce Motion', 'تقليل الحركة والوميض')}
                          onChange={(e) => setReduceMotion(e.target.checked)}
                          className="w-4 h-4 rounded text-[#1769AA] focus:ring-[#1769AA]"
                        />
                        <span className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB]">
                          {localize(profile.language, 'Reduce Motion', 'تقليل الحركة والوميض')}
                        </span>
                      </label>

                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={screenReader}
                          aria-label={localize(profile.language, 'Auto Screen Reader', 'قراءة الشاشة التلقائية')}
                          onChange={(e) => setScreenReader(e.target.checked)}
                          className="w-4 h-4 rounded text-[#1769AA] focus:ring-[#1769AA]"
                        />
                        <span className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB]">
                          {localize(profile.language, 'Auto Screen Reader', 'قراءة الشاشة التلقائية')}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD B: INTERFACE & LANGUAGE PREFERENCES */}
              <div className="bg-white dark:bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start flex flex-col justify-between">
                <div>
                  <div className="border-b border-slate-200 dark:border-[#16395E] pb-4 mb-6">
                    <div className="flex items-center gap-2.5 text-[#1769AA] dark:text-[#4B9FE1]">
                      <Globe className="w-5 h-5 text-[#1769AA] dark:text-[#4B9FE1]" />
                      <h2 className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
                        {localize(profile.language, 'Language & Learning Defaults', 'اللغة ونمط التعلم')}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#A9C4DD] mt-1 font-medium">
                      {localize(
                        profile.language,
                        'Configure primary interface language and explanation style.',
                        'ضبط لغة الواجهة الأساسية وأسلوب الشرح والتفصيل.'
                      )}
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Interface Language */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                        {localize(profile.language, 'Interface Language', 'لغة واجهة الاستخدام')}
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setInterfaceLanguage('Arabic')}
                          className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            interfaceLanguage === 'Arabic'
                              ? 'bg-[#1769AA] border-[#4B9FE1] text-white shadow-md'
                              : 'bg-slate-100 dark:bg-[#082344] border-slate-200 dark:border-[#16395E] text-slate-600 dark:text-[#A9C4DD] hover:border-[#1769AA]/40'
                          }`}
                        >
                          <span>العربية (RTL)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInterfaceLanguage('English')}
                          className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            interfaceLanguage === 'English'
                              ? 'bg-[#1769AA] border-[#4B9FE1] text-white shadow-md'
                              : 'bg-slate-100 dark:bg-[#082344] border-slate-200 dark:border-[#16395E] text-slate-600 dark:text-[#A9C4DD] hover:border-[#1769AA]/40'
                          }`}
                        >
                          <span>English (LTR)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInterfaceLanguage('French')}
                          className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            interfaceLanguage === 'French'
                              ? 'bg-[#1769AA] border-[#4B9FE1] text-white shadow-md'
                              : 'bg-slate-100 dark:bg-[#082344] border-slate-200 dark:border-[#16395E] text-slate-600 dark:text-[#A9C4DD] hover:border-[#1769AA]/40'
                          }`}
                        >
                          <span>Français (LTR)</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#A9C4DD]/80">
                        {localize(
                          profile.language,
                          'Drafts and transcribed lectures are preserved when changing interface language.',
                          'يتم الحفاظ على مسوداتك ومحاضراتك المفرغة دون أي فقد عند تبديل لغة الواجهة.'
                        )}
                      </p>
                    </div>

                    {/* Explanation Detail */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                        {localize(profile.language, 'Explanation Verbosity', 'مستوى تفصيل الشرح')}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['concise', 'balanced', 'detailed'] as const).map((det) => (
                          <button
                            key={det}
                            type="button"
                            onClick={() => setExplanationDetail(det)}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                              explanationDetail === det
                                ? 'bg-[#1769AA] border-[#4B9FE1] text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-[#082344] border-slate-200 dark:border-[#16395E] text-slate-600 dark:text-[#A9C4DD] hover:border-[#1769AA]/40'
                            }`}
                          >
                            {det === 'concise' && (isAr ? 'موجز وسريع' : L('Concise'))}
                            {det === 'balanced' && (isAr ? 'متوازن' : L('Balanced'))}
                            {det === 'detailed' && (isAr ? 'مفصل ودقيق' : L('Detailed'))}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sign Out Button (Canonical Retention) */}
                <div className="pt-4 border-t border-slate-200 dark:border-[#16395E] flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-[#A9C4DD]">
                    {localize(profile.language, 'Signed in as student profile', 'مسجل الدخول كملف طالب')}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await logout();
                      } catch (err) {
                        console.error('Logout error:', err);
                        toast.error(localize(profile.language, 'Failed to log out safely', 'فشل تسجيل الخروج، يرجى المحاولة مرة أخرى'));
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-bold text-rose-300 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5 rtl:rotate-180" />
                    <span>{localize(profile.language, 'Log Out', 'تسجيل الخروج')}</span>
                  </button>
                </div>
              </div>

              {/* ═════════════════════════════════════════════════════════════════
                  CARD E: AI SERVICE & API KEY (BYOK - مفتاح الذكاء الاصطناعي)
                 ═════════════════════════════════════════════════════════════════ */}
              <div className="col-span-1 lg:col-span-2 bg-white dark:bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start flex flex-col justify-between">
                <div>
                  <div className="border-b border-slate-200 dark:border-[#16395E] pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5 text-[#1769AA] dark:text-[#4B9FE1]">
                        <Key className="w-5 h-5 text-[#1769AA] dark:text-[#4B9FE1]" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
                          {localize(profile.language, 'AI Service & API Key (BYOK)', 'خدمة الذكاء الاصطناعي ومفتاحك الخاص')}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-[#A9C4DD] mt-1 font-medium">
                        {localize(
                          profile.language,
                          'Configure your personal Google Gemini API key for guaranteed uptime and direct AI processing.',
                          'أدخل مفتاح Google Gemini الخاص بك لتفعيل المعالجة الفورية المباشرة وتجنب أي ضغط على السيرفر.'
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {savedApiKey ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          <span>{localize(profile.language, 'Personal Key Configured', 'مفتاح خاص مفعّل')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] text-slate-600 dark:text-[#A9C4DD]">
                          <span>{localize(profile.language, 'Using Server Key', 'استخدام مفتاح السيرفر')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="setting-gemini-key" className="text-sm font-bold text-slate-900 dark:text-[#F4F7FB] block">
                        {localize(profile.language, 'Google Gemini API Key', 'مفتاح Google Gemini API')}
                      </label>
                      <div className="relative">
                        <input
                          id="setting-gemini-key"
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder="AIzaSy..."
                          autoComplete="off"
                          spellCheck="false"
                          className="w-full bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-[#F4F7FB] font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#1769AA] placeholder:text-slate-400 dark:placeholder:text-[#A9C4DD]/40 pe-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          aria-label={showApiKey ? localize(profile.language, 'Hide API key', 'إخفاء المفتاح') : localize(profile.language, 'Show API key', 'إظهار المفتاح')}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-[#A9C4DD] hover:text-[#1769AA] hover:dark:text-[#4B9FE1] transition-colors p-1"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-[#A9C4DD] leading-relaxed">
                        {localize(
                          profile.language,
                          'Your key is encrypted and kept only in this browser tab session. It is deleted when you close the tab, and it is sent only to the AI provider you chose, never to any other server.',
                          'مفتاحك مشفر ومحفوظ في جلسة هذا التبويب فقط. بيتمسح لما تقفل التبويب، ولا يُرسل إلا لمزوّد الذكاء الاصطناعي اللي اخترته، ولا لأي خادم آخر.'
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleSaveApiKey}
                        disabled={isSavingKey}
                        className="px-6 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0878BD] text-slate-900 dark:text-[#F4F7FB] hover:text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                      >
                        {isSavingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{localize(profile.language, 'Save Key', 'حفظ المفتاح')}</span>
                      </button>

                      {savedApiKey && (
                        <button
                          type="button"
                          onClick={handleClearApiKey}
                          disabled={isSavingKey}
                          className="px-5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {localize(profile.language, 'Remove Key', 'إزالة المفتاح')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            TAB 2: VOICE & SPEECH PREFERENCES (الصوت والنطق)
           ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'voice' && (
          <div 
            id="panel-voice" 
            role="tabpanel" 
            aria-labelledby="tab-voice"
            className="space-y-6"
          >
            <div className="bg-white dark:bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start">
              <div className="border-b border-slate-200 dark:border-[#16395E] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 text-[#1769AA] dark:text-[#4B9FE1]">
                    <Volume2 className="w-5 h-5 text-[#1769AA] dark:text-[#4B9FE1]" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
                      {localize(profile.language, 'Voice & Speech Preferences', 'تفضيلات الصوت والنطق')}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-[#A9C4DD] mt-1 font-medium">
                    {localize(
                      profile.language,
                      'Control speech rate, pitch, Arabic tashkeel pronunciation, and system voices.',
                      'التحكم في سرعة الإلقاء، طبقة الصوت، نطق التشكيل العربي، واختيار الأصوات المحلية.'
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleVoicePreview}
                  className="px-5 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md self-start sm:self-auto"
                >
                  {isPlayingPreview ? <VolumeX className="w-4 h-4 text-amber-300 animate-pulse" /> : <Play className="w-4 h-4" />}
                  <span>{isPlayingPreview ? (isAr ? 'إيقاف الاختبار' : L('Stop Preview')) : (isAr ? 'تجربة الصوت' : L('Preview Voice'))}</span>
                </button>
              </div>

              {/* Browser Pitch Limitation Notice */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] text-xs text-slate-600 dark:text-[#A9C4DD] space-y-1">
                <div className="flex items-center gap-2 text-[#1769AA] dark:text-[#4B9FE1] font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{isAr ? 'ملاحظة توافقية المتصفح ونظام التشغيل' : L('Browser & OS Compatibility Notice')}</span>
                </div>
                <p className="leading-relaxed">
                  {isAr ? voiceSupport.explanationAr : L(voiceSupport.explanationEn)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Speech Language */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                    {localize(profile.language, 'Speech Language', 'لغة النطق الصوتي')}
                  </label>
                  <select
                    value={speechLanguage}
                    onChange={(e) => setSpeechLanguage(e.target.value as SpeechLanguage)}
                    className="w-full bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-[#F4F7FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#1769AA]"
                  >
                    <option value="ar-SA">العربية الفصحى (ar-SA)</option>
                    <option value="ar-EG">اللهجة المصرية (ar-EG)</option>
                    <option value="en-US">English (United States - en-US)</option>
                    <option value="fr-FR">Français (France - fr-FR)</option>
                  </select>
                </div>

                {/* Available System Voices */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                    {localize(profile.language, 'System Voice Selection', 'اختيار الصوت المثبت على جهازك')}
                  </label>
                  <select
                    value={voiceSelection}
                    onChange={(e) => setVoiceSelection(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-[#F4F7FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#1769AA]"
                  >
                    <option value="default">{isAr ? 'الصوت الافتراضي للمنظومة' : L('System Default Voice')}</option>
                    {availableVoices.map((v, i) => (
                      <option key={`${v.name}-${i}`} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speech Speed Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-900 dark:text-[#F4F7FB]">
                    <span>{localize(profile.language, 'Speech Speed (Rate)', 'سرعة النطق والقراءة')}</span>
                    <span className="text-[#1769AA] dark:text-[#4B9FE1] font-mono">{audioSpeed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={audioSpeed}
                    aria-label={localize(profile.language, 'Speech Speed (Rate)', 'سرعة النطق والقراءة')}
                    onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                    className="w-full accent-[#1769AA] cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-600 dark:text-[#A9C4DD]">
                    <span>0.5x ({isAr ? 'بطيء' : L('Slow')})</span>
                    <span>1.0x ({isAr ? 'طبيعي' : L('Normal')})</span>
                    <span>2.0x ({isAr ? 'سريع' : L('Fast')})</span>
                  </div>
                </div>

                {/* Speech Pitch Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-900 dark:text-[#F4F7FB]">
                    <span>{localize(profile.language, 'Speech Pitch (Where Supported)', 'طبقة الصوت (حيثما يدعم المتصفح)')}</span>
                    <span className="text-[#1769AA] dark:text-[#4B9FE1] font-mono">{audioPitch.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={audioPitch}
                    aria-label={localize(profile.language, 'Speech Pitch', 'طبقة الصوت')}
                    onChange={(e) => setAudioPitch(parseFloat(e.target.value))}
                    className="w-full accent-[#1769AA] cursor-pointer"
                  />
                  <p className="text-xs text-slate-500 dark:text-[#A9C4DD]/80">
                    {explainUnsupportedVoiceSetting('pitch', isAr ? 'Arabic' : 'English')}
                  </p>
                </div>

                {/* Pronunciation & Tashkeel Toggles */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                    {localize(profile.language, 'Arabic Tashkeel & Phonetics', 'التشكيل والنطق الصوتي')}
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pronounceTashkeel}
                      aria-label={localize(profile.language, 'Pronounce Arabic Tashkeel Marks', 'نطق علامات التشكيل وحركات الإعراب')}
                      onChange={(e) => setPronounceTashkeel(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1769AA] focus:ring-[#1769AA]"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                        {localize(profile.language, 'Pronounce Arabic Tashkeel Marks', 'نطق علامات التشكيل وحركات الإعراب')}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-[#A9C4DD]">
                        {localize(profile.language, 'Helpful for academic textbooks and classical Arabic recitation', 'مفيد للكتب التعليمية ودقة التلاوة')}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Numeral Pronunciation */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                    {localize(profile.language, 'Numeral Pronunciation Mode', 'طريقة نطق الأرقام والأعداد')}
                  </label>
                  <select
                    value={numeralPronunciation}
                    onChange={(e) => setNumeralPronunciation(e.target.value as NumeralPronunciation)}
                    className="w-full bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-[#F4F7FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#1769AA]"
                  >
                    <option value="arabic_words">{isAr ? 'ألفاظ عربية كاملة (مثال: خمسة وعشرون)' : L('Full Number in Words (e.g. Twenty Five)')}</option>
                    <option value="individual_digits">{isAr ? 'أرقام منفصلة خانة بخانة (مثال: اثنان خمسة)' : L('Individual Digits (e.g. Two Five)')}</option>
                    <option value="full_number">{isAr ? 'عدد مركب قياسي' : L('Standard Compound')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            TAB 3: DESCRIPTIONS & READING PREFERENCES (الأوصاف والقراءة)
           ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'descriptions' && (
          <div 
            id="panel-descriptions" 
            role="tabpanel" 
            aria-labelledby="tab-descriptions"
            className="space-y-6"
          >
            <div className="bg-white dark:bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start">
              <div className="border-b border-slate-200 dark:border-[#16395E] pb-4">
                <div className="flex items-center gap-2.5 text-[#1769AA] dark:text-[#4B9FE1]">
                  <BookOpen className="w-5 h-5 text-[#1769AA] dark:text-[#4B9FE1]" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
                    {localize(profile.language, 'Visual Descriptions & Reading Defaults', 'أوصاف المشاهد وقارئ الكتب')}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#A9C4DD] mt-1 font-medium">
                  {localize(
                    profile.language,
                    'Tune how visual scenes, products, signs, and textbooks are described and formatted.',
                    'تخصيص أسلوب وصف المشاهد، التعرف على المنتجات، اللافتات، وتنسيقات قراءة الكتب.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Visual Detail Level */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                    {localize(profile.language, 'Visual Scene Detail Level', 'مستوى تفصيل وصف المشهد بالكاميرا')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVisualDetail('concise')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-start ${
                        visualDetail === 'concise'
                          ? 'bg-[#1769AA] border-[#4B9FE1] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-[#082344] border-slate-200 dark:border-[#16395E] text-slate-600 dark:text-[#A9C4DD]'
                      }`}
                    >
                      <span className="block font-black">{isAr ? 'موجز وسريع' : L('Concise')}</span>
                      <span className="text-xs opacity-80 mt-1 block">
                        {isAr ? 'يركز على العناصر الأساسية والعوائق فوراً' : L('Focuses on critical items and obstacles fast')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisualDetail('detailed')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-start ${
                        visualDetail === 'detailed'
                          ? 'bg-[#1769AA] border-[#4B9FE1] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-[#082344] border-slate-200 dark:border-[#16395E] text-slate-600 dark:text-[#A9C4DD]'
                      }`}
                    >
                      <span className="block font-black">{isAr ? 'مفصل شامل' : L('Detailed')}</span>
                      <span className="text-xs opacity-80 mt-1 block">
                        {isAr ? 'يصف الألوان، الإضاءة، العلاقات المكانية والأبعاد' : L('Includes colors, lighting, spatial relations, bounds')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Description Dialect */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                    {localize(profile.language, 'Description Dialect & Tone', 'لهجة الوصف الصوتي')}
                  </label>
                  <select
                    value={descLanguage}
                    onChange={(e) => setDescLanguage(e.target.value as any)}
                    className="w-full bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-[#F4F7FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#1769AA]"
                  >
                    <option value="Arabic">{isAr ? 'العربية الفصحى المبسطة' : L('Simplified Modern Standard Arabic')}</option>
                    <option value="Egyptian Ammiya">{isAr ? 'العامية المصرية الودودة' : L('Friendly Egyptian Arabic (Ammiya)')}</option>
                    <option value="English">{isAr ? 'الإنجليزية' : L('English')}</option>
                  </select>
                </div>

                {/* Preferred Currency */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                    {localize(profile.language, 'Preferred Currency for Banknote & Price Detection', 'العملة المفضلة لكشف الفئات والأسعار')}
                  </label>
                  <select
                    value={preferredCurrency}
                    onChange={(e) => setPreferredCurrency(e.target.value as PreferredCurrency)}
                    className="w-full bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-[#F4F7FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#1769AA]"
                  >
                    <option value="EGP">{isAr ? 'الجنيه المصري (EGP)' : L('Egyptian Pound (EGP)')}</option>
                    <option value="SAR">{isAr ? 'الريال السعودي (SAR)' : L('Saudi Riyal (SAR)')}</option>
                    <option value="AED">{isAr ? 'الدرهم الإماراتي (AED)' : L('UAE Dirham (AED)')}</option>
                    <option value="USD">{isAr ? 'الدولار الأمريكي (USD)' : L('US Dollar (USD)')}</option>
                    <option value="EUR">{isAr ? 'اليورو (EUR)' : L('Euro (EUR)')}</option>
                  </select>
                  <p className="text-xs text-slate-500 dark:text-[#A9C4DD]/80">
                    {isAr 
                      ? `مثال النطق الصوتي: ${formatCurrencySpoken(100, preferredCurrency, 'Arabic')}` 
                      : `Spoken sample: ${formatCurrencySpoken(100, preferredCurrency, 'English')}`}
                  </p>
                </div>

                {/* Measurement Units */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                    {localize(profile.language, 'Measurement Units for Distances & Objects', 'وحدات قياس المسافات والأبعاد')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMeasurementUnits('metric')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        measurementUnits === 'metric'
                          ? 'bg-[#1769AA] border-[#4B9FE1] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-[#082344] border-slate-200 dark:border-[#16395E] text-slate-600 dark:text-[#A9C4DD]'
                      }`}
                    >
                      <span>{isAr ? 'المتر والسنتيمتر (متري)' : L('Meters & Centimeters (Metric)')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeasurementUnits('imperial')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        measurementUnits === 'imperial'
                          ? 'bg-[#1769AA] border-[#4B9FE1] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-[#082344] border-slate-200 dark:border-[#16395E] text-slate-600 dark:text-[#A9C4DD]'
                      }`}
                    >
                      <span>{isAr ? 'القدم والبوصة (إمبراطوري)' : L('Feet & Inches (Imperial)')}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#A9C4DD]/80">
                    {isAr 
                      ? `مثال المسافة: ${formatMeasurementSpoken(2.5, 'distance', measurementUnits, 'Arabic')}`
                      : `Distance sample: ${formatMeasurementSpoken(2.5, 'distance', measurementUnits, 'English')}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            TAB 4: SHORTCUTS & PERSONAL COMMANDS (الأوامر والاختصارات)
           ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'shortcuts' && (
          <div 
            id="panel-shortcuts" 
            role="tabpanel" 
            aria-labelledby="tab-shortcuts"
            className="space-y-6"
          >
            <div className="bg-white dark:bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start">
              <div className="border-b border-slate-200 dark:border-[#16395E] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 text-[#1769AA] dark:text-[#4B9FE1]">
                    <Keyboard className="w-5 h-5 text-[#1769AA] dark:text-[#4B9FE1]" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
                      {localize(profile.language, 'Keyboard Shortcuts & Voice Commands', 'اختصارات لوحة المفاتيح والأوامر الصوتية')}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-[#A9C4DD] mt-1 font-medium">
                    {localize(
                      profile.language,
                      'Pre-configured accessible keys guarded against NVDA, JAWS, and VoiceOver conflicts.',
                      'اختصارات ميسرة ومحمية لعدم التضارب مع قارئات الشاشة (NVDA و JAWS و VoiceOver).'
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRestoreDefaultShortcuts}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#082344] hover:bg-white hover:dark:bg-[#0D2542] border border-slate-200 dark:border-[#16395E] text-xs font-bold text-slate-600 dark:text-[#A9C4DD] hover:text-white transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{localize(profile.language, 'Restore Default Shortcuts', 'استعادة الاختصارات الافتراضية')}</span>
                </button>
              </div>

              {/* Personal Voice Command Phrase */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] space-y-3">
                <label className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                  {localize(profile.language, 'Personal Voice Wake Phrase', 'عبارة التنبيه الصوتي المخصصة')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={personalVoiceCommandPhrase}
                    onChange={(e) => setPersonalVoiceCommandPhrase(e.target.value)}
                    placeholder={isAr ? 'مثال: رفيقي استمع' : L('e.g. Rafiqi Listen')}
                    className="flex-1 bg-white dark:bg-[#0D2542] border border-slate-200 dark:border-[#16395E] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-[#F4F7FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#1769AA]"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-[#A9C4DD]/80">
                  {localize(
                    profile.language,
                    'Say this phrase while using voice document creation or scene questions to wake Rafiqi.',
                    'انطق هذه العبارة في أي وقت أثناء الإملاء الصوتي أو أسئلة المشهد لتفعيل الاستماع المباشر.'
                  )}
                </p>
              </div>

              {/* Shortcuts Matrix Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F7FB]">
                  {localize(profile.language, 'System Navigation & Control Shortcuts', 'جدول الاختصارات والتنقل السريع')}
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#16395E]">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-[#082344] border-b border-slate-200 dark:border-[#16395E] text-[#1769AA] dark:text-[#4B9FE1] font-bold">
                        <th className="p-3 text-start">{isAr ? 'المفتاح' : L('Key')}</th>
                        <th className="p-3 text-start">{isAr ? 'الإجراء' : L('Action')}</th>
                        <th className="p-3 text-start">{isAr ? 'الوصف' : L('Description')}</th>
                        <th className="p-3 text-start">{isAr ? 'الفئة' : L('Category')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-[#16395E]/50">
                      {shortcutsList.map((sc) => (
                        <tr key={sc.id} className="hover:bg-slate-100/50 dark:hover:bg-[#082344]/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-[#1769AA] dark:text-[#4B9FE1] whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E]">
                              {sc.keyCombo}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-[#F4F7FB]">
                            {isAr ? sc.labelAr : L(sc.labelEn)}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-[#A9C4DD] leading-relaxed">
                            {isAr ? sc.descriptionAr : L(sc.descriptionEn)}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-[#1769AA]/15 border border-[#1769AA]/30 text-[#1769AA] dark:text-[#4B9FE1]">
                              {sc.category}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            TAB 5: READING HISTORY MANAGER (سجل القراءة)
           ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div 
            id="panel-history" 
            role="tabpanel" 
            aria-labelledby="tab-history"
            className="space-y-6"
          >
            <div className="bg-white dark:bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start">
              <div className="border-b border-slate-200 dark:border-[#16395E] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 text-[#1769AA] dark:text-[#4B9FE1]">
                    <History className="w-5 h-5 text-[#1769AA] dark:text-[#4B9FE1]" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
                      {localize(profile.language, 'Reading & Lecture History Manager', 'إدارة سجل القراءة واستئناف المحاضرات')}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-[#A9C4DD] mt-1 font-medium">
                    {localize(
                      profile.language,
                      'Bookmarks and position markers stored strictly on your device.',
                      'علامات التوقف ومواضع الاستئناف مخزنة محلياً على جهازك فقط.'
                    )}
                  </p>
                </div>

                {readingHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowClearHistoryConfirm(true)}
                    className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-bold text-rose-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{localize(profile.language, 'Clear All History', 'مسح كامل السجل')}</span>
                  </button>
                )}
              </div>

              {/* Transparent Storage Explanation */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] text-xs text-slate-600 dark:text-[#A9C4DD] space-y-1">
                <div className="flex items-center gap-2 text-[#1769AA] dark:text-[#4B9FE1] font-bold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{isAr ? 'شفافية التخزين المحلي والخصوصية' : L('Storage Provenance & Privacy')}</span>
                </div>
                <p className="leading-relaxed">
                  {getReadingHistoryStorageExplanation(isAr ? 'Arabic' : 'English')}
                </p>
              </div>

              {/* Enable / Disable Reading History Toggle */}
              <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={readingHistoryEnabled}
                  aria-label={localize(profile.language, 'Track Reading Bookmarks & Lecture Timestamps', 'تسجيل مواضع التوقف في الكتب والمحاضرات')}
                  onChange={(e) => setReadingHistoryEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1769AA] focus:ring-[#1769AA]"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                    {localize(profile.language, 'Track Reading Bookmarks & Lecture Timestamps', 'تسجيل مواضع التوقف في الكتب والمحاضرات')}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-[#A9C4DD]">
                    {localize(profile.language, 'Allows you to resume listening from where you left off', 'يتيح استئناف الاستماع والقراءة مباشرة من النقطة التي توقفت عندها')}
                  </span>
                </div>
              </label>

              {/* Reading History Items List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F7FB]">
                  {localize(profile.language, 'Saved Bookmarks & Lectures', 'المحاضرات والكتب المحفوظة')}
                </h3>

                {readingHistory.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] text-center space-y-2">
                    <Book className="w-8 h-8 text-slate-400 dark:text-[#A9C4DD]/50 mx-auto" />
                    <p className="text-xs text-slate-600 dark:text-[#A9C4DD]">
                      {localize(profile.language, 'No reading history records found.', 'لا توجد سجلات قراءة سابقة.')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {readingHistory.map((item) => (
                      <div 
                        key={item.id}
                        className="p-4 rounded-2xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            {item.type === 'audio_lecture' ? (
                              <Headphones className="w-4 h-4 text-[#1769AA] dark:text-[#4B9FE1] shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-[#1769AA] dark:text-[#4B9FE1] shrink-0" />
                            )}
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F4F7FB]">
                              {item.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-[#A9C4DD]">
                            <span>
                              {item.type === 'audio_lecture' 
                                ? (isAr ? `توقف عند الدقيقة ${Math.floor(item.lastPosition / 60)}` : `At minute ${Math.floor(item.lastPosition / 60)}`)
                                : (isAr ? `توقف عند الصفحة ${item.lastPosition}` : `At page ${item.lastPosition}`)}
                            </span>
                            <span>•</span>
                            <span>{item.progressPercent}% {isAr ? 'مكتمل' : L('completed')}</span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full max-w-md h-1.5 bg-white dark:bg-[#0D2542] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#1769AA] rounded-full"
                              style={{ width: `${item.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryItem(item.id)}
                            aria-label={isAr ? `حذف ${item.title}` : `Delete ${item.title}`}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            TAB 6: ASSISTANT MEMORY & PRIVACY (الذاكرة والخصوصية)
           ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'memory' && (
          <div 
            id="panel-memory" 
            role="tabpanel" 
            aria-labelledby="tab-memory"
            className="space-y-6"
          >
            <div className="bg-white dark:bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start">
              <div className="border-b border-slate-200 dark:border-[#16395E] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 text-[#1769AA] dark:text-[#4B9FE1]">
                    <ShieldCheck className="w-5 h-5 text-[#1769AA] dark:text-[#4B9FE1]" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
                      {localize(profile.language, 'Privacy-First Assistant Memory', 'ذاكرة المساعد الذكي وحماية الخصوصية')}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-[#A9C4DD] mt-1 font-medium">
                    {localize(
                      profile.language,
                      'Control what Rafiqi remembers about your preferences and environment. Strictly opt-in.',
                      'التحكم فيما يتذكره رفيقي عن تفضيلاتك وبيئتك المكانية. ميزة اختيارية بالكامل.'
                    )}
                  </p>
                </div>

                {memoryEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowClearMemoryConfirm(true)}
                    className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-bold text-rose-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{localize(profile.language, 'Erase All Memory', 'مسح الذاكرة بالكامل')}</span>
                  </button>
                )}
              </div>

              {/* Privacy Notice Banner */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] text-xs text-slate-600 dark:text-[#A9C4DD] space-y-1">
                <div className="flex items-center gap-2 text-[#1769AA] dark:text-[#4B9FE1] font-bold">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>{isAr ? 'سياسة الخصوصية الصارمة' : L('Strict Privacy Policy')}</span>
                </div>
                <p className="leading-relaxed">
                  {getMemoryPrivacyNotice(isAr ? 'Arabic' : 'English')}
                </p>
              </div>

              {/* Opt-in & Pause Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={memoryOptIn}
                    aria-label={localize(profile.language, 'Enable Assistant Memory (Opt-in)', 'تفعيل ذاكرة المساعد (اختياري)')}
                    onChange={(e) => setMemoryOptIn(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1769AA] focus:ring-[#1769AA]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                      {localize(profile.language, 'Enable Assistant Memory (Opt-in)', 'تفعيل ذاكرة المساعد (اختياري)')}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-[#A9C4DD]">
                      {localize(profile.language, 'Remembers your custom room landmarks and study habits', 'يتذكر معالم غرفتك المحددة وعاداتك الدراسية')}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMemoryPaused}
                    aria-label={localize(profile.language, 'Pause Memory Recording', 'إيقاف مؤقت لحفظ الذاكرة')}
                    onChange={(e) => setIsMemoryPaused(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1769AA] focus:ring-[#1769AA]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB] block">
                      {localize(profile.language, 'Pause Memory Recording', 'إيقاف مؤقت لحفظ الذاكرة')}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-[#A9C4DD]">
                      {localize(profile.language, 'Temporarily prevent Rafiqi from adding new notes', 'يمنع رفيقي مؤقتاً من إضافة أي ملاحظات جديدة')}
                    </span>
                  </div>
                </label>
              </div>

              {/* Add Memory Item with Sensitive Data Validation */}
              {memoryOptIn && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB]">
                    {localize(profile.language, 'Add Verified Memory Note', 'إضافة ملاحظة ذاكرة موثقة')}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={newMemoryCategory}
                      onChange={(e) => setNewMemoryCategory(e.target.value as any)}
                      className="bg-white dark:bg-[#0D2542] border border-slate-200 dark:border-[#16395E] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F4F7FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#1769AA]"
                    >
                      <option value="topic_interest">{isAr ? 'اهتمامات دراسية' : L('Topic Interest')}</option>
                      <option value="room_landmark">{isAr ? 'معلم مكاني بالغرفة' : L('Room Landmark')}</option>
                      <option value="voice_preference">{isAr ? 'تفضيل صوتي خاص' : L('Voice Preference')}</option>
                      <option value="companion_contact">{isAr ? 'جهة مساعدة' : L('Contact')}</option>
                      <option value="custom">{isAr ? 'ملاحظة عامة' : L('Custom Note')}</option>
                    </select>

                    <input
                      type="text"
                      value={newMemoryInput}
                      onChange={(e) => {
                        setNewMemoryInput(e.target.value);
                        setMemoryValidationError(null);
                      }}
                      placeholder={isAr ? 'اكتب ملاحظة (مثال: مفاتيح الخزانة في الدرج العلوي)' : L('Write a note (e.g. Desk is near window)')}
                      className="sm:col-span-2 bg-white dark:bg-[#0D2542] border border-slate-200 dark:border-[#16395E] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-[#F4F7FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#1769AA]"
                    />
                  </div>

                  {memoryValidationError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{memoryValidationError}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddMemoryEntry}
                      disabled={!newMemoryInput.trim()}
                      className="px-4 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{localize(profile.language, 'Add Note', 'إضافة الملاحظة')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Memory Entries List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F7FB]">
                  {localize(profile.language, 'Active Memory Records', 'السجلات المحفوظة في الذاكرة')}
                </h3>

                {memoryEntries.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] text-center space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-400 dark:text-[#A9C4DD]/50 mx-auto" />
                    <p className="text-xs text-slate-600 dark:text-[#A9C4DD]">
                      {localize(profile.language, 'No memory records stored. Your privacy is fully preserved.', 'لا توجد أي سجلات محفوظة في الذاكرة. خصوصيتك مصونة بالكامل.')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memoryEntries.map((mem) => (
                      <div 
                        key={mem.id}
                        className="p-4 rounded-2xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-[#1769AA]/15 border border-[#1769AA]/30 text-[#1769AA] dark:text-[#4B9FE1]">
                              {mem.category}
                            </span>
                            <span className="text-xs text-slate-600 dark:text-[#A9C4DD]">
                              {new Date(mem.timestamp).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-900 dark:text-[#F4F7FB] leading-relaxed">
                            {mem.content}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteMemoryEntry(mem.id)}
                          aria-label={isAr ? 'حذف هذه الملاحظة' : L('Delete note')}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            TAB 7: OFFLINE CAPABILITIES (العمل دون إنترنت)
           ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'offline' && (
          <div 
            id="panel-offline" 
            role="tabpanel" 
            aria-labelledby="tab-offline"
            className="space-y-6"
          >
            <div className="bg-white dark:bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg text-start">
              <div className="border-b border-slate-200 dark:border-[#16395E] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 text-[#1769AA] dark:text-[#4B9FE1]">
                    <Wifi className="w-5 h-5 text-[#1769AA] dark:text-[#4B9FE1]" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
                      {localize(profile.language, 'Offline Capabilities & Connectivity Truth', 'العمل دون اتصال وحقيقة توفر الميزات')}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-[#A9C4DD] mt-1 font-medium">
                    {localize(
                      profile.language,
                      'Truthful classification of features that genuinely work offline vs cloud AI dependencies.',
                      'تصنيف صادق ودقيق للميزات التي تعمل فعلياً دون اتصال بالإنترنت مقابل ميزات الذكاء الاصطناعي السحابية.'
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold ${
                    isOnline ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                  }`}>
                    <Wifi className="w-4 h-4" />
                    <span>{isOnline ? (isAr ? 'الإنترنت متصل حالياً' : L('Online Connected')) : (isAr ? 'غير متصل بالإنترنت' : L('Offline Mode Active'))}</span>
                  </span>
                </div>
              </div>

              {/* Capability Matrix Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#16395E]">
                <table className="w-full text-start text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-[#082344] border-b border-slate-200 dark:border-[#16395E] text-[#1769AA] dark:text-[#4B9FE1] font-bold">
                      <th className="p-3 text-start">{isAr ? 'الميزة والخدمة' : L('Feature')}</th>
                      <th className="p-3 text-start">{isAr ? 'العمل دون إنترنت' : L('Offline Status')}</th>
                      <th className="p-3 text-start">{isAr ? 'التوضيح الفني والحقيقة' : L('Technical Truth')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#16395E]/50">
                    {OFFLINE_CAPABILITY_MATRIX.map((cap) => (
                      <tr key={cap.featureId} className="hover:bg-slate-100/50 dark:hover:bg-[#082344]/50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-[#F4F7FB]">
                          {isAr ? cap.nameAr : L(cap.nameEn)}
                        </td>
                        <td className="p-3">
                          {cap.worksOffline ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                              <Check className="w-3 h-3" />
                              <span>{isAr ? 'يعمل دون إنترنت' : L('Works Offline')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] text-slate-600 dark:text-[#A9C4DD]">
                              <span>{isAr ? 'يتطلب اتصال سحابي' : L('Requires Cloud')}</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-[#A9C4DD] leading-relaxed">
                          {isAr ? cap.explanationAr : L(cap.explanationEn)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── BOTTOM GLOBAL SAVE BANNER (Reference Match) ── */}
        <div className="pt-2 border-t border-slate-200 dark:border-[#16395E]">
          {saveStatus === 'saving' && (
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#082344]/80 border border-[#1769AA]/30 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[#1769AA] dark:text-[#4B9FE1] shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB]">
                  {localize(profile.language, 'Saving changes...', 'جارٍ حفظ التغييرات...')}
                </h4>
                <p className="text-xs text-slate-600 dark:text-[#A9C4DD] mt-0.5">
                  {localize(profile.language, 'Synchronizing preferences with profile', 'مزامنة التفضيلات مع ملفك الشخصي')}
                </p>
              </div>
            </div>
          )}

          {saveStatus === 'saved' && (
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#082344]/80 border border-[#1769AA]/30 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#1769AA] dark:text-[#4B9FE1] shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-[#F4F7FB]">
                  {localize(profile.language, 'Settings saved successfully', 'تم حفظ الإعدادات بنجاح')}
                </h4>
                <p className="text-xs text-slate-600 dark:text-[#A9C4DD] mt-0.5">
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
                <p className="text-xs text-rose-400/80 mt-0.5">
                  {localize(profile.language, 'Check your connection or storage permissions.', 'تحقق من اتصال الشبكة وصلاحيات التخزين.')}
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-[#94A3B8] select-text" data-testid="build-stamp">Build {typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "local"}</p>
      </div>

      {/* Confirmation Modal for Resetting Defaults */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 text-start shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
                {localize(profile.language, 'Restore Default Settings?', 'استعادة الإعدادات الافتراضية؟')}
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#A9C4DD] leading-relaxed">
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
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] text-xs font-semibold text-slate-600 dark:text-[#A9C4DD] hover:text-white transition-all cursor-pointer"
              >
                {localize(profile.language, 'Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-5 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-xs font-bold text-white transition-all cursor-pointer shadow-md"
              >
                {localize(profile.language, 'Yes, Restore Defaults', 'نعم، استعادة الافتراضي')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing Memory */}
      {showClearMemoryConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 text-start shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
                {localize(profile.language, 'Erase All Memory?', 'مسح كامل الذاكرة؟')}
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#A9C4DD] leading-relaxed">
              {localize(
                profile.language,
                'This will permanently delete all remembered preferences, room landmarks, and study notes.',
                'سيتم حذف كافة التفضيلات والمعالم المكانية والملاحظات المحفوظة نهائياً من المتصفح.'
              )}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearMemoryConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] text-xs font-semibold text-slate-600 dark:text-[#A9C4DD]"
              >
                {localize(profile.language, 'Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={handleClearAllMemory}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md"
              >
                {localize(profile.language, 'Erase Permanently', 'مسح نهائي')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing History */}
      {showClearHistoryConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0D2542] border border-[rgba(56,139,190,0.35)] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 text-start shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
                {localize(profile.language, 'Clear Reading History?', 'مسح سجل القراءة؟')}
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#A9C4DD] leading-relaxed">
              {localize(
                profile.language,
                'This will remove all reading bookmarks and lecture timestamps stored on this device.',
                'سيتم مسح جميع علامات التوقف ومواضع الاستماع للمحاضرات والكتب المحفوظة على هذا الجهاز.'
              )}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearHistoryConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#082344] border border-slate-200 dark:border-[#16395E] text-xs font-semibold text-slate-600 dark:text-[#A9C4DD]"
              >
                {localize(profile.language, 'Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md"
              >
                {localize(profile.language, 'Clear History', 'مسح السجل')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}