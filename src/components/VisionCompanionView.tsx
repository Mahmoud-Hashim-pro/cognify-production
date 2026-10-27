/**
 * Visual Companion (الرفيق البصري / المساعد البصري)
 * Life-assistant camera tool for blind and visually impaired users.
 * Reference-matched UI implementation with dark navy palette and teal primary action.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
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

interface VisionCompanionViewProps {
  profile: UserProfile;
  setProfile?: (profile: UserProfile) => void;
  onNavigateBack?: () => void;
}

type Status = 'idle' | 'starting-camera' | 'ready' | 'analyzing' | 'camera-denied' | 'unsupported';

const isArabicLang = (lang?: string) => isArabicLocale(lang);

const COMPANION_LANG_STORAGE_KEY = 'cognify_vision_companion_lang';

export { cleanVisionDescription } from '../lib/visionCleaner';
import { cleanVisionDescription } from '../lib/visionCleaner';
export { exportToWordDocument, DOC_HISTORY_KEY } from './DocumentStudioModal';
export type { SavedDocItem, DocChatMessage } from './DocumentStudioModal';
import DocumentStudioModal from './DocumentStudioModal';
import SpatialMemoryTrajectoryView from './SpatialMemoryTrajectoryView';
import ParentalConsentModal from './ParentalConsentModal';

export default function VisionCompanionView({ profile, setProfile, onNavigateBack }: VisionCompanionViewProps) {
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

  // Modes
  const [readMode, setReadMode] = useState(false);
  const [currencyMode, setCurrencyMode] = useState(false);
  const [faceMode, setFaceMode] = useState(false);
  const [outfitMode, setOutfitMode] = useState(false);
  const [navGuideMode, setNavGuideMode] = useState(false);
  const [shoppingMode, setShoppingMode] = useState(false);
  const [lectureMode, setLectureMode] = useState(false);
  const [readAction, setReadAction] = useState<'summarize' | 'read'>('summarize');

  // Supported languages: Arabic, English, French
  const [companionLang, setCompanionLang] = useState<'ar' | 'en' | 'fr'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(COMPANION_LANG_STORAGE_KEY);
      if (saved === 'ar' || saved === 'en' || saved === 'fr') return saved;
    }
    if (isArabicLang(profile?.language)) return 'ar';
    if (profile?.language === 'French' || (profile?.language as unknown as string) === 'fr') return 'fr';
    return 'ar';
  });

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

  const t = useCallback(
    (en: string, ar: string, fr?: string) => {
      if (companionLang === 'ar') return ar;
      if (companionLang === 'fr') return fr || en;
      return en;
    },
    [companionLang]
  );

  const isAr = companionLang === 'ar';

  const getUserMediaSafe = async (mode: 'environment' | 'user'): Promise<MediaStream> => {
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
      try {
        const stream = await Promise.race([
          navigator.mediaDevices.getUserMedia(constraints),
          new Promise<MediaStream>((_, reject) =>
            setTimeout(() => reject(new Error('CAMERA_TIMEOUT')), 15000)
          ),
        ]);
        if (stream && stream.getVideoTracks().length > 0) {
          return stream;
        }
      } catch (err: any) {
        lastError = err;
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          throw err;
        }
      }
    }

    throw lastError || new Error('NO_CAMERA_FOUND');
  };

  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        return;
      }
      setStatus('starting-camera');
      try {
        streamRef.current?.getTracks().forEach((tr) => tr.stop());
        const stream = await getUserMediaSafe(mode);

        if (!isMountedRef.current) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((playErr) => {
            console.warn('Video auto-play warning:', playErr);
          });
        }
        if (isMountedRef.current) {
          setStatus('ready');
          setAnnounce(
            companionLang === 'ar'
              ? 'الكاميرا جاهزة. اضغط على «ماذا أمامي الآن؟» لسماع الوصف الفوري.'
              : 'Camera ready. Click "What is in front of me now?" to describe the scene.'
          );
        }
      } catch (camErr: any) {
        console.warn('Camera failed or timed out:', camErr);
        if (isMountedRef.current) {
          setStatus('camera-denied');
          setAnnounce(
            companionLang === 'ar'
              ? 'الكاميرا غير مفعلة. يمكنك رفع صورة أو تجربة عينة صوتية.'
              : 'Camera access unavailable. You can upload a photo or play an audio sample.'
          );
        }
      }
    },
    [facingMode, companionLang]
  );

  useEffect(() => {
    isMountedRef.current = true;
    unlockSpeechSynthesis();
    if (!isMinorStudent || profile.parentalConsent?.verified) {
      startCamera();
    } else {
      setStatus('camera-denied');
      setAnnounce(
        companionLang === 'ar'
          ? 'يتطلب استخدام الكاميرا للطلاب القاصرين موافقة ولي الأمر الرسمية.'
          : 'Parental consent is required before camera activation for minor students.'
      );
    }
    return () => {
      isMountedRef.current = false;
      activeAbortControllerRef.current?.abort();
      activeAbortControllerRef.current = null;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      cancelSpeech();
    };
  }, []);

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

  const playDemoSample = useCallback((lang: 'ar' | 'en' | 'fr' = companionLang) => {
    let sampleText = '';
    if (readMode) {
      sampleText =
        lang === 'ar'
          ? 'المفيد من المستند: موعد المحاضرة القادمة يوم الأحد الساعة العاشرة صباحاً في القاعة الرئيسية.'
          : lang === 'fr'
          ? 'L\'essentiel : le prochain cours aura lieu dimanche à dix heures dans l\'amphithéâtre principal.'
          : 'Core takeaway: next lecture is scheduled for Sunday at 10:00 AM in the main auditorium.';
    } else {
      sampleText =
        lang === 'ar'
          ? 'تظهر الصورة على مكتب دراسة يحتوي على نبات أخضر في أصيص أبيض، وكتب مع مكتبية، وكوب أزرق على الطاولة. الإضاءة طبيعية ومناسبة للاستخدام في بيئة داخلية.'
          : lang === 'fr'
          ? 'L\'image montre un bureau d\'étude avec une plante verte dans un pot blanc, des livres et une tasse bleue. L\'éclairage est naturel et bien adapté.'
          : 'The image shows a study desk with a green potted plant in a white pot, books, and a blue mug. Lighting is natural and clear for indoor study.';
    }

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
  }, [companionLang, readMode]);

  const describeScene = async (
    choiceLang?: 'ar' | 'en' | 'fr',
    forcedFrame?: string,
    forcedAction?: 'summarize' | 'read',
    isUploadedPhoto: boolean = false
  ) => {
    const now = Date.now();
    if (now - lastCaptureAttemptRef.current < 750) {
      return;
    }
    lastCaptureAttemptRef.current = now;

    const targetLang = choiceLang || companionLang;
    setCompanionLang(targetLang);
    const activeReadAction = forcedAction || readAction;
    if (forcedAction) setReadAction(forcedAction);

    unlockSpeechSynthesis();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
      } catch {}
    }

    if (!forcedFrame && status !== 'ready' && status !== 'analyzing') {
      const errNoCam =
        targetLang === 'ar'
          ? 'الكاميرا غير متاحة حالياً، يرجى السماح بالوصول أو رفع صورة.'
          : 'Camera is not available. Please allow access or upload an image.';
      speak(errNoCam, targetLang === 'ar' ? 'Arabic' : 'English');
      fileInputRef.current?.click();
      return;
    }

    const frame = forcedFrame || captureFrame();
    if (!frame) {
      const errNoFrame =
        targetLang === 'ar'
          ? 'تعذر التقاط صورة الكاميرا، يرجى المحاولة مرة ثانية أو رفع صورة.'
          : 'Could not capture camera frame. Please try again or upload an image.';
      speak(errNoFrame, targetLang === 'ar' ? 'Arabic' : 'English');
      fileInputRef.current?.click();
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
    const waitingMsg = readMode
      ? targetLang === 'ar'
        ? 'جاري قراءة النص واستخراج المحتوى...'
        : 'Reading text and extracting content...'
      : targetLang === 'ar'
      ? 'جاري تحليل المشهد ووصفه صوتياً...'
      : "Analyzing scene and preparing voice description...";
    setAnnounce(waitingMsg);

    let prompt = '';
    const langMandate =
      targetLang === 'en'
        ? 'CRITICAL MANDATE: You MUST reply entirely in English. Do NOT use any Arabic characters or Arabic script whatsoever.\n'
        : targetLang === 'fr'
        ? 'DIRECTIVE CRITIQUE : Vous DEVEZ répondre entièrement en français. Ne produisez AUCUN caractère arabe.\n'
        : 'توجيه حاسم: تحدث باللغة العربية الواضحة والسهلة والودودة.\n';

    if (readMode || activeReadAction === 'read') {
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
      const cleaned = cleanVisionDescription(result, targetLang);
      setLastDescription(cleaned);
      setStatus('ready');
      setAnnounce(cleaned);
      setObservationType(isUploadedPhoto ? 'uploaded' : forcedFrame ? 'previous' : 'live');
      setObservationTimestamp(captureTimestamp);

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
      speak(errPrompt, targetLang === 'ar' ? 'Arabic' : 'English');
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
      memoryType: isSavingPerson ? 'person' : 'object',
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

        {/* ── 2. CAMERA PREVIEW VIEW FINDER ── */}
        <section
          aria-label={t('Camera Viewfinder', 'شاشة الكاميرا')}
          className="relative rounded-3xl bg-[#082344] border border-[#07558A] overflow-hidden shadow-2xl min-h-[340px] sm:min-h-[420px] md:min-h-[480px] flex items-center justify-center group"
        >
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

          {/* Empty State when camera is not yet active */}
          {(!streamRef.current || status !== 'ready') && (
            <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center space-y-3.5 max-w-md">
              {status === 'starting-camera' ? (
                <>
                  <Loader2 className="w-12 h-12 text-[#00AEB8] animate-spin" />
                  <p className="text-[#F5F8FF] font-bold text-sm sm:text-base">
                    {t('Starting camera stream...', 'جاري تشغيل الكاميرا...')}
                  </p>
                  <p className="text-xs text-[#B9CDE3]/80">
                    {t('Please allow camera access when prompted.', 'يرجى السماح بالوصول للكاميرا إذا طُلب منك ذلك.')}
                  </p>
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
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-4 py-2 rounded-xl bg-[#00AEB8] text-[#061A33] font-bold text-xs hover:bg-[#0878BD] hover:text-white transition-all cursor-pointer"
                    >
                      {t('Retry Camera', 'إعادة المحاولة')}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-[#092747] border border-[#07558A] text-[#F5F8FF] font-bold text-xs hover:border-[#00AEB8] transition-all cursor-pointer"
                    >
                      {t('Upload Image', 'رفع صورة')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Default Calm Empty State matching Reference Image */}
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    aria-label={t('Activate camera preview', 'تفعيل الكاميرا')}
                    className="w-16 h-16 rounded-full bg-[#0878BD]/30 border-2 border-[#00AEB8] flex items-center justify-center text-[#00AEB8] shadow-lg shadow-[#00AEB8]/20 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
                  >
                    <Camera className="w-8 h-8" />
                  </button>

                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-[#F5F8FF]">
                      {t('Point the camera at what you want to analyze', 'وجّه الكاميرا نحو ما تريد تحليله')}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#B9CDE3]">
                      {t('or use an image from your device', 'أو استخدم صورة من جهازك')}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

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
        <section
          aria-label={t('Visual Assistant Actions', 'إجراءات المساعد البصري')}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-1"
        >
          {/* Secondary Action: Upload Image */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t('Upload an image from your device', 'رفع صورة من جهازك')}
            className="px-6 py-3 min-h-[46px] rounded-full bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] hover:bg-[#082344] text-[#F5F8FF] font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
          >
            <Upload className="w-4 h-4 text-[#00AEB8]" />
            <span>{t('Upload Image', 'رفع صورة')}</span>
          </button>

          {/* Primary Action: What is in front of me now? (Prominent Teal Button) */}
          <button
            type="button"
            onClick={() => describeScene(companionLang)}
            disabled={status === 'analyzing'}
            aria-label={t('What is in front of me now? Analyze camera scene', 'ماذا أمامي الآن؟ فحص المشهد')}
            className="px-8 sm:px-10 py-3.5 min-h-[50px] rounded-full bg-[#00AEB8] hover:bg-[#0878BD] text-[#061A33] hover:text-white font-black text-sm sm:text-base shadow-xl shadow-[#00AEB8]/30 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 disabled:pointer-events-none"
          >
            <Camera className="w-5 h-5 fill-current" />
            <span>{t('What is in front of me now?', 'ماذا أمامي الآن؟')}</span>
            <ArrowLeft className={`w-4 h-4 ${isAr ? '' : 'rotate-180'}`} />
          </button>

          {/* Secondary Action: Read Text / OCR */}
          <button
            type="button"
            onClick={() => {
              toggleReadMode();
              describeScene(companionLang, undefined, 'read');
            }}
            aria-label={t('Read printed text or signs aloud', 'قراءة النص واللافتات بصوت مسموع')}
            className="px-6 py-3 min-h-[46px] rounded-full bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] hover:bg-[#082344] text-[#F5F8FF] font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
          >
            <FileText className="w-4 h-4 text-[#00AEB8]" />
            <span>{t('Read Text', 'قراءة النص')}</span>
          </button>

          {/* Secondary Action: Test Audio / Demo Sample */}
          <button
            type="button"
            onClick={() => playDemoSample(companionLang)}
            aria-label={t('Test spoken voice audio sample', 'تجربة الصوت وعينة وصف حية')}
            className="px-6 py-3 min-h-[46px] rounded-full bg-[#092747] border border-[#07558A] hover:border-[#00AEB8] hover:bg-[#082344] text-[#F5F8FF] font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00AEB8]"
          >
            <Volume2 className="w-4 h-4 text-[#00AEB8]" />
            <span>{t('Test Audio', 'تجربة الصوت')}</span>
          </button>
        </section>

        {/* ── 4. LATEST RESULT SECTION ("آخر نتيجة") ── */}
        <section
          aria-label={t('Latest Analysis Result', 'آخر نتيجة')}
          className="p-5 sm:p-6 md:p-7 rounded-3xl bg-[#092747] border border-[#07558A] shadow-xl space-y-4 text-start"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1 border-b border-[#07558A]/50">
            <div className="flex items-center gap-2 text-[#00AEB8]">
              <Sparkles className="w-4 h-4" />
              <h2 className="text-base sm:text-lg font-bold text-[#F5F8FF]">
                {t('Latest Result', 'آخر نتيجة')}
              </h2>
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
                  {readMode
                    ? t('Extracted Text', 'قراءة النص')
                    : currencyMode
                    ? t('Currency Identification', 'قراءة العملة')
                    : t('Scene Description', 'وصف المشهد')}
                </h3>
                <p className="text-xs sm:text-sm text-[#B9CDE3] leading-relaxed font-normal select-text">
                  {lastDescription}
                </p>
              </div>

              {/* Spoken playback button */}
              <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end pt-2 md:pt-0">
                <button
                  type="button"
                  onClick={toggleSpeech}
                  aria-label={isSpeaking ? t('Stop speech readout', 'إيقاف الصوت') : t('Listen to description aloud', 'استمع للوصف')}
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

      </div>

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
