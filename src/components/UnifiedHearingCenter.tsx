import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Ear,
  Camera,
  CameraOff,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Send,
  Trash2,
  Bot,
  Hand,
  Mic,
  MicOff,
  Settings,
  Sliders,
  Info,
  Check,
  X,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserProfile } from '../types';
import { localize, isArabicLocale } from '../lib/translations';
import { speak, cancelSpeech } from '../lib/tts';
import { triggerHapticAlert } from '../lib/hapticNavEngine';
import { generateAdaptiveResponse } from '../services/gemini';
import { Hands, Results } from '@mediapipe/hands';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';
import { toast } from './Toast';
import ParentalConsentModal from './ParentalConsentModal';

const SignAvatar3D = React.lazy(() => import('./SignAvatar3D'));

interface UnifiedHearingCenterProps {
  profile: UserProfile;
  onNavigateBack?: () => void;
  onMenuClick?: () => void;
  isDarkMode?: boolean;
}

type Dialect = 'Egyptian Ammiya' | 'Arabic' | 'English';

export default function UnifiedHearingCenter({
  profile,
  onNavigateBack,
  isDarkMode = true,
}: UnifiedHearingCenterProps) {
  // Dialect / Language
  const [dialect, setDialect] = useState<Dialect>(() => {
    if (profile.language === 'English') return 'English';
    if (profile.language === 'Arabic') return 'Arabic';
    return 'Egyptian Ammiya';
  });

  const isAr = isArabicLocale(dialect);
  const isEgyptian = dialect === 'Egyptian Ammiya';

  // Minor student parental consent gate
  const isMinorStudent = Boolean((profile.age && profile.age < 18) || (profile as any).isMinor);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);

  // Helper for dialect-responsive localization
  const loc = useCallback(
    (en: string, ar: string) => (dialect === 'English' ? en : ar),
    [dialect]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // RIGHT PANEL (3D SIGN AVATAR & AI TUTOR STATE)
  // ───────────────────────────────────────────────────────────────────────────
  const [avatarWords, setAvatarWords] = useState<string[]>(['مرحبا']);
  const [isAvatarPlaying, setIsAvatarPlaying] = useState<boolean>(true);
  const [currentSigningWord, setCurrentSigningWord] = useState<string>('مرحبا');
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiAnswer, setAiAnswer] = useState<string>(
    isEgyptian
      ? 'أهلاً بك! اكتب أي نص أو اسأل سؤالاً وسأشرحه لك فوراً بلغة الإشارة 3D والنص.'
      : isAr
      ? 'مرحباً بك! اكتب أي نص أو اسأل سؤالاً وسأشرحه لك فوراً بلغة الإشارة 3D والنص.'
      : 'Welcome! Type any text or ask a question and I will explain it in 3D Sign Language and text.'
  );
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isQuestionVoiceActive, setIsQuestionVoiceActive] = useState<boolean>(false);

  const triggerAvatarSign = useCallback((text: string) => {
    if (!text.trim()) return;
    const words = text
      .replace(/[^\w\u0600-\u06FF\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (words.length > 0) {
      setAvatarWords(words);
      setCurrentSigningWord(words[0]);
      setIsAvatarPlaying(true);
    }
  }, []);

  const handleReplayAvatar = () => {
    setIsAvatarPlaying(false);
    setTimeout(() => {
      setIsAvatarPlaying(true);
      if (avatarWords.length > 0) {
        setCurrentSigningWord(avatarWords[0]);
      }
    }, 80);
  };

  const handleAskAi = async (overridePrompt?: string) => {
    const q = (overridePrompt || aiQuestion).trim();
    if (!q || isAiLoading) return;

    cancelSpeech();
    setIsAiLoading(true);
    triggerHapticAlert('single-pulse');

    const prompt = `You are Cognify's specialized Deaf & Hard of Hearing AI Sign Companion.
Explain this concept or answer this question clearly, visually, and concisely in 1 to 2 short sentences in the requested language/dialect: "${dialect}".
CRITICAL: Do NOT use any English placeholders or system terms like "Other", "N/A", or "esraahosni". If the dialect is Arabic or Egyptian Ammiya, answer purely in Arabic.
Keep it simple, clear, and direct so it can be signed by a 3D Sign Avatar and read easily by a deaf student:
Question: "${q}"`;

    try {
      const response = await generateAdaptiveResponse(prompt, profile, []);
      let cleanAnswer = response
        .replace(/\bOther\b/gi, '')
        .replace(/\besraahosni\b/gi, '')
        .replace(/\bN\/A\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleanAnswer) {
        cleanAnswer = isEgyptian
          ? 'تمام، فهمت سؤالك وسأشرحه لك بلغة الإشارة.'
          : isAr
          ? 'حسناً، فهمت سؤالك وسأشرحه لك بلغة الإشارة.'
          : 'Understood, I will explain this in sign language.';
      }
      setAiAnswer(cleanAnswer);
      triggerAvatarSign(cleanAnswer);
      toast.success(
        loc('Answer generated & signed in 3D', 'تمت الإجابة والترجمة للغة الإشارة 3D')
      );
    } catch (e) {
      console.error('[AI Tutor] Request failed:', e);
      toast.error(loc('Failed to get AI answer', 'تعذر استحضار الإجابة، يرجى المحاولة ثانية'));
    } finally {
      setIsAiLoading(false);
      if (!overridePrompt) setAiQuestion('');
    }
  };

  const handleDirectSignScript = (overrideText?: string) => {
    const text = (overrideText || aiQuestion).trim();
    if (!text) return;
    cancelSpeech();
    triggerHapticAlert('single-pulse');
    setAiAnswer(text);
    triggerAvatarSign(text);
    toast.success(
      loc('Script translated directly to 3D Sign', 'تمت ترجمة النص مباشرة للغة الإشارة 3D')
    );
  };

  const toggleQuestionVoice = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error(loc('Speech recognition not supported', 'التعرف الصوتي غير مدعوم في هذا المتصفح'));
      return;
    }

    if (isQuestionVoiceActive) {
      setIsQuestionVoiceActive(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = isEgyptian ? 'ar-EG' : isAr ? 'ar-SA' : 'en-US';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => setIsQuestionVoiceActive(true);
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setAiQuestion(transcript);
          handleAskAi(transcript);
        }
      };
      rec.onerror = () => setIsQuestionVoiceActive(false);
      rec.onend = () => setIsQuestionVoiceActive(false);
      rec.start();
    } catch {
      setIsQuestionVoiceActive(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // LEFT PANEL (CAMERA SIGN RECOGNITION TO TEXT & LIVE SPEECH)
  // ───────────────────────────────────────────────────────────────────────────
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<string>('');
  const [detectedSign, setDetectedSign] = useState<string>('');
  const [accumulatedText, setAccumulatedText] = useState<string>('مرحباً، كيف حالك؟');
  const [isSpeakingCameraText, setIsSpeakingCameraText] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [autoVoice, setAutoVoice] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<MediaPipeCamera | null>(null);
  const lastDetectedSignRef = useRef<string>('');
  const lastSignTimeRef = useRef<number>(0);
  const showSkeletonRef = useRef<boolean>(true);
  showSkeletonRef.current = showSkeleton;
  const autoVoiceRef = useRef<boolean>(false);
  autoVoiceRef.current = autoVoice;

  // Gesture heuristic analyzer based on 21 MediaPipe hand landmarks
  const analyzeLandmarksGesture = useCallback((landmarks: Array<{ x: number; y: number; z: number }>): string | null => {
    if (!landmarks || landmarks.length < 21) return null;

    const thumbTip = landmarks[4];
    const thumbBase = landmarks[2];
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];

    const isIndexExtended = indexTip.y < indexPip.y;
    const isMiddleExtended = middleTip.y < middlePip.y;
    const isRingExtended = ringTip.y < ringPip.y;
    const isPinkyExtended = pinkyTip.y < pinkyPip.y;
    const isThumbUp = thumbTip.y < thumbBase.y && thumbTip.y < indexPip.y;

    // 1. I Love You / Deaf Symbol (🤟): Thumb, Index, Pinky extended; Middle and Ring curled
    if (isThumbUp && isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended) {
      return isEgyptian ? 'أنا أصم' : isAr ? 'أنا أصم' : 'I am deaf';
    }

    // 2. Thumbs Up (👍): Thumb extended up, all 4 other fingers curled
    if (isThumbUp && !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return isEgyptian ? 'تمام وموافق' : isAr ? 'نعم أوافق' : 'Yes, OK';
    }

    // 3. Open Hand / Greeting (👋): All 5 fingers extended
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
      return isEgyptian ? 'أهلاً وسهلاً' : isAr ? 'السلام عليكم' : 'Hello';
    }

    // 4. Index Point / "I / Need" (☝️): Only Index extended
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return isEgyptian ? 'أنا محتاج مساعدة' : isAr ? 'أحتاج مساعدة' : 'I need help';
    }

    // 5. Peace / Two (✌️): Index & Middle extended, others curled
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return isEgyptian ? 'لحظة واحدة' : isAr ? 'لحظة واحدة' : 'One moment';
    }

    // 6. Fist (✊): All fingers curled
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && !isThumbUp) {
      return isEgyptian ? 'لا شكراً' : isAr ? 'لا شكراً' : 'No thank you';
    }

    return null;
  }, [isAr, isEgyptian]);

  // Handle MediaPipe hands results
  const onHandsResults = useCallback((results: Results) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      if (showSkeletonRef.current) {
        // Draw skeleton connecting points in sleek cyan
        ctx.strokeStyle = '#12CFE0';
        ctx.lineWidth = 2.5;
        ctx.fillStyle = '#10B8B0';

        for (let i = 0; i < landmarks.length; i++) {
          const x = landmarks[i].x * canvas.width;
          const y = landmarks[i].y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Analyze gesture
      const recognized = analyzeLandmarksGesture(landmarks as any);
      if (recognized) {
        setDetectedSign(recognized);

        const now = Date.now();
        // Debounce repeated emissions: 1.8 seconds cooldown for same sign
        if (now - lastSignTimeRef.current > 1800 || lastDetectedSignRef.current !== recognized) {
          lastSignTimeRef.current = now;
          lastDetectedSignRef.current = recognized;
          triggerHapticAlert('single-pulse');

          // Append to recognized text
          setAccumulatedText((prev) => {
            const separator = prev.trim() ? ' ' : '';
            return prev + separator + recognized;
          });

          if (autoVoiceRef.current) {
            speak(recognized, dialect);
          }
        }
      }
    } else {
      setDetectedSign('');
    }
  }, [analyzeLandmarksGesture, dialect]);

  // Start Camera handler
  const handleStartCamera = async () => {
    if (isMinorStudent && !profile.parentalConsent?.verified) {
      setShowConsentModal(true);
      toast.error(loc('Parental consent is legally required before camera activation for minors.', 'موافقة ولي الأمر مطلوبة قانونياً قبل تشغيل الكاميرا للطلاب القاصرين.'));
      return;
    }

    try {
      setCameraStatus(loc('Opening camera…', 'جاري تشغيل الكاميرا…'));

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialize MediaPipe Hands
      const hands = new Hands({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.6,
      });
      hands.onResults(onHandsResults);
      handsRef.current = hands;

      if (videoRef.current) {
        const camera = new MediaPipeCamera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && videoRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });
        camera.start();
        cameraRef.current = camera;
      }

      setIsCameraActive(true);
      setCameraStatus(loc('Camera Active', 'الكاميرا تعمل'));
      triggerHapticAlert('single-pulse');
    } catch (err) {
      console.error('[SignCamera] Failed to open camera:', err);
      toast.error(loc('Camera access denied or unavailable', 'تعذر فتح الكاميرا، يرجى السماح بالإذن'));
      setCameraStatus('');
      setIsCameraActive(false);
    }
  };

  const handleStopCamera = () => {
    try {
      cameraRef.current?.stop();
    } catch {
      // ignore
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraStatus('');
    setDetectedSign('');
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      handleStopCamera();
      cancelSpeech();
    };
  }, []);

  // Speak accumulated camera text aloud in Live Audio
  const handleSpeakAccumulatedText = () => {
    const textToSpeak = accumulatedText.trim() || (isAr ? 'مرحباً، كيف حالك؟' : 'Hello, how are you?');
    if (!textToSpeak) return;
    setIsSpeakingCameraText(true);
    triggerHapticAlert('single-pulse');

    speak(textToSpeak, dialect, {
      rate: 1.0,
      onStart: () => setIsSpeakingCameraText(true),
      onEnd: () => setIsSpeakingCameraText(false),
      onError: () => setIsSpeakingCameraText(false),
    });
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar select-none bg-[#071B33] text-[#F4F7FB] p-3 sm:p-5 lg:p-6"
    >
      {/* ── TOP SUB-HEADER: TITLE & DIALECT SWITCHER (Matching Reference) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-5">
        {/* Right Side in RTL: Icon + Main Title + Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#0D2542] border border-[#12CFE0]/30 text-[#12CFE0] flex items-center justify-center shadow-[0_0_20px_rgba(18,207,224,0.15)] shrink-0">
            <Ear className="w-6 h-6 text-[#12CFE0]" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#F4F7FB] tracking-tight leading-snug">
              {loc('Sign Language Studio', 'استوديو لغة الإشارة')}
            </h1>
            <p className="text-xs sm:text-sm text-[#A9BDD3] leading-relaxed">
              {loc(
                'Translating texts and explaining ideas in sign language. Sign reading camera, and converting them to instant voice.',
                'ترجمة النصوص وشرح الأفكار بلغة الإشارة. كاميرا قراءة الإشارات، وتحويلها لصوت فوري.'
              )}
            </p>
          </div>
        </div>

        {/* Left Side in RTL: Dialect Pills */}
        <div
          role="group"
          aria-label={loc('Sign language dialect selection', 'اختيار لهجة لغة الإشارة')}
          className="flex items-center gap-1.5 p-1 rounded-full bg-[#0D2542] border border-[#12CFE0]/20 self-start sm:self-auto shrink-0 shadow-inner"
        >
          {([
            { id: 'Egyptian Ammiya' as const, labelEn: '🇪🇬 Egyptian', labelAr: 'مصري', icon: true },
            { id: 'Arabic' as const, labelEn: '🇸🇦 Arabic', labelAr: 'عربي', icon: false },
            { id: 'English' as const, labelEn: 'us EN', labelAr: 'us EN', icon: false },
          ]).map((item) => {
            const isSelected = dialect === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setDialect(item.id)}
                aria-pressed={isSelected}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#12CFE0] focus:outline-none ${
                  isSelected
                    ? 'bg-[#087F8C] text-white shadow-md shadow-[#087F8C]/30'
                    : 'text-[#A9BDD3] hover:text-[#F4F7FB] hover:bg-[#102D4D]/60'
                }`}
              >
                {item.icon && <Hand className="w-3.5 h-3.5 shrink-0 text-[#12CFE0]" aria-hidden="true" />}
                <span>{dialect === 'English' ? item.labelEn : item.labelAr}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TWO-COLUMN MAIN WORKSPACE (Camera Left, Avatar Right) ── */}
      {/* Container forced to LTR so Column 1 is ALWAYS visual Left, Column 2 is visual Right */}
      <div
        style={{ direction: 'ltr' }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 flex-1 items-stretch"
      >
        {/* ══════════════════════════════════════════════════════════════════════
            COLUMN 1 (VISUAL LEFT): SMART SIGN READING CAMERA WORKSPACE
           ══════════════════════════════════════════════════════════════════════ */}
        <section
          dir={isAr ? 'rtl' : 'ltr'}
          aria-label={loc('Sign Language Camera and Live Translation', 'كاميرا قراءة لغة الإشارة والترجمة الفورية')}
          className="bg-[#0D2542] border border-[#12CFE0]/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden transition-all duration-300"
        >
          {/* Card Header: Camera Icon & Title (Right in RTL) + Status Badge (Left in RTL) */}
          <div className="flex items-center justify-between pb-3 border-b border-[#12CFE0]/15 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#102D4D] border border-[#12CFE0]/30 text-[#12CFE0] flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-[#12CFE0]" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-[#F4F7FB] leading-tight">
                  {loc('Smart Sign Language Reading Camera', 'كاميرا قراءة لغة الإشارة الذكية')}
                </h2>
                <p className="text-[11px] text-[#A9BDD3] mt-0.5">
                  {loc(
                    'Point the camera at the person using sign language or in front of you to begin translation.',
                    'قم بتوجيه الكاميرا نحو الشخص الذي يستخدم لغة الإشارة أو أمامك لبدء الترجمة.'
                  )}
                </p>
              </div>
            </div>

            {/* Live Camera Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 border transition-colors ${
                isCameraActive
                  ? 'bg-[#082344] text-[#12CFE0] border-[#12CFE0]/40'
                  : 'bg-[#082344] text-[#A9BDD3] border-white/10'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isCameraActive ? 'bg-[#10B981] animate-pulse' : 'bg-stone-500'
                }`}
                aria-hidden="true"
              />
              <span>
                {isCameraActive
                  ? loc('Camera Active', 'الكاميرا تعمل')
                  : loc('Camera Idle', 'الكاميرا متوقفة')}
              </span>
            </div>
          </div>

          {/* Camera Viewport Stage with Sleek Cyan Reticle Corners */}
          <div className="relative w-full h-[280px] sm:h-[320px] md:h-[350px] my-3 rounded-2xl overflow-hidden bg-[#071B33] border border-[#12CFE0]/15 flex items-center justify-center shadow-inner">
            {/* Corner Markers (Reticle brackets matching reference) */}
            <div
              className="absolute top-3.5 left-3.5 w-6 h-6 border-t-2 border-l-2 border-[#12CFE0] rounded-tl pointer-events-none z-10"
              aria-hidden="true"
            />
            <div
              className="absolute top-3.5 right-3.5 w-6 h-6 border-t-2 border-r-2 border-[#12CFE0] rounded-tr pointer-events-none z-10"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-3.5 left-3.5 w-6 h-6 border-b-2 border-l-2 border-[#12CFE0] rounded-bl pointer-events-none z-10"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-3.5 right-3.5 w-6 h-6 border-b-2 border-r-2 border-[#12CFE0] rounded-br pointer-events-none z-10"
              aria-hidden="true"
            />

            {/* Actual Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label={loc('Sign language camera preview', 'معاينة كاميرا لغة الإشارة')}
              className={`w-full h-full object-cover transform -scale-x-100 ${
                isCameraActive ? 'block' : 'hidden'
              }`}
            />

            {/* Canvas Overlay for hand tracking landmarks */}
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className={`absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 ${
                isCameraActive ? 'block' : 'hidden'
              }`}
            />

            {/* Inactive State Display */}
            {!isCameraActive && (
              <div className="flex flex-col items-center justify-center text-center p-4 max-w-sm gap-2">
                <div className="w-14 h-14 rounded-2xl bg-[#0D2542] border border-[#12CFE0]/30 text-[#12CFE0] flex items-center justify-center shadow-md">
                  <Hand className="w-7 h-7 text-[#12CFE0]" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-[#F4F7FB]">
                  {loc('Camera is Ready to Track Signs', 'الكاميرا جاهزة لقراءة لغة الإشارة')}
                </h3>
                <p className="text-xs text-[#A9BDD3] leading-relaxed">
                  {loc(
                    'Click "Start Camera" below to track hand gestures in real-time and translate them into text and voice.',
                    'اضغط على زر "تشغيل الكاميرا" بالأسفل لرصد حركة اليدين وتحويلها فوراً إلى نصوص وأصوات مسموعة.'
                  )}
                </p>
              </div>
            )}

            {/* Live Detected Sign Banner (Floating at bottom of preview) */}
            {isCameraActive && (
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3 py-2 rounded-xl backdrop-blur-md bg-[#071B33]/85 border border-[#12CFE0]/30 text-xs shadow-lg z-10">
                <span className="text-[11px] font-bold text-[#A9BDD3]">
                  {cameraStatus || loc('Tracking Hands…', 'جاري رصد حركة اليدين…')}
                </span>
                <span className="font-extrabold text-[#12CFE0] text-xs tracking-wide">
                  {detectedSign
                    ? (isAr ? `🤟 رُصدت: ${detectedSign}` : `🤟 Detected: ${detectedSign}`)
                    : loc('Position hands within camera frame', 'ضع يدك بوضوح داخل إطار الكاميرا')}
                </span>
              </div>
            )}
          </div>

          {/* Live Translation Result Area */}
          <div className="space-y-1.5 mb-3">
            {/* Title & Settings Icon */}
            <div className="flex items-center justify-between text-xs text-[#A9BDD3] font-bold px-1">
              <span className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-[#12CFE0]" aria-hidden="true" />
                <span>{loc('Instant Translation', 'الترجمة الفورية')}</span>
              </span>
              {accumulatedText.trim() && (
                <button
                  type="button"
                  onClick={() => setAccumulatedText('')}
                  aria-label={loc('Clear translated text', 'مسح النص المترجم')}
                  className="text-xs text-[#A9BDD3] hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-[#12CFE0] rounded px-1"
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                  <span>{loc('Clear', 'مسح')}</span>
                </button>
              )}
            </div>

            {/* Output Box */}
            <div className="bg-[#071B33] border border-[#12CFE0]/20 rounded-xl p-3.5 min-h-[56px] flex items-center justify-between gap-3 shadow-inner">
              <p
                className={`text-sm sm:text-base font-semibold leading-relaxed ${
                  accumulatedText.trim() ? 'text-[#F4F7FB]' : 'text-[#A9BDD3]/60 font-normal text-xs'
                }`}
              >
                {accumulatedText.trim() ||
                  loc(
                    'Recognized words from your camera signs will appear here…',
                    'الكلام المترجم من إشارات يدك سيظهر هنا في الوقت الفعلي…'
                  )}
              </p>

              {/* Instant TTS Speaker Icon Button */}
              <button
                type="button"
                onClick={handleSpeakAccumulatedText}
                aria-label={loc('Listen to translated voice', 'استمع إلى الترجمة الصوتية')}
                className={`p-2 rounded-lg text-[#12CFE0] hover:text-white hover:bg-[#102D4D] transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#12CFE0] focus:outline-none ${
                  isSpeakingCameraText ? 'animate-bounce text-[#10B8B0]' : ''
                }`}
                title={loc('Speak text aloud', 'نطق النص')}
              >
                <Volume2 className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Action Buttons Row (Matching Reference) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
            {/* Button 1: Camera Settings */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              aria-label={loc('Camera Settings', 'إعدادات الكاميرا')}
              className="py-2.5 px-3 rounded-xl bg-[#102D4D] hover:bg-[#15385E] border border-[#12CFE0]/25 text-[#F4F7FB] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#12CFE0] focus:outline-none"
            >
              <Sliders className="w-4 h-4 text-[#12CFE0] shrink-0" aria-hidden="true" />
              <span className="truncate">{loc('Camera Settings', 'إعدادات الكاميرا')}</span>
            </button>

            {/* Button 2 (Primary Center): Start / Stop Camera */}
            <button
              type="button"
              onClick={isCameraActive ? handleStopCamera : handleStartCamera}
              aria-pressed={isCameraActive}
              aria-label={
                isCameraActive
                  ? loc('Stop Camera', 'إيقاف الكاميرا')
                  : loc('Start Camera', 'تشغيل الكاميرا')
              }
              className="py-2.5 px-3 rounded-xl bg-[#087F8C] hover:bg-[#076D78] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-[#087F8C]/25 active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#12CFE0] focus:outline-none"
            >
              {isCameraActive ? (
                <>
                  <CameraOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{loc('Stop Camera', 'إيقاف الكاميرا')}</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{loc('Start Camera', 'تشغيل الكاميرا')}</span>
                </>
              )}
            </button>

            {/* Button 3: Translated Voice */}
            <button
              type="button"
              onClick={handleSpeakAccumulatedText}
              aria-label={loc('Play translated voice', 'تشغيل الصوت المترجم')}
              className="py-2.5 px-3 rounded-xl bg-[#102D4D] hover:bg-[#15385E] border border-[#12CFE0]/25 text-[#F4F7FB] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#12CFE0] focus:outline-none"
            >
              <Volume2 className="w-4 h-4 text-[#12CFE0] shrink-0" aria-hidden="true" />
              <span className="truncate">{loc('Translated Voice', 'صوت مترجم')}</span>
            </button>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            COLUMN 2 (VISUAL RIGHT): 3D SIGN AVATAR & TEXT-TO-SIGN WORKSPACE
           ══════════════════════════════════════════════════════════════════════ */}
        <section
          dir={isAr ? 'rtl' : 'ltr'}
          aria-label={loc('Interactive 3D Sign Language Avatar', 'الأفاتار ثلاثي الأبعاد التفاعلي')}
          className="bg-[#0D2542] border border-[#12CFE0]/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden transition-all duration-300"
        >
          {/* Card Header: Avatar Icon & Title (Right in RTL) + Replay / Play buttons (Left in RTL) */}
          <div className="flex items-center justify-between pb-3 border-b border-[#12CFE0]/15 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#102D4D] border border-[#12CFE0]/30 text-[#12CFE0] flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-[#12CFE0]" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-[#F4F7FB] leading-tight">
                  {loc('Interactive 3D Avatar', 'الأفاتار ثلاثي الأبعاد التفاعلي')}
                </h2>
                <p className="text-[11px] text-[#A9BDD3] mt-0.5">
                  {loc(
                    'Type any text or choose translations to render sign language with the avatar.',
                    'اكتب أي نص أو اختر من الترجمات لترجمة الأفاتار إلى لغة الإشارة أو لأسئلتك الأصلي.'
                  )}
                </p>
              </div>
            </div>

            {/* Playback Controls (Replay + Play/Pause) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleReplayAvatar}
                aria-label={loc('Replay sign animation', 'إعادة حركة الأفاتار')}
                className="w-8 h-8 rounded-xl bg-[#102D4D] border border-[#12CFE0]/25 text-[#F4F7FB] hover:text-[#12CFE0] hover:border-[#12CFE0]/50 transition-colors flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-[#12CFE0] focus:outline-none"
                title={loc('Replay', 'إعادة')}
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setIsAvatarPlaying(!isAvatarPlaying)}
                aria-label={
                  isAvatarPlaying
                    ? loc('Pause sign avatar', 'إيقاف الأفاتار مؤقتاً')
                    : loc('Play sign avatar', 'تشغيل الأفاتار')
                }
                aria-pressed={isAvatarPlaying}
                className="w-8 h-8 rounded-xl bg-[#102D4D] border border-[#12CFE0]/25 text-[#F4F7FB] hover:text-[#12CFE0] hover:border-[#12CFE0]/50 transition-colors flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-[#12CFE0] focus:outline-none"
                title={isAvatarPlaying ? loc('Pause', 'إيقاف مؤقت') : loc('Play', 'تشغيل')}
              >
                {isAvatarPlaying ? (
                  <Pause className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Play className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* 3D Sign Avatar Stage with Futuristic Cyan Ground Ring */}
          <div className="relative w-full h-[280px] sm:h-[320px] md:h-[350px] my-3 rounded-2xl overflow-hidden bg-gradient-to-b from-[#071B33] to-[#0A223D] border border-[#12CFE0]/15 flex items-center justify-center shadow-inner">
            <React.Suspense
              fallback={
                <div className="flex flex-col items-center justify-center text-[#A9BDD3] gap-2">
                  <div className="w-8 h-8 border-2 border-[#12CFE0] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold">
                    {loc('Loading 3D Sign Avatar…', 'جاري تجهيز الأفاتار ثلاثي الأبعاد…')}
                  </span>
                </div>
              }
            >
              <SignAvatar3D
                words={avatarWords}
                playing={isAvatarPlaying}
                onProgress={(idx) => setCurrentSigningWord(avatarWords[idx] || '')}
                onDone={() => setIsAvatarPlaying(false)}
                className="w-full h-full"
              />
            </React.Suspense>
          </div>

          {/* Current Word / Phrase Banner Card */}
          <div className="bg-[#071B33] border border-[#12CFE0]/20 rounded-xl p-3.5 mb-3 shadow-inner">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#A9BDD3]">
                {loc('Current Word:', 'الكلمة الحالية:')}
              </span>
              <span className="px-3.5 py-0.5 rounded-full text-xs font-black bg-[#082344] text-[#12CFE0] border border-[#12CFE0]/40 shadow-sm">
                {currentSigningWord || avatarWords[0] || loc('Ready', 'مستعد')}
              </span>
            </div>
            <p className="text-[11px] text-[#A9BDD3] leading-relaxed">
              {loc(
                'This word is currently being translated into sign language.',
                'هذه الكلمة يتم ترجمتها الآن إلى لغة الإشارة.'
              )}
            </p>
          </div>

          {/* Text Input Composer */}
          <div className="flex items-center gap-2 mb-3">
            {/* Voice Dictation Mic Button */}
            <button
              type="button"
              onClick={toggleQuestionVoice}
              aria-label={
                isQuestionVoiceActive
                  ? loc('Stop Voice Input', 'إيقاف الإملاء الصوتي')
                  : loc('Speak by Voice', 'إملاء صوتي')
              }
              aria-pressed={isQuestionVoiceActive}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-[#12CFE0] focus:outline-none ${
                isQuestionVoiceActive
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                  : 'bg-[#102D4D] border-[#12CFE0]/25 text-[#F4F7FB] hover:text-[#12CFE0] hover:border-[#12CFE0]/50'
              }`}
              title={loc('Voice input', 'إملاء صوتي')}
            >
              {isQuestionVoiceActive ? (
                <MicOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Mic className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            {/* Input Field with Send Button */}
            <div className="relative flex-1">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.shiftKey) handleAskAi();
                    else handleDirectSignScript();
                  }
                }}
                aria-label={loc(
                  'Type any sentence to translate to sign language or ask a question',
                  'اكتب أي جملة للترجمة إلى لغة الإشارة أو اسأل سؤالاً'
                )}
                placeholder={loc(
                  'Type any sentence to translate to sign language or ask a question…',
                  'اكتب أي جملة للترجمة إلى لغة الإشارة أو اسأل سؤالاً...'
                )}
                className="w-full bg-[#071B33] border border-[#12CFE0]/25 rounded-xl py-2.5 px-4 text-xs sm:text-sm text-[#F4F7FB] placeholder:text-[#A9BDD3]/60 focus:outline-none focus:border-[#12CFE0] focus:ring-1 focus:ring-[#12CFE0] transition-colors"
              />
              <button
                type="button"
                onClick={() => handleDirectSignScript()}
                disabled={!aiQuestion.trim()}
                aria-label={loc('Send for translation', 'إرسال للترجمة')}
                className={`absolute top-1/2 -translate-y-1/2 ${
                  isAr ? 'left-3' : 'right-3'
                } p-1 text-[#12CFE0] hover:text-white disabled:opacity-30 transition-colors cursor-pointer focus:outline-none`}
              >
                <Send className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Action Buttons Row (Matching Reference) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
            {/* Button 1: Ask & Explain */}
            <button
              type="button"
              onClick={() => handleAskAi()}
              disabled={!aiQuestion.trim() || isAiLoading}
              aria-label={loc('Ask AI and explain in sign language', 'اسأل واشرح بلغة الإشارة')}
              className="py-2.5 px-4 rounded-xl bg-[#102D4D] hover:bg-[#15385E] disabled:opacity-40 border border-[#12CFE0]/30 text-[#F4F7FB] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#12CFE0] focus:outline-none"
            >
              <Sparkles className="w-4 h-4 text-[#12CFE0] shrink-0" aria-hidden="true" />
              <span className="truncate">{loc('Ask & Explain', 'اسأل واشرح')}</span>
            </button>

            {/* Button 2 (Primary): Translate to Sign */}
            <button
              type="button"
              onClick={() => handleDirectSignScript()}
              disabled={!aiQuestion.trim()}
              aria-label={loc('Translate text to 3D sign language', 'ترجمة إلى إشارة')}
              className="py-2.5 px-4 rounded-xl bg-[#087F8C] hover:bg-[#076D78] disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#087F8C]/20 active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#12CFE0] focus:outline-none"
            >
              <Hand className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{loc('Translate to Sign', 'ترجمة إلى إشارة')}</span>
            </button>
          </div>
        </section>
      </div>

      {/* ── FULL-WIDTH BOTTOM ACCESSIBILITY TIP BANNER (Matching Reference) ── */}
      <div className="w-full bg-[#0D2542] border border-[#12CFE0]/20 rounded-xl p-3 sm:p-3.5 flex items-center gap-3 text-xs sm:text-sm text-[#A9BDD3] mt-4 shadow-md">
        <Info className="w-5 h-5 text-[#12CFE0] shrink-0" aria-hidden="true" />
        <p className="leading-relaxed">
          {loc(
            'Tip: You can use the camera or enter text for real-time translation, and interact with the translation for extra explanation.',
            'نصيحة: يمكنك استخدام الكاميرا أو إدخال النص للحصول على الترجمة الفورية، كما يمكنك التفاعل على الترجمة للحصول على شرح إضافي.'
          )}
        </p>
      </div>

      {/* ── CAMERA SETTINGS MODAL ── */}
      {showSettingsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="camera-settings-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div
            dir={isAr ? 'rtl' : 'ltr'}
            className="w-full max-w-md bg-[#0D2542] border border-[#12CFE0]/30 rounded-2xl p-5 shadow-2xl text-[#F4F7FB]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#12CFE0]/20">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#12CFE0]" aria-hidden="true" />
                <h3 id="camera-settings-title" className="font-bold text-base">
                  {loc('Camera & Sign Recognition Settings', 'إعدادات الكاميرا والتعرف على الإشارات')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                aria-label={loc('Close settings modal', 'إغلاق نافذة الإعدادات')}
                className="p-1 rounded-lg text-[#A9BDD3] hover:text-white hover:bg-[#102D4D] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Option 1: Hand Skeleton Overlay */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#071B33] border border-[#12CFE0]/15">
                <div>
                  <p className="text-sm font-bold text-[#F4F7FB]">
                    {loc('Show Hand Skeleton', 'إظهار الهيكل التتبعي لليد')}
                  </p>
                  <p className="text-xs text-[#A9BDD3]">
                    {loc(
                      'Displays real-time cyan joint tracking points on the camera view.',
                      'يعرض نقاط تتبع مفاصل اليدين على الكاميرا باللون السماوي.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSkeleton(!showSkeleton)}
                  aria-pressed={showSkeleton}
                  aria-label={loc('Toggle Hand Skeleton Overlay', 'تبديل إظهار هيكل اليد')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    showSkeleton ? 'bg-[#087F8C] justify-end' : 'bg-stone-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                </button>
              </div>

              {/* Option 2: Auto Voice Signs */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#071B33] border border-[#12CFE0]/15">
                <div>
                  <p className="text-sm font-bold text-[#F4F7FB]">
                    {loc('Auto-Voice Recognized Signs', 'نطق فوري تلقائي للإشارات')}
                  </p>
                  <p className="text-xs text-[#A9BDD3]">
                    {loc(
                      'Automatically speaks recognized words out loud as they are detected.',
                      'ينطق الكلمات المكتشفة بصوت آلي فور رصدها بالكاميرا.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoVoice(!autoVoice)}
                  aria-pressed={autoVoice}
                  aria-label={loc('Toggle Auto Voice Recognized Signs', 'تبديل النطق الفوري التلقائي')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    autoVoice ? 'bg-[#087F8C] justify-end' : 'bg-stone-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[#12CFE0]/20 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="py-2 px-5 rounded-xl bg-[#087F8C] hover:bg-[#076D78] text-white font-bold text-xs cursor-pointer shadow-md transition-all"
              >
                {loc('Done', 'تم')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minor Student Parental Consent Gate Modal */}
      <ParentalConsentModal
        isOpen={showConsentModal}
        profile={profile}
        requiredScope="camera"
        onConsentGranted={(consent) => {
          setShowConsentModal(false);
          if (profile) {
            profile.parentalConsent = consent;
          }
          handleStartCamera();
        }}
        onCancel={() => setShowConsentModal(false)}
      />
    </div>
  );
}
