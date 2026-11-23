import {
  ARSL_DICTIONARY,
  ARSL_LECTURES_CATALOG,
  lookupArslSign,
  searchArslDictionary,
  hamnosysToThreePose,
  normalizeHandLandmarks,
  type ArslSignEntry,
  type Point3D,
} from '../../../lib/arslDictionary';
import type { SignRecognitionStatus } from '../types';
import type { SignLanguageSearchResult, SignLanguageServiceConfig, ThreePoseTarget } from './types';
import { SignSmoother, SIGN_LETTERS, type SignPrediction } from './signSmoother';

export class SignLanguageService {
  private config: SignLanguageServiceConfig;
  public smoother = new SignSmoother();

  constructor(config?: Partial<SignLanguageServiceConfig>) {
    this.config = {
      preferredAvatar: '3d_procedural',
      enableFingerspellingFallback: true,
      ...config,
    };
  }

  /**
   * Search official ArSL dictionary and curriculum catalog.
   */
  public search(query: string, limit = 10): SignLanguageSearchResult {
    const trimmed = query.trim();
    if (!trimmed) {
      return { exactMatch: null, suggestions: [], fingerspellingFallback: [] };
    }

    const exact = lookupArslSign(trimmed);
    const suggestions = searchArslDictionary(trimmed, undefined, limit);

    // If word is not in lexical vocabulary, create fingerspelling fallback characters
    const fingerspellingFallback: string[] = [];
    if (!exact && this.config.enableFingerspellingFallback) {
      for (const ch of trimmed) {
        if (ch !== ' ') {
          fingerspellingFallback.push(ch);
        }
      }
    }

    return {
      exactMatch: exact,
      suggestions,
      fingerspellingFallback,
    };
  }

  /**
   * Resolve 3D procedural pose for a given lexical sign.
   */
  public resolve3DPose(sign: ArslSignEntry): ThreePoseTarget {
    return hamnosysToThreePose(sign.hamnosys);
  }

  /**
   * Normalize 21 3D landmarks for scale and translation invariance.
   */
  public normalizeLandmarks(landmarks: Point3D[] | null | undefined): number[] {
    return normalizeHandLandmarks(landmarks);
  }

  /**
   * Returns current honest status of vision-based sign recognition.
   * Guarantees zero false clinical claims.
   */
  public getRecognitionStatus(isCameraActive: boolean, isHandTracked: boolean): SignRecognitionStatus {
    return {
      isCameraActive,
      isHandTracked,
      trackedLandmarksCount: isHandTracked ? 21 : 0,
      researchStatus: isCameraActive ? 'tracking_active' : 'lexicon_supported',
      disclaimerAr:
        'الترجمة الفورية للغة الإشارة تتطلب نماذج ذكاء اصطناعي مخصصة ومدربة، والتطبيق يدعم حالياً تتبع حركة اليدين وقاموس الإشارات المعتمد.',
      disclaimerEn:
        'Continuous real-time sign recognition requires dedicated deep learning sequence decoders. The system currently supports hand landmark tracking and the verified lexicon.',
    };
  }

  public getLecturesCatalog() {
    return ARSL_LECTURES_CATALOG;
  }

  public getMasterLexiconCount(): number {
    return ARSL_DICTIONARY.length;
  }
}
