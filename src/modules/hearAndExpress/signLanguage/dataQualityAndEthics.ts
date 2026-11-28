/**
 * Egyptian Sign Language Data Quality, Ethics & Split Engine
 *
 * Implements strict quality audits, inter-annotator agreement metrics,
 * zero-leakage signer-independent partitioning, and consent revocation deletion.
 */

import type { EslVideoRecord, EslSignAnnotation, EslSignerProfile } from './datasetSchema';

export interface VideoQualityAuditResult {
  videoId: string;
  isAcceptable: boolean;
  resolutionPass: boolean;
  fpsPass: boolean;
  handVisibilityPass: boolean;
  faceVisibilityPass: boolean;
  upperBodyPass: boolean;
  lightingPass: boolean;
  qualityIssues: string[];
}

export interface SignerSplitResult {
  trainSigners: string[];
  valSigners: string[];
  testSigners: string[];
  trainVideoCount: number;
  valVideoCount: number;
  testVideoCount: number;
  isSignerDisjoint: boolean;
}

export class DataQualityAndEthicsEngine {
  /**
   * Run automated technical quality checks on raw signing video recordings.
   * Enforces:
   * - Minimum 720p resolution (1280x720)
   * - Minimum 30 fps (60 fps recommended for fast finger transitions)
   * - Hand visibility score >= 0.85 (no severe occlusion)
   * - Face visibility score >= 0.80 (for non-manual grammatical facial features)
   * - Upper body visibility score >= 0.80 (full signing space visible from hips to head)
   */
  public auditVideoQuality(video: EslVideoRecord): VideoQualityAuditResult {
    const issues: string[] = [];

    const resolutionPass = video.resolution.width >= 1280 && video.resolution.height >= 720;
    if (!resolutionPass) {
      issues.push(`Resolution insufficient (${video.resolution.width}x${video.resolution.height}). Minimum 1280x720 required.`);
    }

    const fpsPass = video.resolution.fps >= 30;
    if (!fpsPass) {
      issues.push(`Frame rate insufficient (${video.resolution.fps} fps). Minimum 30 fps required to avoid motion blur.`);
    }

    const handVisibilityPass = video.handVisibilityScore >= 0.85;
    if (!handVisibilityPass) {
      issues.push(`Hands occluded or out of frame (score ${video.handVisibilityScore} < 0.85).`);
    }

    const faceVisibilityPass = video.faceVisibilityScore >= 0.80;
    if (!faceVisibilityPass) {
      issues.push(`Face occluded or poorly lit (score ${video.faceVisibilityScore} < 0.80). Grammatical facial cues compromised.`);
    }

    const upperBodyPass = video.upperBodyVisibilityScore >= 0.80;
    if (!upperBodyPass) {
      issues.push(`Signing space truncated (score ${video.upperBodyVisibilityScore} < 0.80).`);
    }

    const lightingPass = video.lightingQuality !== 'varying_ambient';
    if (!lightingPass) {
      issues.push(`Lighting quality unstable or uneven.`);
    }

    const isAcceptable =
      resolutionPass &&
      fpsPass &&
      handVisibilityPass &&
      faceVisibilityPass &&
      upperBodyPass &&
      lightingPass;

    return {
      videoId: video.videoId,
      isAcceptable,
      resolutionPass,
      fpsPass,
      handVisibilityPass,
      faceVisibilityPass,
      upperBodyPass,
      lightingPass,
      qualityIssues: issues,
    };
  }

  /**
   * Calculate Cohen's Kappa for two independent annotators classifying glosses.
   * Po: Observed agreement
   * Pe: Expected agreement by chance
   * Kappa = (Po - Pe) / (1 - Pe)
   */
  public calculateCohensKappa(
    annotatorAClasses: string[],
    annotatorBClasses: string[]
  ): number {
    if (annotatorAClasses.length !== annotatorBClasses.length || annotatorAClasses.length === 0) {
      return 0.0;
    }

    const n = annotatorAClasses.length;
    let agreementCount = 0;
    const categoryCountsA: Record<string, number> = {};
    const categoryCountsB: Record<string, number> = {};

    for (let i = 0; i < n; i++) {
      const a = annotatorAClasses[i];
      const b = annotatorBClasses[i];

      if (a === b) agreementCount++;

      categoryCountsA[a] = (categoryCountsA[a] || 0) + 1;
      categoryCountsB[b] = (categoryCountsB[b] || 0) + 1;
    }

    const po = agreementCount / n;

    // Calculate Pe (expected probability by chance)
    let pe = 0;
    const allCategories = new Set([...Object.keys(categoryCountsA), ...Object.keys(categoryCountsB)]);
    for (const cat of allCategories) {
      const pA = (categoryCountsA[cat] || 0) / n;
      const pB = (categoryCountsB[cat] || 0) / n;
      pe += pA * pB;
    }

    if (pe === 1.0) return 1.0; // Perfect match
    const kappa = (po - pe) / (1 - pe);
    return Number(Math.max(-1.0, Math.min(1.0, kappa)).toFixed(3));
  }

  /**
   * Partition dataset into Train / Validation / Test subsets strictly by Signer ID.
   * GUARANTEES zero signer overlap between splits.
   *
   * Target ratios: 70% Train, 15% Validation, 15% Test.
   */
  public generateSignerIndependentSplit(
    videos: EslVideoRecord[],
    signerProfiles: EslSignerProfile[]
  ): SignerSplitResult {
    // Unique signer IDs
    const uniqueSigners = Array.from(new Set(signerProfiles.map((s) => s.signerPseudonymId)));

    // Deterministic stratification
    const totalSigners = uniqueSigners.length;
    const trainCount = Math.max(1, Math.round(totalSigners * 0.7));
    const valCount = Math.max(1, Math.round(totalSigners * 0.15));

    const trainSigners = uniqueSigners.slice(0, trainCount);
    const valSigners = uniqueSigners.slice(trainCount, trainCount + valCount);
    const testSigners = uniqueSigners.slice(trainCount + valCount);

    // If testSigners is empty due to small count, ensure at least one test signer if total >= 3
    if (testSigners.length === 0 && uniqueSigners.length >= 3) {
      testSigners.push(valSigners.pop()!);
    }

    // Verify disjoint sets
    const trainSet = new Set(trainSigners);
    const valSet = new Set(valSigners);
    const testSet = new Set(testSigners);

    let isSignerDisjoint = true;
    for (const s of valSet) {
      if (trainSet.has(s)) isSignerDisjoint = false;
    }
    for (const s of testSet) {
      if (trainSet.has(s) || valSet.has(s)) isSignerDisjoint = false;
    }

    // Assign videos to splits
    let trainVideoCount = 0;
    let valVideoCount = 0;
    let testVideoCount = 0;

    for (const video of videos) {
      if (trainSet.has(video.signerPseudonymId)) {
        video.datasetSplitAssignment = 'train';
        trainVideoCount++;
      } else if (valSet.has(video.signerPseudonymId)) {
        video.datasetSplitAssignment = 'validation';
        valVideoCount++;
      } else if (testSet.has(video.signerPseudonymId)) {
        video.datasetSplitAssignment = 'test';
        testVideoCount++;
      }
    }

    return {
      trainSigners,
      valSigners,
      testSigners,
      trainVideoCount,
      valVideoCount,
      testVideoCount,
      isSignerDisjoint,
    };
  }

  /**
   * ETHICAL & PRIVACY INVARIANT: Right to Withdraw Consent & Cascade Deletion.
   *
   * When a Deaf signer revokes consent, all corresponding videos, landmarks,
   * annotations, and biometric metadata must be permanently deleted from the active corpus.
   */
  public executeConsentRevocationDeletion(
    targetSignerPseudonymId: string,
    corpus: {
      signers: EslSignerProfile[];
      videos: EslVideoRecord[];
    }
  ): {
    success: boolean;
    deletedSignerId: string;
    purgedVideosCount: number;
    purgedAnnotationsCount: number;
  } {
    const signerIndex = corpus.signers.findIndex((s) => s.signerPseudonymId === targetSignerPseudonymId);
    if (signerIndex === -1) {
      return {
        success: false,
        deletedSignerId: targetSignerPseudonymId,
        purgedVideosCount: 0,
        purgedAnnotationsCount: 0,
      };
    }

    // Remove signer
    corpus.signers.splice(signerIndex, 1);

    // Locate and remove all associated videos
    let purgedAnnotationsCount = 0;
    const remainingVideos = corpus.videos.filter((v) => {
      if (v.signerPseudonymId === targetSignerPseudonymId) {
        purgedAnnotationsCount += v.annotations.length;
        return false;
      }
      return true;
    });

    const purgedVideosCount = corpus.videos.length - remainingVideos.length;
    corpus.videos = remainingVideos;

    return {
      success: true,
      deletedSignerId: targetSignerPseudonymId,
      purgedVideosCount,
      purgedAnnotationsCount,
    };
  }
}
