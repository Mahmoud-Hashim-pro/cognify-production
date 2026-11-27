import React, { useEffect, useRef } from 'react';
import { L } from '../lib/translations';
import { Camera, BookOpen, Footprints, Siren } from 'lucide-react';
import { UserProfile } from '../types';
import { AppView } from '../lib/access';
import { DisabilityTab } from '../lib/navigation';
import { speak } from '../lib/tts';
import { VISION_AUTOSTART_KEY } from './GlobalVoiceControls';

export interface BlindHomeViewProps {
  profile: UserProfile;
  isArabic: boolean;
  onNavigate: (view: AppView, tab?: DisabilityTab) => void;
}

/** Ask the global controls (mounted in App) to start the emergency SOS flow. */
export function requestGlobalSOS() {
  window.dispatchEvent(new CustomEvent('rafiqi:trigger-sos'));
}

/**
 * Blind-first home: one voice-first screen with four huge buttons and spoken
 * guidance from the first moment. No visual navigation required at all.
 */
const BlindHomeView: React.FC<BlindHomeViewProps> = ({ profile, isArabic, onNavigate }) => {
  const welcomedRef = useRef(false);

  useEffect(() => {
    if (welcomedRef.current) return;
    welcomedRef.current = true;
    let alreadyWelcomed = false;
    try {
      alreadyWelcomed = sessionStorage.getItem('rafiqi_blind_home_welcomed') === '1';
      sessionStorage.setItem('rafiqi_blind_home_welcomed', '1');
    } catch { /* noop */ }
    const name = (profile?.name || '').split(' ')[0];
    const msg = isArabic
      ? alreadyWelcomed
        ? 'رجعت للشاشة الرئيسية. قول الأمر اللي تحبه أو اختار من الأزرار الأربعة.'
        : `أهلاً بيك${name ? ' يا ' + name : ''} في رفيقي. أربع اختيارات كبيرة: وصف المشهد، قراءة نص، تنقل، وطوارئ. وفي أي شاشة، دوس مطولا على زر الميكروفون الأخضر واتكلم.`
      : alreadyWelcomed
        ? 'Back to the home screen. Say a command or pick one of the four buttons.'
        : `Welcome to Rafiqi${name ? ', ' + name : ''}. Four big choices: describe scene, read text, navigate, and emergency. On any screen, press and hold the green microphone button and talk.`;
    const timer = window.setTimeout(() => {
      speak(msg, isArabic ? 'Arabic' : 'English');
    }, 400);
    return () => window.clearTimeout(timer);
  }, [isArabic, profile?.name]);

  const openVision = (tool: 'scene' | 'read') => {
    try { sessionStorage.setItem(VISION_AUTOSTART_KEY, tool); } catch { /* noop */ }
    onNavigate('disability', 'vision');
  };

  const buttons: Array<{
    key: string;
    labelAr: string;
    labelEn: string;
    hintAr: string;
    hintEn: string;
    icon: React.ReactNode;
    className: string;
    onClick: () => void;
  }> = [
    {
      key: 'scene',
      labelAr: 'وصف المشهد',
      labelEn: 'Describe the scene',
      hintAr: 'الكاميرا تشوفلك اللي قدامك',
      hintEn: 'The camera sees what is in front of you',
      icon: <Camera className="w-14 h-14" aria-hidden="true" />,
      className: 'bg-teal-600 hover:bg-teal-500 focus-visible:ring-teal-300',
      onClick: () => openVision('scene'),
    },
    {
      key: 'read',
      labelAr: 'قراءة نص',
      labelEn: 'Read text',
      hintAr: 'يقرالك أي ورقة أو لافتة',
      hintEn: 'Reads any paper or sign aloud',
      icon: <BookOpen className="w-14 h-14" aria-hidden="true" />,
      className: 'bg-sky-700 hover:bg-sky-600 focus-visible:ring-sky-300',
      onClick: () => openVision('read'),
    },
    {
      key: 'nav',
      labelAr: 'تنقل',
      labelEn: 'Navigate',
      hintAr: 'مشي بإرشاد صوتي خطوة بخطوة',
      hintEn: 'Walking directions, spoken step by step',
      icon: <Footprints className="w-14 h-14" aria-hidden="true" />,
      className: 'bg-indigo-700 hover:bg-indigo-600 focus-visible:ring-indigo-300',
      onClick: () => onNavigate('voice_navigation'),
    },
    {
      key: 'sos',
      labelAr: 'طوارئ',
      labelEn: 'Emergency',
      hintAr: 'يبعت مكانك لأهلك فورا',
      hintEn: 'Sends your location to your people now',
      icon: <Siren className="w-14 h-14" aria-hidden="true" />,
      className: 'bg-red-700 hover:bg-red-600 focus-visible:ring-red-300',
      onClick: () => requestGlobalSOS(),
    },
  ];

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-slate-950 text-white" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mx-auto w-full max-w-xl px-5 py-8 flex flex-col gap-6 min-h-full">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tight">
            {isArabic ? 'رفيقي معاك' : L('Rafiqi is with you')}
          </h1>
          <p className="text-xl text-slate-300" aria-live="polite">
            {isArabic
              ? 'دوس مطولا على زر الميكروفون الأخضر تحت واتكلم، أو اختار زر من الأربعة.'
              : L('Press and hold the green microphone button below and talk, or pick one of the four buttons.')}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 flex-1">
          {buttons.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={b.onClick}
              aria-label={`${isArabic ? b.labelAr : L(b.labelEn)}. ${isArabic ? b.hintAr : L(b.hintEn)}`}
              className={`${b.className} w-full min-h-[120px] rounded-3xl text-white flex items-center gap-5 px-6 py-5 shadow-xl active:scale-[0.98] transition focus:outline-none focus-visible:ring-8`}
            >
              {b.icon}
              <span className="flex flex-col items-start text-start">
                <span className="text-3xl font-black leading-tight">{isArabic ? b.labelAr : L(b.labelEn)}</span>
                <span className="text-lg text-white/85">{isArabic ? b.hintAr : L(b.hintEn)}</span>
              </span>
            </button>
          ))}
        </div>

        <p className="text-center text-lg text-slate-400">
          {isArabic
            ? 'وللطوارئ كمان: هز الموبايل بقوة، أو دوس على زر الميكروفون 3 مرات بسرعة، أو قول ساعدوني.'
            : L('For emergencies you can also: shake the phone hard, triple-tap the microphone button, or say help me.')}
        </p>
      </div>
    </div>
  );
};

export default BlindHomeView;
