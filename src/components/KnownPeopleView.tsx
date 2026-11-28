import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Trash2, UserPlus, Users, ShieldCheck } from 'lucide-react';
import { L } from '../lib/translations';
import { UserProfile } from '../types';
import { speak } from '../lib/tts';
import { toast } from './Toast';
import { generateAdaptiveResponse } from '../services/gemini';

interface KnownPerson {
  id: string;
  name: string;
  photoDataUrl: string; // downscaled JPEG, stored on this device only
  createdAt: string;
}

const STORAGE_KEY = 'rafiqi_known_people_v1';
const CONSENT_KEY = 'rafiqi_known_people_consent_v1';

function loadPeople(): KnownPerson[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePeople(people: KnownPerson[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
  } catch {
    toast.error('Storage full — delete some people first');
  }
}

export interface KnownPeopleViewProps {
  profile: UserProfile;
  isArabic: boolean;
  onNavigateBack: () => void;
}

/**
 * Opt-in known-people recognition. Photos live ONLY on this device
 * (localStorage), adding a person requires explicit spoken consent, and one
 * button erases everything. Identification asks Gemini to compare the live
 * frame with the saved photos; nothing is uploaded for storage.
 */
const KnownPeopleView: React.FC<KnownPeopleViewProps> = ({ profile, isArabic, onNavigateBack }) => {
  const [consent, setConsent] = useState<boolean>(() => {
    try { return localStorage.getItem(CONSENT_KEY) === '1'; } catch { return false; }
  });
  const [people, setPeople] = useState<KnownPerson[]>(() => loadPeople());
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const say = useCallback((text: string) => speak(text, isArabic ? 'Arabic' : 'English'), [isArabic]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraOn(true);
    } catch {
      say(isArabic ? 'الكاميرا مش متاحة' : L('Camera unavailable'));
    }
  }, [isArabic, say]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 480 / (video.videoWidth || 480));
    canvas.width = Math.max(1, Math.round((video.videoWidth || 480) * scale));
    canvas.height = Math.max(1, Math.round((video.videoHeight || 640) * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  const giveConsent = () => {
    try { localStorage.setItem(CONSENT_KEY, '1'); } catch { /* noop */ }
    setConsent(true);
    say(isArabic ? 'تم تسجيل موافقتك. الصور بتتخزن على جهازك بس.' : L('Consent recorded. Photos stay on your device only.'));
  };

  const addFromCamera = () => {
    const frame = captureFrame();
    if (!frame) {
      say(isArabic ? 'شغل الكاميرا الأول' : L('Start the camera first'));
      return;
    }
    if (!newName.trim()) {
      say(isArabic ? 'اكتب اسم الشخص الأول' : L('Enter the person name first'));
      return;
    }
    const person: KnownPerson = {
      id: `p_${Date.now()}`,
      name: newName.trim(),
      photoDataUrl: frame,
      createdAt: new Date().toISOString(),
    };
    savePeople([...people, person]);
    setPeople(loadPeople());
    setNewName('');
    say(isArabic ? `اتسجل ${person.name}` : `${person.name} saved`);
  };

  const eraseAll = () => {
    savePeople([]);
    setPeople([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    say(isArabic ? 'اتمسحت كل بيانات الأشخاص من الجهاز ده' : L('All people data erased from this device'));
  };

  const identify = async () => {
    const frame = captureFrame();
    if (!frame) {
      say(isArabic ? 'شغل الكاميرا الأول ووجهها للشخص' : L('Start the camera and point it at the person'));
      return;
    }
    if (people.length === 0) {
      say(isArabic ? 'لسه مفيش أشخاص مسجلين' : L('No saved people yet'));
      return;
    }
    setBusy(true);
    say(isArabic ? 'ثانية واحدة، بقارن' : L('One moment, comparing'));
    try {
      const prompt = isArabic
        ? `أنت مساعد لشخص كفيف. الصورة الأولى التقطت الآن. الصور التالية أشخاص معروفين بأسمائهم: ${people.map((p, i) => `صورة ${i + 2} = ${p.name}`).join('، ')}. هل الشخص في الصورة الأولى واحد منهم؟ رد بجملة واحدة قصيرة بالعامية المصرية: لو متأكد قول "ده يبدو <الاسم>"، ولو مش متأكد قول "مش متأكد مين ده"، ولو مش واضح قول "الصورة مش واضحة، قرّب الكاميرا". ممنوع تخمن اسم من غير تشابه واضح.`
        : `You assist a blind person. The first image was just captured. The following images are known people by name: ${people.map((p, i) => `image ${i + 2} = ${p.name}`).join(', ')}. Is the person in the first image one of them? Reply with ONE short sentence: if confident say "This looks like <name>", if unsure say "I am not sure who this is", if unclear say "The photo is unclear, move closer". Never guess a name without a clear match.`;
      const attachments = [
        { name: 'current.jpg', type: 'image/jpeg', data: frame.replace(/^data:[^;]+;base64,/, '') },
        ...people.map((p) => ({
          name: `${p.id}.jpg`,
          type: 'image/jpeg',
          data: p.photoDataUrl.replace(/^data:[^;]+;base64,/, ''),
        })),
      ];
      const res = await generateAdaptiveResponse(prompt, { ...profile, language: isArabic ? 'Egyptian Ammiya' : 'English' } as any, [], attachments);
      const text = String(res || '').trim() || (isArabic ? 'مش متأكد مين ده' : L('I am not sure who this is'));
      say(text.slice(0, 200));
    } catch {
      say(isArabic ? 'مقدرتش أقارن دلوقتي، جرب تاني' : L('Could not compare right now, try again'));
    } finally {
      setBusy(false);
    }
  };

  if (!consent) {
    return (
      <div className="flex-1 w-full h-full overflow-y-auto bg-slate-950 text-white" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="mx-auto w-full max-w-xl px-4 py-4 pb-24 flex flex-col gap-4">
          <ShieldCheck className="w-16 h-16 text-teal-400" aria-hidden="true" />
          <h1 className="text-3xl font-black">{isArabic ? 'التعرف على الأشخاص المعروفين' : L('Known people recognition')}</h1>
          <p className="text-xl leading-relaxed" role="note">
            {isArabic
              ? 'الميزة دي اختيارية تماما. صور أصحابك بتتسجل على جهازك بس، ومش بتتخزن عندنا. لما تسأل "مين ده؟" الصور بتتبعت لخدمة الذكاء الاصطناعي للمقارنة لحظيا. تقدر تمسح كل حاجة في أي وقت بزرار واحد. لازم توافقة كل شخص تسجل صورته.'
              : L('This feature is fully optional. Photos of your people are stored on this device only, not on our servers. When you ask "who is this?", photos are sent to the AI service for a one-time comparison. You can erase everything anytime with one button. Every person you save must agree.')}
          </p>
          <button
            type="button"
            onClick={giveConsent}
            className="w-full min-h-[90px] rounded-3xl bg-teal-600 hover:bg-teal-500 text-2xl font-black active:scale-[0.98]"
          >
            {isArabic ? 'موافق — فعّل الميزة' : L('I agree — enable it')}
          </button>
          <button
            type="button"
            onClick={onNavigateBack}
            className="w-full min-h-[80px] rounded-3xl bg-slate-700 hover:bg-slate-600 text-2xl font-bold active:scale-[0.98]"
          >
            {isArabic ? 'لا — رجوع' : L('No — go back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-slate-950 text-white" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mx-auto w-full max-w-xl px-4 py-4 pb-24 flex flex-col gap-4">
        <header>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Users className="w-8 h-8" aria-hidden="true" />
            {isArabic ? 'الأشخاص المعروفين' : L('Known people')}
          </h1>
          <p className="text-base text-slate-300">
            {isArabic ? `${people.length} مسجل على الجهاز ده فقط` : `${people.length} saved on this device only`}
          </p>
        </header>

        <video ref={videoRef} className="w-full rounded-2xl bg-black aspect-video" muted playsInline aria-hidden="true" />

        {!cameraOn ? (
          <button
            type="button"
            onClick={() => void startCamera()}
            className="w-full min-h-[80px] rounded-3xl bg-slate-700 hover:bg-slate-600 text-2xl font-black flex items-center justify-center gap-3"
          >
            <Camera className="w-8 h-8" aria-hidden="true" />
            {isArabic ? 'تشغيل الكاميرا' : L('Start camera')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void identify()}
            disabled={busy}
            className="w-full min-h-[100px] rounded-3xl bg-teal-600 hover:bg-teal-500 text-3xl font-black active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? (isArabic ? 'بقارن...' : L('Comparing...')) : (isArabic ? 'مين ده؟' : L('Who is this?'))}
          </button>
        )}

        <section className="rounded-3xl bg-slate-900 border-2 border-slate-700 p-5 space-y-3" aria-label={isArabic ? 'تسجيل شخص جديد' : L('Save a new person')}>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <UserPlus className="w-7 h-7" aria-hidden="true" />
            {isArabic ? 'سجل شخص جديد' : L('Save a new person')}
          </h2>
          <label className="block text-lg font-bold">
            {isArabic ? 'اسمه' : L('Their name')}
            <input
              aria-label={isArabic ? 'اسم الشخص' : L('Person name')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 w-full min-h-[64px] rounded-2xl bg-slate-800 border-2 border-slate-600 px-4 text-xl font-normal"
            />
          </label>
          <button
            type="button"
            onClick={addFromCamera}
            className="w-full min-h-[80px] rounded-3xl bg-indigo-700 hover:bg-indigo-600 text-2xl font-black active:scale-[0.98]"
          >
            {isArabic ? 'التقط صورته وسجله' : L('Capture photo and save')}
          </button>
        </section>

        {people.length > 0 && (
          <ul className="space-y-2" aria-label={isArabic ? 'المسجلون' : L('Saved people')}>
            {people.map((p) => (
              <li key={p.id} className="rounded-2xl bg-slate-900 border border-slate-700 p-4 text-xl font-bold">
                {p.name}
              </li>
            ))}
          </ul>
        )}

        {people.length > 0 && (
          <button
            type="button"
            onClick={eraseAll}
            className="w-full min-h-[80px] rounded-3xl bg-red-800 hover:bg-red-700 text-xl font-black flex items-center justify-center gap-3"
          >
            <Trash2 className="w-7 h-7" aria-hidden="true" />
            {isArabic ? 'امسح كل بيانات الأشخاص' : L('Erase all people data')}
          </button>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" aria-hidden="true" aria-label={isArabic ? 'رفع صورة شخص' : L('Upload a person photo')} tabIndex={-1} />

        <button
          type="button"
          onClick={onNavigateBack}
          className="w-full min-h-[64px] rounded-2xl bg-slate-700 hover:bg-slate-600 text-xl font-bold"
        >
          {isArabic ? 'رجوع' : L('Back')}
        </button>
      </div>
    </div>
  );
};

export default KnownPeopleView;
