import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Ear,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Trash2,
  Bell,
  Sparkles,
  ArrowRight,
  Check,
  RotateCcw,
  ShieldAlert,
  Stethoscope,
  Store,
  AlertOctagon,
  MessageSquare,
  Radio,
  Type,
  Play,
  Square,
  Hand
} from 'lucide-react';
import { UserProfile } from '../types';
import { localize, isArabicLocale } from '../lib/translations';
import { speak, cancelSpeech } from '../lib/tts';
import { triggerHapticAlert } from '../lib/hapticNavEngine';
import { toast } from './Toast';

const SignAvatar3D = React.lazy(() => import('./SignAvatar3D'));

interface UnifiedHearingCenterProps {
  profile: UserProfile;
  onNavigateBack?: () => void;
  onMenuClick?: () => void;
}

type Dialect = 'Egyptian Ammiya' | 'Arabic' | 'English';
type AACCategory = 'general' | 'medical' | 'daily' | 'emergency';

interface SoundAlertEvent {
  id: string;
  db: number;
  time: string;
}

export default function UnifiedHearingCenter({
  profile,
  onNavigateBack,
}: UnifiedHearingCenterProps) {
  // Language & Dialect
  const [dialect, setDialect] = useState<Dialect>(() => {
    if (profile.language === 'English') return 'English';
    if (profile.language === 'Arabic') return 'Arabic';
    return 'Egyptian Ammiya';
  });

  const isAr = isArabicLocale(dialect);
  const isEgyptian = dialect === 'Egyptian Ammiya';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. 3D SIGN AVATAR STATE & SYNCHRONIZATION
  // ───────────────────────────────────────────────────────────────────────────
  const [avatarWords, setAvatarWords] = useState<string[]>(['أهلا', 'بك']);
  const [isAvatarPlaying, setIsAvatarPlaying] = useState<boolean>(true);
  const [currentSigningWord, setCurrentSigningWord] = useState<string>('أهلا');

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
    }, 100);
  };

  // Quick Sign Trigger Words
  const QUICK_SIGN_WORDS = useMemo(() => [
    { label: 'أهلاً', word: 'أهلا' },
    { label: 'شكراً', word: 'شكرا' },
    { label: 'نعم', word: 'نعم' },
    { label: 'لا', word: 'لا' },
    { label: 'مساعدة', word: 'مساعدة' },
    { label: 'ماء', word: 'ماء' },
    { label: 'طبيب', word: 'طبيب' },
    { label: 'دواء', word: 'دواء' },
    { label: 'ألم', word: 'ألم' },
    { label: 'لحظة', word: 'لحظة' },
  ], []);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. LIVE SPEECH-TO-TEXT (PARTNER CAPTIONS) STATE
  // ───────────────────────────────────────────────────────────────────────────
  const [isListeningPartner, setIsListeningPartner] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [captionsHistory, setCaptionsHistory] = useState<string[]>([]);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [isLargeCaptions, setIsLargeCaptions] = useState(false);
  const [copiedCaptions, setCopiedCaptions] = useState(false);
  const recognitionRef = useRef<any>(null);
  const captionsBottomRef = useRef<HTMLDivElement | null>(null);

  const speechLocale = useMemo(() => {
    if (isEgyptian) return 'ar-EG';
    if (dialect === 'Arabic') return 'ar-SA';
    return 'en-US';
  }, [dialect, isEgyptian]);

  // Check speech recognition support
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechSupported(false);
    }
  }, []);

  const togglePartnerListening = useCallback(() => {
    if (isListeningPartner) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListeningPartner(false);
      setInterimText('');
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error(
        localize(profile.language, 'Browser does not support Speech Recognition', 'المتصفح لا يدعم ميزة التعرف الصوتي')
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = speechLocale;

      rec.onstart = () => {
        setIsListeningPartner(true);
        triggerHapticAlert('single-pulse');
      };

      rec.onresult = (event: any) => {
        let interim = '';
        let finalized = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalized += chunk;
          } else {
            interim += chunk;
          }
        }

        setInterimText(interim);
        if (finalized.trim()) {
          setCaptionsHistory((prev) => [...prev, finalized.trim()]);
          setInterimText('');
          triggerHapticAlert('single-pulse');
          // Automatically animate 3D avatar for finalized speech
          triggerAvatarSign(finalized.trim());
        }
      };

      rec.onerror = (err: any) => {
        if (err.error !== 'no-speech') {
          console.warn('[SpeechRec] Error:', err.error);
        }
      };

      rec.onend = () => {
        if (recognitionRef.current === rec && isListeningPartner) {
          try {
            rec.start();
          } catch {
            setIsListeningPartner(false);
          }
        } else {
          setIsListeningPartner(false);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error('[SpeechRec] Launch failed:', e);
      setIsListeningPartner(false);
    }
  }, [isListeningPartner, speechLocale, profile.language, triggerAvatarSign]);

  // Auto-scroll captions
  useEffect(() => {
    captionsBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [captionsHistory, interimText]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const handleCopyCaptions = () => {
    const full = captionsHistory.join('\n');
    if (!full) return;
    navigator.clipboard.writeText(full).then(() => {
      setCopiedCaptions(true);
      setTimeout(() => setCopiedCaptions(false), 2000);
      toast.success(localize(profile.language, 'Captions copied', 'تم نسخ التفريغ الصوتي'));
    });
  };

  const handleClearCaptions = () => {
    setCaptionsHistory([]);
    setInterimText('');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 3. TEXT-TO-SPEECH (MY VOICE TO THE ROOM) STATE
  // ───────────────────────────────────────────────────────────────────────────
  const [myText, setMyText] = useState('');
  const [isSpeakingOut, setIsSpeakingOut] = useState(false);
  const [recentSpoken, setRecentSpoken] = useState<string[]>([
    isEgyptian ? 'أهلاً بك، أنا أستخدم التطبيق للتحدث' : isAr ? 'مرحباً، أنا أستخدم التطبيق للتحدث' : 'Hello, I use this app to speak'
  ]);

  const handleSpeakText = (override?: string, shouldSign = true) => {
    const textToSpeak = (override || myText).trim();
    if (!textToSpeak) return;

    cancelSpeech();
    setIsSpeakingOut(true);
    triggerHapticAlert('single-pulse');

    if (shouldSign) {
      triggerAvatarSign(textToSpeak);
    }

    speak(textToSpeak, dialect, {
      rate: 1.0,
      onStart: () => setIsSpeakingOut(true),
      onEnd: () => setIsSpeakingOut(false),
      onError: () => setIsSpeakingOut(false),
    });

    setRecentSpoken((prev) => {
      const next = [textToSpeak, ...prev.filter((item) => item !== textToSpeak)];
      return next.slice(0, 4);
    });

    if (!override) {
      setMyText('');
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 4. INSTANT EXPRESS AAC CARDS STATE
  // ───────────────────────────────────────────────────────────────────────────
  const [activeAacCategory, setActiveAacCategory] = useState<AACCategory>('general');
  const [activeDisplayPhrase, setActiveDisplayPhrase] = useState<{ text: string; icon: string } | null>(null);

  const AAC_DATA = useMemo(() => {
    return {
      general: {
        labelAr: 'عام ومباشر',
        labelEn: 'General & Quick',
        icon: MessageSquare,
        color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        phrases: isEgyptian ? [
          { text: 'نعم، تمام وموافق جداً', icon: '👍' },
          { text: 'لأ، مش موافق خالص', icon: '👎' },
          { text: 'شكراً جزيلاً لحضرتك', icon: '🙏' },
          { text: 'لحظة واحدة من فضلك', icon: '⏳' },
          { text: 'أنا أصم، أرجو التحدث بهدوء أو الكتابة', icon: '🤟' },
          { text: 'ممكن تكتب لي على الشاشة؟', icon: '📱' },
        ] : isAr ? [
          { text: 'نعم، أوافق على ذلك', icon: '👍' },
          { text: 'لا، لست موافقاً', icon: '👎' },
          { text: 'شكراً جزيلاً لمساعدتك', icon: '🙏' },
          { text: 'لحظة واحدة لو سمحت', icon: '⏳' },
          { text: 'أنا أصم، أرجو التحدث بوضوح أو الكتابة', icon: '🤟' },
          { text: 'أرجو كتابة التفاصيل على الشاشة', icon: '📱' },
        ] : [
          { text: 'Yes, I completely agree', icon: '👍' },
          { text: 'No, I disagree with this', icon: '👎' },
          { text: 'Thank you very much for your help', icon: '🙏' },
          { text: 'One moment please', icon: '⏳' },
          { text: 'I am deaf, please speak slowly or write', icon: '🤟' },
          { text: 'Please write details on screen', icon: '📱' },
        ]
      },
      medical: {
        labelAr: 'طبي وصحي 🩺',
        labelEn: 'Medical 🩺',
        icon: Stethoscope,
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        phrases: isEgyptian ? [
          { text: 'عندي ألم شديد في الجزء ده', icon: '🤕' },
          { text: 'محتاج قياس الضغط والسكر لو سمحت', icon: '🩺' },
          { text: 'عندي حساسية من أدوية معينة', icon: '⚠️' },
          { text: 'كم مرة في اليوم أتناول العلاج ده؟', icon: '💊' },
          { text: 'ممكن كتابة الروشتة بخط واضح؟', icon: '📝' },
          { text: 'محتاج أستشير طبيب متخصص فوراً', icon: '👨‍⚕️' },
        ] : isAr ? [
          { text: 'أشعر بألم شديد في هذا الموضع', icon: '🤕' },
          { text: 'أحتاج فحص ضغط الدم والسكري', icon: '🩺' },
          { text: 'أعاني من حساسية تجاه بعض الأدوية', icon: '⚠️' },
          { text: 'كم جرعة أتناولها يومياً من هذا الدواء؟', icon: '💊' },
          { text: 'لو سمحت اكتب الوصفة الطبية بوضوح', icon: '📝' },
          { text: 'أحتاج استشارة طبيب متخصص حالاً', icon: '👨‍⚕️' },
        ] : [
          { text: 'I have severe pain in this area', icon: '🤕' },
          { text: 'Please check my blood pressure and glucose', icon: '🩺' },
          { text: 'I have allergies to certain medications', icon: '⚠️' },
          { text: 'How many times a day should I take this?', icon: '💊' },
          { text: 'Please write down prescription clearly', icon: '📝' },
          { text: 'I need to consult a doctor immediately', icon: '👨‍⚕️' },
        ]
      },
      daily: {
        labelAr: 'معاملات وأماكن 🏪',
        labelEn: 'Daily & Places 🏪',
        icon: Store,
        color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
        phrases: isEgyptian ? [
          { text: 'بكم سعر الحاجة دي لو سمحت؟', icon: '💵' },
          { text: 'فين أقرب محطة مترو أو صيدلية؟', icon: '🚇' },
          { text: 'هل متاح الدفع بالفيزا ولا كاش فقط؟', icon: '💳' },
          { text: 'أنا عايز أشتري ده من فضلك', icon: '🛍️' },
          { text: 'ممكن توصلني للعنوان المكتوب ده؟', icon: '📍' },
          { text: 'شكراً جزيلاً ويومك جميل وسعيد', icon: '✨' },
        ] : isAr ? [
          { text: 'كم سعر هذا المنتج من فضلك؟', icon: '💵' },
          { text: 'أين أجد أقرب محطة أو صيدلية؟', icon: '🚇' },
          { text: 'هل تقبلون الدفع بالبطاقة المصرفية؟', icon: '💳' },
          { text: 'أود شراء هذا الشيء لو سمحت', icon: '🛍️' },
          { text: 'هل يمكنك توجيهي إلى هذا العنوان؟', icon: '📍' },
          { text: 'شكراً جزيلاً وطاب يومك', icon: '✨' },
        ] : [
          { text: 'How much does this item cost please?', icon: '💵' },
          { text: 'Where is the nearest station or pharmacy?', icon: '🚇' },
          { text: 'Do you accept credit card payments?', icon: '💳' },
          { text: 'I would like to purchase this item', icon: '🛍️' },
          { text: 'Can you direct me to this address?', icon: '📍' },
          { text: 'Thank you very much, have a great day', icon: '✨' },
        ]
      },
      emergency: {
        labelAr: 'طوارئ واستغاثة 🚨',
        labelEn: 'Emergency 🚨',
        icon: AlertOctagon,
        color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
        phrases: isEgyptian ? [
          { text: 'أنا محتاج مساعدة عاجلة فوراً!', icon: '🚨' },
          { text: 'اتصل بالإسعاف أو النجدة لو سمحت!', icon: '🚑' },
          { text: 'فقدت المحفظة والموبايل بتاعي', icon: '🔍' },
          { text: 'أنا أصم ومش سامع، قف جنبي ساعدني', icon: '🤝' },
          { text: 'في خطر أو حريق هنا، ابتعدوا!', icon: '🔥' },
        ] : isAr ? [
          { text: 'أحتاج مساعدة عاجلة فوراً!', icon: '🚨' },
          { text: 'اتصل بالإسعاف أو الشرطة لو سمحت!', icon: '🚑' },
          { text: 'فقدت هاتفي وأمتعتي الشخصية', icon: '🔍' },
          { text: 'أنا شخص أصم، أرجو مرافقتي لمساعدتي', icon: '🤝' },
          { text: 'يوجد خطر أو حريق، ابتعدوا فوراً!', icon: '🔥' },
        ] : [
          { text: 'I need urgent assistance immediately!', icon: '🚨' },
          { text: 'Please call an ambulance or police now!', icon: '🚑' },
          { text: 'I lost my phone and personal belongings', icon: '🔍' },
          { text: 'I am deaf and cannot hear, please stay and help', icon: '🤝' },
          { text: 'Danger or fire here, move away quickly!', icon: '🔥' },
        ]
      }
    };
  }, [isAr, isEgyptian]);

  const handleTapAacPhrase = (phrase: { text: string; icon: string }) => {
    setActiveDisplayPhrase(phrase);
    handleSpeakText(phrase.text, true);
    triggerHapticAlert('single-pulse');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 5. REAL LOUD SOUND SENTINEL & VISUAL STROBE STATE
  // ───────────────────────────────────────────────────────────────────────────
  const [isSentinelActive, setIsSentinelActive] = useState(false);
  const [currentDb, setCurrentDb] = useState(0);
  const [strobeSensitivity, setStrobeSensitivity] = useState<'normal' | 'high' | 'low'>('normal');
  const [isFlashing, setIsFlashing] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState<SoundAlertEvent[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastAlertTimeRef = useRef<number>(0);

  const thresholdDb = useMemo(() => {
    if (strobeSensitivity === 'high') return 68;
    if (strobeSensitivity === 'low') return 88;
    return 78; // normal
  }, [strobeSensitivity]);

  const stopSentinel = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsSentinelActive(false);
    setCurrentDb(0);
  }, []);

  const startSentinel = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsSentinelActive(true);
      triggerHapticAlert('single-pulse');

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = (dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const computedDb = Math.min(100, Math.max(30, Math.round(20 * Math.log10(rms + 0.0001) + 95)));
        setCurrentDb(computedDb);

        const now = Date.now();
        if (computedDb >= thresholdDb && now - lastAlertTimeRef.current > 3000) {
          lastAlertTimeRef.current = now;
          setIsFlashing(true);
          triggerHapticAlert('danger');
          setTimeout(() => setIsFlashing(false), 1600);

          setSoundAlerts((prev) => [
            {
              id: 'alert_' + now,
              db: computedDb,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            },
            ...prev.slice(0, 4),
          ]);
        }

        animFrameRef.current = requestAnimationFrame(loop);
      };

      loop();
    } catch (err) {
      console.error('[SoundSentinel] Mic access denied:', err);
      toast.error(
        localize(profile.language, 'Microphone access required for Sound Sentinel', 'يتطلب تشغيل المستشعر الإذن باستخدام الميكروفون')
      );
      setIsSentinelActive(false);
    }
  }, [thresholdDb, profile.language]);

  const toggleSentinel = () => {
    if (isSentinelActive) stopSentinel();
    else startSentinel();
  };

  useEffect(() => {
    return () => {
      stopSentinel();
    };
  }, [stopSentinel]);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`flex-1 flex flex-col h-full overflow-hidden select-none bg-[#080409] text-slate-100 transition-colors duration-300 relative ${
        isFlashing ? 'ring-8 ring-rose-500/80' : ''
      }`}
    >
      {/* ── VISUAL HAZARD STROBE BANNER WHEN LOUD SOUND DETECTED ── */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 inset-x-0 z-50 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white px-4 py-3 flex items-center justify-between shadow-2xl shadow-rose-950 animate-pulse"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
              <div>
                <p className="font-black text-sm tracking-wide">
                  {localize(profile.language, '⚠️ LOUD SOUND DETECTED!', '⚠️ تنبيه: تم رصد صوت مرتفع مفاجئ!')}
                </p>
                <p className="text-xs text-rose-100 font-medium">
                  {localize(profile.language, `Volume reached ${currentDb} dB (Alarm, Knock, or Shout)`, `بلغت شدة الصوت ${currentDb} ديسيبل (إنذار، خبط، أو نداء قوي)`)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsFlashing(false)}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold cursor-pointer"
            >
              {localize(profile.language, 'Dismiss', 'تجاهل')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP COMPACT HEADER ── */}
      <header className="px-4 py-2.5 border-b border-[#4A1224]/60 bg-[#0E0610]/95 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="p-1.5 rounded-xl bg-[#150917] border border-[#4A1224]/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={localize(profile.language, 'Back to Hub', 'رجوع للرئيسية')}
            >
              <ArrowRight className={`w-4 h-4 ${isAr ? '' : 'rotate-180'}`} />
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-[#E5A93C]/30 flex items-center justify-center text-[#E5A93C]">
            <Ear className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-black text-sm text-white leading-tight flex items-center gap-2">
              <span>{localize(profile.language, 'Unified Hearing Center & 3D Avatar', 'المركز السمعي الموحد وأفاتار الإشارة 3D')}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                {localize(profile.language, '1 Screen', 'شاشة واحدة')}
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">
              {localize(
                profile.language,
                'Interactive 3D sign avatar, live captions, voice speaker & sound sentinel',
                'أفاتار إشارة 3D تفاعلي، تفريغ كلام مباشر، نطق صوتي، ومستشعر أصوات حقيقي'
              )}
            </p>
          </div>
        </div>

        {/* Dialect Switcher */}
        <div className="flex items-center gap-1 bg-[#150917] border border-[#4A1224]/60 p-1 rounded-xl text-xs">
          {(['Egyptian Ammiya', 'Arabic', 'English'] as Dialect[]).map((d) => (
            <button
              key={d}
              onClick={() => setDialect(d)}
              className={`px-2 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                dialect === d
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d === 'Egyptian Ammiya' ? '🇪🇬 مصري' : d === 'Arabic' ? '🇸🇦 فصحى' : '🇺🇸 EN'}
            </button>
          ))}
        </div>
      </header>

      {/* ── 1-SCREEN UNIFIED DASHBOARD WITH 3D SIGN AVATAR ── */}
      <main className="flex-1 min-h-0 p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-y-auto custom-scrollbar">

        {/* ══════════════════════════════════════════════════════════════════════
            COLUMN 1 (LG: 5 COLS): 3D SIGN AVATAR + SOUND SENTINEL
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 flex flex-col gap-3 sm:gap-4">

          {/* ── 3D SIGN AVATAR CARD ── */}
          <div className="bg-[#120614]/90 border border-[#4A1224]/60 rounded-2xl p-3 sm:p-3.5 flex flex-col shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between pb-2 border-b border-[#4A1224]/40 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                  <Hand className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>{localize(profile.language, '3D Sign Language Avatar', 'أفاتار لغة الإشارة 3D التفاعلي')}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                      {isAvatarPlaying ? 'يوقع الآن...' : 'جاهز'}
                    </span>
                  </h2>
                  <p className="text-[10px] text-slate-400">
                    {localize(profile.language, 'Signs words in 3D in real-time from speech or cards', 'يترجم الكلمات لإشارات 3D فورية من الصوت أو البطاقات')}
                  </p>
                </div>
              </div>

              {/* Avatar Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsAvatarPlaying(!isAvatarPlaying)}
                  className="p-1.5 rounded-lg bg-[#150917] border border-[#4A1224]/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title={isAvatarPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                >
                  {isAvatarPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleReplayAvatar}
                  className="p-1.5 rounded-lg bg-[#150917] border border-[#4A1224]/60 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                  title={localize(profile.language, 'Replay Sign Sequence', 'إعادة الحركة الإشارية')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3D Canvas Stage */}
            <div className="w-full h-[220px] sm:h-[240px] my-2 rounded-xl bg-gradient-to-b from-[#09030B] to-[#140616] border border-[#4A1224]/50 relative overflow-hidden flex items-center justify-center">
              <React.Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                    <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold">جاري تحميل الأفاتار 3D...</span>
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

              {/* Current Word Ticker Badge */}
              <div className="absolute bottom-2 inset-x-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0E0610]/85 backdrop-blur-md border border-[#4A1224]/60 text-xs">
                <span className="text-[10px] text-slate-400 font-bold">
                  {localize(profile.language, 'Current Sign:', 'الإشارة المعروضة:')}
                </span>
                <span className="font-black text-amber-400 text-xs tracking-wide">
                  {currentSigningWord || avatarWords[0] || '---'}
                </span>
              </div>
            </div>

            {/* Quick Word Triggers */}
            <div className="pt-1">
              <span className="text-[10px] text-slate-400 block mb-1 font-bold">
                {localize(profile.language, 'Quick Sign Dictionary (Tap to test):', 'قاموس إشاري فوري (اضغط للتجربة):')}
              </span>
              <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto custom-scrollbar">
                {QUICK_SIGN_WORDS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => triggerAvatarSign(item.word)}
                    className="px-2 py-0.5 rounded-md bg-[#150917] hover:bg-[#230f27] border border-[#4A1224]/50 text-slate-300 hover:text-amber-300 text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    🤟 {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── LOUD SOUND SENTINEL CARD ── */}
          <div className="bg-[#120614]/90 border border-[#4A1224]/60 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#4A1224]/40 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center">
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>{localize(profile.language, 'Loud Sound Sentinel', 'كاشف الأصوات المرتفعة والمخاطر')}</span>
                      {isSentinelActive && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      {localize(profile.language, 'Decibel meter triggers screen strobe & haptics for alarms', 'يقيس الديسيبل الحقيقي وينبه بوميض واهتزاز عند حدوث إنذار أو خبط')}
                    </p>
                  </div>
                </div>

                {/* Sensitivity Selector */}
                <div className="flex items-center gap-1 bg-[#150917] p-0.5 rounded-lg border border-[#4A1224]/50 text-[10px]">
                  {(['high', 'normal', 'low'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStrobeSensitivity(s)}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        strobeSensitivity === s
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s === 'high' ? 'عالية (68dB)' : s === 'normal' ? 'عادية (78dB)' : 'منخفضة (88dB)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Decibel Meter & Live Bar */}
              <div className="my-2 p-2.5 rounded-xl bg-[#09030B] border border-[#4A1224]/40 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400">
                    {localize(profile.language, 'Ambient Noise Level:', 'مستوى الصوت المحيط:')}
                  </span>
                  <span className={`font-mono text-xs font-black ${
                    currentDb >= thresholdDb ? 'text-rose-400 animate-pulse' : currentDb >= 65 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {isSentinelActive ? `${currentDb} dB` : '-- dB'}
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-150 ${
                      currentDb >= thresholdDb
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-md shadow-rose-500/50'
                        : currentDb >= 60
                        ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${isSentinelActive ? Math.min(100, Math.max(5, ((currentDb - 30) / 70) * 100)) : 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-500">
                  <span>30 dB (هدوء)</span>
                  <span className="text-rose-400 font-bold">⚠️ عتبة التنبيه: {thresholdDb} dB</span>
                  <span>100 dB (صاخب)</span>
                </div>
              </div>

              {/* Recent Alerts Log */}
              {soundAlerts.length > 0 && (
                <div className="mb-2 space-y-1 max-h-[50px] overflow-y-auto custom-scrollbar">
                  {soundAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] flex items-center justify-between font-bold"
                    >
                      <span>🚨 تم رصد صوت مرتفع ({alert.db} dB)</span>
                      <span className="font-mono text-slate-400">{alert.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sentinel Toggle Button */}
            <button
              onClick={toggleSentinel}
              className={`w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98] cursor-pointer ${
                isSentinelActive
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30'
                  : 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-rose-500/25'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>
                {isSentinelActive
                  ? localize(profile.language, 'Stop Sound Sentinel', 'إيقاف مستشعر الأصوات')
                  : localize(profile.language, 'Activate Sound Sentinel (Mic)', 'تشغيل مستشعر الأصوات والمخاطر (المايك)')}
              </span>
            </button>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            COLUMN 2 (LG: 7 COLS): CAPTIONS + MY VOICE + AAC CARDS
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 flex flex-col gap-3 sm:gap-4">

          {/* ── CARD 1: LIVE SPEECH-TO-TEXT & SPEECH-TO-SIGN ── */}
          <div className="bg-[#120614]/90 border border-[#4A1224]/60 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#4A1224]/40 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                    <Mic className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>{localize(profile.language, 'Live Speech Captions & Sign', 'تفريغ كلام المتحدث وتحويله لإشارة 3D')}</span>
                      {isListeningPartner && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      {localize(profile.language, 'Transcribes speech into text and triggers the 3D Avatar automatically', 'يفرغ صوت الطرف الآخر لنص كبير ويحركه على الأفاتار 3D فوراً')}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsLargeCaptions(!isLargeCaptions)}
                    className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                      isLargeCaptions
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                        : 'bg-[#150917] border-[#4A1224]/60 text-slate-400 hover:text-white'
                    }`}
                    title={localize(profile.language, 'Toggle Extra Large Font', 'تكبير حجم الخط')}
                  >
                    <Type className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleCopyCaptions}
                    disabled={captionsHistory.length === 0}
                    className="p-1.5 rounded-lg bg-[#150917] border border-[#4A1224]/60 text-slate-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                    title={localize(profile.language, 'Copy Captions', 'نسخ النص')}
                  >
                    {copiedCaptions ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleClearCaptions}
                    disabled={captionsHistory.length === 0 && !interimText}
                    className="p-1.5 rounded-lg bg-[#150917] border border-[#4A1224]/60 text-slate-400 hover:text-rose-400 disabled:opacity-30 transition-colors cursor-pointer"
                    title={localize(profile.language, 'Clear Captions', 'مسح التفريغ')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Captions Display Box */}
              <div className="flex-1 min-h-[120px] max-h-[160px] my-2 p-2.5 rounded-xl bg-[#09030B] border border-[#4A1224]/40 overflow-y-auto custom-scrollbar flex flex-col justify-between">
                {captionsHistory.length === 0 && !interimText ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-2 text-slate-500">
                    <Mic className="w-5 h-5 mb-1 text-slate-600" />
                    <p className="text-xs font-bold text-slate-400">
                      {speechSupported
                        ? localize(profile.language, 'Tap "Listen to Partner" to begin real-time captions', 'اضغط "استمع للمتحدث" لبدء تحويل الكلام لنص وإشارة')
                        : localize(profile.language, 'Speech recognition not supported in this browser', 'التعرف الصوتي غير مدعوم في هذا المتصفح')}
                    </p>
                  </div>
                ) : (
                  <div className={`space-y-1.5 text-start ${isLargeCaptions ? 'text-base font-bold' : 'text-xs'}`}>
                    {captionsHistory.map((phrase, idx) => (
                      <div
                        key={idx}
                        onClick={() => triggerAvatarSign(phrase)}
                        className="p-1.5 rounded-lg bg-[#150917]/80 hover:bg-[#200e23] border border-slate-800 text-slate-200 leading-relaxed cursor-pointer transition-colors"
                        title="اضغط لإعادة محاكاة الإشارة على الأفاتار"
                      >
                        {phrase}
                      </div>
                    ))}
                    {interimText && (
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 italic animate-pulse">
                        {interimText}...
                      </div>
                    )}
                    <div ref={captionsBottomRef} />
                  </div>
                )}
              </div>

              {/* Listen Button Trigger */}
              <button
                onClick={togglePartnerListening}
                className={`w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md cursor-pointer ${
                  isListeningPartner
                    ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-rose-500/20'
                    : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/25'
                }`}
              >
                {isListeningPartner ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>{localize(profile.language, 'Stop Listening', 'إيقاف استماع المايك')}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>{localize(profile.language, 'Listen to Partner (Start Mic)', 'استمع للمتحدث (تشغيل المايك والترجمة للإشارة)')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── CARD 2: TEXT-TO-SPEECH (MY VOICE SPEAKING TO THE ROOM) ── */}
          <div className="bg-[#120614]/90 border border-[#4A1224]/60 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#4A1224]/40 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>{localize(profile.language, 'My Voice (Text-to-Speech)', 'أنا أتحدث (نطق فوري للغرفة)')}</span>
                      {isSpeakingOut && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
                          {localize(profile.language, 'Speaking...', 'ينطق الآن...')}
                        </span>
                      )}
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      {localize(profile.language, 'Type anything to speak out loud and sign on avatar', 'اكتب ما تريد قوله وسينطقه النظام بالصوت ويشير به الأفاتار')}
                    </p>
                  </div>
                </div>

                {isSpeakingOut && (
                  <button
                    onClick={() => {
                      cancelSpeech();
                      setIsSpeakingOut(false);
                    }}
                    className="p-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <VolumeX className="w-3 h-3" />
                    <span>{localize(profile.language, 'Stop', 'إيقاف')}</span>
                  </button>
                )}
              </div>

              {/* Input Form */}
              <div className="my-2 flex flex-col gap-1.5">
                <div className="relative min-h-[70px]">
                  <textarea
                    value={myText}
                    onChange={(e) => setMyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSpeakText();
                      }
                    }}
                    placeholder={localize(
                      profile.language,
                      'Type what you want to say and press Enter...',
                      'اكتب ما تريد قوله واضغط Enter للنطق والمحاكاة بالإشارة...'
                    )}
                    className="w-full h-full p-2.5 rounded-xl bg-[#09030B] border border-[#4A1224]/50 text-slate-100 placeholder:text-slate-500 text-xs focus:outline-none focus:border-amber-400/80 resize-none transition-all leading-relaxed"
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSpeakText()}
                    disabled={!myText.trim()}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20 active:scale-[0.98] cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{localize(profile.language, 'Speak to Room (Enter)', 'انطق للغرفة (Enter)')}</span>
                  </button>
                  <button
                    onClick={() => triggerAvatarSign(myText)}
                    disabled={!myText.trim()}
                    className="py-2 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 hover:text-white disabled:opacity-40 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Hand className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{localize(profile.language, 'Sign on 3D Avatar', 'محاكاة بالإشارة 3D')}</span>
                  </button>
                </div>

                {/* Quick Spoken Chips */}
                {recentSpoken.length > 0 && (
                  <div className="pt-1 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                    <span className="text-[10px] text-slate-400 shrink-0 font-bold">
                      {localize(profile.language, 'Replay:', 'إعادة:')}
                    </span>
                    {recentSpoken.map((phrase, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSpeakText(phrase)}
                        className="px-2 py-0.5 rounded-lg bg-[#150917] hover:bg-[#1f0e22] border border-[#4A1224]/50 text-slate-300 hover:text-amber-300 text-[10px] truncate max-w-[160px] shrink-0 transition-colors cursor-pointer"
                        title={phrase}
                      >
                        🗣️ {phrase}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── CARD 3: INSTANT EXPRESS AAC CARDS ── */}
          <div className="bg-[#120614]/90 border border-[#4A1224]/60 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#4A1224]/40 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-white">
                      {localize(profile.language, 'Instant Express AAC Cards', 'بطاقات التواصل والمواقف السريعة')}
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      {localize(profile.language, 'Speaks aloud, signs on 3D avatar & shows large on screen', 'تنطق فوراً بالصوت وتتحرك على الأفاتار وتظهر بخط كبير')}
                    </p>
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1 bg-[#150917] p-0.5 rounded-lg border border-[#4A1224]/50">
                  {(['general', 'medical', 'daily', 'emergency'] as AACCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveAacCategory(cat)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        activeAacCategory === cat
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat === 'general' ? 'عام' : cat === 'medical' ? 'طبي' : cat === 'daily' ? 'يومي' : '🚨 طوارئ'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Display Banner */}
              <AnimatePresence>
                {activeDisplayPhrase && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mt-1.5 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 flex items-center justify-between gap-2 shadow-inner"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0">{activeDisplayPhrase.icon}</span>
                      <span className="text-xs sm:text-sm font-black truncate">{activeDisplayPhrase.text}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-100 font-bold shrink-0">
                      {localize(profile.language, 'Voice & 3D Sign Active', 'صوت + إشارة 3D')}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cards Grid */}
              <div className="my-1.5 grid grid-cols-2 gap-1.5 overflow-y-auto max-h-[140px] custom-scrollbar p-0.5">
                {AAC_DATA[activeAacCategory].phrases.map((phrase, i) => (
                  <button
                    key={i}
                    onClick={() => handleTapAacPhrase(phrase)}
                    className="p-2 rounded-xl bg-[#09030B] hover:bg-[#180a1c] border border-[#4A1224]/50 hover:border-emerald-500/50 text-start transition-all active:scale-[0.98] group/btn flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span className="text-lg shrink-0 group-hover/btn:scale-110 transition-transform">
                      {phrase.icon}
                    </span>
                    <span className="text-[11px] font-bold text-slate-200 group-hover/btn:text-white leading-tight line-clamp-2">
                      {phrase.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
