/**
 * Rafiqi (رفيقي) — Hear & Express Communication Center (Phase 6)
 *
 * Implements a unified multi-sensory communication suite within the "Communicate" section:
 * 1. Live speech-to-text captions (Arabic & English, font scaling, high contrast)
 * 2. Text-to-speech communication with custom input and speed controls
 * 3. Accessible one-touch quick-response messages
 * 4. AAC Communication Board (Augmentative and Alternative Communication) with 5 categories & sentence builder
 * 5. Visual and vibration-based alert beacons for deaf and hard-of-hearing users
 * 6. Egyptian Sign Language (ESL/ArSL) 3D Avatar foundation hub
 * 7. Universal accessibility: WCAG 2.2 AA contrast, screen reader live regions, keyboard navigation
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  MessageSquare,
  Copy,
  Trash2,
  Send,
  Zap,
  Ear,
  Eye,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Check,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile } from '../types';
import { localize, isArabicLocale } from '../lib/translations';
import { speak, cancelSpeech } from '../lib/tts';
import { BrandLogo } from './ui/BrandLogo';

interface HearAndExpressViewProps {
  profile: UserProfile;
  onNavigateBack?: () => void;
  onOpenSignStudio?: () => void;
  isDarkMode?: boolean;
}

type CommunicationTab = 'captions' | 'tts_quick' | 'aac' | 'alerts' | 'esl';

// Preset Quick Response Messages
export const QUICK_RESPONSES = [
  { id: 'qr_yes', ar: 'نعم، أوافق', en: 'Yes, I agree' },
  { id: 'qr_no', ar: 'لا، شكراً', en: 'No, thank you' },
  { id: 'qr_help', ar: 'أحتاج مساعدة من فضلك', en: 'I need assistance please' },
  { id: 'qr_deaf', ar: 'أنا أصم/ضعيف السمع، يرجى الكتابة لي', en: 'I am deaf/hard of hearing, please write to me' },
  { id: 'qr_restroom', ar: 'أين يقع الحمام من فضلك؟', en: 'Where is the restroom, please?' },
  { id: 'qr_wait', ar: 'لحظة واحدة للتفكير', en: 'One moment please' },
  { id: 'qr_repeat', ar: 'من فضلك أعد ما قلته ببطء', en: 'Please repeat what you said slowly' },
  { id: 'qr_thanks', ar: 'شكراً جزيلاً لك', en: 'Thank you very much' },
  { id: 'qr_tired', ar: 'أشعر بالتعب وأحتاج استراحة', en: 'I feel tired and need a break' },
  { id: 'qr_water', ar: 'أريد كوب ماء من فضلك', en: 'I would like a glass of water, please' },
];

// AAC Categories and Tiles
export interface AacTile {
  id: string;
  emoji: string;
  ar: string;
  en: string;
}

export const AAC_CATEGORIES: { id: string; titleAr: string; titleEn: string; tiles: AacTile[] }[] = [
  {
    id: 'needs',
    titleAr: 'الاحتياجات اليومية',
    titleEn: 'Daily Needs',
    tiles: [
      { id: 'aac_water', emoji: '💧', ar: 'ماء', en: 'Water' },
      { id: 'aac_food', emoji: '🍽️', ar: 'طعام', en: 'Food' },
      { id: 'aac_rest', emoji: '🛏️', ar: 'راحة', en: 'Rest' },
      { id: 'aac_wc', emoji: '🚻', ar: 'حمام', en: 'Restroom' },
      { id: 'aac_med', emoji: '💊', ar: 'دواء', en: 'Medicine' },
      { id: 'aac_walk', emoji: '🚶', ar: 'أريد المشي', en: 'Walk' },
      { id: 'aac_help', emoji: '🆘', ar: 'مساعدة', en: 'Help' },
    ],
  },
  {
    id: 'emotions',
    titleAr: 'المشاعر والحالة',
    titleEn: 'Feelings & States',
    tiles: [
      { id: 'aac_happy', emoji: '😊', ar: 'أنا سعيد', en: 'Happy' },
      { id: 'aac_sad', emoji: '😢', ar: 'أنا حزين', en: 'Sad' },
      { id: 'aac_tired', emoji: '😴', ar: 'أنا متعب', en: 'Tired' },
      { id: 'aac_pain', emoji: '🤕', ar: 'أشعر بألم', en: 'Pain' },
      { id: 'aac_calm', emoji: '😌', ar: 'أنا هادئ', en: 'Calm' },
      { id: 'aac_excited', emoji: '🤩', ar: 'متحمس جداً', en: 'Excited' },
    ],
  },
  {
    id: 'classroom',
    titleAr: 'الفصل والدراسة',
    titleEn: 'Classroom & Study',
    tiles: [
      { id: 'aac_question', emoji: '❓', ar: 'عندي سؤال', en: 'Question' },
      { id: 'aac_repeat', emoji: '🔁', ar: 'أعد الشرح', en: 'Repeat' },
      { id: 'aac_understand', emoji: '✅', ar: 'فهمت', en: 'Understood' },
      { id: 'aac_not_understand', emoji: '❌', ar: 'لم أفهم', en: 'Do not understand' },
      { id: 'aac_time', emoji: '⏳', ar: 'أحتاج وقتاً', en: 'Need time' },
      { id: 'aac_read', emoji: '📖', ar: 'أريد القراءة', en: 'Read' },
      { id: 'aac_write', emoji: '✍️', ar: 'أريد الكتابة', en: 'Write' },
    ],
  },
  {
    id: 'social',
    titleAr: 'التحية والتواصل',
    titleEn: 'Social & Greetings',
    tiles: [
      { id: 'aac_hello', emoji: '👋', ar: 'مرحباً', en: 'Hello' },
      { id: 'aac_bye', emoji: '👋', ar: 'مع السلامة', en: 'Goodbye' },
      { id: 'aac_please', emoji: '🙏', ar: 'من فضلك', en: 'Please' },
      { id: 'aac_thanks', emoji: '💐', ar: 'شكراً لك', en: 'Thank you' },
      { id: 'aac_yes', emoji: '👍', ar: 'نعم', en: 'Yes' },
      { id: 'aac_no', emoji: '👎', ar: 'لا', en: 'No' },
    ],
  },
  {
    id: 'medical',
    titleAr: 'الصحة والطوارئ',
    titleEn: 'Medical & Emergency',
    tiles: [
      { id: 'aac_doctor', emoji: '🩺', ar: 'أحتاج الطبيب', en: 'Doctor' },
      { id: 'aac_headache', emoji: '🤕', ar: 'صداع شديد', en: 'Headache' },
      { id: 'aac_stomach', emoji: '🤢', ar: 'مغص بالبطن', en: 'Stomachache' },
      { id: 'aac_breathe', emoji: '🫁', ar: 'صعوبة تنفس', en: 'Breathing' },
      { id: 'aac_medication', emoji: '💊', ar: 'موعد الدواء', en: 'Medicine time' },
      { id: 'aac_emergency', emoji: '🚨', ar: 'حالة طوارئ', en: 'Emergency' },
    ],
  },
];

export default function HearAndExpressView({
  profile,
  onNavigateBack,
  onOpenSignStudio,
  isDarkMode = true,
}: HearAndExpressViewProps) {
  const isAr = isArabicLocale(profile.language);
  const [activeTab, setActiveTab] = useState<CommunicationTab>('captions');
  const [announceText, setAnnounceText] = useState('');

  // 1. Live Captions State
  const [isListening, setIsListening] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [captionHistory, setCaptionHistory] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xl'>('large');
  const recognitionRef = useRef<any>(null);

  // 2. Text-to-Speech Custom Input State
  const [typedMessage, setTypedMessage] = useState('');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // 3. AAC Sentence Builder State
  const [sentenceStrip, setSentenceStrip] = useState<AacTile[]>([]);
  const [activeAacCategory, setActiveAacCategory] = useState<string>('needs');

  // 4. Visual Alert Beacon State
  const [isAlertFlashing, setIsAlertFlashing] = useState(false);
  const [lastAlertTimestamp, setLastAlertTimestamp] = useState<number | null>(null);

  const announce = (msg: string) => {
    setAnnounceText(msg);
  };

  // Initialize Speech Recognition for Live Captions
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = isAr ? 'ar-EG' : 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setCaptionHistory((prev) => [...prev, transcript.trim()]);
            interim = '';
            // Trigger visual alert pulse on final incoming utterance
            triggerVisualAlert();
          } else {
            interim += transcript;
          }
        }
        setCaptionText(interim);
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [isAr]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      announce(isAr ? 'متصفحك لا يدعم التعرف الصوتي المباشر.' : 'Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      announce(isAr ? 'تم إيقاف الاستماع للتفريغ.' : 'Caption listening stopped.');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        announce(isAr ? 'جاري الاستماع الآن، تحدث بوضوح.' : 'Listening now. Speak clearly.');
      } catch (err) {
        console.warn('Start failed:', err);
      }
    }
  };

  const clearCaptions = () => {
    setCaptionHistory([]);
    setCaptionText('');
    announce(isAr ? 'تم مسح النصوص المفرغة.' : 'Captions cleared.');
  };

  const copyCaptions = () => {
    const full = captionHistory.join('\n');
    if (!full) return;
    navigator.clipboard?.writeText(full).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
      announce(isAr ? 'تم نسخ النص إلى الحافظة.' : 'Copied to clipboard.');
    });
  };

  // Speak Typed Custom Message
  const handleSpeakTyped = (textToSpeak?: string) => {
    const content = textToSpeak || typedMessage;
    if (!content.trim()) return;
    speak(content.trim(), profile.language);
    announce(isAr ? `تم نطق: ${content}` : `Spoken: ${content}`);
  };

  // Trigger Visual & Vibration Alert Beacon
  const triggerVisualAlert = () => {
    setIsAlertFlashing(true);
    setLastAlertTimestamp(Date.now());

    // Vibration pattern (short-short-long)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200, 100, 400]);
      } catch {}
    }

    setTimeout(() => {
      setIsAlertFlashing(false);
    }, 1200);
  };

  // AAC Tile Tap
  const handleAddAacTile = (tile: AacTile) => {
    setSentenceStrip((prev) => [...prev, tile]);
    const word = isAr ? tile.ar : tile.en;
    speak(word, profile.language);
    announce(word);
  };

  const handleSpeakSentence = () => {
    if (sentenceStrip.length === 0) return;
    const fullSentence = sentenceStrip.map((t) => (isAr ? t.ar : t.en)).join(' ');
    speak(fullSentence, profile.language);
    announce(isAr ? `نطق الجملة: ${fullSentence}` : `Speaking sentence: ${fullSentence}`);
  };

  const handleClearSentence = () => {
    setSentenceStrip([]);
    announce(isAr ? 'تم مسح شريط الجملة.' : 'Sentence cleared.');
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 relative select-none ${
        isDarkMode ? 'bg-[#0B131E] text-slate-100' : 'bg-[#F5F9FD] text-slate-900'
      } ${isAlertFlashing ? 'ring-8 ring-amber-400 bg-amber-500/20' : ''}`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Visual Alert Screen Flash Overlay */}
      {isAlertFlashing && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed inset-0 z-50 pointer-events-none bg-amber-400/30 animate-pulse border-8 border-amber-400 flex items-center justify-center"
        >
          <div className="bg-[#0B131E] border-2 border-amber-400 text-amber-300 font-bold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
            <Zap className="w-6 h-6 text-amber-400 animate-bounce" />
            <span className="text-sm">
              {isAr ? 'تنبيه بصري: صوت أو مكالمة جديدة!' : 'Visual Alert: New sound or incoming speech!'}
            </span>
          </div>
        </div>
      )}

      {/* Screen Reader Dynamic Status Announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announceText}
      </div>

      {/* Top Header */}
      <header className="px-4 py-3 border-b border-[#1769AA]/30 bg-[#0D2542] flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button
              type="button"
              onClick={onNavigateBack}
              aria-label={isAr ? 'الرجوع للوحة الميزات' : 'Back to dashboard'}
              className="p-2 rounded-xl text-white hover:bg-[#1769AA]/40 transition-colors focus:ring-2 focus:ring-[#1769AA] cursor-pointer"
            >
              {isAr ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          )}
          <BrandLogo size="sm" />
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <Ear className="w-5 h-5 text-[#4B9FE1]" />
              <span>{isAr ? 'السمع والتعبير (Hear & Express)' : 'Hear & Express Communication'}</span>
            </h1>
            <p className="text-xs text-[#94A3B8]">
              {isAr ? 'القسم 5: التواصل والتعبير — شامل الصم وغير الناطقين' : 'Section 5: Communicate — Multi-sensory'}
            </p>
          </div>
        </div>

        {/* Global Stop Speech Button & Communication Status */}
        <div className="flex items-center gap-2">
          <div
            data-testid="communication-state-indicator"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#09101A] border border-[#22354E] text-xs font-bold"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isListening
                  ? 'bg-red-400 animate-pulse'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="text-[#94A3B8]">
              {isListening
                ? (isAr ? 'تفريغ نشط' : 'Listening Active')
                : (isAr ? 'جاهز للتواصل' : 'Ready')}
            </span>
          </div>

          <button
            type="button"
            data-testid="speech-controls"
            onClick={() => {
              cancelSpeech();
              announce(isAr ? 'تم إيقاف الصوت.' : 'Speech stopped.');
            }}
            aria-label={isAr ? 'إيقاف نطق الصوت' : 'Stop voice speech'}
            className="px-3 py-1.5 rounded-xl bg-[#C43D4D]/20 hover:bg-[#C43D4D]/40 text-[#FFA4A4] border border-[#C43D4D]/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <VolumeX className="w-4 h-4" />
            <span>{isAr ? 'إيقاف الصوت' : 'Stop Audio'}</span>
          </button>
        </div>
      </header>

      {/* Module Navigation Tabs */}
      <nav
        role="tablist"
        aria-label={isAr ? 'أدوات التواصل والتعبير' : 'Communication sub-modules'}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#131E2E] border-b border-[#22354E] overflow-x-auto custom-scrollbar"
      >
        {[
          { id: 'captions' as const, labelAr: '🎙️ تفريغ الكلام المباشر', labelEn: '🎙️ Live Captions' },
          { id: 'tts_quick' as const, labelAr: '💬 النطق والرسائل السريعة', labelEn: '💬 Spoken & Quick Messages' },
          { id: 'aac' as const, labelAr: '🧩 لوحات التواصل الرمزي (AAC)', labelEn: '🧩 AAC Board' },
          { id: 'alerts' as const, labelAr: '⚡ منارة التنبيه البصري', labelEn: '⚡ Visual & Vibration Alert' },
          { id: 'esl' as const, labelAr: '🤟 لغة الإشارة المصرية (3D)', labelEn: '🤟 Egyptian Sign Language' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setActiveTab(tab.id);
                announce(isAr ? tab.labelAr : tab.labelEn);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] shrink-0 ${
                isSelected
                  ? 'bg-[#1769AA] text-white shadow-md shadow-[#1769AA]/35 border border-[#4B9FE1]'
                  : 'bg-[#1A283D] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#22354E]'
              }`}
            >
              {isAr ? tab.labelAr : tab.labelEn}
            </button>
          );
        })}
      </nav>

      {/* Main Content Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: LIVE SPEECH-TO-TEXT CAPTIONS
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'captions' && (
          <section data-testid="live-captions-view" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#131E2E] border border-[#22354E]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Mic className="w-5 h-5 text-[#4B9FE1]" />
                  <span>{isAr ? 'التفريغ الفوري للكلام المنطوق' : 'Live Speech-to-Text Captions'}</span>
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  {isAr
                    ? 'يحول الكلام في المحاضرات والمحادثات إلى نصوص مباشرة متباينة لدعم الصم وضعاف السمع.'
                    : 'Transcribes spoken words into live high-contrast text for deaf and hard-of-hearing users.'}
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  aria-label={isListening ? (isAr ? 'إيقاف الاستماع' : 'Stop listening') : (isAr ? 'بدء الاستماع للكلام' : 'Start listening')}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    isListening
                      ? 'bg-[#C43D4D] text-white animate-pulse shadow-md shadow-[#C43D4D]/30'
                      : 'bg-[#1769AA] hover:bg-[#0D4778] text-white shadow-md'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isListening ? (isAr ? 'إيقاف الاستماع' : 'Stop Captions') : (isAr ? 'بدء التفريغ' : 'Start Captions')}</span>
                </button>

                {/* Font Scaling Toggle */}
                <div className="flex items-center gap-1 bg-[#1A283D] p-1 rounded-xl border border-[#22354E]">
                  {(['normal', 'large', 'xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setFontSize(sz)}
                      aria-label={`${isAr ? 'حجم الخط' : 'Font size'} ${sz}`}
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        fontSize === sz ? 'bg-[#1769AA] text-white' : 'text-[#94A3B8]'
                      }`}
                    >
                      {sz === 'normal' ? 'A' : sz === 'large' ? 'A+' : 'A++'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={toggleListening}
                  data-testid="captions-retry-btn"
                  aria-label={isAr ? 'إعادة محاولة الاستماع' : 'Retry listening'}
                  className="px-3 py-2 rounded-xl bg-[#1A283D] border border-[#22354E] hover:border-[#1769AA] text-xs font-bold text-[#4B9FE1] flex items-center gap-1.5 transition-all cursor-pointer"
                  title={isAr ? 'إعادة المحاولة' : 'Retry'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
                </button>

                <button
                  type="button"
                  onClick={copyCaptions}
                  aria-label={isAr ? 'نسخ النصوص' : 'Copy captions'}
                  className="p-2 rounded-xl bg-[#1A283D] border border-[#22354E] text-[#94A3B8] hover:text-white"
                  title={isAr ? 'نسخ النص' : 'Copy Text'}
                >
                  {copiedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={clearCaptions}
                  aria-label={isAr ? 'مسح كل النصوص' : 'Clear all captions'}
                  className="p-2 rounded-xl bg-[#1A283D] border border-[#22354E] text-[#94A3B8] hover:text-rose-400"
                  title={isAr ? 'مسح' : 'Clear'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Captions Display Screen */}
            <div
              className={`p-6 rounded-3xl bg-[#09101A] border-2 ${
                isListening ? 'border-[#1769AA]' : 'border-[#22354E]'
              } min-h-[300px] max-h-[500px] overflow-y-auto custom-scrollbar flex flex-col justify-end space-y-3`}
            >
              {captionHistory.length === 0 && !captionText && (
                <div data-testid="captions-empty-state" className="text-center py-16 space-y-3 my-auto">
                  <Mic className="w-10 h-10 text-[#4B9FE1]/50 mx-auto" />
                  <p className="text-sm font-bold text-[#F8FAFC]">
                    {isAr ? 'لا توجد نصوص مفرغة بعد (التفريغ المباشر جاهز)' : 'No captions recorded yet (Live captions ready)'}
                  </p>
                  <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                    {isAr
                      ? 'اضغط على زر "بدء التفريغ" وسيبدأ رفيقي في كتابة ما يسمعه فوراً بخط عالي التباين.'
                      : 'Click "Start Captions" and Rafiqi will immediately display spoken words in high-contrast text.'}
                  </p>
                </div>
              )}

              {/* In-Flight Listening & Progress Indicator */}
              {isListening && (
                <div data-testid="captions-loading-progress" className="px-3 py-1.5 rounded-xl bg-[#1769AA]/20 border border-[#1769AA]/40 text-[#4B9FE1] text-xs font-bold flex items-center gap-2 animate-pulse w-fit">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                  <span>{isAr ? 'جاري الاستماع والمعالجة المباشرة...' : 'Loading / Listening in progress...'}</span>
                </div>
              )}

              {/* History Messages */}
              {captionHistory.map((phrase, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl bg-[#131E2E] border border-[#22354E] text-[#F8FAFC] leading-relaxed ${
                    fontSize === 'normal' ? 'text-sm' : fontSize === 'large' ? 'text-lg font-bold' : 'text-2xl font-black'
                  }`}
                >
                  {phrase}
                </div>
              ))}

              {/* Interim Real-Time Streaming */}
              {captionText && (
                <div
                  className={`p-3 rounded-2xl bg-[#1769AA]/20 border border-[#1769AA]/50 text-[#4B9FE1] animate-pulse ${
                    fontSize === 'normal' ? 'text-sm' : fontSize === 'large' ? 'text-lg font-bold' : 'text-2xl font-black'
                  }`}
                >
                  {captionText}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: TEXT-TO-SPEECH & QUICK RESPONSE MESSAGES
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'tts_quick' && (
          <section className="space-y-6">
            {/* Custom Typed Speech Input */}
            <div className="p-5 rounded-3xl bg-[#131E2E] border border-[#22354E] space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#4B9FE1]" />
                <span>{isAr ? 'كتابة نص لنطقه بصوت مسموع (لغير الناطقين)' : 'Type to Speak Aloud (Non-Speaking Users)'}</span>
              </h2>

              <div className="flex gap-2">
                <label htmlFor="custom-speech-input" className="sr-only">
                  {isAr ? 'النص المطلوب نطقه' : 'Text to speak'}
                </label>
                <input
                  id="custom-speech-input"
                  data-testid="text-entry-input"
                  type="text"
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSpeakTyped();
                  }}
                  placeholder={
                    isAr
                      ? 'اكتب هنا ما تريد أن ينطقه رفيقي نيابة عنك...'
                      : 'Type here what you want Rafiqi to say for you...'
                  }
                  className="flex-1 p-3.5 rounded-2xl bg-[#09101A] border border-[#22354E] text-sm text-white placeholder:text-[#94A3B8]/60 outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#1769AA]"
                />
                <button
                  type="button"
                  onClick={() => handleSpeakTyped()}
                  disabled={!typedMessage.trim()}
                  aria-label={isAr ? 'نطق النص المكتوب' : 'Speak typed message'}
                  className="px-5 py-3.5 rounded-2xl bg-[#1769AA] hover:bg-[#0D4778] disabled:bg-[#1A283D] disabled:text-[#94A3B8] text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isAr ? 'انطق' : 'Speak'}</span>
                </button>
              </div>
            </div>

            {/* Quick Response Shortcuts */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#4B9FE1]" />
                <span>{isAr ? 'ردود سريعة بلمسة واحدة (نطق فوري)' : 'One-Touch Quick Responses (Instant Voice)'}</span>
              </h3>

              <div data-testid="quick-responses-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUICK_RESPONSES.map((item) => {
                  const text = isAr ? item.ar : item.en;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSpeakTyped(text)}
                      aria-label={`${isAr ? 'نطق عبارة:' : 'Speak phrase:'} ${text}`}
                      className="p-4 rounded-2xl bg-[#1A283D] hover:bg-[#1769AA]/20 border border-[#22354E] hover:border-[#1769AA] text-[#F8FAFC] text-start flex items-center justify-between gap-3 transition-all cursor-pointer group shadow-sm active:scale-98"
                    >
                      <span className="text-sm font-bold leading-relaxed">{text}</span>
                      <Volume2 className="w-4 h-4 text-[#4B9FE1] group-hover:scale-110 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: AAC COMMUNICATION BOARD & SENTENCE BUILDER
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'aac' && (
          <section data-testid="aac-board-view" className="space-y-5">
            {/* Sentence Strip Builder */}
            <div className="p-4 rounded-3xl bg-[#131E2E] border-2 border-[#1769AA] space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#4B9FE1] uppercase tracking-wider">
                  {isAr ? 'شريط بناء الجملة المنطوقة (AAC)' : 'Spoken Sentence Strip'}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSpeakSentence}
                    disabled={sentenceStrip.length === 0}
                    aria-label={isAr ? 'نطق الجملة الكاملة بصوت مسموع' : 'Speak full sentence'}
                    className="px-4 py-2 rounded-xl bg-[#16845B] hover:bg-[#126b49] disabled:bg-[#1A283D] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isAr ? 'نطق الجملة' : 'Speak Sentence'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSentence}
                    disabled={sentenceStrip.length === 0}
                    aria-label={isAr ? 'مسح شريط الجملة' : 'Clear sentence'}
                    className="p-2 rounded-xl bg-[#1A283D] text-[#94A3B8] hover:text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Strip Items */}
              <div className="min-h-[48px] p-2.5 rounded-2xl bg-[#09101A] border border-[#22354E] flex flex-wrap items-center gap-2">
                {sentenceStrip.length === 0 ? (
                  <span className="text-xs text-[#94A3B8]/70 px-2">
                    {isAr
                      ? 'اضغط على البطاقات الرمزية أدناه لتكوين جملتك ثم اضغط "نطق الجملة".'
                      : 'Tap symbol tiles below to build a sentence, then click "Speak Sentence".'}
                  </span>
                ) : (
                  sentenceStrip.map((tile, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1769AA] text-white font-bold text-xs shadow-xs"
                    >
                      <span>{tile.emoji}</span>
                      <span>{isAr ? tile.ar : tile.en}</span>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* AAC Category Selector */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
              {AAC_CATEGORIES.map((cat) => {
                const isSelected = activeAacCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveAacCategory(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1769AA] text-white border border-[#4B9FE1]'
                        : 'bg-[#131E2E] text-[#94A3B8] border border-[#22354E]'
                    }`}
                  >
                    {isAr ? cat.titleAr : cat.titleEn}
                  </button>
                );
              })}
            </div>

            {/* AAC Tile Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {AAC_CATEGORIES.find((c) => c.id === activeAacCategory)?.tiles.map((tile) => {
                const label = isAr ? tile.ar : tile.en;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => handleAddAacTile(tile)}
                    aria-label={`${isAr ? 'إضافة ونطق رمز:' : 'Add and speak tile:'} ${label}`}
                    className="p-4 rounded-2xl bg-[#1A283D] hover:bg-[#1769AA]/25 border border-[#22354E] hover:border-[#1769AA] text-center flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm group"
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">{tile.emoji}</span>
                    <span className="text-xs font-bold text-[#F8FAFC]">{label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: VISUAL & VIBRATION ALERT BEACON
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'alerts' && (
          <section className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#131E2E] border border-[#22354E] space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-400" />
                <span>{isAr ? 'منارة التنبيه البصري واللمسي (للصم وضعاف السمع)' : 'Visual & Vibration Alert Beacon'}</span>
              </h2>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {isAr
                  ? 'يقوم هذا النظام بإصدار وميض بصري ساطع عبر الشاشة مع نبضات اهتزازية لمسية لتنبيه المستخدم الأصم فور حدوث أصوات هامة، أجهزة إنذار، أو عند تلقي نداءات مباشرة.'
                  : 'Emits a bright full-screen visual flash and haptic vibration patterns to notify deaf users of incoming calls, alarms, or urgent environmental sounds.'}
              </p>

              <div className="p-4 rounded-2xl bg-[#09101A] border border-[#22354E] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">
                    {isAr ? 'اختبار منارة التنبيه الآن' : 'Test Alert Beacon Now'}
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    {isAr ? 'سيومض ضوء أصفر ذهبي على الشاشة مع اهتزاز الجهاز.' : 'Flashes a golden banner and triggers device vibration.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={triggerVisualAlert}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isAr ? 'اختبار التنبيه' : 'Trigger Alert'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 5: EGYPTIAN SIGN LANGUAGE (ESL) FOUNDATION HUB
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'esl' && (
          <section className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#131E2E] border border-[#22354E] space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#1769AA]/20 text-[#4B9FE1] border border-[#1769AA]/40">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? 'لغة الإشارة المصرية المعتمدة (ESL/ArSL)' : 'Egyptian Sign Language (ESL/ArSL)'}</span>
              </div>

              <h2 className="text-lg font-bold text-white">
                {isAr
                  ? 'استوديو وقاموس لغة الإشارة المصرية ثلاثي الأبعاد'
                  : 'Egyptian Sign Language 3D Avatar & Studio'}
              </h2>

              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {isAr
                  ? 'يتضمن هذا الأساس التكاملي قاموس الإشارات المعتمد لطلاب المدارس والجامعات في مصر، مدعوماً بمجسم ثلاثي الأبعاد (3D Avatar) يحاكي حركات الأصابع والذراعين وفق توصيف HamNoSys العلمي. نؤكد بأمانة أن النظام يعتمد على بيانات معجمية موثقة لتفادي أي ترجمة وهمية غير دقيقة.'
                  : 'This foundation provides Egyptian Sign Language (ESL) vocabulary mapped from verified curriculum datasets to a 3D avatar using HamNoSys kinematic curl coordinates, with honest integration disclosure.'}
              </p>

              <div className="pt-2">
                {onOpenSignStudio && (
                  <button
                    type="button"
                    onClick={onOpenSignStudio}
                    className="px-5 py-3 rounded-2xl bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isAr ? 'فتح استوديو لغة الإشارة 3D' : 'Open 3D Sign Language Studio'}</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
