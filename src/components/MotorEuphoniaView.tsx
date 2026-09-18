import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  UserProfile, VocalSoundTriggerConfig, AACCardItem, HeadTrackingConfig, VocalTriggerAction,
} from '../types';
import { createZip, downloadBlob } from '../lib/zipWriter';
import {
  vocalSoundEngine, LiveAudioMetrics, loadVocalTriggers, DEFAULT_VOCAL_TRIGGERS,
} from '../lib/vocalSoundTrigger';
import { FacialHeadTracker, PointerPosition, FacialGestureState, DEFAULT_HEAD_TRACKING_CONFIG } from '../lib/facialHeadTracker';
import { speak, cancelSpeech, unlockSpeechSynthesis, hasArabicVoice } from '../lib/tts';
import { geminiService } from '../services/geminiService';
import { toast } from './Toast';
import { localize, isArabicLocale } from '../lib/translations';
import { doc, setDoc } from 'firebase/firestore';
import { db, cleanDataForFirestore } from '../lib/firebase';
import {
  EmergencyContact,
  loadContacts,
  saveContacts,
  restoreContactsFromCloud,
  syncContactsToCloud,
  makePhoneCall,
  isValidContactPhone,
  sendWhatsAppMessage,
  WHATSAPP_QUICK_MESSAGES,
} from '../lib/contacts';
import {
  loadStoredAccessibilityState,
  setManualPreference,
  persistAccessibilityState,
  deriveAdaptiveAccessibilityState,
} from '../accessibility';
import {
  EuphoniaPhraseDef,
  loadEuphoniaPhraseBank,
  getCategoryIcon,
} from '../lib/euphoniaPhraseBank';
import {
  euphoniaRecorder,
  LocalIndexedDbStorageAdapter,
  RestUploadStorageAdapter,
  EuphoniaStorageAdapter,
  EuphoniaAudioSample,
} from '../lib/euphoniaRecorder';
import { getContextualPhrases, ContextualPhrase } from '../lib/contextualAacEngine';
import { triggerHapticAlert } from '../lib/hapticNavEngine';

/** Shared default adapter — constructed once, not on every render. */
const DEFAULT_LOCAL_ADAPTER = new LocalIndexedDbStorageAdapter();

// ─── Single-switch auto scanning ──────────────────────────────────────────────
// For students who cannot drive the gaze pointer at all. The app walks the
// selectable targets itself and the student makes ONE action to choose; any
// existing trigger doubles as that switch (blink, smile, a vocal sound, the
// Space/Enter a physical switch emulates, or the big on-screen button).
//
// Row-column is the default: linear scanning over a 40-key Arabic keyboard is
// ~a minute per pass, while row-then-column gets to any key in two choices.
const SCAN_HL = 'cognify-scan-hl';
const SCAN_HL_ROW = 'cognify-scan-hl-row';
/** Stop after this many cycles with no selection, rather than moving forever. */
const SCAN_MAX_PASSES = 3;
/** Two switch sources firing at once (a blink that is also a smile) is one press. */
const SCAN_SWITCH_DEBOUNCE_MS = 350;

/**
 * Layer a saved/synced trigger set over the defaults, matched by id.
 *
 * Keeping the defaults as the base means a trigger added in a later build shows
 * up for students whose profile predates it, instead of them being stuck with
 * whatever set was current the day they first opened the app.
 */
function mergeTriggers(saved?: VocalSoundTriggerConfig[]): VocalSoundTriggerConfig[] | null {
  if (!saved || !saved.length) return null;
  return DEFAULT_VOCAL_TRIGGERS.map((d) => ({ ...d, ...(saved.find((x) => x.id === d.id) || {}) }));
}

/** What each vocal action does, for the picker. */
const VOCAL_ACTION_LABELS: { value: VocalTriggerAction; en: string; ar: string }[] = [
  { value: 'select',      en: 'Select what is highlighted', ar: 'اختيار العنصر المحدد' },
  { value: 'next',        en: 'Next screen',                ar: 'الشاشة التالية' },
  { value: 'previous',    en: 'Previous screen',            ar: 'الشاشة السابقة' },
  { value: 'back',        en: 'Close the open window',      ar: 'إغلاق النافذة المفتوحة' },
  { value: 'speak-aloud', en: 'Speak the typed text',       ar: 'نطق النص المكتوب' },
  { value: 'clear',       en: 'Clear the text',             ar: 'مسح النص' },
  { value: 'ask-ai',      en: 'Ask the AI',                 ar: 'اسأل المساعد الذكي' },
  { value: 'emergency',   en: 'Emergency call',             ar: 'اتصال طوارئ' },
];

const TAB_ORDER = [
  'keyboard', 'euphonia-studio', 'smart-room',
  'pain-sensory', 'class-ai', 'custom-bank', 'eye-games',
] as const;
import {
  transcribe,
  getEuphoniaApiUrl,
  setEuphoniaApiUrl,
  checkEuphoniaApiHealth,
} from '../lib/euphoniaApi';
import {
  Activity,
  Mic,
  MicOff,
  Volume2,
  Camera,
  CameraOff,
  RefreshCw,
  Sparkles,
  Sliders,
  Send,
  Bell,
  BookOpen,
  Heart,
  Smile,
  Eye,
  SlidersHorizontal,
  Phone,
  PhoneCall,
  MessageCircle,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Download,
  ScanLine,
  AlertCircle,
  Clock,
  Play,
  X,
  Keyboard as KeyboardIcon,
  Delete,
  Space,
  Languages,
  ArrowRight,
  Lightbulb,
  Tv,
  Wind,
  Bed,
  BellRing,
  Thermometer,
  Zap,
  Check,
  Target,
  Palette,
  VolumeX,
  GraduationCap,
  MessageSquare,
  BookmarkPlus,
  Gamepad2,
  Maximize2,
  Minimize2,
  Trophy,
  Gauge,
  Radio,
  Award,
  Layers,
  EyeOff,
  Columns2,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GazeBlinkKeyboard from './GazeBlinkKeyboard';

interface MotorEuphoniaViewProps {
  profile: UserProfile;
  onSendMessage?: (text: string) => void;
}

// Color Theme Profiles
type ColorTheme = 'amber' | 'cyan' | 'emerald' | 'monochrome';

// Arabic Keyboard Layout Rows (High Contrast & Clear Grid)
const AR_KEYBOARD_ROWS = [
  ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'],
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
  ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', 'ذ'],
  ['؟', '!', '،', '.']
];

// English Keyboard Layout Rows
const EN_KEYBOARD_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ['?', '!', ',', '.']
];

// Arabic Predictive Autocomplete dictionary
const AR_PREDICTIONS: Record<string, string[]> = {
  'ا': ['أنا بخير شكراً', 'أحتاج مساعدة عاجلة', 'أريد شرب ماء', 'أستاذ ممكن سؤال؟', 'السلام عليكم'],
  'أ': ['أنا بخير شكراً', 'أحتاج مساعدة عاجلة', 'أريد شرب ماء', 'أستاذ ممكن سؤال؟', 'أين المرافق؟'],
  'اح': ['أحتاج مساعدة', 'أحتاج ماء', 'أحتاج الذهاب للطبيب'],
  'شك': ['شكراً جزيلاً', 'شكراً لك', 'شكراً على المساعدة'],
  'لو': ['لو سمحت ساعدني', 'لو تفضلت بالماء', 'لو سمحت اضبط السرير'],
  'مس': ['مساعدة من فضلك', 'مساء الخير', 'مستعد للدرس'],
  'عا': ['عايز مساعدة', 'عندي سؤال دراسي', 'عاجل جداً'],
  'من': ['من فضلك', 'ممكن توضيح المفهوم', 'ممكن إعادة النقطة'],
  'ما': ['ماما تعالي', 'ماء للشرب', 'ماشي شكراً'],
  'مر': ['مرافق تعال', 'مرحباً بكم'],
  'دك': ['دكتور احتاجك', 'دقيقة واحدة'],
  'ار': ['أريد تعديل الجلسة', 'أريد النوم', 'أريد الراحة'],
};

const EN_PREDICTIONS: Record<string, string[]> = {
  'i': ['I need help', 'I am fine, thanks', 'I want water', 'I have a question'],
  'h': ['Help please', 'Hello everyone', 'How are you?', 'Home comfort'],
  't': ['Thank you very much', 'Thanks for help', 'Today was good', 'Time for rest'],
  'p': ['Please help me', 'Please call caregiver', 'Problem here'],
  'w': ['Water please', 'WhatsApp message', 'Where are you?', 'What is next?'],
  'c': ['Call doctor now', 'Caregiver assistance', 'Can you explain?'],
};

// Steve Saling Smart Room Automation items
const SMART_ROOM_ITEMS = [
  { id: 'room-light', icon: '💡', labelAr: 'إضاءة الغرفة', labelEn: 'Room Lights', phraseAr: 'لو سمحت قم بتبديل إضاءة الغرفة.', phraseEn: 'Please toggle the room lights.' },
  { id: 'room-tv', icon: '📺', labelAr: 'التلفاز / الشاشة', labelEn: 'TV / Display', phraseAr: 'لو سمحت شغل التلفاز أو شاشة العرض.', phraseEn: 'Please turn on the TV.' },
  { id: 'room-ac', icon: '❄️', labelAr: 'المكيف / التبريد', labelEn: 'AC / Fan', phraseAr: 'لو سمحت شغل المكيف واضبط الحرارة.', phraseEn: 'Please adjust the air conditioning.' },
  { id: 'room-bed-up', icon: '🛏️', labelAr: 'رفع السرير', labelEn: 'Raise Bed', phraseAr: 'لو سمحت ارفع مسند الظهر بالسرير.', phraseEn: 'Please raise the back of my bed.' },
  { id: 'room-bed-down', icon: '🛌', labelAr: 'تمديد السرير', labelEn: 'Flat Bed', phraseAr: 'لو سمحت اجعل السرير في وضع النوم المستوي.', phraseEn: 'Please adjust bed flat for resting.' },
  { id: 'room-alarm', icon: '🔔', labelAr: 'نداء الممرض / إنذار', labelEn: 'Nurse Call Alarm', phraseAr: 'نداء عاجل! أحتاج المرافق أو الممرض فوراً!', phraseEn: 'Urgent assistance needed! Nurse call!', isAlarm: true },
];

// Pain & Sensory Feedback Board
const SENSORY_PAIN_ITEMS = [
  { id: 'pain-head', icon: '🤕', labelAr: 'صداع / ألم بالرأس', phraseAr: 'أشعر بصداع وألم في رأسي، أحتاج مسكن.' },
  { id: 'pain-stomach', icon: '🤢', labelAr: 'ألم بالمعدة / غثيان', phraseAr: 'أشعر بألم في معدتي وغثيان.' },
  { id: 'pain-back', icon: '🩹', labelAr: 'ألم بالظهر / ضغط', phraseAr: 'أشعر بألم وضغط في ظهري، يرجى تعديل وضعيتي.' },
  { id: 'sensory-cold', icon: '🥶', labelAr: 'أشعر بالبرد الشديد', phraseAr: 'أشعر بالبرد الشديد، لو سمحت غطني ببطانية.' },
  { id: 'sensory-hot', icon: '🥵', labelAr: 'أشعر بالحر الشديد', phraseAr: 'أشعر بالحر الشديد، يرجى تشغيل المروحة.' },
  { id: 'sensory-tired', icon: '🥱', labelAr: 'مرهق / أريد النوم', phraseAr: 'أشعر بالإرهاق وأريد النوم والراحة الآن.' },
];

// Default Personal Phrase Bank
const DEFAULT_CUSTOM_PHRASES = [
  { id: 'cp-1', textAr: 'صباح الخير للجميع، يوم سعيد.', icon: '☀️' },
  { id: 'cp-2', textAr: 'أريد مراجعة ملخص درس اليوم.', icon: '📚' },
  { id: 'cp-3', textAr: 'هل يمكن فتح النافذة قليلاً لتجديد الهواء؟', icon: '🪟' },
  { id: 'cp-4', textAr: 'أحبكم جميعاً وشكراً لدعمكم المستمر.', icon: '❤️' },
  { id: 'cp-5', textAr: 'أحتاج شاحن الهاتف والكمبيوتر لو سمحت.', icon: '🔌' },
];

// Steve Saling / Euphonia Quick Need Action Cards
const QUICK_NEEDS = [
  { id: 'need-help', icon: '🚨', labelAr: 'طوارئ / مساعدة', labelEn: 'Emergency / Help', phraseAr: 'أحتاج إلى مساعدة عاجلة من المرافق لو سمحت.', phraseEn: 'I need urgent assistance please.' },
  { id: 'need-water', icon: '💧', labelAr: 'أحتاج ماء', labelEn: 'Need Water', phraseAr: 'أحتاج إلى شرب ماء من فضلك.', phraseEn: 'I would like a drink of water please.' },
  { id: 'need-adjust', icon: '🪑', labelAr: 'تعديل الجلسة', labelEn: 'Adjust Position', phraseAr: 'لو سمحت ساعدني في تعديل وضعية جلوسي.', phraseEn: 'Please help me adjust my position.' },
  { id: 'comm-yes', icon: '✅', labelAr: 'نعم تماماً', labelEn: 'Yes, Exactly', phraseAr: 'نعم، هذا صحيح تماماً.', phraseEn: 'Yes, exactly.' },
  { id: 'comm-no', icon: '❌', labelAr: 'لا، ليس هذا', labelEn: 'No, Not This', phraseAr: 'لا، ليس هذا ما أقصده.', phraseEn: 'No, not this.' },
  { id: 'ai-explain', icon: '💡', labelAr: 'اشرح الدرس', labelEn: 'Explain Simply', phraseAr: 'هل يمكنك شرح المفهوم الأساسي بتشبيه بسيط؟', phraseEn: 'Can you explain simply?', isAi: true },
];

// Project Euphonia Training Phrase Set (Google Project Euphonia Architecture)
interface EuphoniaPhraseItem {
  id: string;
  phraseAr: string;
  phraseEn: string;
  category: string;
  icon: string;
  samplesRecorded: number;
}

const DEFAULT_EUPHONIA_PHRASES: EuphoniaPhraseItem[] = [
  { id: 'eup-1', phraseAr: 'أريد شرب ماء من فضلك', phraseEn: 'I want water please', category: 'basic', icon: '💧', samplesRecorded: 3 },
  { id: 'eup-2', phraseAr: 'أحتاج مساعدة عاجلة من المرافق', phraseEn: 'I need urgent assistance', category: 'emergency', icon: '🚨', samplesRecorded: 3 },
  { id: 'eup-3', phraseAr: 'نعم، هذا صحيح تماماً', phraseEn: 'Yes, exactly', category: 'response', icon: '✅', samplesRecorded: 3 },
  { id: 'eup-4', phraseAr: 'لا، ليس هذا ما أريده', phraseEn: 'No, not this', category: 'response', icon: '❌', samplesRecorded: 3 },
  { id: 'eup-5', phraseAr: 'أشعر بألم وأريد تعديل وضعيتي', phraseEn: 'I am in pain, adjust position', category: 'medical', icon: '🩹', samplesRecorded: 2 },
  { id: 'eup-6', phraseAr: 'ماما تعالي أحتاجك', phraseEn: 'Mom please come', category: 'family', icon: '👩‍👧', samplesRecorded: 1 },
];

// Game 1 Target Bubbles list
const GAME_BUBBLES = [
  { id: 'b-1', char: 'أ', x: 20, y: 30, color: 'bg-amber-400 text-slate-950' },
  { id: 'b-2', char: 'ب', x: 70, y: 25, color: 'bg-emerald-400 text-slate-950' },
  { id: 'b-3', char: 'ج', x: 35, y: 70, color: 'bg-indigo-400 text-white' },
  { id: 'b-4', char: 'د', x: 80, y: 65, color: 'bg-rose-400 text-white' },
  { id: 'b-5', char: 'هـ', x: 50, y: 45, color: 'bg-cyan-400 text-slate-950' },
];

export default function MotorEuphoniaView({ profile, onSendMessage }: MotorEuphoniaViewProps) {
  const getInitialMotorLang = (): 'ar' | 'en' | 'fr' => {
    if (profile.language === 'French') return 'fr';
    if (isArabicLocale(profile.language)) return 'ar';
    return 'en';
  };
  const [motorLang, setMotorLang] = useState<'ar' | 'en' | 'fr'>(getInitialMotorLang);

  useEffect(() => {
    setMotorLang(getInitialMotorLang());
  }, [profile.language]);

  const isArabic = motorLang === 'ar';
  const isFrench = motorLang === 'fr';

  const tMotor = (en: string, ar: string, fr?: string) => {
    if (motorLang === 'ar') return ar;
    if (motorLang === 'fr') return fr || localize('French', en, ar);
    return en;
  };

  // Active Category Tab (Includes Eye Keyboard, Studio, Smart Room, Sensory, AI Class, Custom Bank & Eye Games)
  const [activeTab, setActiveTab] = useState<
    'keyboard' | 'euphonia-studio' | 'smart-room' | 'pain-sensory' | 'class-ai' | 'custom-bank' | 'eye-games'
  >('keyboard');

  // Flexible UI Layout Mode: 'docked' (Sidebar on Left) | 'floating' (Full Width Keyboard with Floating Mini PIP) | 'hidden' (100% Full Width Focused)
  // Default changed from 'floating' to 'docked': floating mode is a `position:
  // fixed` panel with no reserved space in the page layout, so it used to sit
  // ON TOP of the main content by default — for a dwell/gaze-clicking user,
  // any target that happened to be under it was literally unreachable, and
  // sighted users saw text clipped behind it (e.g. tab labels cut off).
  // 'floating' is still available as an opt-in via the toggle below for users
  // who want the extra width and don't mind a floating camera.
  const [sidebarMode, setSidebarMode] = useState<'docked' | 'floating' | 'hidden'>('docked');
  const [cameraCorner, setCameraCorner] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'minimized'>('top-right');
  const [showQuickNeedsRow, setShowQuickNeedsRow] = useState(true);

  // Theme state
  const [theme, setTheme] = useState<ColorTheme>('amber');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Previously isFullscreen was only ever set optimistically inside
  // toggleFullScreenMode() — never corrected against reality. Exiting via
  // the OS/Escape key (not this screen's own button) left it stuck true
  // forever: wrong icon, and any layout that branches on isFullscreen
  // staying wrong until the user happened to press the button twice.
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Tracking states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAudioEngineActive, setIsAudioEngineActive] = useState(false);
  const [cursorPos, setCursorPos] = useState<PointerPosition>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
    normalizedX: 0.5,
    normalizedY: 0.5,
  });
  const [dwellProgress, setDwellProgress] = useState(0);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  // LIVE REFS for the tracker callbacks.
  //
  // FacialHeadTracker.start() receives its callbacks ONCE and keeps them for the
  // whole session, so anything they close over is frozen at that render. That is
  // why dwelling on Speak / Ask AI / WhatsApp did nothing and blink-to-click
  // never fired: handleCardTrigger was a stale copy and hoveredCardId was stuck
  // at its initial null. Mouse clicks went through a different path, which is
  // why desktop testing never caught it. These refs are re-pointed on every
  // render, and the callbacks read `.current` instead of the captured value.
  const cameraBusyRef = useRef(false); // in-flight guard for startCamera()
  const mountedRef = useRef(true);     // guards async callbacks after unmount
  const pendingTimersRef = useRef<any[]>([]); // every timer, cleared on unmount
  const calibAbortRef = useRef(0);            // generation id for the calibration chain
  const sharedAudioCtxRef = useRef<AudioContext | null>(null); // one context for all cues
  const [showCenterDot, setShowCenterDot] = useState(false); // "look at centre" recenter
  /** setTimeout that is cancelled automatically when the view unmounts. */
  const trackedTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      pendingTimersRef.current = pendingTimersRef.current.filter((t) => t !== id);
      if (mountedRef.current) fn();
    }, ms);
    pendingTimersRef.current.push(id);
    return id;
  };
  const hoveredCardIdRef = useRef<string | null>(null);

  // Tremor/dwell telemetry for the Accessibility 2.0 adaptive engine.
  // Plain refs only — this lives inside the per-frame hover hot path, so it
  // must never allocate or trigger a re-render on every frame.
  const hoverFlickerRef = useRef<{ id: string | null; enterCount: number; windowStart: number }>({
    id: null,
    enterCount: 0,
    windowStart: 0,
  });
  const a11yObservationsRef = useRef<{ timestamp: number; dwellTimeMs: number; tremorRetriesCount: number }[]>([]);
  const handleCardTriggerRef = useRef<(id: string) => void>(() => {});
  const checkHoverTargetRef = useRef<(pos: PointerPosition) => void>(() => {});
  const handleVocalTriggerRef = useRef<(t: VocalSoundTriggerConfig) => void>(() => {});

  // Auto-scan runtime state. `scanActive` is whether the scan is currently
  // moving; headConfig.autoScanEnabled is the persisted setting.
  const [scanActive, setScanActive] = useState(false);
  const [scanTickCount, setScanTickCount] = useState(0);         // re-render so the UI follows
  const scanActiveRef = useRef(false);
  const scanRowsRef = useRef<string[][]>([]);
  const scanPhaseRef = useRef<'row' | 'item'>('row');
  const scanRowIdxRef = useRef(0);
  const scanItemIdxRef = useRef(0);
  const scanPassesRef = useRef(0);
  const scanTimerRef = useRef<number | null>(null);
  const scanSwitchRef = useRef<() => void>(() => {});
  const scanLastSwitchRef = useRef(0);
  const headConfigRef = useRef<HeadTrackingConfig>(DEFAULT_HEAD_TRACKING_CONFIG);
  const scanBlockedRef = useRef(false);
  const scanApiRef = useRef<{ start: () => void; stop: (e?: boolean) => void; resync: () => void }>({
    start: () => {}, stop: () => {}, resync: () => {},
  });
  /** What the scan is currently highlighting, so it can be re-applied after any
   *  React render that would otherwise wipe the class off. */
  const scanPaintedRef = useRef<{ ids: string[]; cls: string }>({ ids: [], cls: SCAN_HL });
  const [gestureState, setGestureState] = useState<FacialGestureState>({
    isSmiling: false,
    isMouthOpen: false,
    isEyebrowRaised: false,
    isBlinking: false,
    confidence: 0,
  });

  // 9-Point Medical Eye Calibration state
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [calibrationPointIndex, setCalibrationPointIndex] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibAccuracy, setCalibAccuracy] = useState<number | null>(null);
  // Whether the LAST calibration attempt actually produced a usable mapping.
  // The end-of-calibration panel used to show a green tick and "99.4%" no matter
  // what — including directly above a red "calibration failed" toast and a
  // "Calibration accuracy: 0%" readout.
  const [calibSucceeded, setCalibSucceeded] = useState<boolean | null>(null);

  // Google Project Euphonia 100-Phrase Bank & Model Training State
  const [euphoniaPhraseBank, setEuphoniaPhraseBank] = useState<EuphoniaPhraseDef[]>([]);
  const [euphoniaTrainingState, setEuphoniaTrainingState] = useState<Record<string, number>>({});
  const [euphoniaCategoryFilter, setEuphoniaCategoryFilter] = useState<string>('all');
  const [recordingPhraseId, setRecordingPhraseId] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isEuphoniaLiveListening, setIsEuphoniaLiveListening] = useState(false);
  const [euphoniaMatchedPhrase, setEuphoniaMatchedPhrase] = useState<string | null>(null);
  const [euphoniaMatchSource, setEuphoniaMatchSource] = useState<'custom-model' | 'browser-fallback' | null>(null);
  const [euphoniaApiUrlInput, setEuphoniaApiUrlInput] = useState(() => getEuphoniaApiUrl());
  // The SAVED url, separate from the draft text above. The storage-adapter
  // effect used to key on the draft while reading the persisted value, so
  // pressing "Save & Test" never re-ran it: the toast said "Connected to your
  // custom model" while every sample kept going to local IndexedDB, silently,
  // until someone went looking for the training data.
  const [euphoniaApiUrl, setEuphoniaApiUrlState] = useState(() => getEuphoniaApiUrl());
  const [euphoniaApiHealthy, setEuphoniaApiHealthy] = useState<boolean | null>(null);
  const [isExportingSamples, setIsExportingSamples] = useState(false);

  // Storage adapter: REST if an API URL is configured, otherwise local
  // IndexedDB so recording still works fully offline / pre-backend.
  // Module-level default so the ref stays non-null (this project has
  // strictNullChecks off, so a nullable ref would not be type-checked at its
  // call sites) while avoiding the per-render construction the previous
  // `useRef(new LocalIndexedDbStorageAdapter())` did on every single render.
  const storageAdapterRef = useRef<EuphoniaStorageAdapter>(DEFAULT_LOCAL_ADAPTER);

  useEffect(() => {
    storageAdapterRef.current = euphoniaApiUrl
      ? new RestUploadStorageAdapter(euphoniaApiUrl)
      : new LocalIndexedDbStorageAdapter();
  }, [euphoniaApiUrl]);

  // Load the 100-phrase bank once on mount.
  useEffect(() => {
    loadEuphoniaPhraseBank().then(async (bank) => {
      setEuphoniaPhraseBank(bank);
      const counts: Record<string, number> = {};
      for (const p of bank) {
        try {
          counts[p.id] = await storageAdapterRef.current.countForPhrase(p.id);
        } catch {
          counts[p.id] = 0;
        }
      }
      setEuphoniaTrainingState(counts);
    });
  }, []);

  // One-time check: warn early if this device has no Arabic voice installed
  useEffect(() => {
    const t = setTimeout(() => {
      if (isArabic && !hasArabicVoice()) {
        toast.error(
          isArabic
            ? '⚠️ لا يوجد صوت عربي مثبت على هذا الجهاز — النطق الصوتي لن يعمل. ثبّت حزمة لغة عربية من إعدادات النظام.'
            : '⚠️ No Arabic voice found on this device — speech output will not work.'
        );
      }
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Eye Game State
  const [gameScore, setGameScore] = useState(0);
  const [gamePoppedIds, setGamePoppedIds] = useState<string[]>([]);
  const [reactionBenchmarkMs, setReactionBenchmarkMs] = useState<number | null>(null);
  const reactionStartTimeRef = useRef<number>(Date.now());
  const reactionSamplesRef = useRef<number[]>([]); // per-bubble times, averaged

  // Audio metrics
  const [audioMetrics, setAudioMetrics] = useState<LiveAudioMetrics>({
    volume: 0,
    peakFrequency: 0,
    isTriggering: false,
  });
  // Was read-only: nothing ever called setTriggers, so every student got the
  // same fixed pitches. Now editable, calibrated from the student's own voice,
  // and synced to their profile.
  const [triggers, setTriggers] = useState<VocalSoundTriggerConfig[]>(
    () => mergeTriggers(profile?.vocalTriggers) || loadVocalTriggers(),
  );
  const [capturingTriggerId, setCapturingTriggerId] = useState<string | null>(null);
  const audioMetricsRef = useRef<LiveAudioMetrics | null>(null);
  const vocalSyncTimerRef = useRef<number | null>(null);
  const vocalSyncPendingRef = useRef<VocalSoundTriggerConfig[] | null>(null);
  const flushVocalRef = useRef<() => void>(() => {});
  /** Current triggers, so the calibration routine — which awaits ~2.6s of audio
   *  before writing — cannot save a list captured before that wait. */
  const triggersRef = useRef<VocalSoundTriggerConfig[]>([]);

  // Unified Accessibility 2.0 state — a ref, not React state: this only
  // records manual locks and persists to localStorage, it must never trigger
  // a re-render of this performance-sensitive, camera-driven component.
  const a11yStateRef = useRef(loadStoredAccessibilityState(profile.uid || 'anonymous'));

  // Settings
  const [headConfig, setHeadConfig] = useState<HeadTrackingConfig>(() => {
    // Order matters: the synced profile wins, then the local cache, then the
    // defaults. Everything is spread over DEFAULT_HEAD_TRACKING_CONFIG so a
    // config saved by an older build still picks up keys added since (a stored
    // object missing autoScanMode would otherwise leave it undefined forever).
    try {
      if (profile?.headTrackingConfig) {
        return { ...DEFAULT_HEAD_TRACKING_CONFIG, ...profile.headTrackingConfig };
      }
      const saved = localStorage.getItem('cognify_head_config');
      return saved
        ? { ...DEFAULT_HEAD_TRACKING_CONFIG, ...JSON.parse(saved) }
        : DEFAULT_HEAD_TRACKING_CONFIG;
    } catch {
      return DEFAULT_HEAD_TRACKING_CONFIG;
    }
  });
  /** Pending cloud write, so a slider drag is not one Firestore write per pixel. */
  const headSyncTimerRef = useRef<number | null>(null);
  const headSyncPendingRef = useRef<HeadTrackingConfig | null>(null);
  const flushHeadConfigRef = useRef<() => void>(() => {});

  // Custom Phrase Bank
  const [customPhrases, setCustomPhrases] = useState(() => {
    try {
      const saved = localStorage.getItem('cognify_custom_phrases');
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOM_PHRASES;
    } catch {
      return DEFAULT_CUSTOM_PHRASES;
    }
  });
  const [newPhraseInput, setNewPhraseInput] = useState('');

  // Eye-Gaze Arabic Virtual Keyboard State
  const [typedText, setTypedText] = useState('');
  const [kbLang, setKbLang] = useState<'ar' | 'en'>('ar');
  const [suggestedWords, setSuggestedWords] = useState<string[]>([
    'أنا بخير شكراً', 'أحتاج مساعدة عاجلة', 'أريد شرب ماء', 'شكراً جزيلاً', 'ماما تعالي', 'دكتور احتاجك'
  ]);

  // Smart Room status simulations
  const [roomLightOn, setRoomLightOn] = useState(false);
  const [roomTvOn, setRoomTvOn] = useState(false);
  const [roomAcOn, setRoomAcOn] = useState(false);

  // AI Class / Teacher Live Listener State
  const [isListeningToTeacher, setIsListeningToTeacher] = useState(false);
  const [teacherHeardSpeech, setTeacherHeardSpeech] = useState('');
  const [aiGeneratedClassOptions, setAiGeneratedClassOptions] = useState<string[]>([
    'نعم، فهمت هذا الجزء تماماً.',
    'ممكن إعادة شرح النقطة الأخيرة بمثال؟',
    'أنا جاهز للإجابة عن السؤال.',
    'عندي استفسار عن التطبيق العملي.'
  ]);

  // Mobile Contacts & WhatsApp Modals
  const [contacts, setContacts] = useState<EmergencyContact[]>(loadContacts);
  useEffect(() => {
    if (!profile.uid) return;
    restoreContactsFromCloud(profile.uid).then(setContacts);
  }, [profile.uid]);
  const [showContactPickerModal, setShowContactPickerModal] = useState(false);
  // Editable phone-number setup — a real number was previously impossible to
  // enter anywhere in the app (see contacts.ts). A caregiver/parent typically
  // does this one-time setup, so it's a plain form, not gaze/blink-driven.
  const [showManageContactsModal, setShowManageContactsModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedContactForWa, setSelectedContactForWa] = useState<EmergencyContact | null>(null);
  const [customWaMessage, setCustomWaMessage] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Contextual AAC predictive suggestions
  const [contextualPhrases] = useState<ContextualPhrase[]>(() => getContextualPhrases(new Date()));

  // Emergency SOS state & continuous eye closure detection
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyCountdown, setEmergencyCountdown] = useState<number | null>(null);
  const [emergencyGeoCoords, setEmergencyGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const eyesClosedStartRef = useRef<number | null>(null);

  // Debounce lock for phone calls
  const isDialingRef = useRef(false);

  // Dysarthric Speech AI decoding
  const [isRecordingSpeech, setIsRecordingSpeech] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');
  const [isProcessingAi, setIsProcessingAi] = useState(false);

  // Mouse Dwell simulation for testing without camera
  const mouseDwellStartRef = useRef<number>(0);
  const mouseHoverTargetRef = useRef<string | null>(null);

  // Scientific Eye-Tracking Architecture Modal State
  const [showScientificArchitectureModal, setShowScientificArchitectureModal] = useState(false);
  // Live ref mirror so the 30-120Hz tracker callback can check "is the debug
  // modal open" without closing over stale state or forcing itself into the
  // dependency array of the camera-start effect.
  const showScientificArchitectureModalRef = useRef(false);
  useEffect(() => {
    showScientificArchitectureModalRef.current = showScientificArchitectureModal;
  }, [showScientificArchitectureModal]);
  // Caps how often gaze/gesture updates trigger a React re-render of this
  // (large) tree. The tracker drives this at display refresh rate — up to
  // 120Hz on some laptops — but the dwell timer is 1200ms and the cursor only
  // needs to look smooth, not be reconciled every physical frame. 30Hz is
  // imperceptible for both and roughly halves-to-quarters render volume on
  // 60-120Hz screens, which matters most on exactly the low-end devices this
  // feature targets.
  const lastPointerRenderRef = useRef(0);
  const POINTER_RENDER_INTERVAL_MS = 33;
  const [eyeLiveMetrics, setEyeLiveMetrics] = useState<any>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<FacialHeadTracker | null>(null);
  const voiceContactRecRef = useRef<any>(null);
  const [isListeningForContactName, setIsListeningForContactName] = useState(false);
  const teacherRecRef = useRef<any>(null);

  // Keep the magnetic-snap cache in sync with the visible tab
  useEffect(() => {
    const t = setTimeout(() => trackerRef.current?.refreshSnapTargetsCache(), 60);
    return () => clearTimeout(t);
  }, [activeTab]);

  /**
   * Central speech helper: every place in this view that should say something
   * out loud goes through here instead of calling speak() directly. This is
   * what surfaces a toast when a phrase silently fails to speak (no Arabic
   * voice installed, speechSynthesis blocked outside a user gesture, etc.)
   * instead of the card just doing nothing.
   */
  const speakSafe = (text: string, overrideLang?: string) => {
    if (!text?.trim()) return;
    const voiceLang = overrideLang || (motorLang === 'ar' ? (profile.language || 'Egyptian Ammiya') : 'English');
    speak(text, voiceLang, {
      onError: (reason) => {
        const msg =
          reason === 'unsupported'
            ? (isArabic ? '⚠️ المتصفح لا يدعم النطق الصوتي' : '⚠️ This browser does not support speech output')
            : reason === 'silent-fail'
            ? (isArabic
                ? '⚠️ تعذر نطق الجملة. تأكد من وجود صوت عربي مثبت على الجهاز وأن الصوت غير مكتوم'
                : '⚠️ Could not speak. Check that an English or Arabic voice is installed and the device is not muted')
            : (isArabic ? '⚠️ حدث خطأ أثناء النطق الصوتي' : '⚠️ Speech output error');
        toast.error(msg);
      },
    });
  };

  const triggerEmergencySOS = useCallback((source: 'eye_closure' | 'button' | 'vocal') => {
    triggerHapticAlert('danger');
    setShowEmergencyModal(true);
    setEmergencyCountdown(5);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setEmergencyGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('Geolocation error:', err);
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    }

    const msg = isArabic
      ? 'نداء استغاثة عاجل! تم إطلاق حالة الطوارئ!'
      : motorLang === 'fr'
      ? "Alerte d'urgence ! SOS déclenché !"
      : 'Emergency SOS alert triggered!';
    speakSafe(msg);
  }, [isArabic, motorLang, speakSafe]);

  useEffect(() => {
    if (emergencyCountdown === null) return;
    if (emergencyCountdown <= 0) {
      const currentContacts = loadContacts();
      const lat = emergencyGeoCoords?.lat;
      const lng = emergencyGeoCoords?.lng;
      const mapUrl = lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : '';
      const sosText = isArabic
        ? `🚨 نداء استغاثة عاجل (Emergency SOS) من مستخدم Cognify: أحتاج إلى مساعدة طبية فورية! ${mapUrl ? `موقعي الحالي على الخريطة: ${mapUrl}` : ''}`
        : `🚨 Emergency SOS from Cognify user: I need immediate medical assistance! ${mapUrl ? `Location: ${mapUrl}` : ''}`;

      if (currentContacts.length > 0) {
        const primary = currentContacts.find((c) => c.isPrimaryEmergency) || currentContacts[0];
        if (primary.phone) {
          sendWhatsAppMessage(primary.phone, sosText);
        }
      }
      toast.error(isArabic ? 'تم إرسال نداء الاستغاثة للمرافقين والطوارئ!' : 'Emergency SOS dispatched to caregivers!');
      return;
    }
    const timer = setTimeout(() => {
      setEmergencyCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [emergencyCountdown, emergencyGeoCoords, isArabic]);

  /**
   * ONE shared AudioContext for every cue.
   *
   * Each helper used to do `new AudioContext()` per sound and never close it.
   * Browsers cap the number of live contexts, so after a session of clicks,
   * alarms and calibrations creation started failing silently: no click
   * confirmation on selection, and the nurse-call alarm played nothing — the
   * student got no confirmation their emergency call had registered.
   */
  const getAudioCtx = (): AudioContext | null => {
    try {
      // After unmount the shared context has already been closed. Creating a
      // fresh one here (a recording still finishing, a queued cue) leaked a
      // context that nothing would ever close, and enough of those hit the
      // browser's live-context cap — after which no audio cue plays at all,
      // including the nurse-call alarm.
      if (!mountedRef.current) return null;
      if (!sharedAudioCtxRef.current) {
        const C = window.AudioContext || (window as any).webkitAudioContext;
        if (!C) return null;
        sharedAudioCtxRef.current = new C();
      }
      const ctx = sharedAudioCtxRef.current;
      // Autoplay policy can leave it suspended until a gesture.
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    } catch {
      return null;
    }
  };

  // Audio click sound for eye-blink confirmation
  const playBlinkClickSound = () => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      /* ignore */
    }
  };

  // Pop Bubble Sound Effect
  const playPopSound = () => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      /* ignore */
    }
  };

  // High-priority Nurse Alarm Sound
  const playNurseAlarmSound = () => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now + i * 0.25);
        osc.frequency.setValueAtTime(900, now + i * 0.25 + 0.12);
        gain.gain.setValueAtTime(0.4, now + i * 0.25);
        gain.gain.linearRampToValueAtTime(0.01, now + i * 0.25 + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.25);
        osc.stop(now + i * 0.25 + 0.25);
      }
    } catch {
      /* ignore */
    }
  };

  // Toggle Browser Fullscreen
  const toggleFullScreenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Auto-start camera when view mounts.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isCameraActive && videoRef.current) {
        toggleCamera();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Unlock speech synthesis on the first REAL user gesture.
  //
  // toggleCamera() calls unlockSpeechSynthesis(), but the auto-start above fires
  // it from a timer rather than a gesture, so the browser's autoplay policy
  // refuses the unlock and the FIRST phrase the student speaks is silently
  // dropped — the card highlights and the toast claims it was spoken, but
  // nothing comes out. Any genuine interaction repairs it.
  useEffect(() => {
    let done = false;
    const unlock = () => {
      if (done) return;
      done = true;
      try { unlockSpeechSynthesis(); } catch { /* ignore */ }
      remove();
    };
    const events: (keyof DocumentEventMap)[] = ['pointerdown', 'keydown', 'touchstart'];
    const remove = () => events.forEach((e) => document.removeEventListener(e, unlock));
    events.forEach((e) => document.addEventListener(e, unlock, { once: true, passive: true }));
    return remove;
  }, []);

  // Mouse movement fallback listener
  useEffect(() => {
    if (isCameraActive) return;

    let dwellInterval: any = null;

    const handleMouseMove = (e: MouseEvent) => {
      const pos = {
        x: e.clientX,
        y: e.clientY,
        normalizedX: e.clientX / window.innerWidth,
        normalizedY: e.clientY / window.innerHeight,
      };
      setCursorPos(pos);
      checkHoverTarget(pos);
    };

    dwellInterval = setInterval(() => {
      if (mouseHoverTargetRef.current && mouseDwellStartRef.current > 0) {
        const elapsed = Date.now() - mouseDwellStartRef.current;
        const prog = Math.min(1, elapsed / headConfig.dwellTimeMs);
        setDwellProgress(prog);

        if (prog >= 1) {
          const target = mouseHoverTargetRef.current;
          mouseHoverTargetRef.current = null;
          mouseDwellStartRef.current = 0;
          setDwellProgress(0);
          handleCardTrigger(target);
        }
      } else {
        setDwellProgress(0);
      }
    }, 50);

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (dwellInterval) clearInterval(dwellInterval);
    };
  }, [isCameraActive, headConfig.dwellTimeMs]);

  // Update word autocomplete suggestions when typedText changes
  useEffect(() => {
    const lastWord = typedText.trim().split(/\s+/).pop()?.toLowerCase() || '';
    if (!lastWord) {
      setSuggestedWords(
        kbLang === 'ar'
          ? ['أنا بخير شكراً', 'أحتاج مساعدة عاجلة', 'أريد شرب ماء', 'شكراً جزيلاً', 'ماما تعالي', 'دكتور احتاجك']
          : ['I need help', 'Thank you', 'Please help', 'Water please', 'Call caregiver']
      );
      return;
    }

    const dict = kbLang === 'ar' ? AR_PREDICTIONS : EN_PREDICTIONS;
    const matchedKey = Object.keys(dict).find((k) => lastWord.startsWith(k));
    if (matchedKey) {
      setSuggestedWords(dict[matchedKey]);
    } else {
      setSuggestedWords([]);
    }
  }, [typedText, kbLang]);

  // Save head tracking config
  const updateHeadConfig = (newCfg: Partial<HeadTrackingConfig>) => {
    const updated = { ...headConfig, ...newCfg };
    setHeadConfig(updated);
    trackerRef.current?.updateConfig(updated);

    // Record the user's explicit choice as a locked preference in the shared
    // Accessibility 2.0 state, so the adaptive engine (elsewhere in the app)
    // never silently overrides a value this student deliberately set.
    if (newCfg.dwellTimeMs !== undefined) {
      a11yStateRef.current = setManualPreference(a11yStateRef.current, 'motor.dwellTimeMs', newCfg.dwellTimeMs, true);
      persistAccessibilityState(a11yStateRef.current);
    }

    // Local first: it is instant, and it keeps the tuning working offline and
    // through a failed network write.
    try {
      localStorage.setItem('cognify_head_config', JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    // Then the cloud, debounced. The sensitivity and scan-speed sliders fire on
    // every drag step, which would otherwise be a Firestore write per pixel.
    headSyncPendingRef.current = updated;
    if (headSyncTimerRef.current !== null) clearTimeout(headSyncTimerRef.current);
    headSyncTimerRef.current = window.setTimeout(() => {
      headSyncTimerRef.current = null;
      flushHeadConfigSync();
    }, 1000);
  };

  /** Change one vocal trigger: live engine, local cache, then the profile. */
  const updateTrigger = (id: string, patch: Partial<VocalSoundTriggerConfig>) => {
    const base = triggersRef.current.length ? triggersRef.current : triggers;
    const updated = base.map((t) => (t.id === id ? { ...t, ...patch } : t));
    setTriggers(updated);
    // setTriggers on the engine also writes localStorage, and takes effect on
    // the running mic immediately — no restart needed mid-calibration.
    vocalSoundEngine.setTriggers(updated);
    vocalSyncPendingRef.current = updated;
    if (vocalSyncTimerRef.current !== null) clearTimeout(vocalSyncTimerRef.current);
    vocalSyncTimerRef.current = window.setTimeout(() => {
      vocalSyncTimerRef.current = null;
      flushVocalSync();
    }, 1000);
  };

  const flushVocalSync = () => {
    const pending = vocalSyncPendingRef.current;
    if (!pending || !profile?.uid) return;
    vocalSyncPendingRef.current = null;
    setDoc(
      doc(db, `users/${profile.uid}`),
      cleanDataForFirestore({ vocalTriggers: pending }),
      { merge: true },
    ).catch(() => { /* local cache still holds it; the next change retries */ });
  };

  /**
   * Tune a trigger to the sound the student can actually make.
   *
   * Asking a caregiver to pick a frequency in Hz is not a real option, and the
   * shipped defaults (220 / 750 / 1600 Hz) only fire for a voice that happens to
   * land there — a quiet breathy hum at 140Hz matched nothing at all. This
   * listens to the student instead and takes the median of what it hears.
   */
  const captureVocalTrigger = async (id: string) => {
    if (!isAudioEngineActive) {
      toast.error(
        isArabic
          ? 'شغّل «أصوات إيفونيا» الأول علشان الميكروفون يشتغل'
          : 'Turn on Vocal Sounds first so the microphone is live'
      );
      return;
    }
    setCapturingTriggerId(id);
    toast.info(isArabic ? 'اعمل صوتك دلوقتي واستمر...' : 'Make your sound now and hold it...');

    const samples: { f: number; v: number }[] = [];
    await new Promise<void>((resolve) => {
      const t0 = Date.now();
      const iv = window.setInterval(() => {
        const m = audioMetricsRef.current;
        // Ignore silence and sub-vocal rumble; we want the held tone only.
        if (m && m.volume > 0.03 && m.peakFrequency > 60) samples.push({ f: m.peakFrequency, v: m.volume });
        if (Date.now() - t0 > 2600 || !mountedRef.current) { clearInterval(iv); resolve(); }
      }, 50);
    });
    if (!mountedRef.current) return;
    setCapturingTriggerId(null);

    if (samples.length < 6) {
      toast.error(
        isArabic ? 'مسمعتش صوت واضح — قرّب من الميكروفون وجرّب تاني' : 'No clear sound heard — move closer and try again'
      );
      return;
    }
    const med = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const f = Math.round(med(samples.map((x) => x.f)));
    const v = med(samples.map((x) => x.v));
    updateTrigger(id, {
      targetFrequencyHz: f,
      // Sit under what they actually produced, so an ordinary effort still fires
      // rather than demanding their loudest possible sound every time.
      minEnergyThreshold: Math.min(0.2, Math.max(0.02, Number((v * 0.6).toFixed(3)))),
    });
    toast.success(isArabic ? `تم الضبط على ${f} هرتز` : `Tuned to ${f} Hz`);
  };

  /** Push the pending config to the student's profile. Safe to call after
   *  unmount: it touches no React state. */
  const flushHeadConfigSync = () => {
    const pending = headSyncPendingRef.current;
    if (!pending || !profile?.uid) return;
    headSyncPendingRef.current = null;
    setDoc(
      doc(db, `users/${profile.uid}`),
      cleanDataForFirestore({ headTrackingConfig: pending }),
      { merge: true },
    ).catch(() => {
      // Offline or rules rejected it — localStorage still holds the tuning, so
      // this device keeps working and the next change retries.
    });
  };

  // Start / Stop Camera Tracking
  const toggleCamera = async () => {
    unlockSpeechSynthesis();

    if (isCameraActive) {
      trackerRef.current?.stop();
      trackerRef.current = null;
      setIsCameraActive(false);
      return;
    }

    if (!videoRef.current) return;
    // Re-entrancy guard: the on-screen button and the auto-start effect could
    // both fire (isCameraActive is only set AFTER getUserMedia resolves), which
    // built two trackers. The second overwrote trackerRef, so "Stop Camera"
    // could only ever stop one — the other kept the webcam LED on and a second
    // FaceMesh running at 60fps, fighting over the cursor.
    if (cameraBusyRef.current) return;
    cameraBusyRef.current = true;
    try { trackerRef.current?.stop(); } catch { /* nothing running */ }

    const tracker = new FacialHeadTracker(headConfig);
    trackerRef.current = tracker;

    const ok = await tracker.start(
      videoRef.current,
      {
        onPointerMove: (pos, prog) => {
          // checkHoverTarget drives dwell/latch logic and must run every
          // frame regardless of render throttling — only the setState calls
          // (which trigger a full re-render of this component) are capped.
          checkHoverTargetRef.current(pos);
          const now = Date.now();
          if (now - lastPointerRenderRef.current < POINTER_RENDER_INTERVAL_MS) return;
          lastPointerRenderRef.current = now;
          setCursorPos(pos);
          setDwellProgress(prog);
        },
        onDwellComplete: (targetId) => {
          // The tracker sets its own hover target from magnetic snapping, so
          // guarding checkHoverTarget alone is not enough to keep dwell from
          // firing underneath an active scan.
          if (scanActiveRef.current) return;
          handleCardTriggerRef.current(targetId);
        },
        onGesture: (gesture) => {
          // gestureState/eyeLiveMetrics only feed the scientific-architecture
          // debug modal (checked below) — everything else that reacts to a
          // gesture (blink-click, smile-click, scanning) reads `gesture`
          // directly, not React state. Skipping the setState calls while that
          // modal is closed removes two full-tree re-renders per gesture
          // event (roughly video framerate) for the overwhelming majority of
          // a session.
          if (showScientificArchitectureModalRef.current) {
            setGestureState(gesture);
            if (gesture.metrics) {
              setEyeLiveMetrics(gesture.metrics);
            }
          }
          const hovered = hoveredCardIdRef.current;

          // Continuous 4-second Eye Closure Emergency SOS Trigger (Locked-in / ALS safety)
          const isClosed = Boolean(gesture.isBlinking || (gesture.metrics && gesture.metrics.isBlinking));
          if (isClosed) {
            if (!eyesClosedStartRef.current) {
              eyesClosedStartRef.current = Date.now();
            } else if (Date.now() - eyesClosedStartRef.current >= 4000) {
              triggerEmergencySOS('eye_closure');
              eyesClosedStartRef.current = null;
            }
          } else {
            eyesClosedStartRef.current = null;
          }

          // While scanning, every gesture is just "press the switch".
          if (scanActiveRef.current) {
            if (gesture.isBlinking || gesture.isSmiling) scanSwitchRef.current();
            return;
          }
          if (gesture.isBlinking) {
            if (hovered) {
              playBlinkClickSound();
              // Tell the tracker this target has just fired. Without it the
              // dwell timer kept running underneath and fired the SAME key
              // again ~1.4s later if the student paused on it: "سس" for "س".
              trackerRef.current?.notifyExternalTrigger(hovered);
              handleCardTriggerRef.current(hovered);
            }
          } else if (gesture.isSmiling) {
            if (hovered) {
              trackerRef.current?.notifyExternalTrigger(hovered);
              handleCardTriggerRef.current(hovered);
            }
          }
        },
        onCalibrationStatus: (status) => {
          setCalibAccuracy(status.accuracyEstimate);
        },
        onError: (code) => {
          // Face tracking could not load. Say so and shut the camera off rather
          // than leaving a live camera with a pointer that never moves.
          if (!mountedRef.current) return;
          toast.error(
            isArabic
              ? 'تعذّر تحميل محرك تتبّع الوجه. راجع الاتصال بالإنترنت وحاول تاني.'
              : 'Face-tracking engine failed to load. Check the connection and try again.',
            isArabic ? 'تتبّع العين غير متاح' : 'Eye tracking unavailable',
          );
          console.error('[MotorEuphonia] face mesh:', code);
          try { trackerRef.current?.stop(); } catch { /* ignore */ }
          trackerRef.current = null;
          setIsCameraActive(false);
        },
      },
      overlayCanvasRef.current
    );

    cameraBusyRef.current = false;

    // Left the Motor screen while the webcam was still opening. Don't toast onto
    // whatever screen they are on now — and, more importantly, don't leave a
    // camera running for a view that no longer exists.
    if (!mountedRef.current) {
      try { trackerRef.current?.stop(); } catch { /* ignore */ }
      trackerRef.current = null;
      return;
    }

    if (ok) {
      setIsCameraActive(true);
      toast.success(isArabic ? 'تم تفعيل تتبع العين - انظر للحرف وأغمض عينك لكتابته' : 'Eye-Gaze active - look and blink to type');
    } else {
      // start() released the stream itself; make sure no half-built tracker
      // is left behind holding a camera.
      try { trackerRef.current?.stop(); } catch { /* ignore */ }
      trackerRef.current = null;
      toast.error(
        isArabic
          ? 'تعذر تشغيل تتبع العين. يمكنك المتابعة باستخدام الصوت أو لوحة المفاتيح.'
          : "Eye tracking isn't available. You can continue using voice or keyboard."
      );
    }
  };

  /**
   * Free the microphone for a SpeechRecognition session, and give back a
   * function that restores it.
   *
   * The vocal-sound engine holds its own exclusive getUserMedia stream, and on
   * several browsers a second concurrent mic consumer then fails to start —
   * "No microphone available, or it is in use by another feature", or nothing
   * at all. Only the atypical-speech path released it; "Listen to Teacher" and
   * "Speak Name" did not.
   *
   * Restoring matters as much as releasing: for a student who cannot blink
   * reliably the vocal engine IS their click, so a recognition session that
   * silently left it off took away their only way to select anything.
   */
  const releaseMicForRecognition = (): (() => void) => {
    if (!isAudioEngineActive) return () => {};
    vocalSoundEngine.stop();
    setIsAudioEngineActive(false);
    return () => {
      if (!mountedRef.current) return;
      vocalSoundEngine
        .start((t) => handleVocalTriggerRef.current(t), (m) => { audioMetricsRef.current = m; setAudioMetrics(m); })
        .then((ok) => { if (ok && mountedRef.current) setIsAudioEngineActive(true); })
        .catch(() => { /* the student can switch it back on by hand */ });
    };
  };

  /**
   * Get the recorded training set out of the browser.
   *
   * With no custom-model URL configured (the default), every clip goes to local
   * IndexedDB. The Studio counts them up to "3/3 complete" and tells the student
   * to train a personalized model on their data — while that data had no way
   * out of the browser profile that recorded it.
   */
  const exportEuphoniaTrainingData = async () => {
    const adapter = storageAdapterRef.current as any;
    if (typeof adapter?.exportAllAsZipEntries !== 'function') {
      toast.info(
        isArabic
          ? 'التسجيلات محفوظة على الخادم المخصص، حمّلها من هناك'
          : 'Samples are stored on your custom model server — download them there'
      );
      return;
    }
    setIsExportingSamples(true);
    try {
      const raw: { key: string; blob: Blob }[] = await adapter.exportAllAsZipEntries();
      if (!raw.length) {
        toast.error(isArabic ? 'لا توجد تسجيلات محفوظة بعد' : 'No recorded samples yet');
        return;
      }
      // Keys are `${phraseId}__${timestamp}` — split on the LAST separator, so
      // a phrase id that itself contains "__" is not truncated.
      const phraseIdOf = (key: string) => {
        const cut = String(key).lastIndexOf('__');
        return (cut > 0 ? String(key).slice(0, cut) : String(key)) || 'unknown';
      };
      // Ids reach the archive as folder names, so strip anything a path cannot
      // carry rather than emitting an entry no unzip tool will extract.
      const safe = (v: string) => v.replace(/[^\w؀-ۿ.-]+/g, '_').slice(0, 60) || 'unknown';

      // Group by phrase so the folder layout is what a training pipeline wants.
      const seen: Record<string, number> = {};
      const entries = raw.map(({ key, blob }) => {
        const phraseId = phraseIdOf(key);
        seen[phraseId] = (seen[phraseId] || 0) + 1;
        const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm';
        return { name: `${safe(phraseId)}/take-${seen[phraseId]}.${ext}`, blob };
      });
      // A manifest, so whoever trains the model knows what each clip says.
      const manifest = raw.map(({ key }, i) => ({
        file: entries[i].name,
        key,
        phraseId: phraseIdOf(key),
        phraseText: euphoniaPhraseBank.find((ph) => ph.id === phraseIdOf(key))?.text || '',
      }));
      entries.push({
        name: 'manifest.json',
        blob: new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }),
      });

      const zip = await createZip(entries);
      downloadBlob(zip, `cognify-euphonia-training-${raw.length}-samples.zip`);
      toast.success(
        isArabic ? `تم تصدير ${raw.length} تسجيل` : `Exported ${raw.length} samples`
      );
    } catch (err) {
      toast.error(isArabic ? 'تعذّر تصدير التسجيلات' : 'Could not export the samples');
    } finally {
      if (mountedRef.current) setIsExportingSamples(false);
    }
  };

  // Start / Stop Euphonia Vocal Sound Engine
  const toggleAudioEngine = async () => {
    if (isAudioEngineActive) {
      vocalSoundEngine.stop();
      setIsAudioEngineActive(false);
      return;
    }

    const ok = await vocalSoundEngine.start(
      (trig) => {
        handleVocalTriggerRef.current(trig);
      },
      (metrics) => {
        if (!mountedRef.current) return;
        audioMetricsRef.current = metrics;
        setAudioMetrics(metrics);
      }
    );

    if (!mountedRef.current) return;
    if (ok) {
      setIsAudioEngineActive(true);
      toast.success(isArabic ? 'تم تفعيل معالج إيفونيا للأصوات الصوتية' : 'Euphonia vocal sound trigger active');
    } else {
      toast.error(isArabic ? 'تعذر الوصول إلى الميكروفون' : 'Could not access microphone');
    }
  };

  // Google Project Euphonia: Record Sample for Phrase with MediaRecorder
  const recordEuphoniaSample = (phrase: EuphoniaPhraseDef) => {
    if (euphoniaRecorder.isRecording()) return;

    setRecordingPhraseId(phrase.id);
    toast.info(isArabic ? 'سجّل الآن بنبرتك الطبيعية...' : 'Recording now...');

    euphoniaRecorder.start(phrase.id, phrase.text, {
      onLevel: (rms) => { if (mountedRef.current) setMicLevel(rms); },
      onError: (err) => {
        console.error(err);
        if (!mountedRef.current) return;
        setRecordingPhraseId(null);
        toast.error(isArabic ? 'تعذر الوصول إلى الميكروفون' : 'Could not access microphone');
      },
      onStop: async (sample: EuphoniaAudioSample) => {
        if (!mountedRef.current) return;
        setRecordingPhraseId(null);
        setMicLevel(0);

        if (sample.durationMs < 400) {
          toast.error(isArabic ? 'التسجيل قصير جداً، حاول مرة أخرى' : 'Recording too short, try again');
          return;
        }

        try {
          await storageAdapterRef.current.upload(sample);
          if (!mountedRef.current) return;
          setEuphoniaTrainingState((prev) => ({
            ...prev,
            [phrase.id]: (prev[phrase.id] || 0) + 1,
          }));
          playBlinkClickSound();
          toast.success(isArabic ? '✅ تم حفظ العينة الصوتية بنجاح' : 'Sample saved');
        } catch (err) {
          console.error(err);
          if (mountedRef.current) toast.error(isArabic ? 'فشل حفظ العينة الصوتية' : 'Failed to save sample');
        }
      },
    });
  };

  // Google Project Euphonia: Live Listener using Personalized Model + Browser Fallback
  const toggleEuphoniaLiveListener = async () => {
    if (isEuphoniaLiveListening) {
      euphoniaRecorder.stop();
      setIsEuphoniaLiveListening(false);
      return;
    }

    setIsEuphoniaLiveListening(true);
    setEuphoniaMatchedPhrase(null);
    toast.info(isArabic ? 'جاري الاستماع لصوتك...' : 'Listening...');

    euphoniaRecorder.start('live-match', '(live)', {
      onLevel: (rms) => { if (mountedRef.current) setMicLevel(rms); },
      onError: (err) => {
        console.error(err);
        if (!mountedRef.current) return;
        setIsEuphoniaLiveListening(false);
        toast.error(isArabic ? 'تعذر الوصول إلى الميكروفون' : 'Could not access microphone');
      },
      onStop: async (sample: EuphoniaAudioSample) => {
        if (!mountedRef.current) return;
        setIsEuphoniaLiveListening(false);
        setMicLevel(0);

        try {
          const result = await transcribe({
            audioBlob: sample.blob,
            langCode: motorLang === 'fr' ? 'fr-FR' : (profile?.language === 'Egyptian Ammiya' ? 'ar-EG' : isArabic ? 'ar-SA' : 'en-US'),
          });
          if (!mountedRef.current) return;

          setEuphoniaMatchSource(result.source);

          const normalized = result.text.trim();
          const match = euphoniaPhraseBank.find(
            (p) => p.text.includes(normalized) || normalized.includes(p.text)
          );

          const finalText = match ? match.text : normalized;
          setEuphoniaMatchedPhrase(finalText);
          speakSafe(finalText);

          toast.success(
            result.source === 'custom-model'
              ? (isArabic ? `🎯 (نموذجك المخصص): "${finalText}"` : `🎯 (your model): "${finalText}"`)
              : (isArabic ? `🎯 "${finalText}"` : `🎯 "${finalText}"`)
          );
        } catch (err) {
          console.error(err);
          if (mountedRef.current) toast.error(isArabic ? 'تعذر فهم الصوت، حاول مرة أخرى' : 'Could not understand audio, try again');
        }
      },
    });

    trackedTimeout(() => {
      if (euphoniaRecorder.isRecording()) euphoniaRecorder.stop();
    }, 3000);
  };

  // Settings: save + health-check the API URL
  const handleSaveEuphoniaApiUrl = async () => {
    try {
      setEuphoniaApiUrl(euphoniaApiUrlInput);
      setEuphoniaApiUrlState(euphoniaApiUrlInput.trim()); // drives the adapter effect
      toast.info(isArabic ? 'جاري التحقق من الاتصال...' : 'Checking connection...');
      const healthy = await checkEuphoniaApiHealth(euphoniaApiUrlInput);
      if (!mountedRef.current) return;
      setEuphoniaApiHealthy(healthy);
      toast[healthy ? 'success' : 'error'](
        healthy
          ? (isArabic ? '✅ متصل بنموذجك المخصص' : '✅ Connected to your custom model')
          : (isArabic ? '⚠️ تعذر الوصول للخادم — سيتم استخدام المتصفح مؤقتاً' : '⚠️ Unreachable — using browser ASR for now')
      );
    } catch (err) {
      if (mountedRef.current) {
        setEuphoniaApiHealthy(false);
        toast.error(isArabic ? 'خطأ أثناء فحص الرابط' : 'Error checking API endpoint');
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      trackerRef.current?.stop();
      trackerRef.current = null;
      vocalSoundEngine.stop();
      cancelSpeech();
      try { voiceContactRecRef.current?.stop(); } catch { /* ignore */ }
      try { teacherRecRef.current?.stop(); } catch { /* ignore */ }
      // euphoniaRecRef was declared and never assigned, so this stopped nothing
      // and the mic stayed live after leaving the screen. The real recorder is
      // the module-level singleton.
      try { euphoniaRecorder.stop(); } catch { /* ignore */ }
      // Every setTimeout in this view was untracked: a calibration-failure toast
      // could pop up on a later screen ~11s after leaving, and an emergency-call
      // timer could still open a tel: link from wherever the student now was.
      pendingTimersRef.current.forEach((id) => clearTimeout(id));
      pendingTimersRef.current = [];
      try { sharedAudioCtxRef.current?.close(); } catch { /* ignore */ }
      sharedAudioCtxRef.current = null;
    };
  }, []);

  // Check which card, key, or modal item the cursor is hovering over
  const checkHoverTarget = (pos: PointerPosition) => {
    // While auto-scan is driving, the scan owns the hover. Otherwise the gaze
    // pointer yanks the highlight off whatever the scan just landed on.
    if (scanActiveRef.current) return;
    // Was: querySelectorAll + getBoundingClientRect on EVERY element, every
    // frame. That forces a full layout recompute per element ~60x/second, which
    // is the heaviest single cost on the low-end tablets these students use —
    // and it is why the cursor lagged worst exactly when tracking was active.
    // One hit test does the same job.
    const hit = document.elementFromPoint(pos.x, pos.y) as HTMLElement | null;
    const foundId: string | null =
      (hit?.closest('[data-aac-id]') as HTMLElement | null)?.getAttribute('data-aac-id') ?? null;

    if (foundId !== hoveredCardIdRef.current) {
      // Tremor proxy: re-entering the SAME target repeatedly within a short
      // window is the classic signature of hand tremor on a dwell button.
      // A genuinely new target resets the counter — this is not "how many
      // targets did they visit", only "did they keep bouncing off one".
      const flicker = hoverFlickerRef.current;
      const now = Date.now();
      if (foundId && foundId === flicker.id && now - flicker.windowStart < 1500) {
        flicker.enterCount += 1;
      } else {
        flicker.id = foundId;
        flicker.enterCount = 0;
        flicker.windowStart = now;
      }

      hoveredCardIdRef.current = foundId;
      setHoveredCardId(foundId);
      if (isCameraActive) {
        trackerRef.current?.setHoverTarget(foundId);
      } else {
        mouseHoverTargetRef.current = foundId;
        mouseDwellStartRef.current = foundId ? Date.now() : 0;
      }
    }
  };

  // ─── Auto-scan engine ─────────────────────────────────────────────────────

  /** Every selectable target on screen, grouped into geometric rows. */
  const collectScanRows = (): string[][] => {
    // A modal can opt in with data-scan-root so the scan stays inside it
    // instead of walking targets buried behind the overlay.
    const root: ParentNode = document.querySelector('[data-scan-root]') || document;
    const items: { id: string; top: number; left: number }[] = [];
    root.querySelectorAll<HTMLElement>('[data-aac-id]').forEach((el) => {
      const id = el.getAttribute('data-aac-id');
      if (!id) return;
      const r = el.getBoundingClientRect();
      // display:none collapses to 0x0. Deliberately NOT filtered on the
      // viewport: an item scrolled out of view is still reachable, because
      // highlighting it scrolls it back in.
      if (r.width < 8 || r.height < 8) return;
      if (getComputedStyle(el).visibility === 'hidden') return;
      items.push({ id, top: r.top, left: r.left });
    });
    if (!items.length) return [];

    if ((headConfigRef.current.autoScanMode || 'row-column') === 'linear') {
      return [items.sort((a, b) => a.top - b.top || a.left - b.left).map((i) => i.id)];
    }

    // Row tolerance scales with the grid actually on screen, so the same code
    // groups a dense keyboard and a page of large phrase cards correctly.
    const tops = items.map((i) => i.top).sort((a, b) => a - b);
    const span = (tops[tops.length - 1] - tops[0]) || 1;
    const tol = Math.max(14, Math.min(60, span / Math.max(4, items.length / 4)));

    const rows: { top: number; items: typeof items }[] = [];
    for (const it of [...items].sort((a, b) => a.top - b.top || a.left - b.left)) {
      const row = rows.find((r) => Math.abs(r.top - it.top) <= tol);
      if (row) row.items.push(it);
      else rows.push({ top: it.top, items: [it] });
    }
    return rows.map((r) => r.items.sort((a, b) => a.left - b.left).map((i) => i.id));
  };

  /**
   * Re-apply whatever the scan is currently highlighting.
   *
   * The class is added imperatively (threading scan state through all 26 render
   * sites would buy nothing), but React owns className on these buttons — so the
   * moment it re-renders one, it rewrites className and the class is gone.
   * Setting the scan hover is itself a state change, which re-renders exactly
   * the element being highlighted: the item highlight was applied and then
   * stripped milliseconds later, every single tick. Row highlighting survived
   * only because those elements' className never changed, which is what made it
   * look like the feature worked.
   */
  const applyScanPaint = (): HTMLElement | null => {
    document.querySelectorAll('.' + SCAN_HL).forEach((e) => e.classList.remove(SCAN_HL));
    document.querySelectorAll('.' + SCAN_HL_ROW).forEach((e) => e.classList.remove(SCAN_HL_ROW));
    const { ids, cls } = scanPaintedRef.current;
    if (!ids.length) return null;
    const wanted = new Set(ids);
    let first: HTMLElement | null = null;
    document.querySelectorAll<HTMLElement>('[data-aac-id]').forEach((el) => {
      const id = el.getAttribute('data-aac-id');
      if (!id || !wanted.has(id)) return;
      el.classList.add(cls);
      if (!first) first = el;
    });
    return first;
  };

  const clearScanPaint = () => {
    scanPaintedRef.current = { ids: [], cls: SCAN_HL };
    applyScanPaint();
  };

  const paintScan = (ids: string[], cls: string) => {
    scanPaintedRef.current = { ids, cls };
    const first = applyScanPaint();
    if (first) first.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const setScanHover = (id: string | null) => {
    hoveredCardIdRef.current = id;
    setHoveredCardId(id);
  };

  const enterRowPhase = () => {
    scanPhaseRef.current = 'row';
    scanRowIdxRef.current = -1;
    scanItemIdxRef.current = -1;
    scanPassesRef.current = 0;
    // The switch label is derived from scanPhaseRef, so a phase change that
    // does not force a render leaves the button advertising the wrong action
    // — "Select this" while the scan is actually back to choosing a row.
    setScanTickCount((t) => t + 1);
  };

  const stopScan = (exhausted = false) => {
    if (scanTimerRef.current !== null) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    scanActiveRef.current = false;
    clearScanPaint();
    setScanHover(null);
    setScanActive(false);
    setScanTickCount((t) => t + 1);
    if (exhausted && mountedRef.current) {
      toast.info(
        isArabic
          ? 'تم إيقاف المسح مؤقتًا — اضغط المفتاح لاستئنافه'
          : 'Scanning paused — press the switch to resume'
      );
    }
  };

  const scanAdvance = (depth = 0) => {
    if (!scanActiveRef.current || !mountedRef.current) return;
    // Calibration owns the whole screen and the tracker; scanning underneath it
    // would fight for the pointer. Hold position and pick up afterwards.
    if (scanBlockedRef.current) return;

    let rows = scanRowsRef.current;
    if (!rows.length) {
      rows = collectScanRows();
      scanRowsRef.current = rows;
      enterRowPhase();
      if (!rows.length) return;
    }

    if (scanPhaseRef.current === 'row' && rows.length > 1) {
      scanRowIdxRef.current += 1;
      if (scanRowIdxRef.current >= rows.length) {
        scanPassesRef.current += 1;
        if (scanPassesRef.current >= SCAN_MAX_PASSES) { stopScan(true); return; }
        // Re-snapshot between passes: a tab switch or a scroll may have changed
        // what is on screen since the pass began.
        rows = collectScanRows();
        scanRowsRef.current = rows;
        if (!rows.length) { stopScan(); return; }
        scanRowIdxRef.current = 0;
      }
      // No single card is hovered while choosing a ROW, or a blink here would
      // fire a card instead of picking the row.
      setScanHover(null);
      paintScan(rows[scanRowIdxRef.current] || [], SCAN_HL_ROW);
    } else {
      if (rows.length === 1) scanPhaseRef.current = 'item';
      const row = rows[Math.max(0, scanRowIdxRef.current)] || [];
      if (!row.length) {
        enterRowPhase();
        // Move on in the SAME tick rather than leaving the screen unhighlighted
        // for a full interval. Depth-capped so a pathological layout cannot spin.
        if (depth < 2) scanAdvance(depth + 1);
        return;
      }
      scanItemIdxRef.current += 1;
      if (scanItemIdxRef.current >= row.length) {
        scanItemIdxRef.current = 0;
        scanPassesRef.current += 1;
        if (scanPassesRef.current >= SCAN_MAX_PASSES) {
          // Give up on this row and let them choose a different one.
          if (rows.length > 1) {
            enterRowPhase();
            if (depth < 2) scanAdvance(depth + 1);
            return;
          }
          stopScan(true);
          return;
        }
      }
      const id = row[scanItemIdxRef.current];
      setScanHover(id ?? null);
      paintScan(id ? [id] : [], SCAN_HL);
    }
    setScanTickCount((t) => t + 1);
  };

  /** Self-rescheduling, so a change to the interval slider takes effect at once. */
  const scheduleScan = () => {
    if (scanTimerRef.current !== null) clearTimeout(scanTimerRef.current);
    const ms = Math.max(600, Math.min(5000, headConfigRef.current.autoScanIntervalMs || 1400));
    scanTimerRef.current = window.setTimeout(() => {
      scanAdvance();
      if (scanActiveRef.current) scheduleScan();
    }, ms);
  };

  const startScan = () => {
    const rows = collectScanRows();
    if (!rows.length) return;
    scanRowsRef.current = rows;
    enterRowPhase();
    if (rows.length === 1) scanPhaseRef.current = 'item';
    scanActiveRef.current = true;
    setScanActive(true);
    scanAdvance();      // land on the first target at once, no dead wait
    scheduleScan();
  };

  /** The single action the student makes. Blink, smile, a vocal sound,
   *  Space/Enter, and the on-screen button all arrive here. */
  const scanSwitch = () => {
    const now = Date.now();
    if (now - scanLastSwitchRef.current < SCAN_SWITCH_DEBOUNCE_MS) return;
    scanLastSwitchRef.current = now;

    if (!scanActiveRef.current) { startScan(); return; }   // resume after a pause

    const rows = scanRowsRef.current;
    if (!rows.length) { stopScan(); return; }
    scanPassesRef.current = 0;

    if (scanPhaseRef.current === 'row' && rows.length > 1) {
      scanPhaseRef.current = 'item';
      scanItemIdxRef.current = -1;
      scanAdvance();
      scheduleScan();
      return;
    }

    const id = (rows[Math.max(0, scanRowIdxRef.current)] || [])[scanItemIdxRef.current];
    if (!id) return;
    playBlinkClickSound();
    handleCardTriggerRef.current(id);
    // Activating may switch tabs or open a modal, so rebuild from scratch and
    // go back to choosing a row.
    if (scanTimerRef.current !== null) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null; }
    clearScanPaint();
    setScanHover(null);
    trackedTimeout(() => {
      if (!scanActiveRef.current || !mountedRef.current) return;
      scanRowsRef.current = collectScanRows();
      enterRowPhase();
      if (scanRowsRef.current.length === 1) scanPhaseRef.current = 'item';
      scanAdvance();
      scheduleScan();
    }, 350);
  };

  const cycleTab = (dir: 1 | -1) => {
    const i = TAB_ORDER.indexOf(activeTab as any);
    const n = (i + dir + TAB_ORDER.length) % TAB_ORDER.length;
    setActiveTab(TAB_ORDER[n] as any);
  };

  /** Close the topmost open modal. False when there was nothing to close. */
  const closeTopModal = (): boolean => {
    if (showContactPickerModal) { setShowContactPickerModal(false); return true; }
    if (showWhatsAppModal) { setShowWhatsAppModal(false); return true; }
    if (showConfigModal) { setShowConfigModal(false); return true; }
    if (showScientificArchitectureModal) { setShowScientificArchitectureModal(false); return true; }
    return false;
  };

  /** Rebuild the target list and restart from the row phase. Used whenever the
   *  layout underneath the scan changes (tab switch, modal, orientation). */
  const resyncScan = () => {
    if (!scanActiveRef.current || !mountedRef.current) return;
    scanRowsRef.current = collectScanRows();
    enterRowPhase();
    if (scanRowsRef.current.length === 1) scanPhaseRef.current = 'item';
    scanAdvance();
    scheduleScan();
  };

  // Handle Vocal Trigger actions
  const handleVocalTriggerAction = (trig: VocalSoundTriggerConfig) => {
    const label = isArabic ? trig.nameAr : trig.name;
    // Read the LIVE hover. This whole handler used to be captured once, when the
    // mic was switched on, so 'select' either did nothing or re-fired whichever
    // card happened to be under the cursor at that instant — for the rest of the
    // session, nurse-call alarm and phone contacts included.
    const hovered = hoveredCardIdRef.current;
    let handled = true;

    switch (trig.action) {
      case 'select':
        if (scanActiveRef.current) scanSwitchRef.current();
        else if (hovered) {
          trackerRef.current?.notifyExternalTrigger(hovered);
          handleCardTriggerRef.current(hovered);
        } else handled = false;
        break;
      case 'ask-ai': startAtypicalSpeechRecognition(); break;
      case 'emergency': triggerPrimaryEmergencyCall(); break;
      case 'speak-aloud': handleSpeakTypedText(); break;
      case 'clear': handleClearText(); break;
      case 'next': cycleTab(1); break;
      case 'previous': cycleTab(-1); break;
      case 'back': handled = closeTopModal(); break;
      default: handled = false;
    }

    // Toast AFTER dispatch. It used to fire first and always claim success, so
    // the shipped "High Tone" default (mapped to `next`, which nothing
    // implemented) still told the student it had been heard and acted on.
    if (handled) {
      toast.info(`${isArabic ? 'إشارة صوتية: ' : 'Vocal Trigger: '}${label}`);
    } else {
      toast.warning(
        isArabic ? `«${label}» لم يُنفَّذ — لا يوجد هدف محدد` : `"${label}" did nothing — no target selected`
      );
    }
  };

  // Trigger primary emergency SOS call with debounce
  const triggerPrimaryEmergencyCall = () => {
    if (isDialingRef.current) return;
    isDialingRef.current = true;

    const primary = contacts.find((c) => c.isPrimaryEmergency) || contacts[0];
    if (!primary) { isDialingRef.current = false; return; }

    // Previously this always announced "Calling [caregiver]" and dialed
    // whatever was in primary.phone — including the shipped placeholder
    // numbers nothing in the UI could ever change, so the app confidently
    // lied about placing a call that went nowhere. Check first.
    if (!isValidContactPhone(primary.phone)) {
      isDialingRef.current = false;
      speakSafe(
        isArabic
          ? `لا يوجد رقم محفوظ لـ ${primary.nameAr}. من فضلك افتح إدارة جهات الاتصال وأضف رقم.`
          : `No number saved for ${primary.nameEn}. Please open Manage Contacts and add one.`
      );
      toast.warning(
        isArabic ? `مفيش رقم محفوظ لـ ${primary.nameAr}` : `No number saved for ${primary.nameEn}`,
        isArabic ? 'إعداد ناقص' : 'Setup needed'
      );
      setShowContactPickerModal(true);
      setShowManageContactsModal(true);
      return;
    }

    speakSafe(
      isArabic ? `جاري الاتصال برقم ${primary.nameAr}` : `Calling emergency ${primary.nameEn}`
    );
    toast.success(isArabic ? `اتصال طوارئ: ${primary.nameAr}` : `SOS Call: ${primary.nameEn}`);
    trackedTimeout(() => {
      makePhoneCall(primary.phone);
      isDialingRef.current = false;
    }, 1200);
  };

  // Open Hands-Free Contact Picker
  const openContactPicker = () => {
    setShowContactPickerModal(true);
  };

  // Voice listener to dial by name
  const startVoiceContactListener = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error(isArabic ? 'المتصفح لا يدعم التعرف على الصوت' : 'Speech recognition not supported in browser');
      return;
    }

    try {
      cancelSpeech();
      const restoreMic = releaseMicForRecognition();
      const rec = new SpeechRec();
      voiceContactRecRef.current = rec;
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = profile.language === 'Egyptian Ammiya' ? 'ar-EG' : isArabic ? 'ar-SA' : 'en-US';

      rec.onstart = () => {
        setIsListeningForContactName(true);
        toast.info(isArabic ? 'تحدث الآن... انطق اسم الشخص' : 'Listening...');
      };

      rec.onresult = (e: any) => {
        const spoken = e.results[0][0].transcript.trim().toLowerCase();
        setIsListeningForContactName(false);
        matchAndCallContact(spoken);
      };

      rec.onerror = (e: any) => {
        setIsListeningForContactName(false);
        const reason = e?.error || 'unknown';
        toast.error(
          isArabic
            ? reason === 'not-allowed'
              ? 'تم رفض إذن الميكروفون'
              : reason === 'no-speech'
              ? 'لم يتم رصد أي صوت، حاول مرة أخرى'
              : `تعذر التعرف على الصوت (${reason})`
            : `Speech recognition failed (${reason})`
        );
      };
      rec.onend = () => { setIsListeningForContactName(false); restoreMic(); };
      rec.start();
    } catch {
      setIsListeningForContactName(false);
    }
  };

  // Match spoken word with contact list and dial
  const matchAndCallContact = (spoken: string) => {
    if (isDialingRef.current) return;

    const match = contacts.find(
      (c) =>
        spoken.includes(c.nameAr.toLowerCase()) ||
        spoken.includes(c.nameEn.toLowerCase()) ||
        (spoken.includes('ماما') && c.nameAr.includes('ماما')) ||
        (spoken.includes('مرافق') && c.nameAr.includes('المرافق')) ||
        (spoken.includes('دكتور') && c.nameAr.includes('الدكتور')) ||
        (spoken.includes('إسعاف') && c.nameAr.includes('الإسعاف'))
    );

    if (match) {
      if (!isValidContactPhone(match.phone)) {
        toast.warning(
          isArabic ? `مفيش رقم محفوظ لـ ${match.nameAr}` : `No number saved for ${match.nameEn}`,
          isArabic ? 'إعداد ناقص' : 'Setup needed'
        );
        setShowManageContactsModal(true);
        return;
      }
      isDialingRef.current = true;
      speakSafe(isArabic ? `جاري الاتصال بـ ${match.nameAr}` : `Calling ${match.nameEn}`);
      toast.success(isArabic ? `تم التعرف: اتصال بـ ${match.nameAr}` : `Calling ${match.nameEn}`);
      trackedTimeout(() => {
        makePhoneCall(match.phone);
        setShowContactPickerModal(false);
        isDialingRef.current = false;
      }, 1200);
    } else {
      toast.info(isArabic ? `لم نجد جهة اتصال مطابقة لـ "${spoken}"` : `No contact matched "${spoken}"`);
    }
  };

  // Teacher / Classroom Speech Listener & Auto-Response Generator
  const startTeacherClassListener = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error(isArabic ? 'المتصفح لا يدعم التعرف على الصوت' : 'Speech recognition not supported in browser');
      return;
    }

    try {
      cancelSpeech();
      const restoreMic = releaseMicForRecognition();
      const rec = new SpeechRec();
      teacherRecRef.current = rec;
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = profile.language === 'Egyptian Ammiya' ? 'ar-EG' : isArabic ? 'ar-SA' : 'en-US';

      rec.onstart = () => {
        setIsListeningToTeacher(true);
        toast.info(isArabic ? 'جاري الاستماع لما يقوله المعلم في الغرفة...' : 'Listening to teacher in room...');
      };

      rec.onresult = async (e: any) => {
        const spoken = e.results[0][0].transcript;
        setTeacherHeardSpeech(spoken);
        setIsListeningToTeacher(false);

        // Call Gemini to generate 4 instant quick student answer options
        try {
          const prompt = `A teacher just said this in class: "${spoken}". The student is non-verbal (quadriplegic using eye-tracking). Generate 4 distinct, concise, smart Arabic response options that the student might want to say back (e.g. Agreement/Explanation, Question, Need help, Ready). Return ONLY a JSON array of 4 short Arabic strings, without markdown. Example: ["نعم فهمت هذا المفهوم تماماً.", "هل يمكن توضيح النقطة الأخيرة؟", "أنا جاهز للإجابة.", "عندي سؤال حول التطبيق." ]`;
          const rawResp = await geminiService.askGeneralQuestion(prompt, 'Arabic');
          try {
            const cleanJson = rawResp.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length >= 2) {
              setAiGeneratedClassOptions(parsed);
              toast.success(isArabic ? 'تم توليد خيارات الرد الذكية بنجاح' : 'AI generated responses ready');
            }
          } catch {
            setAiGeneratedClassOptions([
              `نعم، بخصوص "${spoken}" فهمت تماماً.`,
              'ممكن إعادة توضيح هذه النقطة؟',
              'أنا جاهز للإجابة عن السؤال.',
              'شكراً جزيلاً أستاذ.'
            ]);
          }
        } catch {
          /* fallback */
        }
      };

      rec.onerror = (e: any) => {
        setIsListeningToTeacher(false);
        const reason = e?.error || 'unknown';
        toast.error(
          isArabic
            ? reason === 'not-allowed'
              ? 'تم رفض إذن الميكروفون'
              : reason === 'no-speech'
              ? 'لم يتم رصد أي صوت'
              : `تعذر التعرف على الصوت (${reason})`
            : `Speech recognition failed (${reason})`
        );
      };
      rec.onend = () => { setIsListeningToTeacher(false); restoreMic(); };
      rec.start();
    } catch {
      setIsListeningToTeacher(false);
    }
  };

  // Real 9-Point Affine Calibration Runner
  const CALIBRATION_TARGETS_NORM = [
    { x: 0.10, y: 0.12 }, { x: 0.50, y: 0.12 }, { x: 0.90, y: 0.12 },
    { x: 0.10, y: 0.50 }, { x: 0.50, y: 0.50 }, { x: 0.90, y: 0.50 },
    { x: 0.10, y: 0.88 }, { x: 0.50, y: 0.88 }, { x: 0.90, y: 0.88 },
  ];

  const runNinePointCalibration = () => {
    if (!trackerRef.current || !isCameraActive) {
      toast.error(isArabic ? 'شغّل الكاميرا أولاً' : 'Start the camera first');
      return;
    }

    trackerRef.current.resetCalibration();
    setShowCalibrationModal(true);
    setIsCalibrating(true);
    setCalibrationPointIndex(0);
    // A second press of the calibration button supersedes the first, so two
    // chains can never interleave against one tracker.
    const myRun = ++calibAbortRef.current;

    const DWELL_MS = 1200;

    const runPoint = (index: number) => {
      // Cancel (or unmount) aborts the chain. Previously the dots disappeared
      // but the sequence kept running invisibly and then overwrote the mapping
      // with samples taken while the student was no longer looking at any
      // target — leaving the pointer worse than before they started.
      if (calibAbortRef.current !== myRun || !mountedRef.current) return;
      if (index >= CALIBRATION_TARGETS_NORM.length) {
        const status = trackerRef.current?.finalizeCalibration();
        setIsCalibrating(false);
        setCalibAccuracy(status?.accuracyEstimate ?? null);
        setCalibSucceeded(!!status?.isCalibrated);

        if (status?.isCalibrated) {
          toast.success(
            isArabic
              ? `تمت المعايرة بنجاح — دقة تقديرية ${Math.round((status.accuracyEstimate || 0) * 100)}%`
              : `Calibration complete — ~${Math.round((status.accuracyEstimate || 0) * 100)}% accuracy`
          );
        } else {
          toast.error(
            isArabic
              ? 'تعذرت المعايرة، جرّب مرة أخرى وثبّت رأسك أكثر'
              : 'Calibration failed — try again and keep your head steadier'
          );
        }
        trackedTimeout(() => setShowCalibrationModal(false), 1400);
        return;
      }

      setCalibrationPointIndex(index);
      trackerRef.current?.beginCalibrationPoint();

      trackedTimeout(() => {
        if (calibAbortRef.current !== myRun) return;
        const target = CALIBRATION_TARGETS_NORM[index];
        const committed = trackerRef.current?.commitCalibrationPoint(target.x, target.y);
        if (committed) playBlinkClickSound();
        runPoint(index + 1);
      }, DWELL_MS);
    };

    trackedTimeout(() => runPoint(0), 400);
  };

  // Add new phrase to custom bank
  const handleAddCustomPhrase = () => {
    if (!newPhraseInput.trim()) return;
    const newP = {
      id: `cp-${Date.now()}`,
      textAr: newPhraseInput.trim(),
      icon: '💬',
    };
    const updated = [newP, ...customPhrases];
    setCustomPhrases(updated);
    try {
      localStorage.setItem('cognify_custom_phrases', JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    setNewPhraseInput('');
    toast.success(isArabic ? 'تمت إضافة العبارة لبنكك الشخصي' : 'Phrase added to personal bank');
  };

  const handleDeleteCustomPhrase = (id: string) => {
    const updated = customPhrases.filter((p: any) => p.id !== id);
    setCustomPhrases(updated);
    try {
      localStorage.setItem('cognify_custom_phrases', JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  // Virtual Keyboard Actions
  const handleKeyClick = (char: string) => {
    setTypedText((prev) => prev + char);
  };

  const handleBackspace = () => {
    setTypedText((prev) => prev.slice(0, -1));
  };

  const handleSpace = () => {
    setTypedText((prev) => prev + ' ');
  };

  const handleClearText = () => {
    setTypedText('');
  };

  const handleSelectWordSuggestion = (word: string) => {
    setTypedText(word + ' ');
    speakSafe(word);
  };

  const handleSpeakTypedText = () => {
    if (!typedText.trim()) return;
    speakSafe(typedText);
    toast.success(isArabic ? 'تم نطق النص' : 'Spoken aloud');
  };

  const handleSendTypedToAI = async () => {
    if (!typedText.trim()) return;
    setIsProcessingAi(true);
    try {
      const response = await geminiService.askGeneralQuestion(typedText, profile?.language || 'Arabic');
      if (!mountedRef.current) return;
      setAiResponseText(response);
      speakSafe(response);
      if (onSendMessage) {
        onSendMessage(typedText);
      }
    } catch (err) {
      if (mountedRef.current) toast.error(isArabic ? 'خطأ في معالجة الذكاء الاصطناعي' : 'AI processing error');
    } finally {
      if (mountedRef.current) setIsProcessingAi(false);
    }
  };

  const handleSendTypedToWhatsApp = () => {
    if (!typedText.trim()) return;
    setCustomWaMessage(typedText);
    setSelectedContactForWa(null);
    setShowWhatsAppModal(true);
  };

  /**
   * Called once per successful dwell selection. Buffers a lightweight
   * (dwellTimeMs, tremorRetriesCount) observation and, every 5 selections,
   * feeds the batch to the Accessibility 2.0 adaptive engine — which only
   * ever touches fields the student hasn't manually locked (see
   * `deriveAdaptiveAccessibilityState`). This only records/derives data;
   * it deliberately does not yet change live rendering (button size, debounce
   * timing) — that is a separate, larger UI change to review on its own.
   */
  const recordA11yDwellObservation = () => {
    const flicker = hoverFlickerRef.current;
    a11yObservationsRef.current.push({
      timestamp: Date.now(),
      dwellTimeMs: headConfigRef.current.dwellTimeMs,
      tremorRetriesCount: flicker.enterCount,
    });
    if (a11yObservationsRef.current.length > 30) a11yObservationsRef.current.shift();
    flicker.enterCount = 0;

    if (a11yObservationsRef.current.length % 5 === 0) {
      try {
        const next = deriveAdaptiveAccessibilityState(a11yStateRef.current, a11yObservationsRef.current);
        a11yStateRef.current = next;
        persistAccessibilityState(next);
      } catch {
        /* non-fatal: adaptive suggestion skipped, dwell trigger still proceeds */
      }
    }
  };

  // Execute selected AAC Card / Key / Tab
  const handleCardTrigger = async (cardId: string) => {
    recordA11yDwellObservation();

    // 0. Top Category Tabs
    if (cardId === 'tab-keyboard') {
      setActiveTab('keyboard');
      return;
    }
    if (cardId === 'tab-euphonia-studio') {
      setActiveTab('euphonia-studio');
      return;
    }
    if (cardId === 'tab-smart-room') {
      setActiveTab('smart-room');
      return;
    }
    if (cardId === 'tab-pain-sensory') {
      setActiveTab('pain-sensory');
      return;
    }
    if (cardId === 'tab-class-ai') {
      setActiveTab('class-ai');
      return;
    }
    if (cardId === 'tab-custom-bank') {
      setActiveTab('custom-bank');
      return;
    }
    if (cardId === 'tab-eye-games') {
      setActiveTab('eye-games');
      reactionStartTimeRef.current = Date.now();
      return;
    }

    // Pop Eye Game Bubble
    if (cardId.startsWith('game-bubble-')) {
      const bId = cardId.replace('game-bubble-', '');
      if (!gamePoppedIds.includes(bId)) {
        playPopSound();
        const reactionTime = Date.now() - reactionStartTimeRef.current;
        // Restart the clock for the NEXT bubble. Without this the timer ran from
        // the start of the round, so each pop reported a bigger number than the
        // last (800ms, 2400ms, 5000ms...) and a therapist reading it as a
        // benchmark would think the student was deteriorating.
        reactionStartTimeRef.current = Date.now();
        reactionSamplesRef.current.push(reactionTime);
        const samples = reactionSamplesRef.current;
        setReactionBenchmarkMs(Math.round(samples.reduce((a, b) => a + b, 0) / samples.length));
        setGamePoppedIds((prev) => [...prev, bId]);
        setGameScore((prev) => prev + 10);
        toast.success(`🎯 +10 نقاط! سرعة النظر: ${reactionTime}ms`);
      }
      return;
    }

    // Euphonia Phrase Trigger
    if (cardId.startsWith('eup-phrase-')) {
      const eupId = cardId.replace('eup-phrase-', '');
      const item = euphoniaPhraseBank.find((p) => p.id === eupId);
      if (item) {
        speakSafe(item.text);
        toast.success(`🎙️ "${item.text}"`);
      }
      return;
    }

    // 1. Virtual Keyboard Key Dwell/Blink Triggers
    if (cardId.startsWith('kb-key-')) {
      const char = cardId.replace('kb-key-', '');
      handleKeyClick(char);
      return;
    }
    if (cardId.startsWith('kb-word-')) {
      const word = cardId.replace('kb-word-', '');
      handleSelectWordSuggestion(word);
      return;
    }
    if (cardId === 'kb-space') {
      handleSpace();
      return;
    }
    if (cardId === 'kb-backspace') {
      handleBackspace();
      return;
    }
    if (cardId === 'kb-clear') {
      handleClearText();
      return;
    }
    if (cardId === 'kb-speak') {
      handleSpeakTypedText();
      return;
    }
    if (cardId === 'kb-askai') {
      handleSendTypedToAI();
      return;
    }
    if (cardId === 'kb-whatsapp') {
      handleSendTypedToWhatsApp();
      return;
    }
    if (cardId === 'btn-emergency-sos') {
      triggerEmergencySOS('button');
      return;
    }
    if (cardId.startsWith('aac-ctx-')) {
      const phraseId = cardId.replace('aac-ctx-', '');
      const item = contextualPhrases.find((p) => p.id === phraseId);
      if (item) {
        const text = motorLang === 'ar' ? item.textAr : motorLang === 'fr' ? item.textFr : item.textEn;
        speakSafe(text);
        toast.success(text);
      }
      return;
    }
    if (cardId === 'kb-switchlang' || cardId === 'motor-lang-toggle') {
      const next: 'ar' | 'en' | 'fr' = motorLang === 'ar' ? 'en' : motorLang === 'en' ? 'fr' : 'ar';
      setMotorLang(next);
      setKbLang(next === 'ar' ? 'ar' : 'en');
      toast.info(
        next === 'fr'
          ? '🇫🇷 Langue française activée'
          : next === 'ar'
          ? '🇪🇬 تم التحويل للغة العربية'
          : '🇬🇧 Switched to English'
      );
      return;
    }

    // 6. Quick Needs Cards
    const need = QUICK_NEEDS.find((n) => n.id === cardId);
    if (need) {
      const phrase = isArabic ? need.phraseAr : need.phraseEn;
      speakSafe(phrase);
      if (need.isAi) {
        setIsProcessingAi(true);
        try {
          const resp = await geminiService.askGeneralQuestion(phrase, motorLang === 'ar' ? (profile.language || 'Arabic') : 'English');
          setAiResponseText(resp);
          speakSafe(resp);
        } catch {
          /* ignore */
        } finally {
          setIsProcessingAi(false);
        }
      }
      return;
    }

    // 7. Contact calls from modal
    if (cardId.startsWith('call-contact-')) {
      if (isDialingRef.current) return;
      isDialingRef.current = true;

      const contactId = cardId.replace('call-contact-', '');
      const target = contacts.find((c) => c.id === contactId);
      if (target) {
        if (!isValidContactPhone(target.phone)) {
          isDialingRef.current = false;
          toast.warning(
            isArabic ? `مفيش رقم محفوظ لـ ${target.nameAr}` : `No number saved for ${target.nameEn}`,
            isArabic ? 'إعداد ناقص' : 'Setup needed'
          );
          setShowManageContactsModal(true);
          return;
        }
        speakSafe(isArabic ? `جاري الاتصال بـ ${target.nameAr}` : `Calling ${target.nameEn}`);
        trackedTimeout(() => {
          makePhoneCall(target.phone);
          setShowContactPickerModal(false);
          isDialingRef.current = false;
        }, 1200);
        return;
      }
      isDialingRef.current = false;
    }

    // 8. WhatsApp contact selection
    if (cardId.startsWith('wa-contact-')) {
      const contactId = cardId.replace('wa-contact-', '');
      const target = contacts.find((c) => c.id === contactId);
      if (target) {
        setSelectedContactForWa(target);
        speakSafe(isArabic ? `اختر الرسالة لـ ${target.nameAr}` : `Select message for ${target.nameEn}`);
        return;
      }
    }

    // 9. WhatsApp message template selection
    if (cardId.startsWith('wa-msg-')) {
      const msgId = cardId.replace('wa-msg-', '');
      const template = WHATSAPP_QUICK_MESSAGES.find((m) => m.id === msgId);
      if (template && selectedContactForWa) {
        const text = isArabic ? template.textAr : template.textEn;
        if (!isValidContactPhone(selectedContactForWa.phone)) {
          toast.warning(
            isArabic ? `مفيش رقم محفوظ لـ ${selectedContactForWa.nameAr}` : `No number saved for ${selectedContactForWa.nameEn}`,
            isArabic ? 'إعداد ناقص' : 'Setup needed'
          );
          setShowManageContactsModal(true);
          return;
        }
        sendWhatsAppMessage(selectedContactForWa.phone, text);
        toast.success(isArabic ? 'جاري فتح واتساب لإرسال الرسالة' : 'Opening WhatsApp');
        setShowWhatsAppModal(false);
        setSelectedContactForWa(null);
        return;
      }
    }
  };

  // Re-point the tracker's live refs on EVERY render so its long-lived callbacks
  // always invoke the current closures (see the ref declarations above).
  handleCardTriggerRef.current = handleCardTrigger;
  checkHoverTargetRef.current = checkHoverTarget;
  handleVocalTriggerRef.current = handleVocalTriggerAction;
  scanSwitchRef.current = scanSwitch;
  scanApiRef.current = { start: startScan, stop: stopScan, resync: resyncScan };
  flushHeadConfigRef.current = flushHeadConfigSync;
  flushVocalRef.current = flushVocalSync;
  triggersRef.current = triggers;
  headConfigRef.current = headConfig;
  // Calibration takes over the whole screen and drives the tracker itself, so
  // the scan holds position rather than fighting it.
  scanBlockedRef.current = showCalibrationModal || isCalibrating;


  // Deliberately no dependency array: this must run after every render, because
  // any state change in this component re-renders the highlighted button and
  // rewrites its className.
  useEffect(() => {
    if (scanActiveRef.current) applyScanPaint();
  });

  // Adopt tuning changed on ANOTHER device. The profile arrives through App's
  // onSnapshot listener, so this is what makes the settings actually follow the
  // student rather than merely being backed up.
  useEffect(() => {
    const remote = profile?.headTrackingConfig;
    if (!remote) return;
    // Never fight a change this device is still debouncing — that would undo
    // the slider the caregiver is dragging right now.
    if (headSyncPendingRef.current) return;
    const merged = { ...DEFAULT_HEAD_TRACKING_CONFIG, ...remote };
    if (JSON.stringify(merged) === JSON.stringify(headConfig)) return;
    setHeadConfig(merged);
    trackerRef.current?.updateCon