import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Mic, Camera, Square, ExternalLink, LocateFixed } from 'lucide-react';
import { UserProfile } from '../types';
import { speak, cancelSpeech } from '../lib/tts';
import { triggerHapticAlert } from '../lib/hapticNavEngine';
import { getAuthHeaders, generateAdaptiveResponse } from '../services/gemini';
import { answerQuickQuestion } from '../lib/locationAwareness';
import { MOBILITY_SAFETY_DISCLAIMER_AR, MOBILITY_SAFETY_DISCLAIMER_EN } from '../lib/mobilityEngine';

interface RouteStep {
  instruction: string;
  name: string;
  distanceMeters: number;
  durationSeconds: number;
  location: { lat: number; lon: number };
}

interface RouteData {
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
}

export interface VoiceNavigationViewProps {
  profile: UserProfile;
  isArabic: boolean;
  onNavigateBack: () => void;
}

function haversineMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Turn an OSRM maneuver string into short spoken guidance. */
function localizeManeuver(instruction: string, name: string, distanceMeters: number, isArabic: boolean): string {
  const [type, ...mods] = (instruction || '').toLowerCase().split(' ');
  const modifier = mods.join(' ');
  const street = name ? (isArabic ? ` في ${name}` : ` onto ${name}`) : '';
  const dist = distanceMeters >= 1000
    ? (isArabic ? `بعد ${(distanceMeters / 1000).toFixed(1)} كيلو` : `in ${(distanceMeters / 1000).toFixed(1)} kilometers`)
    : (isArabic ? `بعد ${Math.max(10, Math.round(distanceMeters / 10) * 10)} متر` : `in ${Math.max(10, Math.round(distanceMeters / 10) * 10)} meters`);

  const arDir: Record<string, string> = {
    left: 'لف شمال', right: 'لف يمين', 'slight left': 'خد شمال خفيف', 'slight right': 'خد يمين خفيف',
    'sharp left': 'لف شمال جامد', 'sharp right': 'لف يمين جامد', uturn: 'ارجع ورا',
    straight: 'كمل على طول', '': 'كمل على طول',
  };
  const enDir: Record<string, string> = {
    left: 'turn left', right: 'turn right', 'slight left': 'keep slightly left', 'slight right': 'keep slightly right',
    'sharp left': 'turn sharply left', 'sharp right': 'turn sharply right', uturn: 'make a U-turn',
    straight: 'continue straight', '': 'continue straight',
  };

  if (type === 'arrive') return isArabic ? 'وصلت وجهتك' : 'You have arrived';
  if (type === 'depart') return isArabic ? `ابدأ ماشي${street}` : `Start walking${street}`;
  if (type === 'roundabout') return isArabic ? `${dist} ادخل الدوار واخرج منه${street}` : `${dist} take the roundabout${street}`;
  if (type === 'turn' || type === 'end' || type === 'fork' || type === 'merge' || type === 'new' || type === 'continue' || type === 'notification') {
    const dirAr = arDir[modifier] || arDir['straight'];
    const dirEn = enDir[modifier] || enDir['straight'];
    return isArabic ? `${dist} ${dirAr}${street}` : `${dist} ${dirEn}${street}`;
  }
  return isArabic ? `${dist} كمل${street}` : `${dist} continue${street}`;
}

function getSpeechRecognitionCtor(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/**
 * In-app spoken walking navigation for blind users: voice destination entry,
 * step-by-step spoken instructions with haptics, "where am I / what's around /
 * street name" quick answers, and an optional camera obstacle-assist mode.
 * External map apps remain available as an explicit fallback only.
 */
const VoiceNavigationView: React.FC<VoiceNavigationViewProps> = ({ profile, isArabic, onNavigateBack }) => {
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [destinationText, setDestinationText] = useState('');
  const [listeningDest, setListeningDest] = useState(false);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState('');
  const [obstacleActive, setObstacleActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const obstacleTimerRef = useRef<number | null>(null);
  const announcedStepRef = useRef(-1);
  const routeRef = useRef<RouteData | null>(null);
  routeRef.current = route;
  const positionRef = useRef(position);
  positionRef.current = position;

  const say = useCallback(
    (text: string) => speak(text, isArabic ? 'Arabic' : 'English'),
    [isArabic]
  );
  const sayRef = useRef(say);
  sayRef.current = say;

  // ── Watch position ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError(true);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeoError(true),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Announce steps as the user approaches them ─────────────────────────────
  useEffect(() => {
    const r = routeRef.current;
    const p = positionRef.current;
    if (!r || !p) return;
    const idx = Math.min(currentStepIndex, r.steps.length - 1);
    const step = r.steps[idx];
    if (!step || typeof step.location?.lat !== 'number') return;
    const dist = haversineMeters(p.lat, p.lon, step.location.lat, step.location.lon);
    if (dist <= 25 && announcedStepRef.current !== idx) {
      announcedStepRef.current = idx;
      const text = localizeManeuver(step.instruction, step.name, 0, isArabic).replace(/^بعد [^ ]+ [^ ]+ /, '');
      sayRef.current(text);
      triggerHapticAlert('warning');
      if (idx < r.steps.length - 1) {
        setCurrentStepIndex(idx + 1);
      } else if (step.instruction.startsWith('arrive')) {
        triggerHapticAlert('arrival');
      }
    }
  }, [position, currentStepIndex, isArabic]);

  // ── Destination dictation ──────────────────────────────────────────────────
  const dictateDestination = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      say(isArabic ? 'التعرف على الصوت مش مدعوم في المتصفح ده' : 'Speech recognition is not supported in this browser');
      return;
    }
    cancelSpeech();
    const rec = new Ctor();
    rec.lang = isArabic ? 'ar-EG' : 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListeningDest(true);
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || '';
      setDestinationText(text);
      if (text.trim()) void startRouteTo(text.trim());
    };
    rec.onerror = () => setListeningDest(false);
    rec.onend = () => setListeningDest(false);
    try { rec.start(); } catch { setListeningDest(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArabic, say]);

  // ── Geocode + route ────────────────────────────────────────────────────────
  const startRouteTo = useCallback(
    async (query: string) => {
      const p = positionRef.current;
      if (!p) {
        say(isArabic ? 'لسه معرفتش مكانك، ثانية واحدة وجرب تاني' : 'I do not have your location yet, try again in a moment');
        return;
      }
      setBusy(true);
      setStatusLine(isArabic ? 'بدور على المكان...' : 'Finding the place...');
      say(isArabic ? `بدور على ${query}` : `Looking for ${query}`);
      try {
        const headers = await getAuthHeaders();
        const geoRes = await fetch(`/api/mobility/geocode?q=${encodeURIComponent(query)}`, { headers });
        if (!geoRes.ok) throw new Error('geocode failed');
        const geoData = await geoRes.json();
        const first = geoData?.results?.[0];
        if (!first) {
          const msg = isArabic ? `مش لاقي مكان اسمه ${query}. جرب اسم تاني أوي أكتر تفصيلا.` : `I cannot find a place called ${query}. Try a more detailed name.`;
          setStatusLine(msg);
          say(msg);
          return;
        }
        setStatusLine(isArabic ? `الوجهة: ${first.displayName}` : `Destination: ${first.displayName}`);
        const dirRes = await fetch(
          `/api/mobility/directions?from=${p.lat},${p.lon}&to=${first.lat},${first.lon}`,
          { headers }
        );
        if (!dirRes.ok) throw new Error('directions failed');
        const data: RouteData = await dirRes.json();
        if (!data.steps?.length) throw new Error('no steps');
        setRoute(data);
        setCurrentStepIndex(0);
        announcedStepRef.current = -1;
        const summary = isArabic
          ? `المشوار ${data.distanceMeters >= 1000 ? (data.distanceMeters / 1000).toFixed(1) + ' كيلو' : Math.round(data.distanceMeters) + ' متر'} مشي، حوالي ${Math.max(1, Math.round(data.durationSeconds / 60))} دقيقة. ${localizeManeuver(data.steps[0].instruction, data.steps[0].name, data.steps[0].distanceMeters, true)}`
          : `The walk is ${Math.round(data.distanceMeters)} meters, about ${Math.max(1, Math.round(data.durationSeconds / 60))} minutes. ${localizeManeuver(data.steps[0].instruction, data.steps[0].name, data.steps[0].distanceMeters, false)}`;
        say(summary);
      } catch {
        const msg = isArabic ? 'مقدرتش أجيب الطريق دلوقتي. جرب تاني بعد شوية.' : 'I could not get directions right now. Try again shortly.';
        setStatusLine(msg);
        say(msg);
      } finally {
        setBusy(false);
      }
    },
    [isArabic, say]
  );

  // ── Quick answers ──────────────────────────────────────────────────────────
  const ask = useCallback(
    (q: 'where_am_i' | 'whats_around' | 'street_name') => {
      void answerQuickQuestion(q, isArabic).then((a) => sayRef.current(a));
    },
    [isArabic]
  );

  // ── Obstacle assist (camera) ───────────────────────────────────────────────
  const stopObstacleAssist = useCallback(() => {
    setObstacleActive(false);
    if (obstacleTimerRef.current) {
      window.clearInterval(obstacleTimerRef.current);
      obstacleTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const analyzeFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 640 / (video.videoWidth || 640));
    canvas.width = Math.max(1, Math.round((video.videoWidth || 640) * scale));
    canvas.height = Math.max(1, Math.round((video.videoHeight || 480) * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    const clean = dataUrl.replace(/^data:[^;]+;base64,/, '');
    const prompt = isArabic
      ? 'أنت مُحذّر عوائق لشخص كفيف ماشي في الشارع. بص للصورة وحدد: هل فيه خطر أو عائق قريب في طريق المشي (حفرة، سلالم، عربية، عمود، حاجز، أشخاص قريبين جدا، حبل، ارتفاع مفاجئ)؟ لو فيه خطر: ارد بجملة واحدة قصيرة جدا بالعامية المصرية تبدأ بكلمة "خطر" أو "انتبه" وتحدد نوع الخطر واتجاهه (يمين/شمال/قدام). لو الطريق آمن ارد بكلمة واحدة فقط: آمن.'
      : 'You are an obstacle warner for a blind pedestrian. Look at the image: is there a close hazard in the walking path (hole, stairs, vehicle, pole, barrier, very close people, rope, sudden drop)? If yes: reply with ONE very short sentence starting with "Warning" naming the hazard and its direction (left/right/ahead). If the path is safe reply with exactly one word: safe.';
    try {
      const res = await generateAdaptiveResponse(
        prompt,
        { ...profile, language: isArabic ? 'Egyptian Ammiya' : 'English' } as any,
        [],
        [{ name: `obstacle_${Date.now()}.jpg`, type: 'image/jpeg', data: clean }]
      );
      const text = String(res || '').trim();
      if (!text) return;
      const safe = /^(آمن|safe)/i.test(text);
      if (safe) return;
      const severe = /(خطر|عربية|سيارة|حفرة|سلالم|vehicle|car|hole|stairs|drop)/i.test(text);
      triggerHapticAlert(severe ? 'danger' : 'warning');
      sayRef.current(text.slice(0, 160));
    } catch {
      // Silent on analysis failure: the safety disclaimer says this is an aid, not a guarantee.
    }
  }, [isArabic, profile]);

  const analyzeFrameRef = useRef(analyzeFrame);
  analyzeFrameRef.current = analyzeFrame;

  const startObstacleAssist = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setObstacleActive(true);
      sayRef.current(
        isArabic
          ? 'مراقبة العقبات شغالة. ارفع الموبايل قدامك وامشي بحذر. ده مساعد مش بديل للعصا أو الكلب المرشد.'
          : 'Obstacle assist is on. Hold the phone in front of you and walk carefully. This is an aid, not a replacement for a cane or guide dog.'
      );
      obstacleTimerRef.current = window.setInterval(() => {
        void analyzeFrameRef.current();
      }, 2500);
    } catch {
      sayRef.current(isArabic ? 'الكاميرا مش متاحة. اسمح بالكاميرا وجرب تاني.' : 'Camera unavailable. Allow camera access and try again.');
    }
  }, [isArabic]);

  useEffect(() => () => stopObstacleAssist(), [stopObstacleAssist]);

  const mapsFallbackUrl = destinationText.trim() && position
    ? `https://www.google.com/maps/dir/?api=1&origin=${position.lat},${position.lon}&destination=${encodeURIComponent(destinationText.trim())}&travelmode=walking`
    : null;

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-slate-950 text-white" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mx-auto w-full max-w-xl px-4 py-4 pb-24 flex flex-col gap-4">
        <header className="space-y-1">
          <h1 className="text-3xl font-black">{isArabic ? 'التنقل بالصوت' : 'Voice navigation'}</h1>
          <p className="text-base text-amber-300 font-semibold" role="note">
            {isArabic ? MOBILITY_SAFETY_DISCLAIMER_AR : MOBILITY_SAFETY_DISCLAIMER_EN}
          </p>
        </header>

        {geoError && (
          <p role="alert" className="rounded-2xl bg-red-900/60 border border-red-500 p-4 text-lg font-bold">
            {isArabic
              ? 'الموقع الجغرافي مش متاح. فعّل الموقع للمتصفح علشان التنقل يشتغل.'
              : 'Location is unavailable. Enable location for this browser so navigation can work.'}
          </p>
        )}

        {/* Destination entry */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={dictateDestination}
            disabled={busy}
            className={`w-full min-h-[110px] rounded-3xl text-2xl font-black flex items-center justify-center gap-4 shadow-xl active:scale-[0.98] ${
              listeningDest ? 'bg-red-600 animate-pulse' : 'bg-teal-600 hover:bg-teal-500'
            }`}
            aria-label={isArabic ? 'قول وجهتك بالصوت' : 'Say your destination'}
          >
            <Mic className="w-10 h-10" aria-hidden="true" />
            {listeningDest
              ? (isArabic ? 'بسمعك... قول الوجهة' : 'Listening... say the destination')
              : (isArabic ? 'قول وجهتك' : 'Say your destination')}
          </button>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (destinationText.trim()) void startRouteTo(destinationText.trim());
            }}
          >
            <label htmlFor="dest-input" className="sr-only">
              {isArabic ? 'أو اكتب الوجهة' : 'Or type the destination'}
            </label>
            <input
              id="dest-input"
              value={destinationText}
              onChange={(e) => setDestinationText(e.target.value)}
              placeholder={isArabic ? 'أو اكتب الوجهة هنا' : 'Or type the destination here'}
              className="flex-1 min-h-[64px] rounded-2xl bg-slate-800 border-2 border-slate-600 px-4 text-xl"
            />
            <button
              type="submit"
              disabled={busy || !destinationText.trim()}
              className="min-h-[64px] px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xl font-black disabled:opacity-40"
            >
              <Navigation className="w-7 h-7" aria-hidden="true" />
              <span className="sr-only">{isArabic ? 'ابدأ التنقل' : 'Start navigation'}</span>
            </button>
          </form>
        </div>

        {statusLine && (
          <p className="text-lg text-slate-300" aria-live="polite">
            {statusLine}
          </p>
        )}

        {/* Active route */}
        {route && (
          <section aria-label={isArabic ? 'الطريق الحالي' : 'Current route'} className="rounded-3xl bg-slate-900 border-2 border-teal-700 p-5 space-y-3">
            <p className="text-xl font-bold">
              {isArabic
                ? `المشوار: ${route.distanceMeters >= 1000 ? (route.distanceMeters / 1000).toFixed(1) + ' كيلو' : Math.round(route.distanceMeters) + ' متر'} — حوالي ${Math.max(1, Math.round(route.durationSeconds / 60))} دقيقة`
                : `Route: ${Math.round(route.distanceMeters)} m — about ${Math.max(1, Math.round(route.durationSeconds / 60))} min`}
            </p>
            <ol className="space-y-2">
              {route.steps.slice(currentStepIndex, currentStepIndex + 3).map((s, i) => (
                <li key={`${currentStepIndex}-${i}`} className={`text-xl ${i === 0 ? 'font-black text-teal-300' : 'text-slate-300'}`}>
                  {localizeManeuver(s.instruction, s.name, i === 0 ? s.distanceMeters : 0, isArabic)}
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => {
                setRoute(null);
                cancelSpeech();
                say(isArabic ? 'اتلغى التنقل' : 'Navigation cancelled');
              }}
              className="w-full min-h-[64px] rounded-2xl bg-slate-700 hover:bg-slate-600 text-xl font-bold"
            >
              {isArabic ? 'إنهاء التنقل' : 'End navigation'}
            </button>
          </section>
        )}

        {/* Quick answers */}
        <div className="grid grid-cols-3 gap-3">
          {([
            { q: 'where_am_i' as const, ar: 'أنا فين؟', en: 'Where am I?' },
            { q: 'street_name' as const, ar: 'اسم الشارع', en: 'Street name' },
            { q: 'whats_around' as const, ar: 'إيه حواليا؟', en: 'Around me' },
          ]).map((b) => (
            <button
              key={b.q}
              type="button"
              onClick={() => ask(b.q)}
              className="min-h-[80px] rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-lg font-bold flex flex-col items-center justify-center gap-1"
            >
              <LocateFixed className="w-6 h-6" aria-hidden="true" />
              {isArabic ? b.ar : b.en}
            </button>
          ))}
        </div>

        {/* Obstacle assist */}
        <section className="rounded-3xl bg-slate-900 border-2 border-amber-700 p-5 space-y-3">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Camera className="w-7 h-7" aria-hidden="true" />
            {isArabic ? 'تحذير العقبات أثناء المشي' : 'Walking obstacle warning'}
          </h2>
          <p className="text-base text-amber-300 font-semibold">
            {isArabic
              ? 'ده مساعد بس — مش بديل للعصا البيضاء أو الكلب المرشد. ميعرفش يشوف كل حاجة.'
              : 'This is an aid only — not a replacement for a white cane or guide dog. It cannot see everything.'}
          </p>
          <video ref={videoRef} className="w-full rounded-2xl bg-black aspect-video" muted playsInline aria-hidden="true" />
          {obstacleActive ? (
            <button
              type="button"
              onClick={() => {
                stopObstacleAssist();
                say(isArabic ? 'اتوقفت مراقبة العقبات' : 'Obstacle assist stopped');
              }}
              className="w-full min-h-[90px] rounded-3xl bg-red-700 hover:bg-red-600 text-2xl font-black flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <Square className="w-8 h-8" aria-hidden="true" />
              {isArabic ? 'إيقاف التحذير' : 'Stop warnings'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startObstacleAssist()}
              className="w-full min-h-[90px] rounded-3xl bg-amber-600 hover:bg-amber-500 text-2xl font-black active:scale-[0.98]"
            >
              {isArabic ? 'تشغيل تحذير العقبات' : 'Start obstacle warning'}
            </button>
          )}
        </section>

        {/* External maps fallback */}
        {mapsFallbackUrl && (
          <a
            href={mapsFallbackUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 min-h-[64px] rounded-2xl bg-slate-800 border border-slate-600 text-lg font-bold text-slate-200"
          >
            <ExternalLink className="w-5 h-5" aria-hidden="true" />
            {isArabic ? 'افتح في خرائط جوجل (احتياطي)' : 'Open in Google Maps (fallback)'}
          </a>
        )}

        <button
          type="button"
          onClick={onNavigateBack}
          className="w-full min-h-[64px] rounded-2xl bg-slate-700 hover:bg-slate-600 text-xl font-bold"
        >
          {isArabic ? 'رجوع' : 'Back'}
        </button>
      </div>
    </div>
  );
};

export default VoiceNavigationView;
