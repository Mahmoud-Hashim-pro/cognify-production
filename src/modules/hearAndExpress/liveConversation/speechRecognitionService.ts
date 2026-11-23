import type {
  RecognitionState,
  RecognitionError,
  RecognitionErrorCode,
  SupportedLanguageInfo,
  RecognitionStateListener,
} from './types';
import type { Dialect } from '../types';

export const SUPPORTED_LANGUAGES: SupportedLanguageInfo[] = [
  {
    code: 'ar-EG',
    dialect: 'Egyptian Ammiya',
    labelAr: 'العامية المصرية (ar-EG)',
    labelEn: 'Egyptian Arabic (ar-EG)',
    isEngineSupported: true,
    requiresInternet: true,
    isDefault: false,
  },
  {
    code: 'ar-SA',
    dialect: 'Arabic',
    labelAr: 'العربية الفصحى (ar-SA)',
    labelEn: 'Modern Standard Arabic (ar-SA)',
    isEngineSupported: true,
    requiresInternet: true,
    isDefault: true,
  },
  {
    code: 'en-US',
    dialect: 'English',
    labelAr: 'الإنجليزية (en-US)',
    labelEn: 'English (en-US)',
    isEngineSupported: true,
    requiresInternet: true,
    isDefault: false,
  },
];

export interface SpeechResultCallback {
  onInterim: (text: string, confidence: number) => void;
  onFinal: (text: string, confidence: number) => void;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private state: RecognitionState = 'idle';
  private currentLanguageCode = 'ar-SA';
  private stateListeners: Set<RecognitionStateListener> = new Set();
  private resultCallbacks: SpeechResultCallback | null = null;

  // Deduplication guard: prevents duplicate final results emitted by repeated browser events
  private lastFinalText = '';
  private lastFinalTime = 0;

  // Explicit paused flag
  private isPausedManually = false;

  constructor() {}

  public subscribeState(listener: RecognitionStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public getState(): RecognitionState {
    return this.state;
  }

  public getCurrentLanguageCode(): string {
    return this.currentLanguageCode;
  }

  public getSupportedLanguages(): SupportedLanguageInfo[] {
    const hasEngine = this.detectEngineCapabilities().hasSpeechRecognition;
    return SUPPORTED_LANGUAGES.map((lang) => ({
      ...lang,
      isEngineSupported: hasEngine,
    }));
  }

  public static isLanguageSupported(code: string): boolean {
    return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
  }

  public static dialectToCode(dialect: Dialect): string {
    switch (dialect) {
      case 'Egyptian Ammiya':
        return 'ar-EG';
      case 'English':
        return 'en-US';
      case 'Arabic':
      default:
        return 'ar-SA';
    }
  }

  public static codeToDialect(code: string): Dialect {
    switch (code) {
      case 'ar-EG':
        return 'Egyptian Ammiya';
      case 'en-US':
        return 'English';
      case 'ar-SA':
      default:
        return 'Arabic';
    }
  }

  /**
   * Honest architectural capability detection.
   * Discloses whether STT is cloud-streamed (Google/Microsoft Web Speech) or unsupported.
   */
  public detectEngineCapabilities(): {
    hasSpeechRecognition: boolean;
    engineProvider: string;
    isCloudBased: boolean;
    supportsOffline: boolean;
  } {
    if (typeof window === 'undefined') {
      return {
        hasSpeechRecognition: false,
        engineProvider: 'None (Server / Headless)',
        isCloudBased: false,
        supportsOffline: false,
      };
    }

    const hasStandard = 'SpeechRecognition' in window;
    const hasWebkit = 'webkitSpeechRecognition' in window;

    if (!hasStandard && !hasWebkit) {
      return {
        hasSpeechRecognition: false,
        engineProvider: 'Unsupported Browser',
        isCloudBased: false,
        supportsOffline: false,
      };
    }

    const isChrome = /Chrome|Chromium|Edg/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !isChrome;

    return {
      hasSpeechRecognition: true,
      engineProvider: isChrome
        ? 'Browser Speech Service (Google/Microsoft Cloud Speech)'
        : isSafari
          ? 'Apple Siri Speech Recognition'
          : 'Web Speech API',
      isCloudBased: true,
      supportsOffline: false, // Standard Chromium requires active connection for STT
    };
  }

  private transition(newState: RecognitionState, error?: RecognitionError): void {
    this.state = newState;
    this.stateListeners.forEach((l) => l(newState, error));
  }

  public async start(
    languageCode = 'ar-SA',
    callbacks?: SpeechResultCallback
  ): Promise<boolean> {
    if (!SpeechRecognitionService.isLanguageSupported(languageCode)) {
      const err: RecognitionError = {
        code: 'language-not-supported',
        messageAr: `اللغة المطلوبة (${languageCode}) غير مدعومة حالياً بواسطة محرك التعرف.`,
        messageEn: `The requested language (${languageCode}) is not currently supported by the active engine.`,
        recoverable: true,
        suggestedActionAr: 'يرجى اختيار العربية (الفصحى أو المصرية) أو الإنجليزية.',
        suggestedActionEn: 'Please select Modern Standard Arabic, Egyptian Arabic, or English.',
      };
      this.transition('error', err);
      return false;
    }

    if (callbacks) {
      this.resultCallbacks = callbacks;
    }

    this.currentLanguageCode = languageCode;
    this.isPausedManually = false;

    // Feature detect Web Speech API
    if (typeof window === 'undefined') return false;
    const SpeechRecConstructor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecConstructor) {
      const err: RecognitionError = {
        code: 'service-not-allowed',
        messageAr: 'المتصفح الحالي لا يدعم واجهة التعرف على الصوت (Web Speech API).',
        messageEn: 'Your current browser does not support the Web Speech API for live captions.',
        recoverable: false,
        suggestedActionAr: 'يُوصى باستخدام متصفح حديث مثل Chrome أو Edge أو Safari.',
        suggestedActionEn: 'Please use a modern browser such as Chrome, Edge, or Safari.',
      };
      this.transition('error', err);
      return false;
    }

    // Step 1: Request permission explicitly via getUserMedia to test mic access
    this.transition('requesting_permission');
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release test stream; SpeechRecognition opens its own handle
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (e: any) {
      const isDenied = e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError';
      const err: RecognitionError = {
        code: 'not-allowed',
        messageAr: isDenied
          ? 'تم رفض إذن الوصول إلى الميكروفون. يرجى تفعيل إذن الميكروفون في المتصفح.'
          : 'تعذر الوصول إلى الميكروفون (الجهاز غير متاح أو قيد الاستخدام).',
        messageEn: isDenied
          ? 'Microphone access was denied. Please allow microphone permissions in your browser settings.'
          : 'Could not access the microphone (device is unavailable or in use).',
        recoverable: true,
        suggestedActionAr: 'انقر على أيقونة القفل أو الكاميرا بجانب عنوان الموقع واسمح بالميكروفون.',
        suggestedActionEn: 'Click the permissions icon next to the address bar and allow microphone.',
      };
      this.transition('error', err);
      return false;
    }

    // Step 2: Initialize SpeechRecognition instance
    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {
          // ignore
        }
      }

      const rec = new SpeechRecConstructor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = languageCode;

      rec.onstart = () => {
        this.transition('listening');
      };

      rec.onresult = (event: any) => {
        if (this.isPausedManually) return;

        this.transition('processing');

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = res[0]?.transcript || '';
          const confidence = res[0]?.confidence || 0.9;

          if (res.isFinal) {
            const cleanFinal = transcript.trim();
            const now = Date.now();

            // Deduplication guard: ignore exact repeat within 1.2s window
            if (cleanFinal && (cleanFinal !== this.lastFinalText || now - this.lastFinalTime > 1200)) {
              this.lastFinalText = cleanFinal;
              this.lastFinalTime = now;
              this.resultCallbacks?.onFinal(cleanFinal, confidence);
            }
          } else {
            interim += transcript;
          }
        }

        if (interim.trim()) {
          this.resultCallbacks?.onInterim(interim.trim(), 0.7);
        } else {
          this.transition('listening');
        }
      };

      rec.onerror = (event: any) => {
        const errorKey = event.error || 'unknown';

        if (errorKey === 'no-speech') {
          // Normal timeout when no speech is detected; retain listening state
          if (!this.isPausedManually && this.state !== 'idle') {
            this.transition('listening');
          }
          return;
        }

        if (errorKey === 'aborted') {
          if (this.state !== 'idle' && !this.isPausedManually) {
            this.transition('idle');
          }
          return;
        }

        const mappedError = this.mapRecognitionError(errorKey);
        this.transition('error', mappedError);
      };

      rec.onend = () => {
        if (this.isPausedManually) {
          this.transition('paused');
          return;
        }

        // If listening was still expected, attempt a clean restart
        if (this.state === 'listening' || this.state === 'processing') {
          try {
            rec.start();
          } catch {
            this.transition('idle');
          }
        } else {
          this.transition('idle');
        }
      };

      rec.start();
      this.recognition = rec;
      return true;
    } catch (err: any) {
      this.transition('error', {
        code: 'unknown',
        messageAr: 'حدث خطأ غير متوقع أثناء تشغيل محرك التعرف الصوتي.',
        messageEn: 'An unexpected error occurred while starting speech recognition.',
        recoverable: true,
        suggestedActionAr: 'يرجى المحاولة مرة أخرى أو إعادة تحميل الصفحة.',
        suggestedActionEn: 'Please retry or reload the page.',
      });
      return false;
    }
  }

  public pause(): void {
    this.isPausedManually = true;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.transition('paused');
  }

  public resume(): void {
    if (this.state === 'paused') {
      this.isPausedManually = false;
      this.start(this.currentLanguageCode, this.resultCallbacks || undefined);
    }
  }

  public stop(): void {
    this.isPausedManually = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.transition('idle');
  }

  private mapRecognitionError(code: string): RecognitionError {
    switch (code) {
      case 'not-allowed':
        return {
          code: 'not-allowed',
          messageAr: 'تم حظر إذن الميكروفون من قِبل المتصفح.',
          messageEn: 'Microphone permission blocked by browser.',
          recoverable: true,
          suggestedActionAr: 'افتح إعدادات الموقع واسمح للميكروفون بالعمل.',
          suggestedActionEn: 'Open site permissions and allow microphone access.',
        };
      case 'network':
        return {
          code: 'network',
          messageAr: 'تعذر الاتصال بخدمة التعرف على الصوت. تحقق من اتصالك بالإنترنت.',
          messageEn: 'Could not connect to speech service. Check your internet connection.',
          recoverable: true,
          suggestedActionAr: 'تأكد من اتصال الجهاز بشبكة الإنترنت.',
          suggestedActionEn: 'Verify your internet connection and try again.',
        };
      case 'audio-capture':
        return {
          code: 'audio-capture',
          messageAr: 'فشل التقاط الصوت من الميكروفون. قد يكون قيد استخدام تطبيق آخر.',
          messageEn: 'Audio capture failed. The microphone may be used by another app.',
          recoverable: true,
          suggestedActionAr: 'أغلق التطبيقات الأخرى التي تستخدم الميكروفون.',
          suggestedActionEn: 'Close other applications that may be holding the microphone.',
        };
      default:
        return {
          code: 'unknown',
          messageAr: `خطأ في التعرف على الصوت (${code}).`,
          messageEn: `Speech recognition error (${code}).`,
          recoverable: true,
          suggestedActionAr: 'يرجى إعادة المحاولة.',
          suggestedActionEn: 'Please try again.',
        };
    }
  }
}
