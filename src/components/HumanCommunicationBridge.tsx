import React, { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from './Toast';
import { UserProfile } from '../types';
import { localize, isArabicLocale } from '../lib/translations';
import { speak, cancelSpeech } from '../lib/tts';
import { triggerHapticAlert } from '../lib/hapticNavEngine';
import { 
  Volume2, 
  Mic, 
  Square, 
  Play, 
  MessageSquare, 
  UserCheck, 
  Stethoscope, 
  GraduationCap, 
  Store, 
  AlertOctagon, 
  Copy, 
  Download, 
  Trash2, 
  Hand, 
  Sparkles, 
  Check, 
  Radio, 
  Clock, 
  RefreshCw,
  Send
} from 'lucide-react';

// Lazy-load SignAvatar3D so Three.js procedural kinematics do not slow down initial bundle
const SignAvatar3D = React.lazy(() => import('./SignAvatar3D'));

interface HumanCommunicationBridgeProps {
  profile: UserProfile;
}

interface DialogueMessage {
  id: string;
  sender: 'user' | 'partner';
  text: string;
  timestamp: string;
}

type AACCategory = 'medical' | 'academic' | 'daily' | 'emergency';

export default function HumanCommunicationBridge({ profile }: HumanCommunicationBridgeProps) {
  const [voiceDialect, setVoiceDialect] = useState<string>(profile.language || 'Egyptian Ammiya');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [activeAacCategory, setActiveAacCategory] = useState<AACCategory>('medical');

  const isArabic = isArabicLocale(voiceDialect);
  const isEgyptian = voiceDialect === 'Egyptian Ammiya';
  const isFrench = voiceDialect === 'French';

  // ── RICH SCENARIO-SPECIFIC AAC PACKS ──
  const AAC_CATEGORIES: Record<AACCategory, {
    labelAr: string;
    labelEn: string;
    icon: any;
    color: string;
    phrases: { text: string; icon: string }[];
  }> = {
    medical: {
      labelAr: 'كشف طبي وأعراض 🩺',
      labelEn: 'Clinic & Doctor 🩺',
      icon: Stethoscope,
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
      phrases: isEgyptian ? [
        { text: 'عندي ألم شديد في الجزء ده', icon: '🤕' },
        { text: 'عندي حساسية من أدوية معينة', icon: '⚠️' },
        { text: 'محتاج قياس الضغط والسكر لو سمحت', icon: '🩺' },
        { text: 'ممكن تكتب لي الروشتة بخط واضح؟', icon: '📝' },
        { text: 'أنا لا أسمع، أرجو التحدث بهدوء أو الكتابة', icon: '🤟' },
        { text: 'كم مرة في اليوم أتناول العلاج ده؟', icon: '💊' },
        { text: 'هل في أي آثار جانبية للدواء؟', icon: 'ℹ️' },
        { text: 'شكراً يا دكتور، طمنتني جداً', icon: '🙏' },
      ] : isArabic ? [
        { text: 'أشعر بألم في هذا الموضع', icon: '🤕' },
        { text: 'أعاني من حساسية تجاه بعض الأدوية', icon: '⚠️' },
        { text: 'أحتاج فحص ضغط الدم ونسبة السكر', icon: '🩺' },
        { text: 'لو سمحت اكتب الوصفة الطبية بخط واضح', icon: '📝' },
        { text: 'أنا أصم، أرجو الكتابة على الورق أو الشاشة', icon: '🤟' },
        { text: 'كم جرعة أتناولها يومياً من هذا الدواء؟', icon: '💊' },
        { text: 'هل توجد أي أعراض جانبية متوقعة؟', icon: 'ℹ️' },
        { text: 'شكراً جزيلاً لك يا دكتور', icon: '🙏' },
      ] : isFrench ? [
        { text: "J'ai une douleur à cet endroit", icon: '🤕' },
        { text: 'Je suis allergique à certains médicaments', icon: '⚠️' },
        { text: 'Pouvez-vous mesurer ma tension svp ?', icon: '🩺' },
        { text: "Veuillez écrire l'ordonnance clairement", icon: '📝' },
        { text: 'Je suis sourd, écrivez svp', icon: '🤟' },
        { text: 'Combien de fois par jour ce traitement ?', icon: '💊' },
      ] : [
        { text: 'I feel pain in this area', icon: '🤕' },
        { text: 'I have allergies to certain medicines', icon: '⚠️' },
        { text: 'Please check my blood pressure', icon: '🩺' },
        { text: 'Please write down instructions clearly', icon: '📝' },
        { text: 'I am deaf, please type or write', icon: '🤟' },
        { text: 'How many times a day should I take this?', icon: '💊' },
      ],
    },
    academic: {
      labelAr: 'جامعة ومحاضرات 🎓',
      labelEn: 'University & Lectures 🎓',
      icon: GraduationCap,
      color: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10',
      phrases: isEgyptian ? [
        { text: 'عندي سؤال بخصوص نقطة البحث يا دكتور', icon: '🙋‍♂️' },
        { text: 'ممكن إعادة النقطة الأخيرة بطريقة أبسط؟', icon: '🔄' },
        { text: 'هل الجزئية دي داخلة في امتحان الميدتيرم؟', icon: '❓' },
        { text: 'محتاج ورقة الأسئلة مطبوعة أو مكتوبة', icon: '📄' },
        { text: 'ممكن تسجيل المحاضرة أو تفريغها نصياً؟', icon: '🎙️' },
        { text: 'تمام جداً، فهمت الفكرة تماماً!', icon: '✅' },
      ] : isArabic ? [
        { text: 'عندي استفسار عن نقطة في المحاضرة', icon: '🙋‍♂️' },
        { text: 'ممكن إعادة الشرح بطريقة أكثر بساطة؟', icon: '🔄' },
        { text: 'هل هذا الفصل متضمن في الامتحان النهائي؟', icon: '❓' },
        { text: 'أحتاج ورقة الأسئلة مكتوبة من فضلك', icon: '📄' },
        { text: 'شكراً جزيلاً لك، اتضحت الفكرة', icon: '✅' },
      ] : [
        { text: 'I have a question regarding this point', icon: '🙋‍♂️' },
        { text: 'Could you repeat that simpler please?', icon: '🔄' },
        { text: 'Is this chapter on the exam?', icon: '❓' },
        { text: 'I need written questions please', icon: '📄' },
        { text: 'Understood completely, thank you!', icon: '✅' },
      ],
    },
    daily: {
      labelAr: 'مصالح وتعاملات يومية 🏪',
      labelEn: 'Daily Life & Services 🏪',
      icon: Store,
      color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
      phrases: isEgyptian ? [
        { text: 'أين أقرب محطة مترو أو صيدلية؟', icon: '🚇' },
        { text: 'بكم سعر الحاجة دي لو سمحت؟', icon: '💵' },
        { text: 'عايز أشتري ده، الدفع كاش ولا فيزا؟', icon: '💳' },
        { text: 'لو سمحت اكتب لي التفاصيل على الموبايل', icon: '📱' },
        { text: 'أنا بستخدم لغة الإشارة للتواصل', icon: '🤟' },
        { text: 'شكراً جزيلاً، يومك جميل وسعيد!', icon: '✨' },
      ] : isArabic ? [
        { text: 'أين أجد أقرب محطة قطار أو صيدلية؟', icon: '🚇' },
        { text: 'كم سعر هذا المنتج من فضلك؟', icon: '💵' },
        { text: 'أود شراء هذا، هل تقبلون البطاقة؟', icon: '💳' },
        { text: 'أرجو كتابة العنوان والتفاصيل هنا', icon: '📱' },
        { text: 'أنا أستخدم لغة الإشارة للتواصل', icon: '🤟' },
        { text: 'شكراً جزيلاً، طاب يومك!', icon: '✨' },
      ] : [
        { text: 'Where is the nearest station / pharmacy?', icon: '🚇' },
        { text: 'How much does this cost please?', icon: '💵' },
        { text: 'Can I pay with card or cash?', icon: '💳' },
        { text: 'Please write the details on my screen', icon: '📱' },
        { text: 'Thank you very much, have a great day!', icon: '✨' },
      ],
    },
    emergency: {
      labelAr: 'طوارئ واستغاثة 🚨',
      labelEn: 'Urgent & Emergency 🚨',
      icon: AlertOctagon,
      color: 'border-rose-500/40 text-rose-400 bg-rose-500/10',
      phrases: isEgyptian ? [
        { text: 'أنا محتاج مساعدة عاجلة فوراً!', icon: '🚨' },
        { text: 'اتصل بالإسعاف أو النجدة لو سمحت!', icon: '🚑' },
        { text: 'فقدت المحفظة والموبايل بتاعي', icon: '🔍' },
        { text: 'أنا أصم ولا أسمع، رجاءً قف بجانبي', icon: '🤝' },
        { text: 'أحتاج طبيب أو مترجم لغة إشارة', icon: '👨‍⚕️' },
      ] : isArabic ? [
        { text: 'أحتاج مساعدة عاجلة من فضلك!', icon: '🚨' },
        { text: 'اتصل بالإسعاف فوراً لو سمحت!', icon: '🚑' },
        { text: 'فقدت متعلقاتي الشخصية', icon: '🔍' },
        { text: 'أنا شخص أصم، أرجو مساعدتي فوراً', icon: '🤝' },
      ] : [
        { text: 'I need urgent assistance immediately!', icon: '🚨' },
        { text: 'Please call an ambulance / police!', icon: '🚑' },
        { text: 'I lost my personal belongings', icon: '🔍' },
        { text: 'I am deaf, please stay with me to help', icon: '🤝' },
      ],
    },
  };

  // Quick Sign Gestures for rapid one-touch voice response
  const QUICK_GESTURES = [
    { labelAr: 'نعم / تمام', labelEn: 'Yes / OK', icon: '👍', text: isEgyptian ? 'تمام وموافق' : 'نعم، أوافق' },
    { labelAr: 'لا / معترض', labelEn: 'No', icon: '👎', text: isEgyptian ? 'لأ، مش موافق' : 'لا، لست موافقاً' },
    { labelAr: 'شكراً جزيلاً', labelEn: 'Thank You', icon: '🙏', text: isEgyptian ? 'شكراً جزيلاً يا باشا' : 'شكراً جزيلاً لك' },
    { labelAr: 'أنا أصم', labelEn: 'I am Deaf', icon: '🤟', text: isEgyptian ? 'أنا أصم وأتحدث بلغة الإشارة' : 'أنا شخص أصم وأتواصل بلغة الإشارة' },
    { labelAr: 'لحظة واحدة', labelEn: 'One Moment', icon: '⏳', text: isEgyptian ? 'لحظة واحدة من فضلك' : 'لحظة واحدة لو سمحت' },
    { labelAr: 'أين المكان؟', labelEn: 'Where is it?', icon: '❓', text: isEgyptian ? 'فين المكان ده لو سمحت؟' : 'أين يقع هذا المكان لو سمحت؟' },
  ];

  const [inputText, setInputText] = useState('');
  const [isSpeakingOut, setIsSpeakingOut] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [sequence, setSequence] = useState<string[]>([]);
  const [isListeningPartner, setIsListeningPartner] = useState(false);
  const [partnerTranscript, setPartnerTranscript] = useState('');
  const [partnerSignSequence, setPartnerSignSequence] = useState<string[]>([]);
  const [isPartnerSigning, setIsPartnerSigning] = useState(false);
  const [dialogueLog, setDialogueLog] = useState<DialogueMessage[]>([
    {
      id: 'msg-init-1',
      sender: 'user',
      text: isArabic ? 'مرحباً، أنا أستخدم جسر التواصل للتحدث معك.' : 'Hello, I am using the communication bridge to speak with you.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const recognitionRef = useRef<any>(null);
  const dialogueEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll dialogue timeline
  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogueLog]);

  // 1. Speak aloud the user's text to the hearing partner in the room
  const handleSpeakToRoom = (overrideText?: string) => {
    const textToSpeak = (overrideText || inputText).trim();
    if (!textToSpeak) return;

    setIsSpeakingOut(true);
    triggerHapticAlert('single-pulse');

    // Append to live dialogue
    const newMsg: DialogueMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: textToSpeak,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setDialogueLog((prev) => [...prev, newMsg]);

    speak(textToSpeak, voiceDialect, {
      rate: speechRate,
      onStart: () => setIsSpeakingOut(true),
      onEnd: () => setIsSpeakingOut(false),
      onError: (reason) => {
        setIsSpeakingOut(false);
        const msg =
          reason === 'unsupported'
            ? (isArabic ? '⚠️ المتصفح لا يدعم النطق الصوتي' : '⚠️ Speech not supported')
            : reason === 'silent-fail'
            ? (isArabic ? '⚠️ تعذر نطق الجملة. تأكد من إعدادات الصوت' : '⚠️ Speech playback error')
            : (isArabic ? '⚠️ حدث خطأ أثناء النطق' : '⚠️ Speech output error');
        toast.error(msg);
      },
    });

    if (!overrideText) {
      setInputText('');
    }
  };

  // 2. Generate 3D Sign Language video for what the user wrote
  const handleSignMyMessage = (overrideText?: string) => {
    const text = (overrideText || inputText).trim();
    if (!text) return;
    const words = text.split(/\s+/).filter(Boolean);
    setSequence(words);
    setIsSigning(true);
    triggerHapticAlert('single-pulse');
  };

  // 3. Partner speaking into mic -> Live Speech to Sign translation
  const togglePartnerListening = () => {
    if (isListeningPartner) {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      setIsListeningPartner(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error(isArabic ? "المتصفح لا يدعم ميزة تحويل الصوت إلى نص" : "Browser does not support Speech Recognition");
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = voiceDialect === 'Egyptian Ammiya' ? 'ar-EG' : voiceDialect === 'Arabic' ? 'ar-SA' : voiceDialect === 'French' ? 'fr-FR' : 'en-US';

      rec.onresult = (event: any) => {
        let transcript = '';
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const chunk = event.results[i][0].transcript;
          transcript += chunk;
          if (event.results[i].isFinal) finalText += chunk;
        }
        setPartnerTranscript(transcript);

        const words = finalText.trim().split(/\s+/).filter(Boolean);
        if (words.length > 0) {
          setPartnerSignSequence(words);
          setIsPartnerSigning(true);
          triggerHapticAlert('double-pulse');

          // Append to live dialogue
          const partnerMsg: DialogueMessage = {
            id: 'partner-' + Date.now(),
            sender: 'partner',
            text: finalText.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setDialogueLog((prev) => [...prev, partnerMsg]);
        }
      };

      rec.onerror = () => setIsListeningPartner(false);
      rec.onend = () => setIsListeningPartner(false);
      rec.start();
      recognitionRef.current = rec;
      setIsListeningPartner(true);
      triggerHapticAlert('single-pulse');
    } catch (e) {
      console.error("Partner speech recognition error", e);
      setIsListeningPartner(false);
    }
  };

  // Export full transcript as text file
  const handleExportTranscript = () => {
    const lines = dialogueLog.map((m) => `[${m.timestamp}] ${m.sender === 'user' ? (isArabic ? 'أنا (لغة الإشارة)' : 'Me') : (isArabic ? 'المتحدث (صوت)' : 'Partner')}: ${m.text}`);
    const content = lines.join('\n\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cognify_Dialogue_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isArabic ? 'تم حفظ سجل المحادثة بنجاح' : 'Transcript downloaded successfully');
  };

  // Copy transcript to clipboard
  const handleCopyTranscript = () => {
    const lines = dialogueLog.map((m) => `[${m.timestamp}] ${m.sender === 'user' ? 'Me' : 'Partner'}: ${m.text}`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
    toast.success(isArabic ? 'تم نسخ المحادثة إلى الحافظة' : 'Transcript copied to clipboard');
  };

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      cancelSpeech();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#0b0f19] text-slate-100 relative overflow-hidden h-full p-3 sm:p-5 md:p-6 select-none">
      
      {/* ── TOP HEADER WITH DIALECT & CONTROLS ── */}
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#13182b] p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>{isArabic ? "جسر التواصل البشري الحي (Two-Way Neural Relay)" : "Live Two-Way Communication Bridge"}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                {isArabic ? 'مباشر' : 'Live'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {isArabic 
                ? "ترجمة فورية ثنائية: كلام المتحدث يتحول لأفاتار 3D، وإشاراتك وكتابتك تُنطق بصوت طبيعي."
                : "Real-time bridge: Partner speech becomes 3D Sign avatar, your signs/text speak out loud naturally."}
            </p>
          </div>
        </div>

        {/* Dialect and Speed Controls */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
          {/* Dialect Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 px-1.5">🗣️</span>
            {[
              { id: 'Egyptian Ammiya', label: '🇪🇬 مصري' },
              { id: 'Arabic', label: '🇸🇦 فصحى' },
              { id: 'English', label: '🇺🇸 EN' },
              { id: 'French', label: '🇫🇷 FR' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setVoiceDialect(id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  voiceDialect === id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Speech Rate Controls */}
          <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400 font-bold">{isArabic ? 'السرعة:' : 'Speed:'}</span>
            {[0.8, 1.0, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => setSpeechRate(rate)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                  speechRate === rate ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TWO-WAY MAIN SPLIT: SIDE A (DEAF SPEAKER) VS SIDE B (HEARING PARTNER) ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-h-0 overflow-y-auto pb-4">
        
        {/* ── SIDE A: MY VOICE (DEAF / MUTE INDIVIDUAL) ── */}
        <div className="bg-[#13182b] rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <UserCheck className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-white">
                {isArabic ? "أنا أتحدث (صوتي للغرفة)" : "My Spoken Voice (To the Room)"}
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              Signs & AAC ➔ Voice
            </span>
          </div>

          {/* 1. Quick Sign Gestures Ribbon */}
          <div className="mb-3 shrink-0">
            <p className="text-[11px] font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Hand className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isArabic ? "إيماءات إشارية فورية بصوت طبيعي:" : "Instant Sign-to-Speech Gestures:"}</span>
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {QUICK_GESTURES.map((g, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleSpeakToRoom(g.text);
                    handleSignMyMessage(g.text);
                  }}
                  title={g.text}
                  className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/40 text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="text-base">{g.icon}</span>
                  <span className="text-[10px] font-bold text-slate-300 truncate w-full">
                    {isArabic ? g.labelAr : g.labelEn}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Categorized AAC Scenarios Tabs */}
          <div className="mb-3 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(Object.keys(AAC_CATEGORIES) as AACCategory[]).map((catKey) => {
                const cat = AAC_CATEGORIES[catKey];
                const isActive = activeAacCategory === catKey;
                return (
                  <button
                    key={catKey}
                    onClick={() => setActiveAacCategory(catKey)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 border ${
                      isActive
                        ? `${cat.color} shadow-md`
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{isArabic ? cat.labelAr : cat.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* Phrases Grid for active scenario */}
            <div className="grid grid-cols-2 gap-1.5 mt-2 max-h-[140px] overflow-y-auto p-1 bg-slate-900/60 rounded-xl border border-slate-800/80">
              {AAC_CATEGORIES[activeAacCategory].phrases.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(phrase.text);
                    handleSpeakToRoom(phrase.text);
                  }}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-indigo-900/30 hover:border-indigo-500/40 border border-slate-800/90 text-start text-xs font-bold text-slate-200 transition-all active:scale-95 flex items-center gap-2 truncate"
                >
                  <span className="text-sm shrink-0">{phrase.icon}</span>
                  <span className="truncate">{phrase.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Custom Text / Gesture Input */}
          <div className="flex-1 flex flex-col min-h-[90px] mb-3">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="human-bridge-textarea" className="text-[11px] font-bold text-slate-400">
                {isArabic ? "اكتب ما تريد قوله للطرف الآخر:" : "Type what to speak out loud:"}
              </label>
              {inputText.trim() && (
                <button 
                  onClick={() => setInputText('')} 
                  className="text-[10px] text-slate-500 hover:text-slate-300"
                >
                  {isArabic ? 'مسح' : 'Clear'}
                </button>
              )}
            </div>
            <textarea
              id="human-bridge-textarea"
              name="human-bridge-message"
              aria-label={isArabic ? "نص الرسالة المنطوقة" : "Message to speak aloud"}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSpeakToRoom();
                }
              }}
              placeholder={isArabic ? "اكتب ما تريد قوله واضغط Enter للنطق للغرفة..." : "Type your message and press Enter to speak aloud..."}
              className="flex-1 min-h-[70px] p-3 bg-slate-900 border border-slate-800 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-100 font-medium text-xs sm:text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 shrink-0">
            <button
              onClick={() => handleSpeakToRoom()}
              disabled={!inputText.trim()}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 text-slate-950 font-black rounded-xl shadow-lg transition-all active:scale-95 text-xs sm:text-sm"
            >
              {isSpeakingOut ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
              <span>{isArabic ? "انطق للغرفة (Enter)" : "Speak Aloud (Enter)"}</span>
            </button>

            <button
              onClick={() => handleSignMyMessage()}
              disabled={!inputText.trim()}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs sm:text-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isArabic ? "محاكاة الإشارة 3D" : "Sign on Avatar"}</span>
            </button>
          </div>
        </div>

        {/* ── SIDE B: PARTNER SPEAKING IN (SPEECH-TO-SIGN + 3D AVATAR) ── */}
        <div className="bg-[#13182b] rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                <Mic className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-white">
                {isArabic ? "الطرف الآخر يتحدث (تحويل لصورة وإشارة)" : "Partner Speaking (Speech-to-Sign)"}
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300">
              Voice ➔ 3D Sign
            </span>
          </div>

          {/* 3D Sign Preview with Suspense fallback */}
          <div className="relative flex-1 min-h-[220px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 mb-3 flex items-center justify-center">
            <React.Suspense fallback={
              <div className="text-center p-4">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs text-slate-400">{isArabic ? "جاري تحميل الأفاتار ثلاثي الأبعاد..." : "Loading 3D Sign Avatar..."}</span>
              </div>
            }>
              <SignAvatar3D
                words={partnerSignSequence.length > 0 ? partnerSignSequence : sequence}
                playing={isPartnerSigning || isSigning}
                onDone={() => {
                  setIsPartnerSigning(false);
                  setIsSigning(false);
                }}
              />
            </React.Suspense>

            {isListeningPartner && (
              <div className="absolute top-2.5 left-2.5 bg-rose-500/90 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>{isArabic ? "المايك يستمع للمتحدث..." : "Listening to Partner..."}</span>
              </div>
            )}
          </div>

          {/* Real-time Subtitles / Captions */}
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl mb-3 shrink-0 min-h-[50px]">
            <p className="text-[10px] text-slate-400 font-bold mb-0.5">{isArabic ? "الكلام المنطوق لحظياً:" : "Live Spoken Transcript:"}</p>
            <p className="text-xs sm:text-sm font-bold text-emerald-400 break-words">
              {partnerTranscript || (isListeningPartner 
                ? (isArabic ? "المتحدث يتكلم الآن..." : "Partner is speaking now...") 
                : (isArabic ? "اضغط على الزر أدناه لبدء الاستماع للمتحدث" : "Click below to listen to partner"))}
            </p>
          </div>

          {/* Partner Listen Toggle Button */}
          <button
            onClick={togglePartnerListening}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black transition-all shadow-lg text-xs sm:text-sm active:scale-95 shrink-0 ${
              isListeningPartner
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white'
            }`}
          >
            {isListeningPartner ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
            <span>
              {isListeningPartner 
                ? (isArabic ? "إيقاف الاستماع للمتحدث" : "Stop Listening") 
                : (isArabic ? "بدء الاستماع للمتحدث (تحويل لإشارة فورية)" : "Start Listening to Partner")}
            </span>
          </button>
        </div>
      </div>

      {/* ── LIVE TWO-WAY DIALOGUE TIMELINE FOOTER ── */}
      <div className="shrink-0 bg-[#13182b] border border-slate-800 rounded-2xl p-3 sm:p-4 mt-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-black text-white">
              {isArabic ? "سجل المحادثة الحية المزدوجة" : "Two-Way Live Dialogue Timeline"}
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
              {dialogueLog.length} {isArabic ? 'رسائل' : 'messages'}
            </span>
          </div>

          {/* Export & Copy Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyTranscript}
              className="p-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isArabic ? 'نسخ' : 'Copy'}</span>
            </button>
            <button
              onClick={handleExportTranscript}
              className="p-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isArabic ? 'حفظ TXT' : 'Save'}</span>
            </button>
            <button
              onClick={() => setDialogueLog([])}
              className="p-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-500 text-[11px] transition-all"
              title={isArabic ? 'مسح السجل' : 'Clear log'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dialogue Scroll Container */}
        <div className="max-h-[110px] overflow-y-auto space-y-1.5 pr-1">
          {dialogueLog.map((msg) => {
            const isMe = msg.sender === 'user';
            return (
              <div 
                key={msg.id}
                className={`p-2 rounded-xl text-xs flex items-start justify-between gap-3 border ${
                  isMe 
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100 mr-4' 
                    : 'bg-indigo-950/20 border-indigo-500/30 text-indigo-100 ml-4'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                    isMe ? 'bg-emerald-500/30 text-emerald-300' : 'bg-indigo-500/30 text-indigo-300'
                  }`}>
                    {isMe ? (isArabic ? 'أنا (إشارة/نص)' : 'Me') : (isArabic ? 'المتحدث (صوت)' : 'Partner')}
                  </span>
                  <span className="truncate">{msg.text}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">{msg.timestamp}</span>
              </div>
            );
          })}
          <div ref={dialogueEndRef} />
        </div>
      </div>

    </div>
  );
}
