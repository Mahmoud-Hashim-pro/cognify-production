import { useCallback, useEffect, useRef, useState } from 'react';
import { parseVoiceCommand, normalizeArabic, VoiceIntent } from '../lib/voiceCommands';
import { speak, cancelSpeech } from '../lib/tts';
import { generateAdaptiveResponse } from '../services/gemini';

export interface UseGlobalVoiceControlProps {
  isArabic: boolean;
  speechRate: number;
  /** Executes a parsed intent. Return false to fall through to the Gemini intent fallback. */
  onIntent: (intent: VoiceIntent) => boolean | void;
  /** Optional Gemini intent fallback for utterances the local parser cannot map. */
  enableGeminiFallback?: boolean;
}

export type VoiceControlStatus = 'idle' | 'listening' | 'processing' | 'unsupported';

function getSpeechRecognitionCtor(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/**
 * Global hold-to-talk voice control. The owning component starts listening on
 * pointer-down and stops on pointer-up; final transcripts are parsed locally
 * (fast, offline) with an optional Gemini intent-classification fallback.
 */
export function useGlobalVoiceControl({
  isArabic,
  speechRate,
  onIntent,
  enableGeminiFallback = true,
}: UseGlobalVoiceControlProps) {
  const [status, setStatus] = useState<VoiceControlStatus>('idle');
  const [lastHeard, setLastHeard] = useState('');
  const recognitionRef = useRef<any>(null);
  const intentionalStopRef = useRef(false);
  const onIntentRef = useRef(onIntent);
  onIntentRef.current = onIntent;
  const isArabicRef = useRef(isArabic);
  isArabicRef.current = isArabic;
  const speechRateRef = useRef(speechRate);
  speechRateRef.current = speechRate;

  const supported = typeof window !== 'undefined' && !!getSpeechRecognitionCtor();

  const speakShort = useCallback((ar: string, en: string) => {
    speak(isArabicRef.current ? ar : en, isArabicRef.current ? 'Arabic' : 'English', {
      rate: speechRateRef.current,
    });
  }, []);

  const handleTranscript = useCallback(
    async (transcript: string) => {
      const text = transcript.trim();
      if (!text) {
        setStatus('idle');
        return;
      }
      setLastHeard(text);
      const intent = parseVoiceCommand(text);
      if (intent) {
        setStatus('idle');
        onIntentRef.current(intent);
        return;
      }

      // Gemini fallback: classify the intention when local parsing misses.
      if (enableGeminiFallback) {
        setStatus('processing');
        try {
          const prompt = `You are the intent classifier of an Arabic accessibility app for blind users. Classify the user's spoken request into exactly one token from this list: open_camera, read_text, currency, barcode, navigation, reminders, known_people, go_back, go_home, read_screen, repeat, stop, faster, slower, sos, where_am_i, whats_around, street_name, time, date, battery, weather, help, unknown. Reply with the token only, no explanation.\nUser said: "${text.slice(0, 200)}"`;
          const res = await generateAdaptiveResponse(prompt, { language: 'English' } as any, [], []);
          const token = normalizeArabic(String(res || '')).replace(/[^a-z_]/g, '');
          const map: Record<string, VoiceIntent> = {
            open_camera: { type: 'open_vision', tool: 'scene' },
            read_text: { type: 'open_vision', tool: 'read' },
            currency: { type: 'open_vision', tool: 'currency' },
            barcode: { type: 'open_vision', tool: 'product' },
            navigation: { type: 'open_navigation' },
            reminders: { type: 'open_daily_aids' },
            known_people: { type: 'open_known_people' },
            go_back: { type: 'go_back' },
            go_home: { type: 'go_home' },
            read_screen: { type: 'read_screen' },
            repeat: { type: 'repeat' },
            stop: { type: 'stop' },
            faster: { type: 'speech_rate', direction: 'up' },
            slower: { type: 'speech_rate', direction: 'down' },
            sos: { type: 'sos' },
            where_am_i: { type: 'where_am_i' },
            whats_around: { type: 'whats_around' },
            street_name: { type: 'street_name' },
            time: { type: 'time' },
            date: { type: 'date' },
            battery: { type: 'battery' },
            weather: { type: 'weather' },
            help: { type: 'help' },
          };
          const mapped = map[token];
          setStatus('idle');
          if (mapped) {
            onIntentRef.current(mapped);
          } else {
            speakShort('مش فاهم الأمر، جرب تاني أو قول مساعدة', 'I did not understand, try again or say help');
          }
          return;
        } catch {
          setStatus('idle');
          speakShort('مش قادر أفهم دلوقتي، جرب تاني', 'I could not understand right now, try again');
          return;
        }
      }

      setStatus('idle');
      speakShort('مش فاهم الأمر، جرب تاني أو قول مساعدة', 'I did not understand, try again or say help');
    },
    [enableGeminiFallback, speakShort]
  );

  const handleTranscriptRef = useRef(handleTranscript);
  handleTranscriptRef.current = handleTranscript;

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus('unsupported');
      speakShort(
        'التعرف على الصوت مش مدعوم في المتصفح ده، جرب كروم على اندرويد',
        'Speech recognition is not supported in this browser, try Chrome'
      );
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    cancelSpeech();
    intentionalStopRef.current = false;
    const rec = new Ctor();
    rec.lang = isArabicRef.current ? 'ar-EG' : 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    let gotResult = false;

    rec.onresult = (event: any) => {
      gotResult = true;
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      handleTranscriptRef.current(transcript);
    };
    rec.onerror = (event: any) => {
      if (intentionalStopRef.current) return;
      setStatus('idle');
      const code = event?.error || '';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        speakShort('الميكروفون محتاج إذن من إعدادات المتصفح', 'The microphone needs permission from the browser settings');
      } else if (code === 'no-speech') {
        speakShort('مسمعتش حاجة، اتكلم بوضوح', 'I heard nothing, please speak clearly');
      } else if (code !== 'aborted') {
        speakShort('حصل خطأ في الاستماع، جرب تاني', 'Listening error, try again');
      }
    };
    rec.onend = () => {
      recognitionRef.current = null;
      setStatus((s) => (s === 'listening' ? 'idle' : s));
      if (!gotResult && !intentionalStopRef.current) {
        // no-speech is already announced in onerror on most browsers
      }
    };
    recognitionRef.current = rec;
    setStatus('listening');
    try {
      rec.start();
    } catch {
      recognitionRef.current = null;
      setStatus('idle');
    }
  }, [speakShort]);

  const stopListening = useCallback(() => {
    intentionalStopRef.current = true;
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.stop(); } catch { /* noop */ }
    }
  }, []);

  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* noop */ }
        recognitionRef.current = null;
      }
    };
  }, []);

  return { status, supported, lastHeard, startListening, stopListening };
}
