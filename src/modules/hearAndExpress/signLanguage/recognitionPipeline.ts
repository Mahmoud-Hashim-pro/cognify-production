/**
 * Egyptian Sign Language Recognition Pipeline & Model Interface
 *
 * Implements video frame preprocessing, multimodal feature extraction (hands, body pose,
 * and facial non-manual markers), temporal sliding window buffering, uncertainty handling,
 * and out-of-vocabulary (OOV) rejection.
 *
 * Strictly interfaces with the Pre-Implementation Gate to prevent synthetic model fabrication.
 */

import { EslVocabularyCatalog, type EslVocabularyEntry } from './vocabularyCatalog';

export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HolisticFrameFeatures {
  timestamp: number;
  leftHandLandmarks: Point3D[] | null;  // 21 keypoints
  rightHandLandmarks: Point3D[] | null; // 21 keypoints
  upperBodyPoseLandmarks: {
    nose: Point3D;
    leftShoulder: Point3D;
    rightShoulder: Point3D;
    leftElbow: Point3D;
    rightElbow: Point3D;
    leftWrist: Point3D;
    rightWrist: Point3D;
  } | null;
  facialNonManualFeatures: {
    eyebrowElevationRatio: number;      // > 1.1 = raised (Yes/No), < 0.9 = furrowed/lowered (WH)
    mouthAspectRatio: number;           // Height/Width ratio for mouthing
    eyeAspectRatio: number;             // Openness ratio
    headPitchDegrees: number;           // Forward/backward tilt
    headYawDegrees: number;             // Lateral turn (shake)
    headRollDegrees: number;            // Side tilt
  } | null;
  overallLightingScore: number;         // 0.0 to 1.0
  isSigningActive: boolean;            // Detects hand presence in active signing envelope
}

export interface CandidatePrediction {
  glossId: string;
  arabicGloss: string;
  arabicMeaning: string;
  confidence: number;                  // 0.0 to 1.0
  category: string;
}

export interface EslRecognitionResult {
  status: 'recognized' | 'uncertain' | 'out_of_vocabulary' | 'idle_rest';
  primaryCandidate: CandidatePrediction | null;
  alternativeCandidates: CandidatePrediction[];
  isLowConfidence: boolean;
  confidenceScore: number;
  activeNonManualMarkersDetected: string[];
  uncertaintyReasonEn?: string;
  uncertaintyReasonAr?: string;
  latencyMs: number;
  timestamp: number;
}

export interface IEslRecognitionModel {
  readonly modelId: string;
  readonly architectureName: string;
  readonly targetVocabularySize: number;
  readonly isModelLoaded: boolean;
  loadWeights(): Promise<boolean>;
  inferSequence(sequence: HolisticFrameFeatures[]): Promise<CandidatePrediction[]>;
}

export class EslRecognitionPipeline {
  private frameBuffer: HolisticFrameFeatures[] = [];
  private readonly maxWindowFrames: number;
  private customModel: IEslRecognitionModel | null = null;
  private uncertaintyThreshold = 0.65; // Below 65% triggers uncertain / OOV status

  constructor(maxWindowFrames = 32) {
    this.maxWindowFrames = maxWindowFrames;
  }

  /**
   * Register a real trained recognition model backend.
   */
  public registerModel(model: IEslRecognitionModel): void {
    this.customModel = model;
  }

  public getModel(): IEslRecognitionModel | null {
    return this.customModel;
  }

  public setUncertaintyThreshold(threshold: number): void {
    this.uncertaintyThreshold = Math.max(0.1, Math.min(0.95, threshold));
  }

  /**
   * Push a newly extracted holistic video frame into the temporal buffer.
   */
  public ingestFrame(frame: HolisticFrameFeatures): void {
    this.frameBuffer.push(frame);
    if (this.frameBuffer.length > this.maxWindowFrames) {
      this.frameBuffer.shift();
    }
  }

  public getBufferedFramesCount(): number {
    return this.frameBuffer.length;
  }

  public clearBuffer(): void {
    this.frameBuffer = [];
  }

  /**
   * Normalize 21 3D hand landmarks for scale and wrist translation invariance.
   */
  public static normalizeHandKeypoints(landmarks: Point3D[] | null): Point3D[] | null {
    if (!landmarks || landmarks.length !== 21) return null;

    // Wrist is index 0
    const wrist = landmarks[0];
    // Middle finger MCP is index 9 (palm scale reference)
    const middleMcp = landmarks[9];
    const dx = middleMcp.x - wrist.x;
    const dy = middleMcp.y - wrist.y;
    const dz = middleMcp.z - wrist.z;
    const scale = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

    return landmarks.map((pt) => ({
      x: (pt.x - wrist.x) / scale,
      y: (pt.y - wrist.y) / scale,
      z: (pt.z - wrist.z) / scale,
      visibility: pt.visibility ?? 1.0,
    }));
  }

  /**
   * Detect active non-manual facial cues from facial landmarks.
   */
  public static extractNonManualCues(facialData: HolisticFrameFeatures['facialNonManualFeatures']): string[] {
    if (!facialData) return [];

    const cues: string[] = [];
    if (facialData.eyebrowElevationRatio > 1.15) {
      cues.push('eyebrow_raised (Yes/No Question / Surprise)');
    } else if (facialData.eyebrowElevationRatio < 0.88) {
      cues.push('eyebrow_lowered_furrowed (WH Question / Inquiry)');
    }

    if (Math.abs(facialData.headYawDegrees) > 12) {
      cues.push('head_shake (Negation)');
    } else if (facialData.headPitchDegrees > 10) {
      cues.push('head_nod (Affirmation)');
    }

    if (facialData.mouthAspectRatio > 0.45) {
      cues.push('mouthing_gesture (Lexical / Grammatical mouthing)');
    }

    return cues;
  }

  /**
   * Run recognition inference across the temporal window.
   *
   * If no valid model is loaded (as mandated by the Pre-Implementation Gate),
   * honestly returns `out_of_vocabulary` / `uncertain` with explicit disclosures,
   * completely refusing to fabricate random or fake predictions.
   */
  public async processSequence(): Promise<EslRecognitionResult> {
    const startTime = Date.now();
    const now = Date.now();

    // 1. Check if buffer has sufficient frames (minimum 12 frames for temporal gestures)
    if (this.frameBuffer.length < 12) {
      return {
        status: 'idle_rest',
        primaryCandidate: null,
        alternativeCandidates: [],
        isLowConfidence: true,
        confidenceScore: 0.0,
        activeNonManualMarkersDetected: [],
        uncertaintyReasonEn: 'Insufficient temporal frames in buffer (minimum 12 frames required).',
        uncertaintyReasonAr: 'عدد الإطارات الزمنية غير كافٍ في المخزن المؤقت (يلزم 12 إطاراً على الأقل).',
        latencyMs: Date.now() - startTime,
        timestamp: now,
      };
    }

    // 2. Check for active signing in recent frames
    const recentFrames = this.frameBuffer.slice(-8);
    const hasActiveSigning = recentFrames.some((f) => f.isSigningActive);
    if (!hasActiveSigning) {
      return {
        status: 'idle_rest',
        primaryCandidate: null,
        alternativeCandidates: [],
        isLowConfidence: false,
        confidenceScore: 0.0,
        activeNonManualMarkersDetected: [],
        uncertaintyReasonEn: 'Signer is in rest/idle posture. No active gesture detected.',
        uncertaintyReasonAr: 'الإشاري في وضع السكون والراحة. لا توجد حركة إشارية نشطة.',
        latencyMs: Date.now() - startTime,
        timestamp: now,
      };
    }

    // 3. Extract non-manual markers from the latest active frame
    const latestActive = recentFrames.reverse().find((f) => f.isSigningActive) || this.frameBuffer[this.frameBuffer.length - 1];
    const activeNonManualMarkersDetected = EslRecognitionPipeline.extractNonManualCues(latestActive.facialNonManualFeatures);

    // 4. Model Inference Evaluation
    if (!this.customModel || !this.customModel.isModelLoaded) {
      // HONEST PRE-IMPLEMENTATION GATE COMPLIANCE:
      // No trained model weights loaded -> refuse to invent fake predictions!
      return {
        status: 'out_of_vocabulary',
        primaryCandidate: null,
        alternativeCandidates: [],
        isLowConfidence: true,
        confidenceScore: 0.0,
        activeNonManualMarkersDetected,
        uncertaintyReasonEn:
          'No authenticated Egyptian Sign Language neural network weights are loaded. In accordance with Phase 4 & 5 directives, synthetic predictions are strictly prohibited.',
        uncertaintyReasonAr:
          'لا توجد أوزان نموذج شبكة عصبية مدربة ومحققة للغة الإشارة المصرية. امتثالاً للتوجيهات السريرية، يمتنع النظام تماماً عن توليد تنبؤات عشوائية زائفة.',
        latencyMs: Date.now() - startTime,
        timestamp: now,
      };
    }

    // 5. If genuine model is present, run inference
    try {
      const candidates = await this.customModel.inferSequence(this.frameBuffer);
      const latencyMs = Date.now() - startTime;

      if (candidates.length === 0) {
        return {
          status: 'out_of_vocabulary',
          primaryCandidate: null,
          alternativeCandidates: [],
          isLowConfidence: true,
          confidenceScore: 0.0,
          activeNonManualMarkersDetected,
          uncertaintyReasonEn: 'Input motion does not match any recognized sign in the vocabulary.',
          uncertaintyReasonAr: 'الحركة المدخلة لا تطابق أياً من الإشارات المعجمية المعتمدة.',
          latencyMs,
          timestamp: now,
        };
      }

      const topCandidate = candidates[0];
      const isLowConfidence = topCandidate.confidence < this.uncertaintyThreshold;

      return {
        status: isLowConfidence ? 'uncertain' : 'recognized',
        primaryCandidate: topCandidate,
        alternativeCandidates: candidates.slice(1, 4), // Top 3 alternatives
        isLowConfidence,
        confidenceScore: topCandidate.confidence,
        activeNonManualMarkersDetected,
        uncertaintyReasonEn: isLowConfidence
          ? `Low confidence score (${(topCandidate.confidence * 100).toFixed(1)}% < ${(this.uncertaintyThreshold * 100)}%). Tagged uncertain.`
          : undefined,
        uncertaintyReasonAr: isLowConfidence
          ? `نسبة الثقة منخفضة (${(topCandidate.confidence * 100).toFixed(1)}%). تم تصنيف النتيجة على أنها غير مؤكدة لضمان الأمان.`
          : undefined,
        latencyMs,
        timestamp: now,
      };
    } catch (err: any) {
      return {
        status: 'uncertain',
        primaryCandidate: null,
        alternativeCandidates: [],
        isLowConfidence: true,
        confidenceScore: 0.0,
        activeNonManualMarkersDetected,
        uncertaintyReasonEn: `Inference error: ${err.message}`,
        uncertaintyReasonAr: `خطأ في معالجة النموذج: ${err.message}`,
        latencyMs: Date.now() - startTime,
        timestamp: now,
      };
    }
  }
}
