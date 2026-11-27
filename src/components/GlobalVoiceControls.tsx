import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, PhoneCall, Siren, X } from 'lucide-react';
import { UserProfile } from '../types';
import { AppView } from '../lib/access';
import { DisabilityTab } from '../lib/navigation';
import { useGlobalVoiceControl } from '../hooks/useGlobalVoiceControl';
import { useEmergencySOS } from '../hooks/useEmergencySOS';
import { VoiceIntent, voiceCommandsHelp } from '../lib/voiceCommands';
import { speak, cancelSpeech, replayLastSpeech } from '../lib/tts';
import { loadContacts, makePhoneCall } from '../lib/contacts';
import { answerQuickQuestion } from '../lib/locationAwareness';

export const VISION_AUTOSTART_KEY = 'rafiqi_vision_autostart_tool';
const TTS_RATE_KEY = 'cognify_tts_rate';

export interface GlobalVoiceControlsProps {
  profile: UserProfile;
  isArabic: boolean;
  onNavigate: (view: AppView, tab?: DisabilityTab) => void;
}

/**
 * Global blind-first controls, mounted once for the whole app:
 * - A huge floating hold-to-talk button that runs every voice command.
 * - Triple-tap on the same button triggers the emergency SOS.
 * - Phone shake triggers the emergency SOS.
 * - The SOS countdown / status modal lives here so SOS works from ANY screen.
 */
const GlobalVoiceControls: React.FC<GlobalVoiceControlsProps> = ({ profile, isArabic, onNavigate }) => {
  const [speechRate, setSpeechRate] = useState<number>(() => {
    const saved = Number(localStorage.getItem(TTS_RATE_KEY));
    return saved >= 0.5 && saved <= 2 ? saved : 1;
  });
  const [motionPermissionAsked, setMotionPermissionAsked] = useState(false);

  const speakSafe = useCallback(
    (text: string) => {
      speak(text, isArabic ? 'Arabic' : 'English', { rate: speechRate });
    },
    [isArabic, speechRate]
  );
  const speakSafeRef = useRef(speakSafe);
  speakSafeRef.current = speakSafe;

  const sos = useEmergencySOS({
    profile,
    motorLang: isArabic ? 'ar' : 'en',
    isArabic,
    speakSafe: (text: string) => speakSafeRef.current(text),
  });
  const sosRef = useRef(sos);
  sosRef.current = sos;

  const handleIntent = useCallback(
    (intent: VoiceIntent): boolean => {
      const say = (ar: string, en: string) => speak(isArabic ? ar : en, isArabic ? 'Arabic' : 'English', { rate: speechRate });
      switch (intent.type) {
        case 'sos':
          sosRef.current.triggerEmergencySOS('vocal');
          return true;
        case 'open_vision':
          try { sessionStorage.setItem(VISION_AUTOSTART_KEY, intent.tool); } catch { /* noop */ }
          onNavigate('disability', 'vision');
          say('بفتح الكاميرا', 'Opening the camera');
          return true;
        case 'open_navigation':
          onNavigate('voice_navigation');
          say('بفتح التنقل', 'Opening navigation');
          return true;
        case 'open_daily_aids':
          onNavigate('daily_aids');
          say('بفتح التذكيرات والمساعدات اليومية', 'Opening daily reminders and aids');
          return true;
        case 'open_known_people':
          onNavigate('known_people');
          say('بفتح الأشخاص المعروفين', 'Opening known people');
          return true;
        case 'go_back':
          window.history.back();
          return true;
        case 'go_home':
          onNavigate('blind_home');
          say('رجعت للشاشة الرئيسية', 'Back to the home screen');
          return true;
        case 'read_screen': {
          const main = document.getElementById('main-content');
          const text = (main?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
          if (text) {
            speak(text, isArabic ? 'Arabic' : 'English', { rate: speechRate });
          } else {
            say('الشاشة فاضية دلوقتي', 'The screen is empty right now');
          }
          return true;
        }
        case 'repeat':
          if (!replayLastSpeech()) say('مفيش حاجة اتقالت قبل كده', 'Nothing was said before');
          return true;
        case 'stop':
          cancelSpeech();
          return true;
        case 'speech_rate': {
          const next = Math.min(2, Math.max(0.5, Number((speechRate + (intent.direction === 'up' ? 0.2 : -0.2)).toFixed(1))));
          setSpeechRate(next);
          try { localStorage.setItem(TTS_RATE_KEY, String(next)); } catch { /* noop */ }
          window.dispatchEvent(new CustomEvent('rafiqi-tts-rate-changed', { detail: next }));
          speak(
            isArabic ? `السرعة بقت ${next}` : `Speech speed is now ${next}`,
            isArabic ? 'Arabic' : 'English',
            { rate: next }
          );
          return true;
        }
        case 'where_am_i':
        case 'street_name':
        case 'whats_around':
        case 'weather':
        case 'time':
        case 'date':
        case 'battery':
          say('ثانية واحدة', 'One moment');
          answerQuickQuestion(intent.type, isArabic).then((answer) =>
            speak(answer, isArabic ? 'Arabic' : 'English', { rate: speechRate })
          );
          return true;
        case 'help':
          speak(voiceCommandsHelp(isArabic), isArabic ? 'Arabic' : 'English', { rate: speechRate });
          return true;
        default:
          return false;
      }
    },
    [isArabic, speechRate, onNavigate]
  );

  const voice = useGlobalVoiceControl({ isArabic, speechRate, onIntent: handleIntent });

  // ── Triple-tap the floating button => SOS ──────────────────────────────────
  const tapTimesRef = useRef<number[]>([]);
  const pressActiveRef = useRef(false);
  const pressFiredRef = useRef(false);

  const handlePressStart = useCallback(() => {
    pressActiveRef.current = true;
    pressFiredRef.current = false;
    // Ask iOS for motion permission from this user gesture (needed for shake-SOS).
    if (!motionPermissionAsked && typeof (window as any).DeviceMotionEvent?.requestPermission === 'function') {
      setMotionPermissionAsked(true);
      (window as any).DeviceMotionEvent.requestPermission().catch(() => undefined);
    }
    voice.startListening();
    // If recognition is still not listening shortly after, this was a tap.
    window.setTimeout(() => {
      if (pressActiveRef.current && !pressFiredRef.current) {
        pressFiredRef.current = true;
      }
    }, 250);
  }, [motionPermissionAsked, voice]);

  const handlePressEnd = useCallback(() => {
    if (!pressActiveRef.current) return;
    pressActiveRef.current = false;
    voice.stopListening();
    const now = Date.now();
    tapTimesRef.current = tapTimesRef.current.filter((t) => now - t < 700);
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length >= 3) {
      tapTimesRef.current = [];
      sosRef.current.triggerEmergencySOS('button');
    }
  }, [voice]);

  // ── Global SOS request event (any view can ask for the SOS flow) ──────────
  useEffect(() => {
    const onRequest = () => sosRef.current.triggerEmergencySOS('button');
    window.addEventListener('rafiqi:trigger-sos', onRequest);
    return () => window.removeEventListener('rafiqi:trigger-sos', onRequest);
  }, []);

  // ── Shake => SOS (blind users only; this control tree is mounted for them) ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastTrigger = 0;
    let lastX = 0, lastY = 0, lastZ = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const { x = 0, y = 0, z = 0 } = acc;
      const delta = Math.abs((x || 0) - lastX) + Math.abs((y || 0) - lastY) + Math.abs((z || 0) - lastZ);
      lastX = x || 0; lastY = y || 0; lastZ = z || 0;
      const now = Date.now();
      if (delta > 45 && now - lastTrigger > 30000) {
        lastTrigger = now;
        sosRef.current.triggerEmergencySOS('button');
      }
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, []);

  const primaryContact = loadContacts().find((c) => c.isPrimaryEmergency) || loadContacts()[0];

  return (
    <>
      {/* Floating hold-to-talk voice button */}
      <button
        type="button"
        aria-label={
          isArabic
            ? 'زر التحكم الصوتي. اضغط مطولا واتكلم. ثلاث ضغطات سريعة للطوارئ.'
            : 'Voice control button. Press and hold to talk. Triple tap for emergency.'
        }
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerCancel={handlePressEnd}
        onPointerLeave={handlePressEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={`fixed bottom-5 end-5 z-[70] w-20 h-20 rounded-full flex items-center justify-center shadow-2xl border-4 transition-all select-none touch-none ${
          voice.status === 'listening'
            ? 'bg-red-600 border-red-300 scale-110 animate-pulse'
            : voice.status === 'processing'
            ? 'bg-amber-500 border-amber-200'
            : 'bg-teal-600 border-teal-300 hover:bg-teal-500'
        } text-white`}
        style={{ minWidth: 80, minHeight: 80 }}
      >
        <Mic className="w-10 h-10" aria-hidden="true" />
        <span className="sr-only" aria-live="polite">
          {voice.status === 'listening'
            ? (isArabic ? 'بسمعك دلوقتي' : 'Listening now')
            : voice.status === 'processing'
            ? (isArabic ? 'بفهم الأمر' : 'Understanding')
            : ''}
        </span>
      </button>

      {/* Global SOS countdown / status modal */}
      {sos.showEmergencyModal && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={isArabic ? 'وضع الطوارئ' : 'Emergency mode'}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-red-950/95 p-6"
        >
          <div className="w-full max-w-md flex flex-col items-center gap-8 text-center text-white">
            <Siren className="w-20 h-20 text-red-300 animate-pulse" aria-hidden="true" />
            {sos.emergencyCountdown !== null && sos.emergencyCountdown > 0 ? (
              <>
                <p className="text-3xl font-black" aria-live="assertive">
                  {isArabic
                    ? `هيتم إرسال استغاثة بموقعك خلال ${sos.emergencyCountdown} ثواني`
                    : `SOS with your location will be sent in ${sos.emergencyCountdown} seconds`}
                </p>
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    sos.cancelEmergencySOS();
                    speakSafe(isArabic ? 'اتلغت الاستغاثة' : 'SOS cancelled');
                  }}
                  className="w-full min-h-[96px] rounded-3xl bg-white text-red-900 text-3xl font-black shadow-xl active:scale-95"
                >
                  {isArabic ? 'إلغاء — أنا بخير' : 'Cancel — I am okay'}
                </button>
              </>
            ) : sos.sosDispatchStatus === 'sending' ? (
              <p className="text-2xl font-bold" aria-live="assertive">
                {isArabic ? 'جاري إرسال الاستغاثة بموقعك...' : 'Sending SOS with your location...'}
              </p>
            ) : sos.sosDispatchStatus === 'confirmed' ? (
              <>
                <p className="text-2xl font-bold text-emerald-300" aria-live="assertive">
                  {isArabic ? 'وصلت الاستغاثة. المساعدة في الطريق.' : 'SOS received. Help is on the way.'}
                </p>
                <button
                  type="button"
                  onClick={sos.cancelEmergencySOS}
                  className="w-full min-h-[80px] rounded-3xl bg-white/10 border-2 border-white/40 text-2xl font-bold active:scale-95"
                >
                  {isArabic ? 'إغلاق' : 'Close'}
                </button>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-amber-300" aria-live="assertive">
                  {isArabic ? 'الإرسال التلقائي فشل. اتصل مباشرة.' : 'Automatic sending failed. Call directly.'}
                </p>
                {primaryContact && (
                  <button
                    type="button"
                    onClick={() => makePhoneCall(primaryContact.phone)}
                    className="w-full min-h-[96px] rounded-3xl bg-emerald-500 text-white text-2xl font-black flex items-center justify-center gap-3 active:scale-95"
                  >
                    <PhoneCall className="w-8 h-8" aria-hidden="true" />
                    {isArabic ? `اتصل بـ ${primaryContact.nameAr || primaryContact.nameEn}` : `Call ${primaryContact.nameEn || primaryContact.nameAr}`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={sos.cancelEmergencySOS}
                  className="w-full min-h-[72px] rounded-3xl bg-white/10 border-2 border-white/40 text-xl font-bold active:scale-95"
                >
                  <span className="flex items-center justify-center gap-2">
                    <X className="w-6 h-6" aria-hidden="true" />
                    {isArabic ? 'إغلاق' : 'Close'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalVoiceControls;
