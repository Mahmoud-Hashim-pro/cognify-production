/**
 * Visual Companion (الرفيق البصري / المساعد البصري)
 * Life-assistant camera tool for blind and visually impaired users.
 * Reference-matched UI implementation with dark navy palette and teal primary action.
 */
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  BookmarkPlus,
  Loader2,
  AlertTriangle,
  X,
  Trash2,
  Maximize2,
  Minimize2,
  Sparkles,
  Globe,
  MapPin,
  Search,
  BookOpen,
  ShoppingBag,
  GraduationCap,
  Banknote,
  Users,
  Palette,
  Compass,
  FileText,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  Upload,
  ShieldCheck,
  Play,
  Eye,
  Mic,
  MicOff,
  HelpCircle,
  MessageSquare,
  Send,
  Layers,
  Settings2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { triggerHapticAlert, parseNavGuidance } from '../lib/hapticNavEngine';
import { doc, setDoc } from 'firebase/firestore';
import { db, cleanDataForFirestore } from '../lib/firebase';
import { UserProfile, VisionMemory, SpatialObjectRecord } from '../types';
import { localize, isArabicLocale } from '../lib/translations';
import { generateAdaptiveResponse } from '../services/gemini';
import { speak, cancelSpeech, unlockSpeechSynthesis } from '../lib/tts';
import { toast } from './Toast';
import {
  extractSpatialObjectsFromVision,
  recordObservedSpatialObjects,
  getSpatialObjects,
  querySpatialMemory,
  loadSpatialObjectsFromFirestore,
} from '../lib/spatialMemoryEngine';

export type VisualToolId = 'scene' | 'currency' | 'read' | 'color' | 'object' | 'face';

export interface VisualToolConfig {
  id: VisualToolId;
  titleEn: string;
  titleAr: string;
  titleFr: string;
  shortDescEn: string;
  shortDescAr: string;
  shortDescFr: string;
  captureBtnEn: string;
  captureBtnAr: string;
  captureBtnFr: string;
  openCamBtnEn: string;
  openCamBtnAr: string;
  openCamBtnFr: string;
  uploadBtnEn: string;
  uploadBtnAr: string;
  uploadBtnFr: string;
  Icon: React.ComponentType<{ className?: string }>;
  badgeEn: string;
  badgeAr: string;
  badgeFr: string;
  keyboardShortcut: string;
  memoryType: 'object' | 'person';
  waitingEn: string;
  waitingAr: string;
  waitingFr: string;
  demoSampleEn: string;
  demoSampleAr: string;
  demoSampleFr: string;
}

export const VISUAL_TOOLS: VisualToolConfig[] = [
  {
    id: 'scene',
    titleEn: 'Visual Assistant & Safety',
    titleAr: 'المساعد البصري ووصف المشهد',
    titleFr: 'Assistant Visuel & Sécurité',
    shortDescEn: 'Describes surroundings, alerts to obstacles, and guides indoor/outdoor navigation.',
    shortDescAr: 'وصف فوري للمحيط وتنبيه من العوائق وتوجيه آمن للحركة الداخلية والخارجية.',
    shortDescFr: 'Description de l\'environnement, détection d\'obstacles et guidage sécurisé.',
    captureBtnEn: 'What is in front of me now?',
    captureBtnAr: 'ماذا أمامي الآن؟',
    captureBtnFr: 'Que se passe-t-il devant moi ?',
    openCamBtnEn: 'Open Camera for Scene Vision',
    openCamBtnAr: 'تشغيل الكاميرا لوصف المشهد',
    openCamBtnFr: 'Activer la caméra pour la scène',
    uploadBtnEn: 'Upload Scene Image',
    uploadBtnAr: 'رفع صورة مشهد',
    uploadBtnFr: 'Téléverser une image de scène',
    Icon: Eye,
    badgeEn: 'Scene & Safety',
    badgeAr: 'وصف المشهد والأمان',
    badgeFr: 'Scène & Sécurité',
    keyboardShortcut: 'V',
    memoryType: 'object',
    waitingEn: 'Analyzing scene and preparing voice description...',
    waitingAr: 'جاري تحليل المشهد ووصفه صوتياً...',
    waitingFr: 'Analyse de la scène en cours...',
    demoSampleEn: 'The image shows a study desk with a green potted plant in a white pot, books, and a blue mug. Lighting is natural and clear for indoor study.',
    demoSampleAr: 'تظهر الصورة على مكتب دراسة يحتوي على نبات أخضر في أصيص أبيض، وكتب مع مكتبية، وكوب أزرق على الطاولة. الإضاءة طبيعية ومناسبة للاستخدام في بيئة داخلية.',
    demoSampleFr: 'L\'image montre un bureau d\'étude avec une plante verte dans un pot blanc, des livres et une tasse bleue. L\'éclairage est naturel et bien adapté.',
  },
  {
    id: 'currency',
    titleEn: 'Cash & Banknote Reader',
    titleAr: 'قارئ العملات والنقود',
    titleFr: 'Lecteur de Monnaie et Billets',
    shortDescEn: 'Identifies banknotes and coins with high accuracy (EGP, USD, EUR, SAR).',
    shortDescAr: 'يتعرف على فئات العملات النقدية الورقية وينطق قيمتها فوراً بدقة عالية.',
    shortDescFr: 'Identifie les coupures et billets avec grande précision (EGP, USD, EUR, SAR).',
    captureBtnEn: 'Identify Banknote / Cash',
    captureBtnAr: 'فحص وقراءة العملة',
    captureBtnFr: 'Identifier le billet',
    openCamBtnEn: 'Open Camera for Cash Reader',
    openCamBtnAr: 'تشغيل الكاميرا لقراءة العملات',
    openCamBtnFr: 'Activer la caméra pour les billets',
    uploadBtnEn: 'Upload Banknote Image',
    uploadBtnAr: 'رفع صورة عملة نقدية',
    uploadBtnFr: 'Téléverser un billet',
    Icon: Banknote,
    badgeEn: 'Cash & Currency (EGP/USD/EUR/SAR)',
    badgeAr: 'نقود وعملات',
    badgeFr: 'Billets & Devises',
    keyboardShortcut: 'C',
    memoryType: 'object',
    waitingEn: 'Identifying banknote denomination and currency...',
    waitingAr: 'جاري فحص وقراءة فئة العملة النقدية...',
    waitingFr: 'Identification de la coupure en cours...',
    demoSampleEn: 'Banknote detected: Two Hundred Egyptian Pounds (200 EGP). The bill is genuine and in good condition with the denomination clearly visible.',
    demoSampleAr: 'تم فحص العملة: مئتا جنيه مصري (200 ج.م). العملة الورقية واضحة المعالم وبحالة جيدة والفئة محددة بدقة.',
    demoSampleFr: 'Billet identifié : deux cents livres égyptiennes (200 EGP). La coupure est authentique et en bon état.',
  },
  {
    id: 'read',
    titleEn: 'Printed Text & Sign OCR',
    titleAr: 'قراءة النصوص واللافتات (OCR)',
    titleFr: 'Lecture de Textes & Panneaux',
    shortDescEn: 'Instant text recognition from classroom whiteboards, medicine boxes, signs, and books.',
    shortDescAr: 'استخراج وقراءة النصوص المطبوعة واللافتات والسبورة وعبوات الأدوية صوتياً.',
    shortDescFr: 'Reconnaissance instantanée des textes imprimés, panneaux et documents.',
    captureBtnEn: 'Read Text Aloud',
    captureBtnAr: 'قراءة النص واللافتات',
    captureBtnFr: 'Lire le texte à voix haute',
    openCamBtnEn: 'Open Camera for Text OCR',
    openCamBtnAr: 'تشغيل الكاميرا لقراءة النصوص',
    openCamBtnFr: 'Activer la caméra pour la lecture',
    uploadBtnEn: 'Upload Document or Sign',
    uploadBtnAr: 'رفع صورة نص أو لافتة',
    uploadBtnFr: 'Téléverser un document ou panneau',
    Icon: FileText,
    badgeEn: 'Text & Signs OCR',
    badgeAr: 'نصوص ولافتات OCR',
    badgeFr: 'Texte & Enseignes',
    keyboardShortcut: 'T',
    memoryType: 'object',
    waitingEn: 'Reading text and extracting content...',
    waitingAr: 'جاري قراءة النص واستخراج المحتوى...',
    waitingFr: 'Lecture du texte visible...',
    demoSampleEn: 'Text read: Lecture room 204. Advanced Cognitive Computing. Lecture begins on Sunday at 10:00 AM.',
    demoSampleAr: 'النص المكتوب: قاعة المحاضرات 204. الحوسبة المعرفية المتقدمة. موعد المحاضرة القادمة يوم الأحد الساعة العاشرة صباحاً.',
    demoSampleFr: 'Texte lu : Salle de cours 204. Informatique cognitive avancée. Cours dimanche à dix heures.',
  },
  {
    id: 'color',
    titleEn: 'Color & Outfit Matcher',
    titleAr: 'فحص وتنسيق الألوان',
    titleFr: 'Harmonie des Couleurs & Tenue',
    shortDescEn: 'Identifies garment colors, patterns, and recommends coordinated complementary outfits.',
    shortDescAr: 'فحص درجات ألوان الملابس والمقتنيات وتقديم نصائح لتنسيق الألوان المتناسقة.',
    shortDescFr: 'Détecte les nuances de vêtements et conseille des associations harmonieuses.',
    captureBtnEn: 'Detect Color & Match Outfit',
    captureBtnAr: 'فحص وتنسيق الألوان',
    captureBtnFr: 'Analyser la tenue et les couleurs',
    openCamBtnEn: 'Open Camera for Color Matcher',
    openCamBtnAr: 'تشغيل الكاميرا لفحص الألوان',
    openCamBtnFr: 'Activer la caméra pour les couleurs',
    uploadBtnEn: 'Upload Garment Image',
    uploadBtnAr: 'رفع صورة ملابس',
    uploadBtnFr: 'Téléverser un vêtement',
    Icon: Palette,
    badgeEn: 'Garment & Color Harmony',
    badgeAr: 'الألوان والملابس',
    badgeFr: 'Couleurs & Tenue',
    keyboardShortcut: 'K',
    memoryType: 'object',
    waitingEn: 'Analyzing garment colors, patterns, and styling...',
    waitingAr: 'جاري فحص درجات الألوان وتنسيق المظهر...',
    waitingFr: 'Analyse des couleurs et du style vestimentaire...',
    demoSampleEn: 'The shirt is navy blue with fine white stripes. It coordinates perfectly with beige, grey, or khaki trousers for a formal or casual look.',
    demoSampleAr: 'القميص لونه كحلي داكن مقلم بخطوط بيضاء رفيعة، ويتناسق بشكل ممتاز مع بنطال بلون بيج أو رمادي فاتح لمظهر أنيق ومتناسق.',
    demoSampleFr: 'La chemise est bleu marine à fines rayures blanches. Elle s\'associe parfaitement avec un pantalon beige ou gris clair.',
  },
  {
    id: 'object',
    titleEn: 'Spatial Memory & Item Finder',
    titleAr: 'الذاكرة المكانية وكشف الأشياء',
    titleFr: 'Localisateur d\'Objets & Espace',
    shortDescEn: 'Locates keys, wallets, phones, and glasses with spatial clock-face hints.',
    shortDescAr: 'تحديد أماكن المفاتيح والنظارات والمحفظة بنظام اتجاه عقارب الساعة والمسافة.',
    shortDescFr: 'Localise les clés, portefeuilles et téléphones avec repères spatiaux.',
    captureBtnEn: 'Locate Objects & Items',
    captureBtnAr: 'كشف مكان الأشياء',
    captureBtnFr: 'Localiser les objets proches',
    openCamBtnEn: 'Open Camera for Item Finder',
    openCamBtnAr: 'تشغيل الكاميرا للبحث عن الأشياء',
    openCamBtnFr: 'Activer la caméra pour les objets',
    uploadBtnEn: 'Upload Room Image',
    uploadBtnAr: 'رفع صورة للبحث عن الغرض',
    uploadBtnFr: 'Téléverser une vue de la pièce',
    Icon: Compass,
    badgeEn: 'Spatial Object Recall',
    badgeAr: 'الأشياء والمقتنيات',
    badgeFr: 'Objets Spatiaux',
    keyboardShortcut: 'O',
    memoryType: 'object',
    waitingEn: 'Scanning room landmarks and detecting personal objects...',
    waitingAr: 'جاري البحث عن الأشياء ومعالم المكان...',
    waitingFr: 'Recherche des objets et repères spatiaux...',
    demoSampleEn: 'Item located: Your key ring is at 2 o\'clock, approximately 40 centimeters away on the table next to the laptop. The space ahead is clear.',
    demoSampleAr: 'تم العثور على الغرض: ميدالية مفاتيحك موجودة عند اتجاه الساعة 2 على بعد حوالي 40 سم على الطاولة بجوار اللابتوب، والمسار أمام يدك سالك.',
    demoSampleFr: 'Objet localisé : votre trousseau de clés se trouve à deux heures, à environ quarante centimètres sur la table à côté de l\'ordinateur.',
  },
  {
    id: 'face',
    titleEn: 'Person & Face Recognition',
    titleAr: 'التعرف على الأشخاص والوجوه',
    titleFr: 'Reconnaissance de Personnes',
    shortDescEn: 'Recognizes people entering camera view, distance, facial expressions, and clothing.',
    shortDescAr: 'التعرف على الأشخاص في مجال الرؤية ومسافتهم وتعابير وجوههم وملابسهم.',
    shortDescFr: 'Reconnaît les personnes dans le champ, la distance et les expressions.',
    captureBtnEn: 'Recognize Person in Frame',
    captureBtnAr: 'التعرف على الأشخاص',
    captureBtnFr: 'Reconnaître la personne',
    openCamBtnEn: 'Open Camera for Person Recognition',
    openCamBtnAr: 'تشغيل الكاميرا للتعرف على الأشخاص',
    openCamBtnFr: 'Activer la caméra pour les visages',
    uploadBtnEn: 'Upload Person Image',
    uploadBtnAr: 'رفع صورة شخص',
    uploadBtnFr: 'Téléverser une photo de personne',
    Icon: Users,
    badgeEn: 'Person & Proximity',
    badgeAr: 'الأشخاص والوجوه',
    badgeFr: 'Personnes & Proximité',
    keyboardShortcut: 'P',
    memoryType: 'person',
    waitingEn: 'Detecting people and matching recognized faces...',
    waitingAr: 'جاري التعرف على الشخص والوجوه الظاهرة...',
    waitingFr: 'Détection des personnes et visages...',
    demoSampleEn: 'A person is standing directly in front of you at about two meters distance, smiling and greeting you, wearing a dark green jacket.',
    demoSampleAr: 'يقف شخص أمامك مباشرة على مسافة مترين تقريباً، يبتسم ويرحب بك، ويرتدي سترة بلون زيتي داكن.',
    demoSampleFr: 'Une personne se tient directement devant vous à environ deux mètres, souriante et portant une veste vert foncé.',
  },
];

interface VisionCompanionViewProps {
  profile: UserProfile;
  setProfile?: (profile: UserProfile) => void;
  onNavigateBack?: () => void;
  initialTool?: VisualToolId;
  onToolChange?: (tool: VisualToolId) => void;
}

type Status = 'idle' | 'starting-camera' | 'ready' | 'analyzing' | 'camera-denied' | 'no-camera' | 'camera-in-use' | 'unsupported' | 'timeout';

const isArabicLang = (lang?: string) => isArabicLocale(lang);

const COMPANION_LANG_STORAGE_KEY = 'cognify_vision_companion_lang';

export { cleanVisionDescription } from '../lib/visionCleaner';
import { cleanVisionDescription } from '../lib/visionCleaner';
export { exportToWordDocument, DOC_HISTORY_KEY } from './DocumentStudioModal';
export type { SavedDocItem, DocChatMessage } from './DocumentStudioModal';
import DocumentStudioModal from './DocumentStudioModal';
import SpatialMemoryTrajectoryView from './SpatialMemoryTrajectoryView';
import ParentalConsentModal from './ParentalConsentModal';

export default function VisionCompanionView({
  profile,
  setProfile,
  onNavigateBack,
  initialTool = 'scene',
  onToolChange,
}: VisionCompanionViewProps) {
  const isMinorStudent = Boolean((profile.age && profile.age < 18) || (profile as any).isMinor);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(
    Boolean(isMinorStudent && !profile.parentalConsent?.verified)
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef<boolean>(true);
  const cameraSessionIdRef = useRef<number>(0);
  const isAcquiringCameraRef = useRef<boolean>(false);
  const cameraReadinessCleanupRef = useRef<(() => void) | null>(null);

  // Lifecycle: Automatically start camera on mount and safely cleanup tracks on unmount
  useEffect(() => {
    isMountedRef.current = true;
    if (!showConsentModal) {
      startCamera();
    }
    return () => {
      isMountedRef.current = false;
      cameraSessionIdRef.current++;
      cameraReadinessCleanupRef.current?.();
      cameraReadinessCleanupRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Monotonically increasing request ID & in-flight tracking to reject stale scene descriptions
  const activeRequestIdRef = useRef<number>(0);
  const lastObservationTimeRef = useRef<number>(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const lastCaptureAttemptRef = useRef<number>(0);

  const [observationTimestamp, setObservationTimestamp] = useState<number | null>(() => {
    try {
      const raw = sessionStorage.getItem('cognify_vision_last_observation');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.timestamp) return parsed.timestamp;
      }
    } catch {}
    return null;
  });

  const [observationType, setObservationType] = useState<'live' | 'previous' | 'uncertain' | 'uploaded' | null>(() => {
    try {
      const raw = sessionStorage.getItem('cognify_vision_last_observation');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.description) return 'previous';
      }
    } catch {}
    return null;
  });

  const [status, setStatus] = useState<Status>('starting-camera');
  const [lastDescription, setLastDescription] = useState<string>(() => {
    try {
      const raw = sessionStorage.getItem('cognify_vision_last_observation');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.description) return parsed.description;
      }
    } catch {}
    return '';
  });
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSavingPerson, setIsSavingPerson] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuestAuthCard, setShowGuestAuthCard] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Supported languages: Arabic, English, French (Declared early for child callbacks)
  const [companionLang, setCompanionLang] = useState<'ar' | 'en' | 'fr'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(COMPANION_LANG_STORAGE_KEY);
      if (saved === 'ar' || saved === 'en' || saved === 'fr') return saved;
    }
    if (isArabicLang(profile?.language)) return 'ar';
    if (profile?.language === 'French' || (profile?.language as unknown as string) === 'fr') return 'fr';
    return 'ar';
  });

  const isAr = companionLang === 'ar';

  const t = useCallback(
    (en: string, ar: string, fr?: string) => {
      if (companionLang === 'ar') return ar;
      if (companionLang === 'fr') return fr || en;
      return en;
    },
    [companionLang]
  );

  // Active Visual Tool
  const [activeTool, setActiveTool] = useState<VisualToolId>(initialTool || 'scene');
  const activeToolRef = useRef<VisualToolId>(activeTool);
  activeToolRef.current = activeTool;
  const [readMode, setReadMode] = useState(initialTool === 'read');
  const [currencyMode, setCurrencyMode] = useState(initialTool === 'currency');
  const [faceMode, setFaceMode] = useState(initialTool === 'face');
  const [outfitMode, setOutfitMode] = useState(initialTool === 'color');
  const [navGuideMode, setNavGuideMode] = useState(false);
  const [shoppingMode, setShoppingMode] = useState(false);
  const [lectureMode, setLectureMode] = useState(false);
  const [readAction, setReadAction] = useState<'summarize' | 'read'>('summarize');

  // Assistive UX Modes & Controls (Beginner vs Advanced, Detail Level, Speech Rate)
  const [userMode, setUserMode] = useState<'beginner' | 'advanced'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('cognify_vision_user_mode');
      if (saved === 'beginner' || saved === 'advanced') return saved;
    }
    return 'beginner';
  });

  const [detailLevel, setDetailLevel] = useState<'concise' | 'standard' | 'detailed'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('cognify_vision_detail_level');
      if (saved === 'concise' || saved === 'standard' || saved === 'detailed') return saved;
    }
    return 'standard';
  });

  const [speechRate, setSpeechRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('cognify_vision_speech_rate');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) return parsed;
      }
    }
    return 1.0;
  });

  // Follow-Up Q&A about current image
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpHistory, setFollowUpHistory] = useState<{ role: 'user' | 'assistant'; text: string; timestamp: number }[]>([]);
  const [isAnsweringFollowUp, setIsAnsweringFollowUp] = useState(false);

  // Scene Comparison (Change Detection vs Previous Observation)
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [isComparingScene, setIsComparingScene] = useState(false);
  const previousDescriptionRef = useRef<string>('');

  // Voice Command System (Web Speech Recognition)
  const [isVoiceCommandsActive, setIsVoiceCommandsActive] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string>('');
  const voiceRecognitionRef = useRef<any>(null);

  // Targeted Object Query & Saved Memories
  const [targetItemQuery, setTargetItemQuery] = useState('');
  const [memorySearchQuery, setMemorySearchQuery] = useState('');
  const [selectedMemoryCategory, setSelectedMemoryCategory] = useState<'all' | 'person' | 'object' | 'document'>('all');
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Camera acquisition helper with prompt detection, proper timer cleanup, and prevention of retry cascades
  const getUserMediaSafe = async (mode: 'environment' | 'user'): Promise<MediaStream> => {
    let isPrompting = true; // Default true so all browsers (including Safari/iOS without permission query) get full 45s
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'camera' as PermissionName });
        isPrompting = perm.state === 'prompt';
      } catch {}
    }

    // Give users ample time (45s) for interactive system permission prompts and device spin-up
    const timeoutDuration = isPrompting ? 45000 : 20000;

    const attempts: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: { ideal: mode },
        },
        audio: false,
      },
      {
        video: true,
        audio: false,
      },
    ];

    let lastError: any = null;
    for (const constraints of attempts) {
      let timerId: ReturnType<typeof setTimeout> | null = null;
      let hasTimedOut = false;

      try {
        const stream = await new Promise<MediaStream>((resolve, reject) => {
          timerId = setTimeout(() => {
            hasTimedOut = true;
            reject(new Error('CAMERA_TIMEOUT'));
          }, timeoutDuration);

          navigator.mediaDevices.getUserMedia(constraints)
            .then((s) => {
              if (timerId) clearTimeout(timerId);
              if (hasTimedOut) {
                // If user granted permission late, immediately stop tracks to prevent leaked camera access
                s.getTracks().forEach((tr) => tr.stop());
                return;
              }
              resolve(s);
            })
            .catch((err) => {
              if (timerId) clearTimeout(timerId);
              if (!hasTimedOut) {
                reject(err);
              }
            });
        });

        if (stream && stream.getVideoTracks().length > 0) {
          return stream;
        }
      } catch (err: any) {
        lastError = err;
        // If timeout occurred, DO NOT cascade into attempt 2 and 3 — user is likely still prompted or camera hardware is unresponsive
        if (err?.message === 'CAMERA_TIMEOUT') {
          break;
        }
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          throw err;
        }
      }
    }

    throw lastError || new Error('NO_CAMERA_FOUND');
  };

  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      if (isAcquiringCameraRef.current) {
        return;
      }
      if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setStatus('unsupported');
        setAnnounce(companionLang === 'ar' ? 'يتطلب تشغيل الكاميرا اتصالاً آمناً (HTTPS).' : 'Camera requires a secure HTTPS connection.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        setAnnounce(companionLang === 'ar' ? 'متصفحك الحالي لا يدعم الوصول للكاميرا.' : 'Your browser does not support camera access.');
        return;
      }
      cameraReadinessCleanupRef.current?.();
      cameraReadinessCleanupRef.current = null;
      isAcquiringCameraRef.current = true;
      const sessionId = ++cameraSessionIdRef.current;
      setStatus('starting-camera');
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((tr) => tr.stop());
          streamRef.current = null;
        }
        const stream = await getUserMediaSafe(mode);

        if (!isMountedRef.current || sessionId !== cameraSessionIdRef.current) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('muted', 'true');

          let isResolved = false;
          let pollTimer: ReturnType<typeof setInterval> | null = null;

          const finalizeReady = () => {
            if (isResolved) return;
            if (!isMountedRef.current || sessionId !== cameraSessionIdRef.current) return;
            isResolved = true;
            if (pollTimer) {
              clearInterval(pollTimer);
              pollTimer = null;
            }
            if (video) {
              video.removeEventListener('loadedmetadata', checkDimensions);
              video.removeEventListener('canplay', checkDimensions);
              video.removeEventListener('loadeddata', checkDimensions);
              video.removeEventListener('playing', checkDimensions);
              video.removeEventListener('timeupdate', checkDimensions);
            }
            setStatus('ready');
            const activeToolConfig = VISUAL_TOOLS.find((t) => t.id === activeToolRef.current) || VISUAL_TOOLS[0];
            const toolCapLabel = companionLang === 'ar' ? activeToolConfig.captureBtnAr : companionLang === 'fr' ? activeToolConfig.captureBtnFr : activeToolConfig.captureBtnEn;
            setAnnounce(
              companionLang === 'ar'
                ? `الكاميرا جاهزة. اضغط على «${toolCapLabel}» للفحص الفوري.`
                : `Camera ready. Click "${toolCapLabel}" to analyze.`
            );
          };

          const checkDimensions = () => {
            const v = videoRef.current;
            if (v && v.videoWidth > 0 && v.videoHeight > 0) {
              finalizeReady();
            }
          };

          const markReady = () => {
            const v = videoRef.current;
            if (v && v.videoWidth > 0 && v.videoHeight > 0) {
              finalizeReady();
            } else {
              checkDimensions();
            }
          };

          cameraReadinessCleanupRef.current = () => {
            if (pollTimer) {
              clearInterval(pollTimer);
              pollTimer = null;
            }
            if (video) {
              video.removeEventListener('loadedmetadata', checkDimensions);
              video.removeEventListener('canplay', checkDimensions);
              video.removeEventListener('loadeddata', checkDimensions);
              video.removeEventListener('playing', checkDimensions);
              video.removeEventListener('timeupdate', checkDimensions);
            }
          };

          video.addEventListener('loadedmetadata', checkDimensions);
          video.addEventListener('canplay', checkDimensions);
          video.addEventListener('loadeddata', checkDimensions);
          video.addEventListener('playing', checkDimensions);
          video.addEventListener('timeupdate', checkDimensions);

          video.onloadedmetadata = () => markReady();
          video.oncanplay = () => markReady();

          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            markReady();
          } else {
            let checkCount = 0;
            pollTimer = setInterval(() => {
              checkCount++;
              const v = videoRef.current;
              if (v && v.videoWidth > 0 && v.videoHeight > 0) {
                finalizeReady();
              } else if (checkCount >= 8) { // after ~400ms of active stream
                if (stream.active && stream.getVideoTracks().some((t) => t.readyState === 'live')) {
                  finalizeReady();
                } else if (checkCount >= 30) {
                  if (pollTimer) {
                    clearInterval(pollTimer);
                    pollTimer = null;
                  }
                }
              }
            }, 50);
          }

          video.play().catch((playErr) => {
            console.warn('Video auto-play warning:', playErr);
          });
        } else if (isMountedRef.current && sessionId === cameraSessionIdRef.current) {
          setStatus('ready');
        }
      } catch (camErr: any) {
        if (!isMountedRef.current || sessionId !== cameraSessionIdRef.current) {
          return;
        }
        console.warn('Camera failed or timed out:', camErr);
        if (isMountedRef.current) {
          const errName = camErr?.name || '';
          const errMsg = camErr?.message || '';
          if (errMsg === 'CAMERA_TIMEOUT') {
            setStatus('timeout');
            setAnnounce(
              companionLang === 'ar'
                ? 'استغرقت الكاميرا وقتاً طويلاً للاستجابة. يرجى التأكد من السماح بإذن الكاميرا ثم الضغط على إعادة المحاولة.'
                : companionLang === 'fr'
                ? 'Le délai d\'attente de la caméra a expiré. Veuillez autoriser l\'accès et réessayer.'
                : 'Camera request timed out. Please allow camera permissions and click Retry.'
            );
          } else if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
            setStatus('camera-denied');
            setAnnounce(
              companionLang === 'ar'
                ? 'تم حظر إذن الكاميرا. اضغط على رمز القفل بالمتصفح للسماح بالكاميرا، أو ارفع صورة.'
                : 'Camera permission denied. Please allow access in browser or upload an image.'
            );
          } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError' || errMsg === 'NO_CAMERA_FOUND') {
            setStatus('no-camera');
            setAnnounce(
              companionLang === 'ar'
                ? 'لم يتم العثور على كاميرا في هذا الجهاز. يمكنك توصيل كاميرا أو رفع صورة.'
                : 'No camera found on this device. You can connect a webcam or upload a photo.'
            );
          } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
            setStatus('camera-in-use');
            setAnnounce(
              companionLang === 'ar'
                ? 'الكاميرا قيد الاستخدام بواسطة تطبيق آخر. يرجى إغلاق التطبيقات الأخرى وإعادة المحاولة.'
                : 'Camera is currently in use by another app. Please close other camera apps and retry.'
            );
          } else {
            setStatus('camera-denied');
            setAnnounce(
              companionLang === 'ar'
                ? 'تعذر تشغيل الكاميرا. يمكنك إعادة المحاولة أو رفع صورة.'
                : 'Camera access unavailable. You can retry or upload an image.'
            );
          }
        }
      } finally {
        isAcquiringCameraRef.current = false;
      }
    },
    [facingMode, companionLang]
  );

  const stopCamera = useCallback(() => {
    cameraReadinessCleanupRef.current?.();
    cameraReadinessCleanupRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
    setAnnounce(
      companionLang === 'ar'
        ? 'تم إيقاف الكاميرا.'
        : companionLang === 'fr'
        ? 'Caméra arrêtée.'
        : 'Camera stopped.'
    );
  }, [companionLang]);

  const handleSwitchTool = useCallback((toolId: VisualToolId) => {
    setActiveTool(toolId);
    setReadMode(toolId === 'read');
    setCurrencyMode(toolId === 'currency');
    setFaceMode(toolId === 'face');
    setOutfitMode(toolId === 'color');
    onToolChange?.(toolId);

    const tool = VISUAL_TOOLS.find((t) => t.id === toolId);
    if (tool) {
      const toolName = companionLang === 'ar' ? tool.titleAr : companionLang === 'fr' ? tool.titleFr : tool.titleEn;
      const msg = companionLang === 'ar' ? `تم تفعيل أداة: ${toolName}` : `Activated ${toolName}`;
      setAnnounce(msg);
    }

    if (!streamRef.current || !streamRef.current.active || status === 'idle') {
      startCamera();
    }
  }, [companionLang, onToolChange, status, startCamera]);

  useEffect(() => {
    if (initialTool && initialTool !== activeTool) {
      setActiveTool(initialTool);
      setReadMode(initialTool === 'read');
      setCurrencyMode(initialTool === 'currency');
      setFaceMode(initialTool === 'face');
      setOutfitMode(initialTool === 'color');
    }
  }, [initialTool]);

  // Spatial memory state
  const [showSpatialMemory, setShowSpatialMemory] = useState(false);
  const [spatialRecords, setSpatialRecords] = useState<SpatialObjectRecord[]>(() =>
    profile?.uid ? getSpatialObjects(profile.uid) : []
  );
  const [spatialQueryInput, setSpatialQueryInput] = useState('');
  const [spatialQueryResult, setSpatialQueryResult] = useState<string | null>(null);
  const [showDocStudio, setShowDocStudio] = useState(false);

  useEffect(() => {
    if (profile?.uid) {
      loadSpatialObjectsFromFirestore(profile.uid).then((records) => {
        if (isMountedRef.current && records && records.length > 0) {
          setSpatialRecords(records);
        }
      });
    }
  }, [profile?.uid]);

  const memories = profile?.visionMemories || [];

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchesCat =
        selectedMemoryCategory === 'all' ||
        (selectedMemoryCategory === 'person' && m.memoryType === 'person') ||
        (selectedMemoryCategory === 'object' && (m.memoryType === 'object' || !m.memoryType)) ||
        (selectedMemoryCategory === 'document' && m.memoryType === 'document');
      const matchesSearch =
        !memorySearchQuery.trim() ||
        m.label.toLowerCase().includes(memorySearchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(memorySearchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [memories, selectedMemoryCategory, memorySearchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleSwitchTool('currency');
        describeScene(companionLang, undefined, undefined, false, 'currency');
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        handleSwitchTool('read');
        describeScene(companionLang, undefined, 'read', false, 'read');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        cancelSpeech();
        setIsSpeaking(false);
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        handleSwitchTool('scene');
        describeScene(companionLang, undefined, undefined, false, 'scene');
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        handleSwitchTool('object');
        describeScene(companionLang, undefined, undefined, false, 'object');
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleSwitchTool('face');
        describeScene(companionLang, undefined, undefined, false, 'face');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleSwitchTool('color');
        describeScene(companionLang, undefined, undefined, false, 'color');
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setShowFollowUp(false);
        setShowSaveDialog(false);
        setShowSpatialMemory(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [companionLang, handleSwitchTool, status]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      setIsFullscreen(true);
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const flipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  const toggleUserMode = () => {
    const next = userMode === 'beginner' ? 'advanced' : 'beginner';
    setUserMode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cognify_vision_user_mode', next);
    }
    const msg = companionLang === 'ar'
      ? (next === 'advanced' ? 'تم تفعيل الوضع المتقدم مع كامل الأدوات والتحكم.' : 'تم تفعيل وضع المبتدئ البسيط.')
      : (next === 'advanced' ? 'Advanced mode enabled with all tools and controls.' : 'Beginner mode enabled.');
    setAnnounce(msg);
    speak(msg, companionLang === 'ar' ? 'Arabic' : 'English', { rate: speechRate });
  };

  const handleSelectLang = (lang: 'ar' | 'en' | 'fr') => {
    setCompanionLang(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COMPANION_LANG_STORAGE_KEY, lang);
    }
    const msg = lang === 'ar' ? 'تم ضبط اللغة على العربية.' : lang === 'fr' ? 'Langue définie sur le français.' : 'Language set to English.';
    setAnnounce(msg);
  };

  const handleSpeechRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cognify_vision_speech_rate', String(newRate));
    }
    const msg = companionLang === 'ar' ? `سرعة الصوت: ${newRate}x` : `Speech speed: ${newRate}x`;
    setAnnounce(msg);
    speak(msg, companionLang === 'ar' ? 'Arabic' : 'English', { rate: newRate });
  };

  const handleDetailLevelChange = (newLevel: 'concise' | 'standard' | 'detailed') => {
    setDetailLevel(newLevel);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cognify_vision_detail_level', newLevel);
    }
    const msg = companionLang === 'ar'
      ? (newLevel === 'concise' ? 'تم ضبط الوصف على الموجز.' : newLevel === 'detailed' ? 'تم ضبط الوصف على المفصل.' : 'تم ضبط الوصف على القياسي.')
      : `Detail level set to ${newLevel}.`;
    setAnnounce(msg);
  };

  const compareWithPreviousScene = async () => {
    if (!lastSnapshot) {
      toast.info(companionLang === 'ar' ? 'يرجى التقاط مشهد أولاً للمقارنة.' : 'Please capture a scene first to compare.');
      return;
    }
    const prevDesc = previousDescriptionRef.current || sessionStorage.getItem('cognify_vision_last_observation');
    if (!prevDesc) {
      const msg = companionLang === 'ar'
        ? 'لا يوجد مشهد سابق مسجل للمقارنة معه بعد. التقط مشهداً ثانياً وسأقارنه لك.'
        : 'No previous scene recorded yet. Capture another frame and I will compare them.';
      toast.info(msg);
      speak(msg, companionLang === 'ar' ? 'Arabic' : 'English', { rate: speechRate });
      return;
    }

    setIsComparingScene(true);
    setAnnounce(companionLang === 'ar' ? 'جاري مقارنة المشهد الحالي مع المشهد السابق...' : 'Comparing current scene with previous observation...');

    const cleanData = lastSnapshot.replace(/^data:[^;]+;base64,/, '');
    const langMandate = companionLang === 'en'
      ? 'CRITICAL MANDATE: You MUST reply entirely in English. Do NOT use any Arabic characters.\n'
      : companionLang === 'fr'
      ? 'DIRECTIVE CRITIQUE : Vous DEVEZ répondre entièrement en français.\n'
      : 'توجيه حاسم: تحدث باللغة العربية الواضحة والسهلة والودودة.\n';

    const comparePrompt = `${langMandate}أنت مساعد بصري متخصص في مقارنة التغييرات المكانية لمساعدة شخص كفيف على إدراك ما استجد في المكان.
الوصف السابق للمكان: "${typeof prevDesc === 'string' ? prevDesc : (prevDesc as any)?.description || ''}"
الصورة الحالية ملتقطة الآن أمام الكاميرا.
تعليمات المقارنة:
1. اذكر التغييرات الواضحة فقط (أشخاص دخلوا أو خرجوا، أشياء تم تحريكها، عوائق استجدت).
2. إذا كان المشهد متطابقاً دون تغيير ملحوظ، قل مباشرة: "لا توجد تغييرات ملحوظة في المشهد أمامك، الوضع كما هو."
3. تحدث في جملتين فقط بلغة طبيعية وودودة بدون أي نجوم ماركداون (**).`;

    try {
      const res = await generateAdaptiveResponse(
        comparePrompt,
        { ...profile, language: companionLang === 'ar' ? 'Egyptian Ammiya' : companionLang === 'fr' ? 'French' : 'English' },
        [],
        [{ name: `compare_${Date.now()}.jpg`, type: 'image/jpeg', data: cleanData }]
      );
      const cleaned = cleanVisionDescription(res, companionLang);
      setComparisonResult(cleaned);
      setAnnounce(cleaned);
      speak(cleaned, companionLang === 'ar' ? 'Arabic' : companionLang === 'fr' ? 'French' : 'English', {
        rate: speechRate,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    } catch (err) {
      const errCompare = companionLang === 'ar' ? 'تعذرت المقارنة حالياً، يرجى المحاولة ثانية.' : 'Could not compare scenes right now.';
      setComparisonResult(errCompare);
      speak(errCompare, companionLang === 'ar' ? 'Arabic' : 'English', { rate: speechRate });
    } finally {
      setIsComparingScene(false);
    }
  };

  const handleAskFollowUp = async (customQ?: string) => {
    const query = customQ || followUpQuestion;
    if (!query.trim() || !lastSnapshot || isAnsweringFollowUp) return;
    setFollowUpQuestion('');
    setIsAnsweringFollowUp(true);
    const userMsg = query.trim();
    setFollowUpHistory((prev) => [...prev, { role: 'user', text: userMsg, timestamp: Date.now() }]);

    const cleanData = lastSnapshot.replace(/^data:[^;]+;base64,/, '');
    const langMandate = companionLang === 'en'
      ? 'CRITICAL MANDATE: You MUST reply entirely in English. Do NOT use any Arabic characters.\n'
      : companionLang === 'fr'
      ? 'DIRECTIVE CRITIQUE : Vous DEVEZ répondre entièrement en français.\n'
      : 'توجيه حاسم: تحدث باللغة العربية الواضحة والسهلة والودودة.\n';

    const followUpPrompt = `${langMandate}أنت مساعد بصري متخصص يجيب عن استفسار شخص كفيف حول الصورة الملتقطة المعروضة أمامه الآن بدقة وأمانة.
الوصف الأساسي السابق للصورة: "${lastDescription}"
سؤال المستخدم: "${userMsg}"
تعليمات الإجابة:
1. أجب بصدق واختصار بناءً على تفاصيل الصورة فقط.
2. حدد موضع الأشياء بالساعة التقديرية (مثلاً: على يمينك، عند الساعة 3).
3. إذا كان الشيء غير مرئي بالصورة قل ذلك صراحة واقترح توجيه الكاميرا.
تحدث في جملة أو جملتين بأسلوب ودود بدون نجوم ماركداون (**).`;

    try {
      const ans = await generateAdaptiveResponse(
        followUpPrompt,
        { ...profile, language: companionLang === 'ar' ? 'Egyptian Ammiya' : companionLang === 'fr' ? 'French' : 'English' },
        [],
        [{ name: `qa_${Date.now()}.jpg`, type: 'image/jpeg', data: cleanData }]
      );
      const cleaned = cleanVisionDescription(ans, companionLang);
      setFollowUpHistory((prev) => [...prev, { role: 'assistant', text: cleaned, timestamp: Date.now() }]);
      setAnnounce(cleaned);
      const voiceLang = companionLang === 'ar' ? 'Arabic' : companionLang === 'fr' ? 'French' : 'English';
      speak(cleaned, voiceLang, { rate: speechRate, onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false) });
    } catch (err) {
      const errMsg = companionLang === 'ar' ? 'تعذر الإجابة على السؤال حالياً، يرجى المحاولة ثانية.' : 'Could not answer follow-up question right now.';
      setFollowUpHistory((prev) => [...prev, { role: 'assistant', text: errMsg, timestamp: Date.now() }]);
      speak(errMsg, companionLang === 'ar' ? 'Arabic' : 'English', { rate: speechRate });
    } finally {
      setIsAnsweringFollowUp(false);
    }
  };

  const toggleVoiceCommands = () => {
    if (isVoiceCommandsActive) {
      try { voiceRecognitionRef.current?.stop(); } catch {}
      setIsVoiceCommandsActive(false);
      const stopMsg = companionLang === 'ar' ? 'تم إيقاف الاستماع للأوامر الصوتية.' : 'Voice commands stopped.';
      setAnnounce(stopMsg);
      toast.info(stopMsg);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      const unsuppMsg = companionLang === 'ar' ? 'التعرف الصوتي غير مدعوم في متصفحك.' : 'Speech recognition is not supported in this browser.';
      toast.error(unsuppMsg);
      setAnnounce(unsuppMsg);
      speak(unsuppMsg, companionLang === 'ar' ? 'Arabic' : 'English', { rate: speechRate });
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = companionLang === 'ar' ? 'ar-EG' : companionLang === 'fr' ? 'fr-FR' : 'en-US';

      rec.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const transcript = (event.results[lastIndex][0].transcript || '').trim().toLowerCase();
        setLastVoiceCommand(transcript);
        triggerHapticAlert('single-pulse');

        if (/ماذا|مشهد|أمام|شوف|انظر|look|scene|what/i.test(transcript)) {
          handleSwitchTool('scene');
          describeScene(companionLang, undefined, undefined, false, 'scene');
        } else if (/اقرأ|نص|ورقة|كتاب|قراءة|read|text|ocr/i.test(transcript)) {
          handleSwitchTool('read');
          describeScene(companionLang, undefined, 'read', false, 'read');
        } else if (/فلوس|نقود|عملة|جنيه|cash|money|currency|banknote/i.test(transcript)) {
          handleSwitchTool('currency');
          describeScene(companionLang, undefined, undefined, false, 'currency');
        } else if (/ألوان|لون|ملابس|لبس|color|outfit/i.test(transcript)) {
          handleSwitchTool('color');
          describeScene(companionLang, undefined, undefined, false, 'color');
        } else if (/ابحث|مكان|أين|دور|غرض|شيء|find|locate|object|item/i.test(transcript)) {
          handleSwitchTool('object');
          describeScene(companionLang, undefined, undefined, false, 'object');
        } else if (/شخص|ناس|وجوه|وجه|مين|person|face|who/i.test(transcript)) {
          handleSwitchTool('face');
          describeScene(companionLang, undefined, undefined, false, 'face');
        } else if (/اسكت|توقف|وقف|اصمت|stop|quiet|silence/i.test(transcript)) {
          cancelSpeech();
          setIsSpeaking(false);
        } else if (/أعد|كرر|سمعني|ثاني|ثانية|repeat|replay/i.test(transcript)) {
          replaySpeech();
        } else if (/احفظ|ذاكرة|save|remember/i.test(transcript)) {
          openSaveDialog();
        } else if (/رجوع|ارجع|خروج|back|exit/i.test(transcript)) {
          onNavigateBack?.();
        } else if (showFollowUp) {
          handleAskFollowUp(transcript);
        }
      };

      rec.onerror = (e: any) => {
        console.warn('Voice command recognition error:', e);
        setIsVoiceCommandsActive(false);
      };
      rec.onend = () => {
        if (isMountedRef.current && isVoiceCommandsActive) {
          try { rec.start(); } catch {}
        } else {
          setIsVoiceCommandsActive(false);
        }
      };

      rec.start();
      voiceRecognitionRef.current = rec;
      setIsVoiceCommandsActive(true);
      triggerHapticAlert('double-pulse');
      const startMsg = companionLang === 'ar' ? 'الاستماع للأوامر الصوتية مفعّل. تحدث بأمرك الآن.' : 'Listening for voice commands. Speak now.';
      setAnnounce(startMsg);
      toast.success(startMsg);
    } catch (err) {
      console.error('Failed to start voice recognition:', err);
      setIsVoiceCommandsActive(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!profile?.uid) return;
    const updated = memories.filter((m) => m.id !== memoryId);
    if (setProfile) setProfile({ ...profile, visionMemories: updated });
    const msg = companionLang === 'ar' ? 'تم حذف العنصر من الذاكرة.' : 'Memory deleted.';
    setAnnounce(msg);
    toast.info(msg);
    try {
      await setDoc(
        doc(db, `users/${profile.uid}`),
        { visionMemories: cleanDataForFirestore(updated) },
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to sync memory deletion:', err);
    }
  };

  const captureFrame = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;

    if (video.paused && !video.ended) {
      video.play().catch(() => {});
    }

    const maxDim = 1280;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const playDemoSample = useCallback((lang: 'ar' | 'en' | 'fr' = companionLang, targetTool: VisualToolId = activeTool) => {
    const currentToolDef = VISUAL_TOOLS.find((t) => t.id === targetTool) || VISUAL_TOOLS[0];
    const sampleText =
      lang === 'ar'
        ? currentToolDef.demoSampleAr
        : lang === 'fr'
        ? currentToolDef.demoSampleFr
        : currentToolDef.demoSampleEn;

    setShowGuestAuthCard(false);
    setLastDescription(sampleText);
    setStatus('ready');
    setAnnounce(sampleText);
    setObservationTimestamp(Date.now());
    setObservationType('previous');

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    }

    const voiceLang = lang === 'ar' ? 'Arabic' : lang === 'fr' ? 'French' : 'English';
    setTimeout(() => {
      speak(sampleText, voiceLang, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    }, 60);
  }, [companionLang, activeTool]);

  const describeScene = async (
    choiceLang?: 'ar' | 'en' | 'fr',
    forcedFrame?: string,
    forcedAction?: 'summarize' | 'read',
    isUploadedPhoto: boolean = false,
    forcedTool?: VisualToolId
  ) => {
    const now = Date.now();
    if (now - lastCaptureAttemptRef.current < 750) {
      return;
    }
    lastCaptureAttemptRef.current = now;

    const targetLang = choiceLang || companionLang;
    setCompanionLang(targetLang);
    const effectiveTool = forcedTool || (forcedAction === 'read' ? 'read' : activeTool);
    if (forcedTool && forcedTool !== activeTool) {
      setActiveTool(forcedTool);
    }
    const activeReadAction = forcedAction || (effectiveTool === 'read' ? 'read' : readAction);
    if (forcedAction) setReadAction(forcedAction);

    unlockSpeechSynthesis();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
      } catch {}
    }

    if (!forcedFrame && status === 'starting-camera') {
      const waitMsg =
        targetLang === 'ar'
          ? 'جاري تجهيز الكاميرا، يرجى الانتظار ثوانٍ معدودة ثم المحاولة مجدداً.'
          : 'Camera is still warming up, please wait a moment and try again.';
      toast.info(waitMsg);
      speak(waitMsg, targetLang === 'ar' ? 'Arabic' : 'English');
      return;
    }

    if (!forcedFrame && status !== 'ready' && status !== 'analyzing') {
      const errNoCam =
        targetLang === 'ar'
          ? 'الكاميرا غير متاحة حالياً. يرجى تفعيل إذن الكاميرا وإعادة المحاولة أو استخدام زر رفع صورة يدوياً.'
          : 'Camera is not available. Please allow camera access, retry, or select Upload Image.';
      toast.info(errNoCam);
      speak(errNoCam, targetLang === 'ar' ? 'Arabic' : 'English');
      return;
    }

    let frame = forcedFrame || captureFrame();
    if (!frame && !forcedFrame && videoRef.current && videoRef.current.readyState >= 1) {
      // Allow a brief moment for video frame buffer to decode
      await new Promise((r) => setTimeout(r, 200));
      frame = captureFrame();
    }
    if (!frame) {
      const errNoFrame =
        targetLang === 'ar'
          ? 'تعذر التقاط إطار واضح من الكاميرا حالياً. يرجى التأكد من تشغيل الكاميرا وإعادة المحاولة أو رفع صورة.'
          : 'Could not capture a valid camera frame. Please ensure camera is active and retry or upload an image.';
      toast.warning(errNoFrame);
      speak(errNoFrame, targetLang === 'ar' ? 'Arabic' : 'English');
      return;
    }

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    const currentReqId = ++activeRequestIdRef.current;
    const captureTimestamp = Date.now();
    lastObservationTimeRef.current = captureTimestamp;

    setLastSnapshot(frame);
    setStatus('analyzing');
    const activeToolConfig = VISUAL_TOOLS.find((t) => t.id === effectiveTool) || VISUAL_TOOLS[0];
    const waitingMsg =
      targetLang === 'ar'
        ? activeToolConfig.waitingAr
        : targetLang === 'fr'
        ? activeToolConfig.waitingFr
        : activeToolConfig.waitingEn;
    setAnnounce(waitingMsg);

    let prompt = '';
    const langMandate =
      targetLang === 'en'
        ? 'CRITICAL MANDATE: You MUST reply entirely in English. Do NOT use any Arabic characters or Arabic script whatsoever.\n'
        : targetLang === 'fr'
        ? 'DIRECTIVE CRITIQUE : Vous DEVEZ répondre entièrement en français. Ne produisez AUCUN caractère arabe.\n'
        : 'توجيه حاسم: تحدث باللغة العربية الواضحة والسهلة والودودة.\n';

    if (effectiveTool === 'currency') {
      if (targetLang === 'ar') {
        prompt = `${langMandate}أنت رفيق ذكي ومتخصص في فحص وقراءة العملات النقدية الورقية والقطع المعدنية لمساعدة شخص كفيف عبر الكاميرا.
افحص الصورة بدقة بالغة واذكر فوراً:
1. القيمة والعملة: حدد الفئة واسم العملة بدقة فائقة (مثلاً: مئتا جنيه مصري، خمسون جنيهاً مصرياً، عشرون دولاراً أمريكياً، عشرة يورو، مئة ريال سعودي).
2. التفاصيل والحالة: اذكر ما إذا كانت العملة جديدة أم متهالكة، وأي أرقام بارزة عليها.
3. إذا لم تكن هناك عملة واضحة: قل باختصار: "لم أتمكن من التعرف على عملة نقدية واضحة، يرجى فرد الورقة وتقريب الكاميرا بإضاءة جيدة".
تحدث بجملة أو جملتين بلغة عربية سهلة وودودة بدون أي نجوم ماركداون (**) أو عناوين روبوتية.`;
      } else if (targetLang === 'fr') {
        prompt = `${langMandate}Vous êtes un assistant expert en reconnaissance de devises et billets pour une personne aveugle ou malvoyante via sa caméra.
1. Dénomination et devise : Indiquez précisément la valeur et la monnaie (ex. : 200 livres égyptiennes, 20 dollars américains, 50 euros).
2. Clarté : Si aucun billet n'est clairement visible, indiquez : "Aucun billet identifiable, veuillez déplier la coupure sous un bon éclairage."
Fournissez 1 à 2 phrases directes sans astérisques markdown (**).`;
      } else {
        prompt = `${langMandate}You are an expert currency and banknote recognition assistant speaking aloud to a blind or low-vision user through their camera.
Examine the captured image with extreme precision and state:
1. Denomination & Currency: Clearly name the denomination and currency (e.g., 200 Egyptian Pounds, 20 US Dollars, 50 Euros, 100 Saudi Riyals).
2. Orientation & Details: Note condition, visible features, or orientation if discernible.
3. If no banknote is clear: Say "No clear currency detected in frame. Please unfold the banknote and ensure good lighting."
Deliver 1-2 conversational sentences without markdown asterisks (**) or robotic headings.`;
      }
    } else if (effectiveTool === 'color') {
      if (targetLang === 'ar') {
        prompt = `${langMandate}أنت رفيق ذكي متخصص في فحص الألوان وتنسيق الملابس والمقتنيات لمساعدة شخص كفيف عبر الكاميرا.
افحص الصورة بدقة واذكر:
1. الألوان الأساسية: حدد بدقة اللون الأساسي ودرجته (مثلاً: كحلي داكن، أزرق سماوي، زيتي، بيج، رمادي).
2. النقوش والتفاصيل: بين ما إذا كانت القطعة سادة أو مقلمة أو كاروهات.
3. تناسق الألوان: قدم نصيحة سريعة ومفيدة عن الألوان المناسبة لتنسيقها مع هذه القطعة.
تحدث بلغة عربية عامية ودودة في جملتين دون أي نجوم ماركداون (**).`;
      } else if (targetLang === 'fr') {
        prompt = `${langMandate}Vous êtes un assistant expert en détection de couleurs et coordination vestimentaire pour une personne aveugle ou malvoyante.
1. Nuances précises : Identifiez la couleur dominante et ses nuances (bleu marine, vert olive, beige, etc.).
2. Motif et texture : Indiquez si le vêtement est uni, rayé ou à carreaux.
3. Conseils d'association : Donnez un conseil rapide de combinaison vestimentaire harmonieuse sans astérisques markdown (**).`;
      } else {
        prompt = `${langMandate}You are an expert color and outfit matching assistant speaking aloud to a blind or low-vision user through their camera.
1. Primary Color & Shade: Accurately identify dominant colors and nuances (e.g., navy blue, olive green, charcoal grey, beige).
2. Pattern: Note if solid, striped, checked, or patterned.
3. Outfit Coordination: Offer practical advice on matching complementary colors.
Deliver 2 clear, conversational sentences without markdown asterisks (**).`;
      }
    } else if (effectiveTool === 'object') {
      if (targetLang === 'ar') {
        prompt = `${langMandate}أنت رفيق ذكي متخصص في الذاكرة المكانية والبحث عن الأشياء والمقتنيات الشخصية لشخص كفيف عبر الكاميرا.
ابحث في الصورة بدقة عن الأغراض الأساسية (مفاتيح، محفظة، هاتف، كوب، نظارة، حقيبة، قلم، شاحن):
1. الأشياء المكتشفة وموقعها: سمّ كل غرض ومكانه التوجيهي الدقيق بنظام عقارب الساعة والمسافة التقريبية (مثلاً: المفاتيح عند الساعة 2 على بعد 40 سم على الطاولة).
2. العوائق: نبه لأي عائق أمام حركة اليد.
تحدث بلغة عربية عامية واضحة ومباشرة بدون نجوم ماركداون (**).`;
      } else if (targetLang === 'fr') {
        prompt = `${langMandate}Vous êtes un assistant expert en localisation spatiale d'objets pour une personne aveugle ou malvoyante.
1. Objets et repères : Identifiez les objets personnels clés (clés, portefeuille, téléphone, tasse, lunettes) avec leur position relative en heures d'horloge et distance (ex. : clés à 2 heures, à 40 cm sur la table).
2. Dégagement : Précisez si l'accès est libre sans astérisques markdown (**).`;
      } else {
        prompt = `${langMandate}You are an expert spatial object finder speaking aloud to a blind or low-vision user through their camera.
Locate personal items (keys, wallet, phone, mug, glasses, bag):
1. Detected Items & Position: Name each item with clock-face direction and approximate distance (e.g., keys at 2 o'clock, 40 cm away on the desk).
2. Clearance: Note any obstacles before reaching.
Deliver 2 crisp sentences without markdown asterisks (**).`;
      }
    } else if (effectiveTool === 'face') {
      if (targetLang === 'ar') {
        prompt = `${langMandate}أنت رفيق ذكي متخصص في التعرف على الأشخاص والوجوه لمساعدة شخص كفيف عبر الكاميرا.
افحص ما إذا كان هناك شخص أمام الكاميرا:
1. وجود الأشخاص وموقعهم: هل يوجد شخص أمامك مباشرة، على اليمين، أو على اليسار، وعلى بعد كم تقريباً.
2. المظهر والتعبير: تعبير الوجه (مبتسم، يتحدث)، والملابس البارزة للمساعدة على تمييزه.
3. تحدث بلغة عربية ودودة وسلسة بدون نجوم ماركداون (**).`;
      } else if (targetLang === 'fr') {
        prompt = `${langMandate}Vous êtes un assistant expert en reconnaissance faciale et présence humaine pour une personne aveugle ou malvoyante.
1. Présence et distance : Indiquez la présence de personnes, leur position (en face, à droite, à gauche) et la distance approximative.
2. Expression et tenue : Notez l'expression (souriant, attentif) et la couleur principale des vêtements sans astérisques markdown (**).`;
      } else {
        prompt = `${langMandate}You are an expert person and face recognition assistant speaking aloud to a blind or low-vision user through their camera.
1. Person Presence & Distance: Note if someone is standing directly ahead, left, or right, and approximate distance.
2. Expression & Appearance: Note facial expression (smiling, speaking) and clothing color cues.
Deliver 2 warm, natural sentences without markdown asterisks (**).`;
      }
    } else if (effectiveTool === 'read' || activeReadAction === 'read') {
      if (targetLang === 'ar') {
        prompt = `${langMandate}أنت تساعد شخصاً كفيفاً بقراءة النص المكتوب أو المطبوع في الصورة أمامه (كتاب، ورقة، شاشة، لافتة، منتج، أو مستند).
اقرأ كل النص الظاهر بوضوح وبالترتيب الصحيح كلمة بكلمة. لو في الصورة أرقام أو تواريخ أو مبالغ، انطقها بدقة.
لو لا يوجد نص واضح، قل باختصار: "لا يوجد نص واضح في الصورة، حاول تقريب الكاميرا". لا تستخدم أي نجوم ماركداون (**) أو عناوين روبوتية.`;
      } else {
        prompt = `${langMandate}You are helping a visually impaired person read text visible through their camera (a book, sign, screen, product label, or document).
Read out all visible text clearly in order, word for word. Pronounce numbers, dates, or prices accurately.
If no clear text is visible, say "No clear text detected, try moving closer". Do not use markdown asterisks or robotic headings.`;
      }
    } else {
      if (targetLang === 'ar') {
        prompt = `${langMandate}أنت رفيق ومساعد بصري ذكي يتحدث بصوته لشخص كفيف أو ضعيف البصر عبر الكاميرا.
انظر بدقة متناهية إلى ما يظهر أمام الكاميرا الآن، وقدم وصفاً مكانياً دقيقاً ومفيداً عملياً بالترتيب التالي:
1. الأمان والمخاطر: ابدأ مباشرة بجملة تطمينية سلسة إذا لم تكن هناك مخاطر ("المسار مفتوح وآمن أمامك").
2. العناصر الأساسية: ثم صف الأشخاص والأشياء البارزة ومواقعها النسبية.
3. قراءة النصوص واللافتات: اقرأ أي نصوص أو عناوين ظاهرة بدقة.
4. الإيجاز والوضوح: تحدث بلغة عربية عامية سهلة وطبيعية وودودة، بدون أي نجوم ماركداون (**) أو شرطات أو عناوين روبوتية لكي يُنطق الشرح صوتياً بسلاسة.`;
      } else if (targetLang === 'fr') {
        prompt = `${langMandate}Vous êtes un assistant visuel expert parlant à voix haute pour une personne aveugle ou malvoyante via sa caméra.
1. Sécurité et dangers : S'il n'y a aucun danger, commencez directement par rassurer la personne ("Aucun danger devant vous").
2. Objets et agencement : Décrivez les personnes, objets clés et leurs positions relatives.
3. Texte visible : Lisez fidèlement les panneaux, étiquettes ou textes visibles.
4. Concision et ton : Fournissez 2 à 3 phrases claires, naturelles et fluides, sans astérisques markdown (**) ni titres robotiques pour une synthèse vocale limpide.`;
      } else {
        prompt = `${langMandate}You are an expert visual companion speaking aloud to a blind or low-vision user through their camera.
Examine what is visible in front of the camera right now with utmost precision:
1. Safety & Hazards: If there are no hazards, start directly with reassuring words ("Area in front of you is clear").
2. Main Objects & Layout: Describe people, objects, and their relative positions.
3. Visible Text: Read any signs, labels, or visible text word-for-word.
4. Brevity & Tone: Deliver 2-3 crisp, natural, conversational sentences without markdown asterisks (**) or robotic headings so speech is smooth.`;
      }
    }

    if (detailLevel === 'concise') {
      prompt += targetLang === 'ar'
        ? '\nمستوى الإيجاز: لخص النتيجة في جملة واحدة فقط واضحة تركز على السلامة وخلو المسار.'
        : '\nDetail level: Summarize in 1 concise sentence focusing on safety and clear pathway.';
    } else if (detailLevel === 'detailed') {
      prompt += targetLang === 'ar'
        ? '\nمستوى التفصيل: قدم وصفاً دقيقاً في 3 إلى 4 جمل تشمل توزيع المكان والألوان والإضاءة والمواقع النسبية بالساعة.'
        : '\nDetail level: Provide a thorough 3-4 sentence description detailing space, colors, lighting, and relative clock positions.';
    }

    if (effectiveTool === 'object' && targetItemQuery.trim()) {
      prompt += targetLang === 'ar'
        ? `\nالمستخدم يبحث بشكل خاص عن الغرض التالي: "${targetItemQuery.trim()}". هل تراه في الصورة؟ حدد مكانه بدقة بنظام الساعة والمسافة، وإن لم تره قل ذلك واقترح توجيه الكاميرا.`
        : `\nThe user is specifically searching for: "${targetItemQuery.trim()}". State if visible with clock-face direction and distance. If not visible, explicitly state so.`;
    }

    try {
      const cleanData = frame.replace(/^data:[^;]+;base64,/, '');
      const result = await generateAdaptiveResponse(
        prompt,
        {
          ...profile,
          language: targetLang === 'ar' ? 'Egyptian Ammiya' : targetLang === 'fr' ? 'French' : 'English',
        },
        [],
        [{ name: `scene_${captureTimestamp}_${currentReqId}.jpg`, type: 'image/jpeg', data: cleanData }],
        undefined,
        abortController.signal
      );

      if (!isMountedRef.current || currentReqId !== activeRequestIdRef.current || abortController.signal.aborted) return;

      setShowGuestAuthCard(false);

      if (result.startsWith('⚠️')) {
        setStatus('ready');
        setLastDescription(result);
        setAnnounce(result);
        const spoken = cleanVisionDescription(result, targetLang).replace(/[*_`~⚠️]/g, '').trim();
        speak(spoken, targetLang === 'ar' ? 'Arabic' : targetLang === 'fr' ? 'French' : 'English', { rate: speechRate });
        return;
      }

      const cleaned = cleanVisionDescription(result, targetLang);
      previousDescriptionRef.current = lastDescription;
      setLastDescription(cleaned);
      setStatus('ready');
      setAnnounce(cleaned);
      setObservationType(isUploadedPhoto ? 'uploaded' : forcedFrame ? 'previous' : 'live');
      setObservationTimestamp(captureTimestamp);
      if (!forcedFrame) {
        setComparisonResult(null);
      }

      try {
        sessionStorage.setItem('cognify_vision_last_observation', JSON.stringify({
          description: cleaned,
          timestamp: captureTimestamp,
          type: 'previous',
        }));
      } catch {}

      if (profile?.uid) {
        const extracted = extractSpatialObjectsFromVision(cleaned, profile.uid, targetLang);
        if (extracted.length > 0) {
          recordObservedSpatialObjects(profile.uid, extracted).then(() => {
            if (isMountedRef.current && profile.uid) {
              setSpatialRecords(getSpatialObjects(profile.uid));
            }
          });
        }
      }

      // Read aloud automatically
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
      }

      const voiceLang = targetLang === 'ar' ? 'Arabic' : targetLang === 'fr' ? 'French' : 'English';
      setTimeout(() => {
        speak(cleaned, voiceLang, {
          rate: speechRate,
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }, 60);
    } catch (err: any) {
      if (!isMountedRef.current || currentReqId !== activeRequestIdRef.current || abortController.signal.aborted || err?.name === 'AbortError') {
        return;
      }
      setStatus('ready');
      const errPrompt =
        targetLang === 'ar'
          ? 'حصلت مشكلة في تحليل الصورة، من فضلك جرب ثانية أو ارفع صورة أخرى.'
          : 'Something went wrong analyzing the image. Please try again.';
      setLastDescription(errPrompt);
      speak(errPrompt, targetLang === 'ar' ? 'Arabic' : 'English', { rate: speechRate });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(companionLang === 'ar' ? 'يرجى اختيار ملف صورة صالح.' : 'Please select a valid image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLastSnapshot(dataUrl);
      setStatus('ready');
      describeScene(companionLang, dataUrl, undefined, true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const replaySpeech = () => {
    if (!lastDescription) return;
    cancelSpeech();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    const voiceLang = companionLang === 'ar' ? 'Arabic' : companionLang === 'fr' ? 'French' : 'English';
    const cleaned = cleanVisionDescription(lastDescription, companionLang);
    setTimeout(() => {
      speak(cleaned, voiceLang, {
        rate: speechRate,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }, 60);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      cancelSpeech();
      setIsSpeaking(false);
    } else {
      replaySpeech();
    }
  };

  const toggleReadMode = () => {
    setReadMode((prev) => !prev);
  };

  const openSaveDialog = () => {
    if (!lastDescription) return;
    cancelSpeech();
    setLabelInput('');
    setIsSavingPerson(false);
    setShowSaveDialog(true);
  };

  const saveMemory = async () => {
    if (!labelInput.trim()) { setShowSaveDialog(false); return; }
    if (!profile?.uid) {
      setShowSaveDialog(false);
      const msg = companionLang === 'ar' ? 'يرجى تسجيل الدخول لحفظ الذاكرة.' : "Please sign in to save memories.";
      setAnnounce(msg);
      speak(msg, companionLang === 'ar' ? 'Arabic' : 'English');
      return;
    }
    const memory: VisionMemory = {
      id: `vm_${Date.now()}`,
      label: labelInput.trim(),
      description: lastDescription,
      createdAt: new Date().toISOString(),
      memoryType: isSavingPerson || activeTool === 'face' ? 'person' : 'object',
      imageUrl: lastSnapshot || undefined,
    };
    const prevMemories = memories;
    const updated = [...memories, memory];
    if (setProfile) setProfile({ ...profile, visionMemories: updated });
    setShowSaveDialog(false);
    const msg = companionLang === 'ar' ? `تم حفظ "${memory.label}".` : `Saved as "${memory.label}".`;
    setAnnounce(msg);
    speak(msg, companionLang === 'ar' ? 'Arabic' : 'English');
    try {
      await setDoc(
        doc(db, `users/${profile.uid}`),
        { visionMemories: cleanDataForFirestore(updated) },
        { merge: true }
      );
    } catch (err) {
      if (setProfile) setProfile({ ...profile, visionMemories: prevMemories });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex flex-col h-full w-full bg-[#061A33] text-[#F5F8FF] overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 select-none transition-colors ${
        isFullscreen ? 'fixed inset-0 z-[99999] p-4 bg-[#061A33]' : ''
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Screen-reader live region */}
      <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        {announce}
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        aria-label={t('Upload photo for visual analysis', 'رفع صورة للتحليل البصري')}
        className="hidden"
        aria-hidden="true"
      />

      <div className="max-w-6xl mx-auto w-full space-y-6 sm:space-y-8 pb-16">
        {/* ── TOP ACCESSIBILITY & PREFERENCES TOOLBAR ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#082344]/80 p-3 sm:p-4 rounded-2xl border border-[#07558A]/80 backdrop-blur-md">
          {onNavigateBack ? (
            <button
              type="button"
              onClick={onNavigateBack}
              data-testid="vision-navigate-back-btn"
              aria-label={t('Back to Dashboard Hub', 'الرجوع للوحة الميزات الرئيسية', 'Retour au tableau de bord')}
              title={t('Back to Dashboard Hub', 'الرجوع للوحة الميزات الرئيسية', 'Retour au tableau de bord')}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-2xl bg-[#082344] hover:bg-[#0D2542] border border-[#07558A] hover:border-[#00AEB8]/60 text-[#B9CDE3] hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180 text-[#00AEB8]" />
              <span className="text-xs font-bold">{t('Back', 'رجوع', 'Retour')}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Beginner / Advanced Mode Toggle */}
            <button
              type="button"
              onClick={toggleUserMode}
              data-testid="user-mode-toggle"
              aria-label={
                userMode === 'beginner'
                  ? t('Switch to Advanced Mode', 'التبديل إلى الوضع المتقدم')
                  : t('Switch to Beginner Mode', 'التبديل إلى الوضع المبسط')
              }
              className={`px-3 py-1.5 min-h-[38px] rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                userMode === 'beginner'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-[#00AEB8]/15 border-[#00AEB8]/40 text-[#00AEB8]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{userMode === 'beginner' ? t('Mode: Simple', 'الوضع: مبسط') : t('Mode: Advanced', 'الوضع: متقدم')}</span>
            </button>

            {/* Voice Command Recognition Mic Toggle */}
            <button
              type="button"
              onClick={toggleVoiceCommands}
              data-testid="voice-commands-toggle"
              aria-label={
                isVoiceCommandsActive
                  ? t('Stop voice commands', 'إيقاف الأوامر الصوتية')
                  : t('Start voice commands', 'تشغيل الأوامر الصوتية')
              }
              title={
                isVoiceCommandsActive
                  ? t('Listening for commands...', 'جاري الاستماع للأوامر الصوتية...')
                  : t('Voice commands', 'أوامر صوتية')
              }
              className={`px-3 py-1.5 min-h-[38px] rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isVoiceCommandsActive
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                  : 'bg-[#092747] border-[#07558A] text-[#B9CDE3] hover:text-white'
              }`}
            >
              {isVoiceCommandsActive ? (
                <Mic className="w-3.5 h-3.5 text-red-400 animate-bounce" />
              ) : (
                <MicOff className="w-3.5 h-3.5 text-[#B9CDE3]" />
              )}
              <span className="hidden sm:inline">
                {isVoiceCommandsActive ? t('Listening...', 'استماع...') : t('Voice Commands', 'أوامر صوتية')}
              </span>
            </button>

            {/* Detail Level Selector */}
            <div
              data-testid="detail-level-selector"
              role="group"
              aria-label={t('Speech detail level', 'مستوى تفصيل الوصف')}
              className="flex items-center rounded-xl bg-[#061A33] border border-[#07558A] p-0.5 text-[11px]"
            >
              <button
                type="button"
                onClick={() => handleDetailLevelChange('concise')}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  detailLevel === 'concise' ? 'bg-[#00AEB8] text-[#061A33]' : 'text-[#B9CDE3] hover:text-white'
                }`}
                title={t('Concise descriptions', 'أوصاف موجزة')}
              >
                {t('Concise', 'موجز')}
              </button>
              <button
                type="button"
                onClick={() => handleDetailLevelChange('standard')}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  detailLevel === 'standard' ? 'bg-[#00AEB8] text-[#061A33]' : 'text-[#B9CDE3] hover:text-white'
                }`}
                title={t('Standard descriptions', 'أوصاف متوسطة')}
              >
                {t('Standard', 'متوسط')}
              </button>
              <button
                type="button"
                onClick={() => handleDetailLevelChange('detailed')}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  detailLevel === 'detailed' ? 'bg-[#00AEB8] text-[#061A33]' : 'text-[#B9CDE3] hover:text-white'
                }`}
                title={t('Detailed comprehensive descriptions', 'أوصاف تفصيلية شاملة')}
              >
                {t('Detailed', 'مفصل')}
              </button>
            </div>

            {/* Speech Rate Selector */}
            <div
              data-testid="speech-rate-selector"
              role="group"
              aria-label={t('Speech playback speed', 'سرعة نطق الصوت')}
              className="flex items-center rounded-xl bg-[#061A33] border border-[#07558A] p-0.5 text-[11px]"
            >
              {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSpeechRateChange(rate)}
                  className={`px-1.5 py-1 rounded-lg font-bold transition-all ${
                    speechRate === rate ? 'bg-[#0878BD] text-white' : 'text-[#B9CDE3] hover:text-white'
                  }`}
                  title={`${rate}x`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Language Selector */}
            <div
              role="group"
              aria-label={t('Assistant language', 'لغة المساعد')}
              className="flex items-center rounded-xl bg-[#061A33] border border-[#07558A] p-0.5 text-[11px]"
            >
              {(['ar', 'en', 'fr'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleSelectLang(lang)}
                  className={`px-2 py-1 rounded-lg font-bold uppercase transition-all ${
                    companionLang === lang ? 'bg-[#00AEB8] text-[#061A33]' : 'text-[#B9CDE3] hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Keyboard Shortcuts Help Dialog Trigger */}
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              data-testid="shortcuts-help-btn"
              aria-label={t('Keyboard Shortcuts Help (?)', 'مساعدة اختصارات لوحة المفاتيح (?)')}
              title={t('Keyboard Shortcuts (?)', 'اختصارات لوحة المفاتيح (?)')}
              className="p-2 rounded-xl bg-[#092747] border border-[#07558A] text-[#00AEB8] hover:text-white hover:border-[#00AEB8] transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── 1. INTRODUCTION HERO SECTION (NO HUMAN ILLUSTRATION) ── */}
        <section
          aria-label={t('Visual Assistant Introduction', 'مقدمة المساعد البصري')}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#082344] via-[#092747] to-[#082344] border border-[#07558A] p-6 sm:p-8 shadow-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
            {/* Left Column: Heading, Subtitle, and Tag */}
            <div className="md:col-span-8 lg:col-span-8 space-y-3 text-start">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-[#00AEB8]/15 text-[#00AEB8] border border-[#00AEB8]/30 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('Welcome to Visual Assistant', 'مرحبًا بك في المساعد البصري')}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#F5F8FF] tracking-tight leading-tight">
                {t('Discover the world around you', 'اكتشف العالم من حولك')}
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-[#B9CDE3] leading-relaxed max-w-2xl font-normal">
                {t(
                  'Use the camera or upload an image to analyze scenes, read text, and deliver clear, accurate voice descriptions.',
                  'استخدم الكاميرا أو ارفع صورة لتحليل المشاهد، قراءة النصوص، وتقديم أوصاف صوتية دقيقة وواضحة.'
                )}
              </p>
            </div>

            {/* Right Column: Abstract Glowing Eye Emblem (Completely Non-Human) */}
            <div className="md:col-span-4 lg:col-span-4 flex items-center justify-center md:justify-end relative">
              <div className="absolute inset-0 bg-radial from-[#00AEB8]/25 via-[#0878BD]/15 to-transparent blur-2xl -z-10 rounded-full scale-125 pointer-events-none" />

              <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center">
                {/* Concentric rings */}
                <div className="absolute inset-0 rounded-full border border-dashed border-[#07558A]/80 animate-spin-slow pointer-events-none" />
                <div className="absolute inset-2 rounded-full border border-[#00AEB8]/25 pointer-events-none" />
                
                {/* Inner circular emblem with glowing eye */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#082344] via-[#092747] to-[#0878BD]/40 border-2 border-[#00AEB8] flex items-center justify-center shadow-lg shadow-[#00AEB8]/30 transition-transform duration-300 hover:scale-105">
                  <Eye className="w-9 h-9 sm:w-11 sm:h-11 text-[#00AEB8] drop-shadow-[0_0_12px_rgba(0,174,184,0.6)]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── BEGINNER MODE 3-STEP GUIDE BANNER ── */}
        {userMode === 'beginner' && (
          <div
            role="region"
            aria-label={t('Simple Usage Guide', 'دليل الاستخدام السريع')}
            className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#07558A]/30 via-[#082344] to-[#07558A]/30 border-2 border-[#00AEB8]/60 shadow-xl space-y-3.5 text-start"
          >
            <div className="flex items-center gap-2 text-sm sm:text-base font-black text-[#00AEB8]">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{t('Simple 3-Step Assistive Guide', 'دليل الخطوات الثلاث السريع للرؤية')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#061A33]/85 border border-[#07558A]/60">
                <span className="w-7 h-7 rounded-xl bg-[#00AEB8] text-[#061A33] font-black text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <p className="text-xs sm:text-sm text-[#F5F8FF] leading-relaxed">
                  {t('Point your camera toward what you want to identify or read.', 'وجّه كاميرا جهازك نحو ما تريد معرفته أو قراءته.')}
                </p>
              </div>
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#061A33]/85 border border-[#07558A]/60">
                <span className="w-7 h-7 rounded-xl bg-[#00AEB8] text-[#061A33] font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="text-xs sm:text-sm text-[#F5F8FF] leading-relaxed">
                  {t('Press the large button below (or press V on your keyboard).', 'اضغط على الزر الكبير في المنتصف (أو اضغط حرف V بلوحة المفاتيح).')}
                </p>
              </div>
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#061A33]/85 border border-[#07558A]/60">
                <span className="w-7 h-7 rounded-xl bg-[#00AEB8] text-[#061A33] font-black text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <p className="text-xs sm:text-sm text-[#F5F8FF] leading-relaxed">
                  {t('Listen immediately to the clear spoken voice description.', 'استمع فوراً للوصف الصوتي التلقائي بوضوح تام.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── 1.5 VISUAL ASSISTANT TOOL SELECTOR BAR ── */}
        <section
          aria-label={t('Visual Assistant Tools Selector', 'شريط أدوات المساعد البصري المتخصصة', 'Sélecteur d\'outils visuels')}
          className="space-y-2.5"
        >
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00AEB8]">
              <SlidersHorizontal className="w-4 h-4" />
              <span>{t('Select Visual Tool', 'اختر أداة الرؤية المتخصصة', 'Choisir l\'outil visuel')}</span>
            </div>
            <span className="text-[11px] text-[#B9CDE3]/70 hidden sm:inline">
              {t('Shortcuts: C = Cash, T = OCR, S = Stop voice, V = Scene, O = Item Finder, P = Face', 'اختصارات لوحة المفاتيح: C = نقود، T = نص، S = إيقاف الصوت، V = مشهد، O = أشياء، P = وجوه')}
            </span>
          </div>

          <div
            role="tablist"
            aria-label={t('Visual Tools', 'أدوات الرؤية')}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5"
          >
            {VISUAL_TOOLS.map((tool) => {
              const isSelected = activeTool === tool.id;
              const ToolIcon = tool.Icon;
              const title = companionLang === 'ar' ? tool.titleAr : companionLang === 'fr' ? tool.titleFr : tool.titleEn;
              const badge = companionLang === 'ar' ? tool.badgeAr : companionLang === 'fr' ? tool.badgeFr : tool.badgeEn;

              return (
                <button
                  key={tool.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleSwitchTool(tool.id)}
                  className={`min-h-[64px] p-2.5 sm:p-3 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8] ${
                    isSelected
                      ? 'bg-[#00AEB8]/15 border-[#00AEB8] text-[#F5F8FF] shadow-lg shadow-[#00AEB8]/20 ring-1 ring-[#00AEB8]'
                      : 'bg-[#082344] border-[#07558A] text-[#B9CDE3] hover:text-white hover:border-[#00AEB8]/60 hover:bg-[#092747]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-[#00AEB8] text-[#061A33]' : 'bg-[#092747] text-[#00AEB8]'
                      }`}
                    >
                      <ToolIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#061A33] text-[#00AEB8] border border-[#07558A]/80">
                      {tool.keyboardShortcut}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-tight truncate">{title}</h3>
                    <p className="text-[10px] text-[#B9CDE3]/70 truncate">{badge}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 1.75 TARGET OBJECT FINDER QUERY BAR (When Object Finder tool is active) ── */}
        {activeTool === 'object' && (
          <section
            aria-label={t('Item Finder Search', 'البحث عن غرض محدد')}
            className="p-4 sm:p-5 rounded-3xl bg-[#082344] border border-[#07558A] shadow-lg space-y-2 text-start"
          >
            <label htmlFor="target-item-input" className="block text-xs sm:text-sm font-bold text-[#00AEB8]">
              {t('What item are you looking for?', 'ما هو الغرض أو الشيء الذي تبحث عنه الآن؟')}
            </label>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#00AEB8] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="target-item-input"
                  type="text"
                  value={targetItemQuery}
                  onChange={(e) => setTargetItemQuery(e.target.value)}
                  placeholder={t(
                    'e.g. Keys, wallet, glasses, phone, medication bottle...',
                    'مثال: المفاتيح، المحفظة، النظارة، الهاتف، علبة الدواء...'
                  )}
                  className="w-full ps-9 pe-4 py-2.5 rounded-2xl bg-[#061A33] border border-[#07558A] text-[#F5F8FF] text-xs sm:text-sm outline-none focus:border-[#00AEB8] placeholder:text-[#B9CDE3]/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      describeScene(companionLang);
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => describeScene(companionLang)}
                disabled={status === 'analyzing'}
                className="px-5 py-2.5 rounded-2xl bg-[#00AEB8] hover:bg-[#0878BD] text-[#061A33] hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {t('Search Scene', 'ابحث في المشهد')}
              </button>
            </div>
            <p className="text-[11px] text-[#B9CDE3]/70">
              {t(
                'Point the camera slowly around the room. The assistant will guide you using clock positions (e.g. at 2 o\'clock).',
                'حرّك الكاميرا ببطء في الغرفة. سيخبرك المساعد بموقع الغرض بساعة الحائط (مثال: عند الساعة الثانية).'
              )}
            </p>
          </section>
        )}

        {/* ── 2. CAMERA PREVIEW VIEW FINDER ── */}
        <section
          aria-label={t('Camera Viewfinder', 'شاشة الكاميرا')}
          className="relative rounded-3xl bg-[#082344] border border-[#07558A] overflow-hidden shadow-2xl min-h-[340px] sm:min-h-[420px] md:min-h-[480px] flex items-center justify-center group"
        >
          {/* Active Tool Badge at Viewfinder Corner */}
          {(() => {
            const activeToolConfig = VISUAL_TOOLS.find((t) => t.id === activeTool) || VISUAL_TOOLS[0];
            const ToolIcon = activeToolConfig.Icon;
            return (
              <div className="absolute top-6 start-6 z-20 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#061A33]/85 border border-[#00AEB8] text-[#F5F8FF] backdrop-blur-md shadow-md">
                  <ToolIcon className="w-3.5 h-3.5 text-[#00AEB8]" />
                  <span>
                    {companionLang === 'ar'
                      ? activeToolConfig.titleAr
                      : companionLang === 'fr'
                      ? activeToolConfig.titleFr
                      : activeToolConfig.titleEn}
                  </span>
                </span>
              </div>
            );
          })()}
          {/* Cyan/Teal Corner Viewfinder Brackets */}
          <div className="absolute top-5 start-5 w-8 h-8 sm:w-10 sm:h-10 border-s-2 border-t-2 border-[#00AEB8] rounded-tl-xl pointer-events-none z-10" />
          <div className="absolute top-5 end-5 w-8 h-8 sm:w-10 sm:h-10 border-e-2 border-t-2 border-[#00AEB8] rounded-tr-xl pointer-events-none z-10" />
          <div className="absolute bottom-5 start-5 w-8 h-8 sm:w-10 sm:h-10 border-s-2 border-b-2 border-[#00AEB8] rounded-bl-xl pointer-events-none z-10" />
          <div className="absolute bottom-5 end-5 w-8 h-8 sm:w-10 sm:h-10 border-e-2 border-b-2 border-[#00AEB8] rounded-br-xl pointer-events-none z-10" />

          {/* Real Video Feed when active */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              status === 'ready' && streamRef.current ? 'opacity-100' : 'opacity-0 absolute inset-0'
            }`}
          />

          {/* Top Overlays when stream is active */}
          {status === 'ready' && streamRef.current && (
            <div className="absolute top-6 end-6 z-20 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#061A33]/80 border border-[#07558A] text-[#00AEB8] backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#00AEB8] animate-pulse" />
                <span>{t('Live Camera', 'بث مباشر')}</span>
              </span>
              <button
                type="button"
                onClick={stopCamera}
                aria-label={t('Stop Camera', 'إيقاف الكاميرا')}
                title={t('Stop Camera', 'إيقاف الكاميرا')}
                className="p-2 rounded-xl bg-[#061A33]/80 border border-[#07558A] text-[#B9CDE3] hover:text-white transition-all cursor-pointer backdrop-blur-md"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={flipCamera}
                aria-label={t('Flip camera facing mode', 'تبديل الكاميرا')}
                className="p-2 rounded-xl bg-[#061A33]/80 border border-[#07558A] text-[#B9CDE3] hover:text-white transition-all cursor-pointer backdrop-blur-md"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={t('Toggle fullscreen', 'ملء الشاشة')}
                className="p-2 rounded-xl bg-[#061A33]/80 border border-[#07558A] text-[#B9CDE3] hover:text-white transition-all cursor-pointer backdrop-blur-md"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* In-Viewfinder Floating Capture Shutter Control Bar (Anchored at Bottom Center) */}
          {status === 'ready' && streamRef.current && (() => {
            const activeToolConfig = VISUAL_TOOLS.find((t) => t.id === activeTool) || VISUAL_TOOLS[0];
            const ToolIcon = activeToolConfig.Icon;
            const primaryBtnLabel =
              companionLang === 'ar'
                ? activeToolConfig.captureBtnAr
                : companionLang === 'fr'
                ? activeToolConfig.captureBtnFr
                : activeToolConfig.captureBtnEn;
            const uploadBtnLabel =
              companionLang === 'ar'
                ? activeToolConfig.uploadBtnAr
                : companionLang === 'fr'
                ? activeToolConfig.uploadBtnFr
                : activeToolConfig.uploadBtnEn;

            return (
              <div data-testid="viewfinder-floating-shutter" className="absolute bottom-6 inset-x-0 z-20 flex flex-wrap items-center justify-center gap-3 px-4 pointer-events-none">
                <button
                  type="button"
                  onClick={() => describeScene(companionLang)}
                  disabled={(status as string) === 'analyzing'}
                  data-testid="floating-capture-shutter-btn"
                  aria-label={primaryBtnLabel}
                  className="pointer-events-auto px-7 sm:px-9 py-3.5 min-h-[50px] rounded-full bg-[#00AEB8] hover:bg-[#0878BD] text-[#061A33] hover:text-white font-black text-sm sm:text-base shadow-2xl shadow-[#00AEB8]/50 flex items-center justify-center gap-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md outline-none focus-visible:ring-4 focus-visible:ring-white disabled:opacity-50"
                >
                  <ToolIcon className="w-5 h-5 fill-current" />
                  <span>{primaryBtnLabel}</span>
                  <ArrowLeft className={`w-4 h-4 ${isAr ? '' : 'rotate-180'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="floating-upload-btn"
                  aria-label={uploadBtnLabel}
                  title={uploadBtnLabel}
                  className="pointer-events-auto p-3.5 min-h-[50px] min-w-[50px] rounded-full bg-[#061A33]/85 hover:bg-[#082344] text-[#00AEB8] hover:text-white border border-[#07558A] hover:border-[#00AEB8] shadow-xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
                >
                  <Upload className="w-5 h-5" />
                </button>
              </div>
            );
          })()}

          {/* Empty State when camera is not yet active */}
          {(!streamRef.current || status !== 'ready') && (() => {
            const activeToolConfig = VISUAL_TOOLS.find((t) => t.id === activeTool) || VISUAL_TOOLS[0];
            const ToolIcon = activeToolConfig.Icon;
            const openCamBtnLabel =
              companionLang === 'ar'
                ? activeToolConfig.openCamBtnAr
                : companionLang === 'fr'
                ? activeToolConfig.openCamBtnFr
                : activeToolConfig.openCamBtnEn;
            const uploadBtnLabel =
              companionLang === 'ar'
                ? activeToolConfig.uploadBtnAr
                : companionLang === 'fr'
                ? activeToolConfig.uploadBtnFr
                : activeToolConfig.uploadBtnEn;
            const toolTitle =
              companionLang === 'ar'
                ? activeToolConfig.titleAr
                : companionLang === 'fr'
                ? activeToolConfig.titleFr
                : activeToolConfig.titleEn;

            return (
              <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-lg">
                {status === 'starting-camera' ? (
                  <>
                    <Loader2 className="w-12 h-12 text-[#00AEB8] animate-spin" />
                    <p className="text-[#F5F8FF] font-bold text-sm sm:text-base">
                      {t('Starting camera stream...', 'جاري تشغيل الكاميرا...')}
                    </p>
                    <p className="text-xs text-[#B9CDE3]/80">
                      {t('Please allow camera access when prompted.', 'يرجى السماح بالوصول للكاميرا إذا طُلب منك ذلك.')}
                    </p>
                    <div className="flex items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-4 py-2 rounded-xl bg-[#00AEB8] text-[#061A33] font-bold text-xs hover:bg-[#0878BD] hover:text-white transition-all cursor-pointer"
                      >
                        {t('Retry Camera', 'إعادة محاولة الكاميرا')}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-[#092747] border border-[#07558A] text-[#F5F8FF] font-bold text-xs hover:border-[#00AEB8] transition-all cursor-pointer"
                      >
                        {uploadBtnLabel}
                      </button>
                    </div>
                  </>
                ) : status === 'no-camera' ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                      <CameraOff className="w-7 h-7" />
                    </div>
                    <p className="text-[#F5F8FF] font-bold text-sm sm:text-base">
                      {t('No camera detected on this device', 'لم يتم العثور على كاميرا في هذا الجهاز')}
                    </p>
                    <p className="text-xs text-[#B9CDE3] leading-relaxed max-w-xs">
                      {t(
                        'Connect a webcam or use the image upload option below to analyze photos from your files.',
                        'يرجى توصيل كاميرا خارجية أو استخدام خيار رفع صورة من ملفات جهازك.'
                      )}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-5 py-2.5 rounded-xl bg-[#00AEB8] text-[#061A33] font-bold text-xs hover:bg-[#0878BD] hover:text-white transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{openCamBtnLabel}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 rounded-xl bg-[#092747] border border-[#07558A] text-[#F5F8FF] font-bold text-xs hover:border-[#00AEB8] transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4 text-[#00AEB8]" />
                        <span>{uploadBtnLabel}</span>
                      </button>
                    </div>
                  </>
                ) : status === 'camera-in-use' ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <p className="text-[#F5F8FF] font-bold text-sm sm:text-base">
                      {t('Camera is currently in use', 'الكاميرا قيد الاستخدام حالياً')}
                    </p>
                    <p className="text-xs text-[#B9CDE3] leading-relaxed max-w-xs">
                      {t(
                        'Another application is using your webcam. Please close other camera apps and click retry.',
                        'هناك تطبيق آخر يستخدم الكاميرا الآن. يرجى إغلاق التطبيقات الأخرى ثم الضغط على إعادة المحاولة.'
                      )}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-5 py-2.5 rounded-xl bg-[#00AEB8] text-[#061A33] font-bold text-xs hover:bg-[#0878BD] hover:text-white transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{openCamBtnLabel}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 rounded-xl bg-[#092747] border border-[#07558A] text-[#F5F8FF] font-bold text-xs hover:border-[#00AEB8] transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4 text-[#00AEB8]" />
                        <span>{uploadBtnLabel}</span>
                      </button>
                    </div>
                  </>
                ) : status === 'unsupported' ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <p className="text-[#F5F8FF] font-bold text-sm sm:text-base">
                      {t('Camera requires HTTPS or supported browser', 'الكاميرا تتطلب اتصالاً آمناً أو متصفحاً مدعوماً')}
                    </p>
                    <p className="text-xs text-[#B9CDE3] leading-relaxed max-w-xs">
                      {t(
                        'Please access Cognify over HTTPS, or use the image upload option below.',
                        'يرجى فتح التطبيق عبر اتصال آمن (HTTPS) أو استخدام رفع صورة من جهازك.'
                      )}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 rounded-xl bg-[#00AEB8] text-[#061A33] font-bold text-xs hover:bg-[#0878BD] hover:text-white transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4 text-[#061A33]" />
                        <span>{uploadBtnLabel}</span>
                      </button>
                    </div>
                  </>
                ) : status === 'camera-denied' ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <p className="text-[#F5F8FF] font-bold text-sm sm:text-base">
                      {t('Camera access needed or denied', 'تم حظر الكاميرا أو تحتاج إذن')}
                    </p>
                    <p className="text-xs text-[#B9CDE3] leading-relaxed max-w-xs">
                      {t(
                        'Click the lock or camera icon in your browser address bar to allow camera access, or use image upload below.',
                        'اضغط على رمز القفل أو الكاميرا في شريط المتصفح للسماح بالكاميرا، أو استخدم خيار رفع صورة من جهازك.'
                      )}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-5 py-2.5 rounded-xl bg-[#00AEB8] text-[#061A33] font-bold text-xs hover:bg-[#0878BD] hover:text-white transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{openCamBtnLabel}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 rounded-xl bg-[#092747] border border-[#07558A] text-[#F5F8FF] font-bold text-xs hover:border-[#00AEB8] transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4 text-[#00AEB8]" />
                        <span>{uploadBtnLabel}</span>
                      </button>
                    </div>
                  </>
                ) : status === 'timeout' ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Clock className="w-7 h-7" />
                    </div>
                    <p className="text-[#F5F8FF] font-bold text-sm sm:text-base">
                      {t('Camera request timed out', 'استغرقت الكاميرا وقتاً طويلاً للاستجابة')}
                    </p>
                    <p className="text-xs text-[#B9CDE3] leading-relaxed max-w-xs">
                      {t(
                        'The camera did not respond in time or permission took too long to grant. Please allow camera permissions and click Retry.',
                        'لم تستجب الكاميرا في الوقت المحدد أو استغرق منح الإذن وقتاً طويلاً. يرجى التأكد من السماح بالكاميرا ثم الضغط على إعادة المحاولة.'
                      )}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-5 py-2.5 rounded-xl bg-[#00AEB8] text-[#061A33] font-bold text-xs hover:bg-[#0878BD] hover:text-white transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{t('Retry Camera', 'إعادة محاولة الكاميرا')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 rounded-xl bg-[#092747] border border-[#07558A] text-[#F5F8FF] font-bold text-xs hover:border-[#00AEB8] transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4 text-[#00AEB8]" />
                        <span>{uploadBtnLabel}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-[#0878BD]/25 border-2 border-[#00AEB8] flex items-center justify-center text-[#00AEB8] shadow-lg shadow-[#00AEB8]/20">
                      <ToolIcon className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-bold text-[#F5F8FF]">
                        {toolTitle}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#B9CDE3] max-w-sm">
                        {companionLang === 'ar' ? activeToolConfig.shortDescAr : companionLang === 'fr' ? activeToolConfig.shortDescFr : activeToolConfig.shortDescEn}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        aria-label={openCamBtnLabel}
                        className="px-6 py-3 min-h-[48px] rounded-2xl bg-[#00AEB8] hover:bg-[#0878BD] text-[#061A33] hover:text-white font-bold text-sm flex items-center gap-2.5 shadow-xl shadow-[#00AEB8]/30 transition-all hover:scale-105 active:scale-95 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-white"
                      >
                        <Camera className="w-5 h-5" />
                        <span>{openCamBtnLabel}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label={uploadBtnLabel}
                        className="px-5 py-3 min-h-[48px] rounded-2xl bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] text-[#F5F8FF] font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
                      >
                        <Upload className="w-4 h-4 text-[#00AEB8]" />
                        <span>{uploadBtnLabel}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => playDemoSample(companionLang, activeTool)}
                        aria-label={t('Test Audio', 'تجربة الصوت')}
                        className="px-4 py-3 min-h-[48px] rounded-2xl bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] text-[#F5F8FF] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
                      >
                        <Volume2 className="w-4 h-4 text-[#00AEB8]" />
                        <span>{t('Test Audio', 'تجربة الصوت')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Analyzing Overlay Spinner */}
          {status === 'analyzing' && (
            <div className="absolute inset-0 bg-[#061A33]/85 backdrop-blur-xs flex flex-col items-center justify-center z-30 space-y-3 p-4">
              <Loader2 className="w-12 h-12 text-[#00AEB8] animate-spin" />
              <p className="text-[#F5F8FF] font-bold text-sm sm:text-base animate-pulse">
                {announce || t('Analyzing scene in front of you...', 'بحلل اللي قدامك في الكاميرا...')}
              </p>
            </div>
          )}
        </section>

        {/* ── 3. PRIMARY & SECONDARY ACTION CONTROLS ROW ── */}
        {(() => {
          const activeToolConfig = VISUAL_TOOLS.find((t) => t.id === activeTool) || VISUAL_TOOLS[0];
          const PrimaryToolIcon = activeToolConfig.Icon;
          const primaryBtnLabel =
            companionLang === 'ar'
              ? activeToolConfig.captureBtnAr
              : companionLang === 'fr'
              ? activeToolConfig.captureBtnFr
              : activeToolConfig.captureBtnEn;
          const openCamBtnLabel =
            companionLang === 'ar'
              ? activeToolConfig.openCamBtnAr
              : companionLang === 'fr'
              ? activeToolConfig.openCamBtnFr
              : activeToolConfig.openCamBtnEn;
          const uploadBtnLabel =
            companionLang === 'ar'
              ? activeToolConfig.uploadBtnAr
              : companionLang === 'fr'
              ? activeToolConfig.uploadBtnFr
              : activeToolConfig.uploadBtnEn;

          const isCamStreaming = status === 'ready' && !!streamRef.current;

          return (
            <section
              aria-label={t('Visual Assistant Actions', 'إجراءات المساعد البصري')}
              className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-1"
            >
              {/* Camera Activation / Stop Toggle Button */}
              <button
                type="button"
                onClick={isCamStreaming ? stopCamera : () => startCamera()}
                aria-label={isCamStreaming ? t('Stop Camera', 'إيقاف الكاميرا') : openCamBtnLabel}
                className="px-5 py-3 min-h-[46px] rounded-full bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] hover:bg-[#082344] text-[#F5F8FF] font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
              >
                <Camera className={`w-4 h-4 ${isCamStreaming ? 'text-emerald-400' : 'text-[#00AEB8]'}`} />
                <span>{isCamStreaming ? t('Stop Camera', 'إيقاف الكاميرا') : openCamBtnLabel}</span>
              </button>

              {/* Primary Action: Dedicated Capture Button for the Active Visual Tool */}
              <button
                type="button"
                onClick={() => describeScene(companionLang)}
                disabled={status === 'analyzing'}
                aria-label={primaryBtnLabel}
                className="px-8 sm:px-10 py-3.5 min-h-[50px] rounded-full bg-[#00AEB8] hover:bg-[#0878BD] text-[#061A33] hover:text-white font-black text-sm sm:text-base shadow-xl shadow-[#00AEB8]/30 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 disabled:pointer-events-none"
              >
                <PrimaryToolIcon className="w-5 h-5 fill-current" />
                <span>{primaryBtnLabel}</span>
                <ArrowLeft className={`w-4 h-4 ${isAr ? '' : 'rotate-180'}`} />
              </button>

              {/* Secondary Action: Upload Image */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={uploadBtnLabel}
                className="px-6 py-3 min-h-[46px] rounded-full bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] hover:bg-[#082344] text-[#F5F8FF] font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
              >
                <Upload className="w-4 h-4 text-[#00AEB8]" />
                <span>{uploadBtnLabel}</span>
              </button>

              {/* Quick Action: If not on Cash, offer Cash; if on Cash, offer Scene */}
              {activeTool !== 'currency' ? (
                <button
                  type="button"
                  onClick={() => {
                    handleSwitchTool('currency');
                    describeScene(companionLang, undefined, undefined, false, 'currency');
                  }}
                  aria-label={t('Identify Banknote / Cash', 'فحص وقراءة العملة')}
                  className="px-5 py-3 min-h-[46px] rounded-full bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] hover:bg-[#082344] text-[#F5F8FF] font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
                >
                  <Banknote className="w-4 h-4 text-[#00AEB8]" />
                  <span>{t('Cash Reader', 'قارئ العملات')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleSwitchTool('scene');
                    describeScene(companionLang, undefined, undefined, false, 'scene');
                  }}
                  aria-label={t('What is in front of me now? Analyze camera scene', 'ماذا أمامي الآن؟ فحص المشهد')}
                  className="px-5 py-3 min-h-[46px] rounded-full bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] hover:bg-[#082344] text-[#F5F8FF] font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
                >
                  <Eye className="w-4 h-4 text-[#00AEB8]" />
                  <span>{t('Scene Assistant', 'المساعد البصري')}</span>
                </button>
              )}

              {/* Secondary Action: Read Text / OCR */}
              <button
                type="button"
                onClick={() => {
                  handleSwitchTool('read');
                  describeScene(companionLang, undefined, 'read', false, 'read');
                }}
                aria-label={t('Read printed text or signs aloud', 'قراءة النص واللافتات بصوت مسموع')}
                className="px-5 py-3 min-h-[46px] rounded-full bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] hover:bg-[#082344] text-[#F5F8FF] font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
              >
                <FileText className="w-4 h-4 text-[#00AEB8]" />
                <span>{t('Read Text', 'قراءة النص')}</span>
              </button>

              {/* Secondary Action: Test Audio / Demo Sample */}
              <button
                type="button"
                onClick={() => playDemoSample(companionLang, activeTool)}
                aria-label={t('Test spoken voice audio sample', 'تجربة الصوت وعينة وصف حية')}
                className="px-5 py-3 min-h-[46px] rounded-full bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] hover:bg-[#082344] text-[#F5F8FF] font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
              >
                <Volume2 className="w-4 h-4 text-[#00AEB8]" />
                <span>{t('Test Audio', 'تجربة الصوت')}</span>
              </button>
            </section>
          );
        })()}

        {/* ── 4. LATEST RESULT SECTION ("آخر نتيجة") ── */}
        <section
          aria-label={t('Latest Analysis Result', 'آخر نتيجة')}
          className="p-5 sm:p-6 md:p-7 rounded-3xl bg-[#092747] border border-[#07558A] shadow-xl space-y-5 text-start"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#07558A]/50">
            <div className="flex items-center gap-2.5 text-[#00AEB8]">
              <Sparkles className="w-4 h-4" />
              <h2 className="text-base sm:text-lg font-bold text-[#F5F8FF]">
                {t('Latest Result', 'آخر نتيجة')}
              </h2>
              {/* Observation Source Badge */}
              {lastDescription && (
                <span
                  data-testid="observation-source-badge"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    observationType === 'live'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : observationType === 'uploaded'
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                      : observationType === 'uncertain'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-[#00AEB8]/15 border-[#00AEB8]/40 text-[#00AEB8]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span>
                    {observationType === 'live'
                      ? t('Live Camera', 'بث مباشر')
                      : observationType === 'uploaded'
                      ? t('Uploaded Photo', 'صورة مرفوعة')
                      : observationType === 'uncertain'
                      ? t('Uncertain Result', 'نتيجة غير مؤكدة')
                      : t('Previous Observation', 'ملاحظة سابقة')}
                  </span>
                </span>
              )}
            </div>

            {observationTimestamp && (
              <span className="text-[11px] text-[#B9CDE3]/70 font-medium">
                {new Date(observationTimestamp).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          {/* Content */}
          {lastDescription ? (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                {/* Thumbnail */}
                <div className="w-full sm:w-44 h-28 sm:h-32 rounded-2xl overflow-hidden border border-[#07558A] bg-[#082344] shrink-0 relative flex items-center justify-center">
                  {lastSnapshot ? (
                    <img
                      src={lastSnapshot}
                      alt={t('Analyzed camera snapshot', 'لقطة المشهد')}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-10 h-10 text-[#00AEB8]/60" />
                  )}
                </div>

                {/* Description text */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-[#F5F8FF]">
                    {(() => {
                      const activeToolConfig = VISUAL_TOOLS.find((t) => t.id === activeTool) || VISUAL_TOOLS[0];
                      return companionLang === 'ar'
                        ? activeToolConfig.titleAr
                        : companionLang === 'fr'
                        ? activeToolConfig.titleFr
                        : activeToolConfig.titleEn;
                    })()}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#B9CDE3] leading-relaxed font-normal select-text">
                    {lastDescription}
                  </p>
                </div>

                {/* Primary result action controls */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0">
                  {lastSnapshot && (
                    <button
                      type="button"
                      onClick={() => describeScene(companionLang, lastSnapshot)}
                      disabled={status === 'analyzing'}
                      aria-label={t('Retry analysis on this image', 'إعادة فحص هذه اللقطة')}
                      className="px-4 py-2.5 rounded-full bg-[#082344] border border-[#07558A] hover:border-[#00AEB8] text-[#00AEB8] hover:text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{t('Retry Analysis', 'إعادة الفحص')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={toggleSpeech}
                    aria-label={
                      isSpeaking
                        ? t('Stop speech readout', 'إيقاف الصوت')
                        : t('Listen to description aloud', 'استمع للوصف')
                    }
                    className="px-5 py-2.5 rounded-full bg-[#082344] border border-[#07558A] hover:border-[#00AEB8] text-[#F5F8FF] hover:text-[#00AEB8] font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#00AEB8] text-[#061A33] flex items-center justify-center font-bold">
                      {isSpeaking ? (
                        <span className="w-2.5 h-2.5 bg-[#061A33] rounded-xs" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </div>
                    <span>{isSpeaking ? t('Stop Voice', 'إيقاف الصوت') : t('Listen to Description', 'استمع للوصف')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={openSaveDialog}
                    aria-label={t('Remember this scene as a memory', 'حفظ هذا المشهد في الذاكرة')}
                    title={t('Save to Memory', 'حفظ')}
                    className="p-2.5 rounded-full bg-[#082344] border border-[#07558A] text-[#B9CDE3] hover:text-[#00AEB8] hover:border-[#00AEB8] transition-all cursor-pointer"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Extended Assistive Action Bar: Scene Comparison & Follow-up Q&A */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#07558A]/40">
                <button
                  type="button"
                  onClick={compareWithPreviousScene}
                  disabled={isComparingScene || !lastSnapshot}
                  className="px-4 py-2 rounded-xl bg-[#082344] border border-[#07558A] hover:border-[#00AEB8] text-[#F5F8FF] hover:text-[#00AEB8] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isComparingScene ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00AEB8]" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-[#00AEB8]" />
                  )}
                  <span>{t('Compare with Previous Scene', 'مقارنة مع المشهد السابق')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFollowUp((prev) => !prev)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    showFollowUp
                      ? 'bg-[#00AEB8] text-[#061A33] border-[#00AEB8]'
                      : 'bg-[#082344] border-[#07558A] text-[#F5F8FF] hover:border-[#00AEB8]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t('Ask about this photo', 'اسأل عن الصورة')}</span>
                </button>
              </div>

              {/* Raw OCR Text Review Box (For OCR Tool) */}
              {activeTool === 'read' && lastDescription && (
                <div className="p-4 rounded-2xl bg-[#061A33] border border-[#07558A] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#00AEB8]">
                      <FileText className="w-4 h-4" />
                      <span>{t('Extracted Text Content', 'النص المستخرج من الصورة')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(lastDescription);
                        setCopiedText(true);
                        setTimeout(() => setCopiedText(false), 2000);
                        const msg = companionLang === 'ar' ? 'تم نسخ النص إلى الحافظة.' : 'Text copied to clipboard.';
                        setAnnounce(msg);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#082344] border border-[#07558A] hover:border-[#00AEB8] text-xs font-bold text-[#F5F8FF] flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">{t('Copied!', 'تم النسخ!')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#00AEB8]" />
                          <span>{t('Copy Text', 'نسخ النص')}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-[#082344]/80 border border-[#07558A]/50 text-xs sm:text-sm text-[#F5F8FF] font-mono leading-relaxed select-text whitespace-pre-wrap">
                    {lastDescription}
                  </div>
                </div>
              )}

              {/* Scene Comparison Result Card */}
              {comparisonResult && (
                <div
                  role="region"
                  aria-label={t('Scene Comparison Result', 'نتيجة مقارنة المشهدين')}
                  className="p-4 rounded-2xl bg-[#082344] border-2 border-[#00AEB8]/80 space-y-2.5 text-start"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-[#07558A]">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#00AEB8]">
                      <RefreshCw className="w-4 h-4" />
                      <span>{t('Scene Differences Detected', 'الفروق والتغيرات المكتشفة في المشهد')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setComparisonResult(null)}
                      aria-label={t('Dismiss comparison', 'إغلاق المقارنة')}
                      className="text-[#B9CDE3] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-[#F5F8FF] leading-relaxed select-text">
                    {comparisonResult}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      speak(comparisonResult, companionLang === 'ar' ? 'Arabic' : 'English', {
                        rate: speechRate,
                      })
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-[#061A33] border border-[#07558A] text-[#00AEB8] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{t('Listen to Comparison', 'استمع للمقارنة')}</span>
                  </button>
                </div>
              )}

              {/* Interactive Follow-Up Q&A Panel */}
              {showFollowUp && (
                <div
                  role="region"
                  aria-label={t('Follow-up Q&A', 'الأسئلة الاستفسارية')}
                  className="p-4 sm:p-5 rounded-2xl bg-[#082344] border border-[#07558A] space-y-3.5 text-start"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#00AEB8]">
                      <MessageSquare className="w-4 h-4" />
                      <span>{t('Ask about this scene', 'محادثة واستفسار عن هذه اللقطة')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFollowUp(false)}
                      className="text-[#B9CDE3] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preset quick questions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      companionLang === 'ar' ? 'أين المفاتيح في هذه الصورة؟' : 'Where are keys in this photo?',
                      companionLang === 'ar' ? 'ما هو النص المكتوب بالضبط؟' : 'What is the exact text written?',
                      companionLang === 'ar' ? 'هل هناك أي عوائق في طريقي؟' : 'Are there obstacles in my path?',
                      companionLang === 'ar' ? 'صف ألوان الملابس بالتفصيل' : 'Describe garment colors in detail',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAskFollowUp(preset)}
                        disabled={isAnsweringFollowUp}
                        className="px-3 py-1 rounded-xl bg-[#061A33] border border-[#07558A] hover:border-[#00AEB8] text-[11px] text-[#B9CDE3] hover:text-white transition-all cursor-pointer disabled:opacity-50"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Q&A Thread History */}
                  {followUpHistory.length > 0 && (
                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 p-2 rounded-xl bg-[#061A33]">
                      {followUpHistory.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                            item.role === 'user'
                              ? 'bg-[#0878BD]/30 border border-[#0878BD] text-white ms-6'
                              : 'bg-[#092747] border border-[#07558A] text-[#B9CDE3] me-6'
                          }`}
                        >
                          <span className="font-bold text-[10px] block opacity-75 mb-1">
                            {item.role === 'user' ? t('You:', 'أنت:') : t('Assistant:', 'المساعد:')}
                          </span>
                          {item.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Follow-up input form */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={followUpQuestion}
                      onChange={(e) => setFollowUpQuestion(e.target.value)}
                      placeholder={t('Type your question about this image...', 'اكتب سؤالك عن هذه الصورة...')}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#061A33] border border-[#07558A] text-[#F5F8FF] text-xs sm:text-sm outline-none focus:border-[#00AEB8]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAskFollowUp();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAskFollowUp()}
                      disabled={isAnsweringFollowUp || !followUpQuestion.trim()}
                      className="px-4 py-2.5 rounded-xl bg-[#00AEB8] hover:bg-[#0878BD] text-[#061A33] hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isAnsweringFollowUp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 rtl:rotate-180" />
                      )}
                      <span>{t('Send', 'إرسال')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 sm:p-12 text-center rounded-2xl bg-[#082344]/50 border border-dashed border-[#07558A] space-y-2">
              <Eye className="w-8 h-8 text-[#00AEB8] mx-auto opacity-75" />
              <h3 className="text-sm sm:text-base font-bold text-[#F5F8FF]">
                {t('No scene analyzed yet', 'لم يتم إجراء أي تحليل بعد')}
              </h3>
              <p className="text-xs text-[#B9CDE3] max-w-md mx-auto leading-relaxed">
                {t(
                  'Point your camera and click "What is in front of me now?" or upload a photo to receive an instant voice description.',
                  'وجّه الكاميرا واضغط على زر «ماذا أمامي الآن؟» أو ارفع صورة لتحليل المشهد وسماع الوصف الصوتي الفوري.'
                )}
              </p>
            </div>
          )}
        </section>

        {/* ── 5. SAVED MEMORIES & SPATIAL ASSISTANCE HUB ── */}
        <section
          aria-label={t('Saved Memories and Locations', 'ذاكرة الأماكن والمقتنيات المحفوظة')}
          className="p-5 sm:p-6 md:p-7 rounded-3xl bg-[#082344] border border-[#07558A] shadow-xl space-y-4 text-start"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#07558A]/50">
            <div className="flex items-center gap-2 text-[#00AEB8]">
              <BookmarkPlus className="w-5 h-5" />
              <h2 className="text-base sm:text-lg font-bold text-[#F5F8FF]">
                {t('Saved Memories & Places', 'ذاكرة الأماكن والمقتنيات المحفوظة')}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#061A33] text-[#00AEB8] border border-[#07558A]">
                {filteredMemories.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSpatialMemory(true)}
                data-testid="open-spatial-memory-btn"
                className="px-3.5 py-1.5 rounded-xl bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] text-[#F5F8FF] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-[#00AEB8]" />
                <span>{t('Spatial Map', 'المسار المكاني')}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDocStudio(true)}
                data-testid="open-doc-studio-btn"
                className="px-3.5 py-1.5 rounded-xl bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] text-[#F5F8FF] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#00AEB8]" />
                <span>{t('Doc Studio', 'استوديو المستندات')}</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-[#061A33] rounded-xl border border-[#07558A]/60 text-xs font-bold">
              {(
                [
                  { id: 'all', labelEn: 'All', labelAr: 'الكل' },
                  { id: 'person', labelEn: 'People', labelAr: 'أشخاص' },
                  { id: 'object', labelEn: 'Objects', labelAr: 'أشياء' },
                  { id: 'document', labelEn: 'Docs', labelAr: 'وثائق' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedMemoryCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedMemoryCategory === cat.id
                      ? 'bg-[#00AEB8] text-[#061A33]'
                      : 'text-[#B9CDE3] hover:text-white'
                  }`}
                >
                  {companionLang === 'ar' ? cat.labelAr : cat.labelEn}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-[#00AEB8] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={memorySearchQuery}
                onChange={(e) => setMemorySearchQuery(e.target.value)}
                placeholder={t('Search saved memories...', 'البحث في الذاكرة...')}
                aria-label={t('Search saved memories', 'البحث في الذاكرة المحفوظة')}
                className="w-full ps-8 pe-3 py-1.5 rounded-xl bg-[#061A33] border border-[#07558A] text-[#F5F8FF] text-xs outline-none focus:border-[#00AEB8]"
              />
            </div>
          </div>

          {/* Memory Cards Grid */}
          {filteredMemories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {filteredMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-3.5 rounded-2xl bg-[#092747] border border-[#07558A] hover:border-[#00AEB8]/60 transition-all space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-6 h-6 rounded-lg bg-[#00AEB8]/15 text-[#00AEB8] flex items-center justify-center shrink-0">
                          {mem.memoryType === 'person' ? (
                            <Users className="w-3.5 h-3.5" />
                          ) : (
                            <BookmarkPlus className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-[#F5F8FF] truncate">{mem.label}</h4>
                      </div>
                      <span className="text-[10px] text-[#B9CDE3]/60 shrink-0">
                        {new Date(mem.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-[#B9CDE3] line-clamp-2 leading-relaxed">
                      {mem.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#07558A]/40">
                    <button
                      type="button"
                      onClick={() =>
                        speak(mem.description, companionLang === 'ar' ? 'Arabic' : 'English', {
                          rate: speechRate,
                        })
                      }
                      aria-label={`${t('Listen to', 'استمع إلى')} ${mem.label}`}
                      className="px-3 py-1 rounded-xl bg-[#061A33] border border-[#07558A] text-[#00AEB8] hover:text-white hover:border-[#00AEB8] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{t('Listen', 'استمع')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteMemory(mem.id)}
                      aria-label={`${t('Delete memory', 'حذف ذاكرة')} ${mem.label}`}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center rounded-2xl bg-[#061A33]/50 border border-dashed border-[#07558A] space-y-1">
              <p className="text-xs text-[#B9CDE3]">
                {memorySearchQuery
                  ? t('No memories match your search filter.', 'لا توجد عناصر مطابقة لبحثك.')
                  : t(
                      'No saved memories yet. Click the bookmark icon on any result to save it.',
                      'لم يتم حفظ أي عناصر بعد. اضغط على رمز الحفظ فوق أي نتيجة لإضافتها.'
                    )}
              </p>
            </div>
          )}
        </section>

      </div>

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      {showShortcutsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="w-full max-w-lg bg-[#082344] border border-[#07558A] rounded-3xl p-6 space-y-4 shadow-2xl text-start">
            <div className="flex items-center justify-between pb-2 border-b border-[#07558A]/50">
              <div className="flex items-center gap-2 text-[#00AEB8]">
                <HelpCircle className="w-5 h-5" />
                <h3 id="shortcuts-modal-title" className="text-base sm:text-lg font-bold text-[#F5F8FF]">
                  {t('Keyboard Shortcuts Cheatsheet', 'دليل اختصارات لوحة المفاتيح')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                aria-label={t('Close shortcuts modal', 'إغلاق نافذة الاختصارات')}
                className="p-1.5 rounded-xl bg-[#092747] border border-[#07558A] text-[#B9CDE3] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
              {[
                { key: 'V', titleEn: 'Scene Vision & Safety', titleAr: 'وصف المشهد العام والأمان' },
                { key: 'C', titleEn: 'Cash & Currency Reader', titleAr: 'قارئ العملات والنقود' },
                { key: 'T', titleEn: 'Text & Signs OCR', titleAr: 'قراءة النصوص واللافتات' },
                { key: 'K', titleEn: 'Color & Outfit Matcher', titleAr: 'فحص وتنسيق الألوان' },
                { key: 'O', titleEn: 'Target Item Finder', titleAr: 'البحث عن غرض محدد' },
                { key: 'P / F', titleEn: 'People & Face Recognition', titleAr: 'التعرف على الأشخاص والوجوه' },
                { key: 'S', titleEn: 'Stop Voice / Silence', titleAr: 'إيقاف نطق الصوت فوراً' },
                { key: '?', titleEn: 'Show / Hide Shortcuts', titleAr: 'فتح / إغلاق دليل الاختصارات' },
                { key: 'Esc', titleEn: 'Close Dialogs & Modals', titleAr: 'إغلاق النوافذ المنبثقة' },
              ].map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#061A33] border border-[#07558A]"
                >
                  <span className="text-xs text-[#F5F8FF] font-medium">
                    {companionLang === 'ar' ? shortcut.titleAr : shortcut.titleEn}
                  </span>
                  <kbd className="px-2 py-1 rounded bg-[#092747] border border-[#00AEB8]/40 text-[#00AEB8] font-mono text-xs font-bold">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-5 py-2 rounded-xl bg-[#00AEB8] text-[#061A33] font-bold text-xs hover:bg-[#0878BD] hover:text-white transition-all cursor-pointer"
              >
                {t('Close', 'إغلاق')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spatial Trajectory & Breadcrumbs Modal */}
      {showSpatialMemory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="spatial-modal-title"
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="w-full max-w-xl bg-[#082344] border border-[#07558A] rounded-3xl p-6 space-y-4 shadow-2xl text-start">
            <div className="flex items-center justify-between pb-2 border-b border-[#07558A]/50">
              <div className="flex items-center gap-2 text-[#00AEB8]">
                <Compass className="w-5 h-5" />
                <h3 id="spatial-modal-title" className="text-base sm:text-lg font-bold text-[#F5F8FF]">
                  {t('Spatial Memory & Trajectory Navigator', 'خريطة المسار المكاني والذاكرة المكانية')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSpatialMemory(false)}
                aria-label={t('Close spatial memory modal', 'إغلاق خريطة المسار')}
                className="p-1.5 rounded-xl bg-[#092747] border border-[#07558A] text-[#B9CDE3] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#B9CDE3]">
                {t(
                  'Search previously recorded spatial objects or trace room landmarks saved in your private encrypted vault.',
                  'ابحث في الأغراض والمواقع المكانية المسجلة مسبقاً أو تتبع معالم الغرفة المشفرة بأمان.'
                )}
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={spatialQueryInput}
                  onChange={(e) => setSpatialQueryInput(e.target.value)}
                  placeholder={t('e.g. Where did I leave my keys?', 'مثال: أين تركت مفاتيحي أو نظارتي؟')}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#061A33] border border-[#07558A] text-[#F5F8FF] text-xs outline-none focus:border-[#00AEB8]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && profile?.uid) {
                      const res = querySpatialMemory(profile.uid, spatialQueryInput, companionLang === 'ar' ? 'ar' : 'en');
                      setSpatialQueryResult(res.message);
                      if (res.message)
                        speak(res.message, companionLang === 'ar' ? 'Arabic' : 'English', { rate: speechRate });
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (profile?.uid) {
                      const res = querySpatialMemory(profile.uid, spatialQueryInput, companionLang === 'ar' ? 'ar' : 'en');
                      setSpatialQueryResult(res.message);
                      if (res.message)
                        speak(res.message, companionLang === 'ar' ? 'Arabic' : 'English', { rate: speechRate });
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-[#00AEB8] text-[#061A33] font-bold text-xs hover:bg-[#0878BD] hover:text-white transition-all cursor-pointer"
                >
                  {t('Query', 'استعلام')}
                </button>
              </div>

              {spatialQueryResult && (
                <div className="p-3.5 rounded-xl bg-[#061A33] border border-[#00AEB8]/40 space-y-1.5">
                  <span className="text-[11px] font-bold text-[#00AEB8]">
                    {t('Spatial Engine Answer:', 'إجابة محرك الذاكرة المكانية:')}
                  </span>
                  <p className="text-xs text-[#F5F8FF] leading-relaxed">{spatialQueryResult}</p>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-[#B9CDE3]">
                  {t('Recent Spatial Landmarks:', 'معالم مكانية حديثة:')}
                </h4>
                <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1.5">
                  {spatialRecords.length > 0 ? (
                    spatialRecords.slice(0, 5).map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2 rounded-lg bg-[#061A33] border border-[#07558A]/60 flex items-center justify-between text-xs"
                      >
                        <span className="text-[#F5F8FF] font-medium">{rec.objectName}</span>
                        <span className="text-[10px] text-[#B9CDE3]/60">
                          {rec.relativePosition?.distance ? `${rec.relativePosition.distance}` : (rec.room || 'Detected')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-[#B9CDE3]/50 italic">
                      {t('No spatial landmarks recorded yet.', 'لم يتم تسجيل معالم مكانية بعد.')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSpatialMemory(false)}
                className="px-5 py-2 rounded-xl bg-[#00AEB8] text-[#061A33] font-bold text-xs hover:bg-[#0878BD] hover:text-white transition-all cursor-pointer"
              >
                {t('Close', 'إغلاق')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Memory Dialog Modal */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[#082344] border border-[#07558A] rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-[#F5F8FF]">
              {t('Save Scene to Memory', 'حفظ المشهد في الذاكرة')}
            </h3>
            <p className="text-xs text-[#B9CDE3]">
              {t('Enter a name for this item or place to recognize it next time:', 'أدخل اسماً لهذا الشيء أو المكان ليتعرف عليه المساعد في المرات القادمة:')}
            </p>
            {/* Type Switcher: Object vs Person */}
            <div role="tablist" aria-label={companionLang === 'ar' ? 'نوع العنصر المحفوظ' : 'Memory item type'} className="flex gap-2 p-1 bg-[#061A33] rounded-xl border border-[#07558A]/60">
              <button
                type="button"
                role="tab"
                aria-selected={!isSavingPerson}
                onClick={() => setIsSavingPerson(false)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-[#00AEB8] focus:outline-none ${
                  !isSavingPerson ? 'bg-[#0878BD] text-white shadow' : 'text-[#B9CDE3] hover:text-white'
                }`}
              >
                {companionLang === 'ar' ? '📦 شيء أو غرض' : '📦 Object / Item'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSavingPerson}
                onClick={() => setIsSavingPerson(true)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-[#00AEB8] focus:outline-none ${
                  isSavingPerson ? 'bg-[#0878BD] text-white shadow' : 'text-[#B9CDE3] hover:text-white'
                }`}
              >
                {companionLang === 'ar' ? '👤 شخص أو صديق' : '👤 Person / Friend'}
              </button>
            </div>

            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder={t('e.g. My study desk, Front door key...', 'مثال: مكتبي، مفاتيح الشقة...')}
              aria-label={companionLang === 'ar' ? (isSavingPerson ? 'اسم الشخص أو الصديق' : 'اسم المكان أو الشيء') : (isSavingPerson ? 'Person or friend name' : 'Object or location label')}
              className="w-full px-4 py-2.5 rounded-xl bg-[#092747] border border-[#07558A] text-[#F5F8FF] text-sm outline-none focus:border-[#00AEB8]"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#B9CDE3] hover:text-white"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={saveMemory}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00AEB8] text-[#061A33] hover:bg-[#0878BD] hover:text-white transition-colors"
              >
                {t('Save', 'حفظ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document & Lecture Studio Modal */}
      <DocumentStudioModal
        isOpen={showDocStudio}
        onClose={() => setShowDocStudio(false)}
        profile={profile}
        companionLang={companionLang}
        onAnnounce={(msg) => setAnnounce(msg)}
      />

      {/* Parental Consent Modal for Minors */}
      <ParentalConsentModal
        isOpen={showConsentModal}
        profile={profile}
        requiredScope="camera"
        onConsentGranted={(consent) => {
          setShowConsentModal(false);
          if (setProfile) {
            setProfile({
              ...profile,
              parentalConsent: consent,
              parentEmail: consent.parentEmail,
            });
          }
          startCamera();
        }}
        onCancel={() => {
          setShowConsentModal(false);
          setStatus('camera-denied');
        }}
      />
    </div>
  );
}
