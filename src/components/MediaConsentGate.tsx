import React, { useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { speak, stopSpeaking } from '../lib/tts';
import { isArabicLocale, isFrenchLocale, L } from '../lib/translations';
import { MEDIA_CONSENT_VERSION } from '../lib/mediaConsent';

interface MediaConsentGateProps {
  language?: string;
  onConsent: () => void;
  onDecline: () => void;
}

const TEXT_AR =
  'قبل ما نستخدم الكاميرا أو المايكروفون أول مرة: ' +
  'صور الكاميرا بتتبعت لخدمة ذكاء اصطناعي من جوجل (Gemini) عشان توصفها، ومش بنخزن الصور عندنا. ' +
  'الأوامر الصوتية ممكن تمر على جوجل أو أبل حسب المتصفح عشان تتحول لكتابة. ' +
  'الموقع بيتستخدم في الطوارئ بس. ' +
  'اللي بنخزنه هو ذاكرة الأشياء اللي بتطلبها ومحادثاتك، وتقدر تمسحها في أي وقت من الإعدادات. ' +
  'في تحت زرار موافق وزرار لأ.';

const TEXT_FR =
  "Avant d'utiliser la caméra ou le microphone pour la première fois : " +
  "les photos de la caméra sont envoyées à l'IA Gemini de Google pour être décrites, et nous ne les stockons pas. " +
  "Les commandes vocales peuvent être traitées par Google ou Apple selon votre navigateur. " +
  "La position n'est utilisée qu'en cas d'urgence. " +
  "Nous stockons les mémoires d'objets que vous demandez et vos discussions, et vous pouvez les supprimer à tout moment dans les Paramètres. " +
  "Ci-dessous, il y a un bouton J'accepte et un bouton Non.";

const TEXT_EN =
  'Before we use the camera or microphone for the first time: ' +
  'camera photos are sent to Google Gemini AI to be described, and we do not store the photos. ' +
  'Voice commands may be processed by Google or Apple depending on your browser. ' +
  'Location is used only for emergencies. ' +
  'What we store is the object memories you ask for and your chats, and you can delete them anytime in Settings. ' +
  'Below are an I agree button and a No button.';

/**
 * One-time informed-consent screen shown before the first camera or
 * microphone use. Fully spoken for blind users, with two very large buttons.
 * Links to the full privacy policy and terms pages.
 */
const MediaConsentGate: React.FC<MediaConsentGateProps> = ({ language, onConsent, onDecline }) => {
  const isAr = isArabicLocale(language);
  const spokenRef = useRef(false);

  useEffect(() => {
    if (spokenRef.current) return;
    spokenRef.current = true;
    const isFr = isFrenchLocale(language);
    speak(isAr ? TEXT_AR : isFr ? TEXT_FR : TEXT_EN, isAr ? 'Arabic' : isFr ? 'French' : 'English');
    return () => stopSpeaking();
  }, [isAr]);

  return (
    <div
      className="fixed inset-0 z-[120000] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-consent-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-[#0E1416] border-2 border-amber-500/60 p-6 sm:p-8 text-white shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-10 h-10 text-amber-400 shrink-0" aria-hidden="true" />
          <h2 id="media-consent-title" className="text-2xl font-black">
            {isAr ? 'قبل أول استخدام' : L('Before first use')}
          </h2>
        </div>

        <ul className="space-y-3 text-base leading-relaxed text-stone-200 font-bold list-none">
          <li>
            {isAr
              ? '• صور الكاميرا بتتبعت لخدمة ذكاء اصطناعي من جوجل (Gemini) عشان توصفها. مش بنخزن الصور عندنا.'
              : L('• Camera photos are sent to Google Gemini AI to be described. We do not store the photos.')}
          </li>
          <li>
            {isAr
              ? '• الأوامر الصوتية ممكن تمر على جوجل أو أبل حسب المتصفح عشان تتحول لكتابة.'
              : L('• Voice commands may be processed by Google or Apple, depending on your browser, to be transcribed.')}
          </li>
          <li>
            {isAr
              ? '• الموقع بيتستخدم في الطوارئ بس، عشان نبعته للمرافقين لو طلبت SOS.'
              : L('• Location is used only for emergencies, to send it to your caregivers if you trigger SOS.')}
          </li>
          <li>
            {isAr
              ? '• اللي بنخزنه: ذاكرة الأشياء اللي بتطلب حفظها ومحادثاتك. تقدر تمسحهم في أي وقت من الإعدادات أو بزرار "امسح كل ذاكرة الكاميرا".'
              : L('• What we store: the object memories you ask to save and your chats. You can delete them anytime in Settings or with the "Clear all camera memory" button.')}
          </li>
        </ul>

        <p className="mt-4 text-sm text-stone-400 font-bold">
          {isAr ? 'اقرأ التفاصيل كاملة في ' : L('Read the full details in our ')}
          <a href="#/privacy-policy" className="text-amber-400 underline">
            {isAr ? 'سياسة الخصوصية' : L('Privacy Policy')}
          </a>
          {isAr ? ' و' : L(' and ')}
          <a href="#/terms" className="text-amber-400 underline">
            {isAr ? 'شروط الاستخدام' : L('Terms of Use')}
          </a>
          {isAr ? `. نسخة الموافقة: ${MEDIA_CONSENT_VERSION}` : (isFrenchLocale(language) ? `. Version du consentement : ${MEDIA_CONSENT_VERSION}` : `. Consent version: ${MEDIA_CONSENT_VERSION}`)}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConsent}
            autoFocus
            className="w-full min-h-[64px] rounded-2xl bg-amber-500 text-black text-2xl font-black active:scale-95 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
          >
            {isAr ? 'موافق' : L('I agree')}
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="w-full min-h-[64px] rounded-2xl bg-stone-800 border-2 border-stone-600 text-white text-2xl font-black active:scale-95 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
          >
            {isAr ? 'لا' : 'No'}
          </button>
        </div>

        <p className="mt-3 text-xs text-stone-500 text-center font-bold">
          {isAr
            ? 'لو اخترت "لا" مش هنقدر نشغل الكاميرا أو المايكروفون، وباقي التطبيق شغال عادي.'
            : L('If you choose "No" we cannot turn on the camera or microphone; the rest of the app keeps working.')}
        </p>
      </div>
    </div>
  );
};

export default MediaConsentGate;
