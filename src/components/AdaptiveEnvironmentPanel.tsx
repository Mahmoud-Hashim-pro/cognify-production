/**
 * Adaptive Environment Panel
 * ---------------------------------------------------------------------------
 * Wires src/lib/adaptiveAccessibility.ts into the Unified Accessibility
 * Toolkit. Uses the real camera (ambient luminance) and microphone (ambient
 * noise) to recommend high-contrast mode and/or live captions, with honest
 * Arabic/English explanations. Nothing is recorded or uploaded: frames are
 * sampled in-memory and streams are stopped immediately after each check.
 */
import React, { useEffect, useRef, useState } from 'react';
import { L } from '../lib/translations';
import { Sun, Volume2, Lightbulb, Loader2 } from 'lucide-react';
import {
  analyzeAmbientLuminance,
  createAmbientNoiseMonitor,
  recommendAdaptiveAdjustments,
  type LuminanceLevel,
  type NoiseLevel,
  type AdaptiveRecommendations,
} from '../lib/adaptiveAccessibility';

interface AdaptiveEnvironmentPanelProps {
  isArabic: boolean;
  isDarkMode: boolean;
  /** Active accessibility profile key (e.g. 'Vocal-Deaf'), '' when none. */
  currentA11y: string;
}

type CheckState = 'idle' | 'checking' | 'done' | 'denied' | 'unsupported';

export const AdaptiveEnvironmentPanel: React.FC<AdaptiveEnvironmentPanelProps> = ({
  isArabic,
  isDarkMode,
  currentA11y,
}) => {
  const [lightState, setLightState] = useState<CheckState>('idle');
  const [noiseState, setNoiseState] = useState<CheckState>('idle');
  const [luminance, setLuminance] = useState<LuminanceLevel | null>(null);
  const [noiseLevel, setNoiseLevel] = useState<NoiseLevel | null>(null);
  const [dbApprox, setDbApprox] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<AdaptiveRecommendations | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRefs = useRef<MediaStream[]>([]);
  const noiseStopRef = useRef<(() => void) | null>(null);

  // Always release hardware on unmount.
  useEffect(() => {
    return () => {
      noiseStopRef.current?.();
      streamRefs.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      streamRefs.current = [];
    };
  }, []);

  const refreshRecommendations = (lum: LuminanceLevel | null, noise: NoiseLevel | null) => {
    if (!lum && !noise) return;
    setRecommendations(
      recommendAdaptiveAdjustments(lum ?? 'normal', noise ?? 'quiet', currentA11y)
    );
  };

  const checkLighting = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setLightState('unsupported');
      return;
    }
    setLightState('checking');
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRefs.current.push(stream);
      const video = videoRef.current;
      if (!video) throw new Error('video element missing');
      video.srcObject = stream;
      await video.play();
      // Give the sensor a moment to auto-expose before sampling.
      await new Promise((r) => setTimeout(r, 600));
      const level = analyzeAmbientLuminance(video);
      setLuminance(level);
      setLightState('done');
      refreshRecommendations(level, noiseLevel);
    } catch {
      setLightState('denied');
    } finally {
      if (videoRef.current) videoRef.current.srcObject = null;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        streamRefs.current = streamRefs.current.filter((s) => s !== stream);
      }
    }
  };

  const checkNoise = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setNoiseState('unsupported');
      return;
    }
    setNoiseState('checking');
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRefs.current.push(stream);
      const monitor = createAmbientNoiseMonitor(stream);
      noiseStopRef.current = monitor.stop;
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 2500);
        monitor.start((level, db) => {
          clearTimeout(timeout);
          setNoiseLevel(level);
          setDbApprox(Math.round(db));
          setNoiseState('done');
          refreshRecommendations(luminance, level);
          resolve();
        });
      });
      monitor.stop();
      noiseStopRef.current = null;
      if (noiseState === 'checking') setNoiseState((prev) => (prev === 'checking' ? 'done' : prev));
    } catch {
      setNoiseState('denied');
    } finally {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        streamRefs.current = streamRefs.current.filter((s) => s !== stream);
      }
    }
  };

  const cardCls = isDarkMode
    ? 'bg-[#121B1E] border-stone-800'
    : 'bg-white border-stone-200';
  const textCls = isDarkMode ? 'text-stone-100' : 'text-stone-900';
  const subCls = isDarkMode ? 'text-stone-400' : 'text-stone-500';

  const statusLabel = (state: CheckState) => {
    if (state === 'checking') return isArabic ? 'جاري الفحص...' : L('Checking...');
    if (state === 'denied')
      return isArabic
        ? 'تم رفض الإذن. اسمح بالوصول من إعدادات المتصفح ثم أعد المحاولة.'
        : L('Permission denied. Allow access in your browser settings and try again.');
    if (state === 'unsupported')
      return isArabic
        ? 'هذا المتصفح لا يدعم الوصول للكاميرا/الميكروفون.'
        : L('This browser does not support camera/microphone access.');
    return '';
  };

  const luminanceLabel = (level: LuminanceLevel) =>
    isArabic
      ? level === 'dim'
        ? 'إضاءة خافتة'
        : level === 'glare'
          ? 'وهج ساطع'
          : 'إضاءة طبيعية'
      : level === 'dim'
        ? 'Dim lighting'
        : level === 'glare'
          ? 'Bright glare'
          : 'Normal lighting';

  const noiseLabel = (level: NoiseLevel) =>
    isArabic
      ? level === 'noisy'
        ? 'ضوضاء مرتفعة'
        : level === 'moderate'
          ? 'ضوضاء متوسطة'
          : 'هادئ'
      : level === 'noisy'
        ? 'Noisy'
        : level === 'moderate'
          ? 'Moderate noise'
          : 'Quiet';

  return (
    <div className="space-y-4" data-testid="adaptive-environment-panel">
      {/* Hidden video element used only for luminance sampling */}
      <video ref={videoRef} className="hidden" playsInline muted aria-hidden="true" />

      <p className={`text-xs leading-relaxed ${subCls}`}>
        {isArabic
          ? 'يفحص هذا القسم إضاءة المكان ومستوى الضوضاء لحظياً عبر الكاميرا والميكروفون ليقترح إعدادات أسهل لعينيك وأذنيك. لا يتم تسجيل أو رفع أي صورة أو صوت — الفحص يتم على جهازك فقط ويتوقف فور انتهائه.'
          : L('This section checks your room lighting and noise level on the spot using your camera and microphone, then suggests settings that are easier on your eyes and ears. Nothing is recorded or uploaded - the check runs only on your device and stops as soon as it finishes.')}
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Lighting check */}
        <div className={`p-5 rounded-3xl border space-y-3 ${cardCls}`}>
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <h3 className={`text-sm font-black ${textCls}`}>
              {isArabic ? 'فحص الإضاءة المحيطة' : L('Ambient lighting check')}
            </h3>
          </div>
          {luminance && (
            <p className={`text-xs font-bold ${textCls}`}>
              {isArabic ? 'النتيجة: ' : L('Result: ')}
              {luminanceLabel(luminance)}
            </p>
          )}
          {lightState === 'checking' && (
            <p className={`text-xs flex items-center gap-2 ${subCls}`}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              {statusLabel(lightState)}
            </p>
          )}
          {(lightState === 'denied' || lightState === 'unsupported') && (
            <p className="text-xs text-rose-400" role="alert">
              {statusLabel(lightState)}
            </p>
          )}
          <button
            type="button"
            onClick={checkLighting}
            disabled={lightState === 'checking'}
            className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {isArabic ? 'افحص الإضاءة الآن' : L('Check lighting now')}
          </button>
        </div>

        {/* Noise check */}
        <div className={`p-5 rounded-3xl border space-y-3 ${cardCls}`}>
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-sky-400" aria-hidden="true" />
            <h3 className={`text-sm font-black ${textCls}`}>
              {isArabic ? 'فحص الضوضاء المحيطة' : L('Ambient noise check')}
            </h3>
          </div>
          {noiseLevel && (
            <p className={`text-xs font-bold ${textCls}`}>
              {isArabic ? 'النتيجة: ' : L('Result: ')}
              {noiseLabel(noiseLevel)}
              {dbApprox !== null &&
                (isArabic ? ` (حوالي ${dbApprox} ديسيبل)` : ` (~${dbApprox} dB)`)}
            </p>
          )}
          {noiseState === 'checking' && (
            <p className={`text-xs flex items-center gap-2 ${subCls}`}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              {statusLabel(noiseState)}
            </p>
          )}
          {(noiseState === 'denied' || noiseState === 'unsupported') && (
            <p className="text-xs text-rose-400" role="alert">
              {statusLabel(noiseState)}
            </p>
          )}
          <button
            type="button"
            onClick={checkNoise}
            disabled={noiseState === 'checking'}
            className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {isArabic ? 'افحص الضوضاء الآن' : L('Check noise now')}
          </button>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations && (
        <div
          className={`p-5 rounded-3xl border space-y-3 ${
            isDarkMode ? 'bg-[#0D2542] border-[#1769AA]/40' : 'bg-sky-50 border-sky-200'
          }`}
          data-testid="adaptive-recommendations"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h3 className={`text-sm font-black ${textCls}`}>
              {isArabic ? 'التوصيات' : L('Recommendations')}
            </h3>
          </div>
          <p className={`text-xs leading-relaxed ${textCls}`}>
            {isArabic ? recommendations.reasonAr : recommendations.reasonEn}
          </p>
          <div className="flex flex-wrap gap-2">
            {recommendations.highContrastRecommended && (
              <span className="px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
                {isArabic ? '⬛ وضع التباين العالي' : L('⬛ High-contrast mode')}
              </span>
            )}
            {recommendations.liveCaptionsRecommended && (
              <span className="px-3 py-1.5 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-300 text-[11px] font-bold">
                {isArabic ? '💬 التسميات التوضيحية المباشرة' : L('💬 Live captions')}
              </span>
            )}
            {!recommendations.highContrastRecommended && !recommendations.liveCaptionsRecommended && (
              <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                {isArabic ? '✓ البيئة الحالية مناسبة' : L('✓ Current environment is suitable')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdaptiveEnvironmentPanel;
