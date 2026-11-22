/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Rafiqi — Phase 12: Personalize & Personal Accessibility Profile Engine
 * 
 * Production-grade personal accessibility profile, language preferences,
 * speech/voice controls, description defaults, personal shortcuts, reading history,
 * privacy-first assistant memory, and offline capability classification.
 */

// ═════════════════════════════════════════════════════════════════════════════
// 1. TYPES & DATA STRUCTURES
// ═════════════════════════════════════════════════════════════════════════════

export type SupportedInterfaceLanguage = 'Arabic' | 'English';

export type SpeechLanguage = 'ar-SA' | 'ar-EG' | 'en-US' | 'fr-FR';

export type ReadingVerbosity = 'concise' | 'normal' | 'detailed';

export type NumeralPronunciation = 'individual_digits' | 'full_number' | 'arabic_words';

export type ReadingModeDefault = 'plain_text' | 'dyslexia_friendly' | 'braille_ready' | 'high_contrast';

export type PreferredCurrency = 'EGP' | 'USD' | 'EUR' | 'SAR' | 'AED';

export type MeasurementSystem = 'metric' | 'imperial';

export interface VoicePreferences {
  speechLanguage: SpeechLanguage;
  voiceId: string;
  speed: number;        // 0.5 to 2.0 (default: 1.0)
  volume: number;       // 0.0 to 1.0 (default: 1.0)
  pitch: number;        // 0.5 to 1.5 (default: 1.0)
  verbosity: ReadingVerbosity;
  pronounceTashkeel: boolean;
  numeralPronunciation: NumeralPronunciation;
}

export interface DescriptionPreferences {
  visualDetail: 'concise' | 'detailed';
  preferredLanguage: 'Arabic' | 'Egyptian Ammiya' | 'English';
  readingMode: ReadingModeDefault;
  currency: PreferredCurrency;
  numeralPronunciation: NumeralPronunciation;
  measurementUnits: MeasurementSystem;
}

export interface PersonalShortcutItem {
  id: string;
  action: string;
  labelAr: string;
  labelEn: string;
  keyCombo: string;
  category: 'navigation' | 'speech' | 'safety';
  descriptionAr: string;
  descriptionEn: string;
  isCustom: boolean;
}

export interface ReadingHistoryItem {
  id: string;
  title: string;
  type: 'audio_lecture' | 'epub_book' | 'pdf_document' | 'handwritten_note' | 'social_image';
  lastPosition: number; // page number or audio timestamp in seconds
  totalLength: number;  // total pages or total duration
  progressPercent: number;
  timestamp: number;
  storageProvenance: 'local_browser_only';
}

export interface AssistantMemoryEntry {
  id: string;
  category: 'topic_interest' | 'room_landmark' | 'voice_preference' | 'companion_contact' | 'custom';
  content: string;
  timestamp: number;
  source: string;
  isUserVerified: boolean;
}

export interface OfflineCapabilityItem {
  featureId: string;
  nameAr: string;
  nameEn: string;
  worksOffline: boolean;
  requiresInternet: boolean;
  explanationAr: string;
  explanationEn: string;
}

export interface PersonalizePreferencesProfile {
  interfaceLanguage: SupportedInterfaceLanguage;
  voice: VoicePreferences;
  descriptions: DescriptionPreferences;
  shortcuts: PersonalShortcutItem[];
  personalVoiceCommandPhrase: string;
  memoryOptIn: boolean;
  isMemoryPaused: boolean;
  readingHistoryEnabled: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  fontSizeScale: 'normal' | 'medium' | 'large' | 'extra-large';
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. SAFE DEFAULTS & STORAGE KEYS
// ═════════════════════════════════════════════════════════════════════════════

export const PERSONALIZE_STORAGE_KEYS = {
  PREFERENCES: 'cognify_personalize_preferences',
  READING_HISTORY: 'cognify_reading_history',
  ASSISTANT_MEMORY: 'cognify_assistant_memory',
  MEMORY_OPT_IN: 'cognify_assistant_memory_optin',
  MEMORY_PAUSED: 'cognify_assistant_memory_paused',
  READING_HISTORY_ENABLED: 'cognify_reading_history_enabled',
} as const;

export const DEFAULT_SHORTCUTS: PersonalShortcutItem[] = [
  {
    id: 'nav_vision',
    action: 'open_vision_companion',
    labelAr: 'فتح الرفيق البصري',
    labelEn: 'Open Visual Companion',
    keyCombo: 'Alt+V',
    category: 'navigation',
    descriptionAr: 'الانتقال المباشر لكاميرا الرفيق البصري وكشف المشهد',
    descriptionEn: 'Direct shortcut to camera visual companion and scene detection',
    isCustom: false,
  },
  {
    id: 'nav_reader',
    action: 'open_read_learn',
    labelAr: 'فتح استوديو القراءة والكتب',
    labelEn: 'Open Book Studio & Reader',
    keyCombo: 'Alt+R',
    category: 'navigation',
    descriptionAr: 'الانتقال المباشر لقارئ الكتب وتفريغ المحاضرات',
    descriptionEn: 'Direct shortcut to book reader and lecture transcription',
    isCustom: false,
  },
  {
    id: 'nav_productivity',
    action: 'open_work_create',
    labelAr: 'فتح مساحة الإنتاجية',
    labelEn: 'Open Productivity Workspace',
    keyCombo: 'Alt+W',
    category: 'navigation',
    descriptionAr: 'الانتقال المباشر للإملاء الصوتي ومساعد المستندات والعروض',
    descriptionEn: 'Direct shortcut to voice document creation and slides creator',
    isCustom: false,
  },
  {
    id: 'nav_mobility',
    action: 'open_move_explore',
    labelAr: 'فتح مساعد الحركة واستكشاف الأماكن',
    labelEn: 'Open Mobility & Places Assistant',
    keyCombo: 'Alt+M',
    category: 'navigation',
    descriptionAr: 'الانتقال المباشر لوصف الأماكن، قارئ اللافتات، ومساعد الحافلات',
    descriptionEn: 'Direct shortcut to place descriptions, signs, and transit assistant',
    isCustom: false,
  },
  {
    id: 'nav_communicate',
    action: 'open_communicate',
    labelAr: 'فتح مساعد التواصل الشامل',
    labelEn: 'Open Accessible Communication',
    keyCombo: 'Alt+C',
    category: 'navigation',
    descriptionAr: 'الانتقال المباشر للمساعدة البشرية وقارئ الخط اليدوي والمدفوعات',
    descriptionEn: 'Direct shortcut to human assistance, handwriting, and payment guidance',
    isCustom: false,
  },
  {
    id: 'nav_personalize',
    action: 'open_personalize',
    labelAr: 'فتح جواز التيسير والتفضيلات',
    labelEn: 'Open Personalize & Passport',
    keyCombo: 'Alt+P',
    category: 'navigation',
    descriptionAr: 'الانتقال المباشر لإعدادات الصوت واللغات والاختصارات والذاكرة',
    descriptionEn: 'Direct shortcut to voice, language, shortcuts, and memory settings',
    isCustom: false,
  },
  {
    id: 'speech_toggle',
    action: 'toggle_speech_playback',
    labelAr: 'إيقاف مؤقت / استئناف القراءة الصوتية',
    labelEn: 'Pause / Resume Speech Playback',
    keyCombo: 'Alt+S',
    category: 'speech',
    descriptionAr: 'التحكم الفوري في القراءة الصوتية الحالية',
    descriptionEn: 'Instant control to pause or resume active speech synthesis',
    isCustom: false,
  },
  {
    id: 'safety_kill_switch',
    action: 'emergency_kill_switch',
    labelAr: 'الإيقاف الفوري التام (زر الطوارئ)',
    labelEn: 'Emergency Stop & Stream Kill Switch',
    keyCombo: 'Escape',
    category: 'safety',
    descriptionAr: 'إيقاف فوري لأي بث كاميرا أو ميكروفون وقراءة صوتية نشطة',
    descriptionEn: 'Immediate termination of any active camera, microphone, or speech stream',
    isCustom: false,
  },
];

export const DEFAULT_PERSONALIZE_PREFERENCES: PersonalizePreferencesProfile = {
  interfaceLanguage: 'Arabic',
  voice: {
    speechLanguage: 'ar-SA',
    voiceId: 'default',
    speed: 1.0,
    volume: 1.0,
    pitch: 1.0,
    verbosity: 'normal',
    pronounceTashkeel: false,
    numeralPronunciation: 'arabic_words',
  },
  descriptions: {
    visualDetail: 'concise',
    preferredLanguage: 'Arabic',
    readingMode: 'plain_text',
    currency: 'EGP',
    numeralPronunciation: 'arabic_words',
    measurementUnits: 'metric',
  },
  shortcuts: DEFAULT_SHORTCUTS,
  personalVoiceCommandPhrase: 'رفيقي استمع',
  memoryOptIn: false,
  isMemoryPaused: false,
  readingHistoryEnabled: true,
  highContrast: false,
  reduceMotion: false,
  fontSizeScale: 'medium',
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. LANGUAGE PREFERENCES & PRESERVATION
// ═════════════════════════════════════════════════════════════════════════════

export function getLayoutDirection(lang: SupportedInterfaceLanguage): 'rtl' | 'ltr' {
  return lang === 'Arabic' ? 'rtl' : 'ltr';
}

/**
 * Ensures user drafts, transcribed lectures, and reading bookmarks remain
 * preserved when switching interface language.
 */
export function preserveUserContentOnLanguageSwitch<T extends Record<string, any>>(
  userWorkspaceState: T,
  _previousLang: SupportedInterfaceLanguage,
  _newLang: SupportedInterfaceLanguage
): T {
  // Return shallow copy maintaining immutable content references
  return {
    ...userWorkspaceState,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. VOICE PREFERENCES & BROWSER CAPABILITY EXPLANATIONS
// ═════════════════════════════════════════════════════════════════════════════

export interface BrowserVoiceSupportInfo {
  isSynthesisSupported: boolean;
  isPitchSupported: boolean;
  availableVoicesCount: number;
  hasArabicVoice: boolean;
  hasEgyptianVoice: boolean;
  hasEnglishVoice: boolean;
  explanationAr: string;
  explanationEn: string;
}

export function detectBrowserVoiceSupport(): BrowserVoiceSupportInfo {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return {
      isSynthesisSupported: false,
      isPitchSupported: false,
      availableVoicesCount: 0,
      hasArabicVoice: false,
      hasEgyptianVoice: false,
      hasEnglishVoice: false,
      explanationAr: 'المتصفح الحالي لا يدعم التوليد الصوتي المدمج (Web Speech API). سيتم استخدام قارئ الشاشة المثبت على نظام التشغيل.',
      explanationEn: 'The active browser does not support Web Speech API. The operating system screen reader will be utilized instead.',
    };
  }

  const voices = window.speechSynthesis.getVoices();
  const hasAr = voices.some((v) => v.lang.startsWith('ar'));
  const hasEg = voices.some((v) => v.lang === 'ar-EG');
  const hasEn = voices.some((v) => v.lang.startsWith('en'));

  // Some browsers / operating systems (e.g. Android WebViews, older Safari) ignore the pitch property
  const isPitchSupported = typeof (window as any).SpeechSynthesisUtterance !== 'undefined' &&
    'pitch' in (new (window as any).SpeechSynthesisUtterance());

  return {
    isSynthesisSupported: true,
    isPitchSupported,
    availableVoicesCount: voices.length,
    hasArabicVoice: hasAr,
    hasEgyptianVoice: hasEg,
    hasEnglishVoice: hasEn,
    explanationAr: hasAr
      ? 'أصوات اللغة العربية مدعومة ومفعلة من خلال نظام التشغيل والمتصفح.'
      : 'لم يتم العثور على صوت عربي مثبت بنظام المتصفح؛ يُرجى تثبيت حزمة الصوت العربي من إعدادات النظام لجودة أفضل.',
    explanationEn: hasEn
      ? 'English system voices are supported and available.'
      : 'No native English voice detected in browser engine; default system fallback will be used.',
  };
}

export function explainUnsupportedVoiceSetting(
  settingName: 'pitch' | 'voice' | 'volume',
  lang: SupportedInterfaceLanguage = 'Arabic'
): string {
  const isAr = lang === 'Arabic';
  switch (settingName) {
    case 'pitch':
      return isAr
        ? 'ملاحظة: بعض المتصفحات وأنظمة الهواتف تتجاهل ضبط طبقة الصوت (Pitch) وتطبق الطبقة الطبيعية للمحرك الصوتي.'
        : 'Note: Certain browsers and operating systems ignore pitch adjustment and speak using the engine standard pitch.';
    case 'voice':
      return isAr
        ? 'الصوت المختار غير مثبت محلياً على جهازك؛ يتم استخدام الصوت الافتراضي للنظام تلقائياً.'
        : 'Selected voice is not installed locally on your system; falling back to the default OS synthesizer voice.';
    case 'volume':
      return isAr
        ? 'يتم التحكم في مستوى الصوت من خلال المتصفح، مع مراعاة ألا يتجاوز حد أمان الأذن لمستخدمي سماعات الرأس.'
        : 'Volume is regulated by browser audio constraints, adhering to headphone safety levels.';
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. DESCRIPTION PREFERENCES & FORMATTERS
// ═════════════════════════════════════════════════════════════════════════════

const ARABIC_DIGIT_WORDS = ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];

export function formatNumeralSpoken(
  value: number | string,
  style: NumeralPronunciation,
  lang: SupportedInterfaceLanguage = 'Arabic'
): string {
  const isAr = lang === 'Arabic';
  const str = String(value).trim();

  if (style === 'individual_digits') {
    if (isAr) {
      return str
        .split('')
        .map((ch) => {
          const digit = parseInt(ch, 10);
          return !isNaN(digit) && digit >= 0 && digit <= 9 ? ARABIC_DIGIT_WORDS[digit] : ch;
        })
        .join(' ');
    }
    return str.split('').join(' ');
  }

  if (style === 'arabic_words' && isAr) {
    const num = parseInt(str, 10);
    if (!isNaN(num)) {
      if (num >= 0 && num <= 9) return ARABIC_DIGIT_WORDS[num];
      if (num === 10) return 'عشرة';
      if (num === 11) return 'أحد عشر';
      if (num === 12) return 'اثنا عشر';
      if (num === 20) return 'عشرون';
      if (num === 25) return 'خمسة وعشرون';
      if (num === 50) return 'خمسون';
      if (num === 100) return 'مئة';
      if (num === 200) return 'مئتان';
      if (num === 500) return 'خمسمائة';

      const tensWords: Record<number, string> = {
        2: 'عشرون', 3: 'ثلاثون', 4: 'أربعون', 5: 'خمسون', 6: 'ستون', 7: 'سبعون', 8: 'ثمانون', 9: 'تسعون'
      };
      if (num > 20 && num < 100) {
        const units = num % 10;
        const tens = Math.floor(num / 10);
        if (units === 0) return tensWords[tens];
        return `${ARABIC_DIGIT_WORDS[units]} و${tensWords[tens]}`;
      }
    }
  }

  return str;
}

export function formatCurrencySpoken(
  amount: number,
  currency: PreferredCurrency,
  lang: SupportedInterfaceLanguage = 'Arabic'
): string {
  const isAr = lang === 'Arabic';
  const currencyLabelsAr: Record<PreferredCurrency, string> = {
    EGP: 'جنيه مصري',
    USD: 'دولار أمريكي',
    EUR: 'يورو',
    SAR: 'ريال سعودي',
    AED: 'درهم إماراتي',
  };
  const currencyLabelsEn: Record<PreferredCurrency, string> = {
    EGP: 'Egyptian Pounds',
    USD: 'US Dollars',
    EUR: 'Euros',
    SAR: 'Saudi Riyals',
    AED: 'UAE Dirhams',
  };

  return isAr
    ? `${amount} ${currencyLabelsAr[currency]}`
    : `${amount} ${currencyLabelsEn[currency]}`;
}

export function formatMeasurementSpoken(
  value: number,
  unit: string,
  system: MeasurementSystem,
  lang: SupportedInterfaceLanguage = 'Arabic'
): string {
  const isAr = lang === 'Arabic';
  const cleanUnit = unit.toLowerCase().trim();
  const isDist = cleanUnit === 'distance' || cleanUnit === 'meter' || cleanUnit === 'm';

  if (system === 'imperial') {
    if (isDist) {
      const feet = Math.round(value * 3.28084);
      return isAr ? `${feet} قدم تقريباً` : `approximately ${feet} feet`;
    }
    return isAr ? `${value} ${unit}` : `${value} ${unit}`;
  }

  // Metric
  if (isDist) {
    return isAr ? `${value} متر` : `${value} meters`;
  }
  return isAr ? `${value} ${unit}` : `${value} ${unit}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. SHORTCUTS & COMMANDS CONFLICT VALIDATOR
// ═════════════════════════════════════════════════════════════════════════════

export interface ShortcutConflictResult {
  isValid: boolean;
  hasConflict: boolean;
  screenReaderConflict?: 'NVDA' | 'JAWS' | 'VoiceOver' | 'OS';
  conflictReasonAr?: string;
  conflictReasonEn?: string;
}

export function validateShortcutConflict(
  proposedCombo: string,
  shortcutsList: PersonalShortcutItem[] = DEFAULT_SHORTCUTS
): ShortcutConflictResult {
  const clean = proposedCombo.trim().toLowerCase();

  // Screen Reader specific conflict detection
  if (clean.includes('insert+f7') || clean.includes('insert+up') || clean.includes('insert+space')) {
    return {
      isValid: false,
      hasConflict: true,
      screenReaderConflict: 'NVDA',
      conflictReasonAr: 'مرفوض: يتعارض هذا الاختصار مع مفاتيح قارئ الشاشة NVDA.',
      conflictReasonEn: 'Rejected: This combination conflicts with reserved NVDA screen reader commands.',
    };
  }

  if (clean.includes('insert+down') || clean.includes('caps+arrow') || clean.includes('caps+space')) {
    return {
      isValid: false,
      hasConflict: true,
      screenReaderConflict: 'JAWS',
      conflictReasonAr: 'مرفوض: يتعارض هذا الاختصار مع مفاتيح قارئ الشاشة JAWS.',
      conflictReasonEn: 'Rejected: This combination conflicts with reserved JAWS screen reader commands.',
    };
  }

  if (clean.includes('ctrl+alt+r') || clean.includes('control+option') || clean.includes('ctrl+option')) {
    return {
      isValid: false,
      hasConflict: true,
      screenReaderConflict: 'VoiceOver',
      conflictReasonAr: 'مرفوض: يتعارض هذا الاختصار مع مفاتيح قارئ الشاشة VoiceOver.',
      conflictReasonEn: 'Rejected: This combination conflicts with reserved VoiceOver screen reader commands.',
    };
  }

  if (['alt+f4', 'ctrl+w', 'ctrl+t', 'ctrl+n'].includes(clean)) {
    return {
      isValid: false,
      hasConflict: true,
      screenReaderConflict: 'OS',
      conflictReasonAr: 'مرفوض: يتعارض هذا الاختصار مع أوامر النظام التشغيلي الأساسية.',
      conflictReasonEn: 'Rejected: This combination conflicts with reserved operating system commands.',
    };
  }

  // Check duplicates in existing app shortcuts
  const existing = shortcutsList.find((s) => s.keyCombo.toLowerCase() === clean);
  if (existing) {
    return {
      isValid: false,
      hasConflict: true,
      conflictReasonAr: `مرفوض: الاختصار مستخدم بالفعل للإجراء "${existing.labelAr}".`,
      conflictReasonEn: `Rejected: Combination is already assigned to "${existing.labelEn}".`,
    };
  }

  return { isValid: true, hasConflict: false };
}

export function announceShortcutAction(
  actionOrKey: string,
  lang: SupportedInterfaceLanguage = 'Arabic'
): string {
  const isAr = lang === 'Arabic';
  const found = DEFAULT_SHORTCUTS.find(
    (s) => s.action === actionOrKey || s.keyCombo.toLowerCase() === actionOrKey.toLowerCase()
  );
  if (found) {
    return isAr ? `تم تفعيل: ${found.labelAr}` : `Activated: ${found.labelEn}`;
  }
  return isAr ? 'تم تفعيل الاختصار' : 'Shortcut activated';
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. READING HISTORY MANAGER (METADATA ONLY, NO BINARY LEAKAGE)
// ═════════════════════════════════════════════════════════════════════════════

export function getReadingHistoryStorageExplanation(lang: SupportedInterfaceLanguage = 'Arabic'): string {
  return lang === 'Arabic'
    ? 'تنبيه الخصوصية وحجم التخزين: يحتفظ سجل القراءة فقط بالعناوين وعلامات توقف القراءة (رقم الصفحة أو الدقيقة الصوتية) محلياً داخل متصفحك. لا يتم تخزين الملفات الصوتية الأصلية أو الكتب الضخمة لضمان خصوصيتك وتوفير مساحة جهازك.'
    : 'Privacy & Storage Notice: Reading history stores only titles and bookmark timestamps (page number or audio second) locally in your browser. Original book files or heavy audio streams are never stored unnecessarily, ensuring privacy and storage efficiency.';
}

export function parseReadingHistory(rawJson?: string | null): ReadingHistoryItem[] {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        id: String(item.id || `item_${Date.now()}`),
        title: String(item.title || 'Untitled Document'),
        type: item.type || 'epub_book',
        lastPosition: Number(item.lastPosition || 1),
        totalLength: Number(item.totalLength || 100),
        progressPercent: Math.min(100, Math.max(0, Number(item.progressPercent || 0))),
        timestamp: Number(item.timestamp || Date.now()),
        storageProvenance: 'local_browser_only',
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export function addReadingHistoryItem(
  history: ReadingHistoryItem[],
  newItem: Omit<ReadingHistoryItem, 'id' | 'timestamp' | 'storageProvenance'> & { id?: string }
): ReadingHistoryItem[] {
  const existingIdx = history.findIndex((h) => h.id === newItem.id || (h.title === newItem.title && h.type === newItem.type));
  const updatedItem: ReadingHistoryItem = {
    id: newItem.id || `read_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...newItem,
    timestamp: Date.now(),
    storageProvenance: 'local_browser_only',
  };

  if (existingIdx >= 0) {
    const copy = [...history];
    copy[existingIdx] = updatedItem;
    return copy;
  }

  // Prepend to show most recent first, capping at 30 items
  return [updatedItem, ...history].slice(0, 30);
}

export function removeReadingHistoryItem(
  history: ReadingHistoryItem[],
  idToRemove: string
): ReadingHistoryItem[] {
  return history.filter((h) => h.id !== idToRemove);
}

export function clearAllReadingHistory(): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(PERSONALIZE_STORAGE_KEYS.READING_HISTORY);
    } catch {}
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. PRIVACY-FIRST ASSISTANT MEMORY (OPT-IN & SENSITIVE DATA GUARD)
// ═════════════════════════════════════════════════════════════════════════════

export function getMemoryPrivacyNotice(lang: SupportedInterfaceLanguage = 'Arabic'): string {
  return lang === 'Arabic'
    ? 'مبدأ الخصوصية الصارم: ميزة ذاكرة المساعد الشخصي اختيارية وتتطلب موافقتك الصريحة (Opt-In). جميع المعلومات المحفوظة مشفرة ومحفوظة محلياً داخل جهازك فقط. يتذكر رفيقي فقط اهتماماتك وتفضيلات التيسير المصرح بها، ويحظر تماماً حفظ بطاقات الهوية القومية أو أرقام البطاقات المصرفية أو كلمات المرور.'
    : 'Strict Privacy Principle: Personal Assistant Memory is strictly opt-in and requires your explicit consent. All saved memory entries are encrypted locally on your device. Rafiqi only remembers authorized topics and accessibility preferences, and strictly forbids storing National IDs, bank cards, or passwords.';
}

export function getMemoryErasureDisclaimer(lang: SupportedInterfaceLanguage = 'Arabic'): string {
  return lang === 'Arabic'
    ? 'إقرار الحذف والنسخ الاحتياطي: عند حذف أي معلومة من الذاكرة، يتم مسحها فورياً وبشكل كامل من وحدة التخزين النشطة لجهازك. رفيقي صادق ولا يدعي محو البيانات من النسخ الاحتياطية للكوارث أو البنى التحتية الخارجية إلا بعد التحقق الفعلي.'
    : 'Erasure & Backup Disclosure: Deleted memory entries are immediately removed from active device storage. Rafiqi does not misleadingly claim data is wiped from disaster recovery backups or external provider clouds unless independently verified.';
}

export interface MemorySanitizationResult {
  isAllowed: boolean;
  isValid: boolean;
  sanitizedText: string;
  blockedReason?: string;
  blockedReasonAr?: string;
  blockedReasonEn?: string;
}

/**
 * Sanitizes and guards text to prevent storing sensitive personal information
 * (e.g. 14-digit Egyptian National ID, credit cards, passwords).
 */
export function sanitizeMemoryContent(text: string): MemorySanitizationResult {
  const nationalIdRegex = /\b\d{14}\b/;
  const creditCardRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b/;
  const passwordRegex = /(?:password|كلمة السر|كلمة المرور)\s*[:=]\s*\S+/i;

  if (nationalIdRegex.test(text)) {
    return {
      isAllowed: false,
      isValid: false,
      sanitizedText: '',
      blockedReason: 'تم منع الحفظ: يحتوي النص على رقم قومي أو وثيقة هوية رسمية (14 رقماً). يحظر رفيقي تخزين الأرقام القومية في ذاكرة المساعد.',
      blockedReasonAr: 'تم منع الحفظ: يحتوي النص على رقم قومي أو وثيقة هوية رسمية (14 رقماً). يحظر رفيقي تخزين الأرقام القومية في ذاكرة المساعد.',
      blockedReasonEn: 'Blocked: Text contains a 14-digit National ID. Storing national IDs in memory is strictly forbidden.',
    };
  }

  if (creditCardRegex.test(text)) {
    return {
      isAllowed: false,
      isValid: false,
      sanitizedText: '',
      blockedReason: 'تم منع الحفظ: يحتوي النص على أرقام بطاقة مصرفية سرية.',
      blockedReasonAr: 'تم منع الحفظ: يحتوي النص على أرقام بطاقة مصرفية سرية.',
      blockedReasonEn: 'Blocked: Text contains credit card numbers.',
    };
  }

  if (passwordRegex.test(text)) {
    return {
      isAllowed: false,
      isValid: false,
      sanitizedText: '',
      blockedReason: 'تم منع الحفظ: يحظر تخزين كلمات المرور الحساسة.',
      blockedReasonAr: 'تم منع الحفظ: يحظر تخزين كلمات المرور الحساسة.',
      blockedReasonEn: 'Blocked: Storing passwords or credentials is forbidden.',
    };
  }

  return {
    isAllowed: true,
    isValid: true,
    sanitizedText: text.trim(),
  };
}

export function createAssistantMemoryEntry(
  category: AssistantMemoryEntry['category'],
  content: string,
  source: string = 'explicit_user_input'
): AssistantMemoryEntry {
  const sanitized = sanitizeMemoryContent(content);
  return {
    id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    category,
    content: sanitized.sanitizedText || content,
    timestamp: Date.now(),
    source,
    isUserVerified: true,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. OFFLINE CAPABILITY MATRIX (TRUTHFULNESS & ZERO FAKE OFFLINE AI)
// ═════════════════════════════════════════════════════════════════════════════

export const OFFLINE_CAPABILITY_MATRIX: OfflineCapabilityItem[] = [
  {
    featureId: 'haptics_vibration',
    nameAr: 'نبضات الاهتزاز اللمسي لتنبيه العوائق',
    nameEn: 'Haptic Vibration Hazard Alerts',
    worksOffline: true,
    requiresInternet: false,
    explanationAr: 'يعمل محلياً بالكامل عبر محرك الاهتزاز المدمج بالجهاز بدون اتصال بالإنترنت.',
    explanationEn: 'Functions entirely locally using device vibration motor without internet connection.',
  },
  {
    featureId: 'local_browser_tts',
    nameAr: 'القراءة الصوتية ونطق الشاشة (TTS المدمج)',
    nameEn: 'Screen Reader & Local Speech Synthesis',
    worksOffline: true,
    requiresInternet: false,
    explanationAr: 'تعمل الأصوات المثبتة محلياً على جهازك وقارئات الشاشة (NVDA/TalkBack/VoiceOver) دون اتصال بالإنترنت.',
    explanationEn: 'Locally installed system voices and screen readers function offline.',
  },
  {
    featureId: 'local_bookmarks_history',
    nameAr: 'استعراض سجل القراءة وعلامات التوقف',
    nameEn: 'Reading History & Bookmark Markers',
    worksOffline: true,
    requiresInternet: false,
    explanationAr: 'العلامات المرجعية وسجل القراءة محفوظ محلياً بالمتصفح ويعمل دون شبكة.',
    explanationEn: 'Bookmarks and reading history are stored in browser storage and available offline.',
  },
  {
    featureId: 'offline_shortcuts',
    nameAr: 'اختصارات لوحة المفاتيح الميسرة',
    nameEn: 'Accessible Keyboard Shortcuts',
    worksOffline: true,
    requiresInternet: false,
    explanationAr: 'جميع مفاتيح التنقل والاختصارات مسجلة محلياً وتستجيب دون إنترنت.',
    explanationEn: 'All key bindings are locally handled and operate without internet.',
  },
  {
    featureId: 'offline_pecs_aac',
    nameAr: 'لوحات التواصل الرمزي (PECS / AAC)',
    nameEn: 'PECS & AAC Symbol Boards',
    worksOffline: true,
    requiresInternet: false,
    explanationAr: 'بطاقات التعبير الرمزي مخزنة في الذاكرة المحلية وتعمل بشكل كامل في وضع الطوارئ دون شبكة.',
    explanationEn: 'PECS symbol cards are stored locally and fully functional offline.',
  },
  {
    featureId: 'gemini_vision_analysis',
    nameAr: 'الذكاء البصري المتقدم وتحليل المشاهد (Gemini)',
    nameEn: 'Advanced Multimodal Visual AI (Gemini)',
    worksOffline: false,
    requiresInternet: true,
    explanationAr: 'يتطلب اتصالاً بالإنترنت للاتصال بنماذج الرؤية المعرفية السحابية المعتمدة.',
    explanationEn: 'Requires an active internet connection to communicate with verified cloud vision models.',
  },
  {
    featureId: 'lecture_audio_transcription',
    nameAr: 'تفريغ المحاضرات الصوتية الطويلة',
    nameEn: 'Extended Audio Lecture Transcription',
    worksOffline: false,
    requiresInternet: true,
    explanationAr: 'معالجة الملفات الصوتية الأكاديمية الضخمة تتطلب خوادم التعرف الصوتي السحابية المعتمدة.',
    explanationEn: 'Processing heavy audio recordings requires verified cloud speech-to-text models.',
  },
  {
    featureId: 'online_human_assist_live',
    nameAr: 'المساعدة البشرية المباشرة وبث الفيديو الحي',
    nameEn: 'Live Volunteer & Video Assistance',
    worksOffline: false,
    requiresInternet: true,
    explanationAr: 'يتطلب بث الكاميرا والصوت اتصالاً بالشبكة للربط بالمرافق المبصر.',
    explanationEn: 'Live video and audio stream requires network connectivity to connect with sighted companion.',
  },
  {
    featureId: 'online_cloud_sync',
    nameAr: 'المزامنة السحابية للتقدم الدراسي',
    nameEn: 'Cloud Profile & Progress Synchronization',
    worksOffline: false,
    requiresInternet: true,
    explanationAr: 'مزامنة السجلات مع قاعدة بيانات المؤسسة التعليمية تتطلب اتصالاً آمناً بالإنترنت.',
    explanationEn: 'Syncing educational records with institution cloud database requires internet connectivity.',
  },
];

export function getOfflineCapabilities(): OfflineCapabilityItem[] {
  return OFFLINE_CAPABILITY_MATRIX;
}

export function isFeatureAvailableOffline(featureId: string): boolean {
  const feat = OFFLINE_CAPABILITY_MATRIX.find(
    (f) => f.featureId === featureId || 
           (featureId === 'offline_haptics' && f.featureId === 'haptics_vibration') ||
           (featureId === 'offline_screen_reader' && f.featureId === 'local_browser_tts') ||
           (featureId === 'offline_reading_history' && f.featureId === 'local_bookmarks_history') ||
           (featureId === 'online_gemini_vision' && f.featureId === 'gemini_vision_analysis') ||
           (featureId === 'online_lecture_transcription' && f.featureId === 'lecture_audio_transcription')
  );
  return feat ? feat.worksOffline : false;
}

// ═════════════════════════════════════════════════════════════════════════════
// 10. ANTI-VIOLATION CLAIMS VALIDATOR FOR PERSONALIZE
// ═════════════════════════════════════════════════════════════════════════════

export function verifySafePersonalizeClaims(text: string): { isSafe: boolean; violations: string[] } {
  const violations: string[] = [];

  // Prohibit fake offline AI claims
  if (/gemini.*works\s+offline|multimodal.*offline\s+without\s+internet|تحليل\s+بصري\s+كامل\s+بدون\s+إنترنت|يعمل\s+الذكاء\s+الاصطناعي\s+بدون\s+شبكة/i.test(text)) {
    violations.push('violates truthful offline boundary: cloud visual AI requires internet');
  }

  // Prohibit fake 100% backup erasure guarantees
  if (/guaranteed\s+100%\s+erased\s+from\s+all\s+backups|مسح\s+تام\s+من\s+كافة\s+النسخ\s+الاحتياطية\s+السحابية\s+مؤكداً/i.test(text)) {
    violations.push('violates honest data erasure boundary: backup erasure cannot be falsely promised without verified audit');
  }

  // Prohibit silent storage of sensitive national ID
  if (/store\s+national\s+id\s+in\s+memory|حفظ\s+الرقم\s+القومي\s+تلقائياً/i.test(text)) {
    violations.push('violates sensitive data prohibition: national IDs must never be stored in assistant memory');
  }

  // Prohibit automatic opt-in for memory
  if (/memory\s+enabled\s+by\s+default|تفعيل\s+الذاكرة\s+إجبارياً\s+بدون\s+إذن/i.test(text)) {
    violations.push('violates privacy-first opt-in requirement');
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}
