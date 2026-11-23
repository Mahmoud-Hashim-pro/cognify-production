/**
 * Egyptian Sign Language Avatar Motion Validator & Video Fallback Resolver
 *
 * Enforces the strict clinical invariant:
 * "An avatar must not generate random hand poses and present them as fluent Egyptian Sign Language.
 * If accurate sign animation is unavailable, provide video demonstrations instead of pretending the avatar can sign fluently."
 *
 * Audits and prevents the unverified procedural ASL hand-curl synthesis found in legacy avatars.
 */

import { ExpertSignDictionary, type VerifiedSignEntry } from './expertSignDictionary';

export type AvatarRenderMode =
  | '3d_avatar_validated'              // حركة ثلاثية الأبعاد موثقة ومطابقة حركياً
  | 'video_demonstration_fallback'     // عرض فيديو حقيقي مسجل ومعتمد كبديل آمن
  | 'unsupported_sign';                // إشارة غير موثقة (لا يتم اختلاقها)

export interface ValidatedSignMotionTrack {
  trackId: string;
  signId: string;
  arabicGloss: string;
  sourceType: 'mocap_optical_capture' | 'expert_rotoscoped' | 'unverified_procedural_asl';
  isExpertApproved: boolean;
  approvingExpertId: string;
  durationSeconds: number;
  framerate: number;
  jointRotationsEuler: Record<string, [number, number, number]>[];
  facialMorphTargets: Record<string, number>[];
  validationTimestamp: string;
}

export interface AvatarDemonstrationResolution {
  signId: string;
  arabicPhrase: string;
  renderMode: AvatarRenderMode;
  visualMediaUrl: string;
  hasValid3dAnimation: boolean;
  proceduralAslRejected: boolean;
  justificationEn: string;
  justificationAr: string;
  verifiedSignEntry?: VerifiedSignEntry;
}

export class AvatarMotionValidator {
  private dictionary: ExpertSignDictionary;
  private verifiedMotionTracks: Map<string, ValidatedSignMotionTrack> = new Map();

  constructor(dictionary?: ExpertSignDictionary) {
    this.dictionary = dictionary || new ExpertSignDictionary();
  }

  /**
   * Register a verified optical motion capture or expert rotoscoped motion track.
   * Rejects unverified procedural ASL tracks.
   */
  public registerMotionTrack(track: ValidatedSignMotionTrack): boolean {
    if (track.sourceType === 'unverified_procedural_asl' || !track.isExpertApproved) {
      console.warn(`[AvatarMotionValidator] REJECTED track "${track.trackId}": Unverified procedural ASL cannot be registered as Egyptian Sign Language.`);
      return false;
    }

    this.verifiedMotionTracks.set(track.signId, track);
    return true;
  }

  /**
   * Resolve whether an Egyptian sign should be presented via validated 3D animation
   * or safely fallen back to verified native video demonstration.
   */
  public resolveSignDemonstration(signId: string): AvatarDemonstrationResolution {
    const verifiedEntry = this.dictionary.getEntryById(signId);

    if (!verifiedEntry) {
      return {
        signId,
        arabicPhrase: 'غير معروف',
        renderMode: 'unsupported_sign',
        visualMediaUrl: '',
        hasValid3dAnimation: false,
        proceduralAslRejected: true,
        justificationEn: 'Sign is not in the expert-reviewed dictionary. Zero fake signs are generated.',
        justificationAr: 'الإشارة غير مسجلة في القاموس المعتمد، ويمتنع النظام عن توليد إشارات وهمية.',
      };
    }

    const motionTrack = this.verifiedMotionTracks.get(signId);

    // If a verified, expert-approved 3D motion sequence is available:
    if (motionTrack && motionTrack.isExpertApproved && motionTrack.sourceType !== 'unverified_procedural_asl') {
      return {
        signId,
        arabicPhrase: verifiedEntry.arabicPhrase,
        renderMode: '3d_avatar_validated',
        visualMediaUrl: `/animations/validated/${motionTrack.trackId}.json`,
        hasValid3dAnimation: true,
        proceduralAslRejected: false,
        justificationEn: 'Demonstrated via verified, expert-approved 3D motion capture track.',
        justificationAr: 'يتم العرض بواسطة مسار حركة ثلاثي الأبعاد معتمد ومطابق للحركة الحقيقية.',
        verifiedSignEntry: verifiedEntry,
      };
    }

    // MANDATORY ETHICAL FALLBACK:
    // When accurate 3D animation is unavailable, switch to verified video demonstration
    // instead of pretending procedural ASL hand curls represent fluent Egyptian signing!
    return {
      signId,
      arabicPhrase: verifiedEntry.arabicPhrase,
      renderMode: 'video_demonstration_fallback',
      visualMediaUrl: verifiedEntry.videoDemonstrationUrl,
      hasValid3dAnimation: false,
      proceduralAslRejected: true,
      justificationEn:
        'Accurate 3D sign animation is currently unavailable for this entry. Safe fallback to verified expert video demonstration is enforced; procedural ASL approximations are strictly rejected.',
      justificationAr:
        'الرسوم المتحركة ثلاثية الأبعاد الدقيقة غير متوفرة بعد لهذه الإشارة. تم تفعيل العرض المرئي الآمن بواسطة فيديو حقيقي معتمد، مع حظر توليد حركات عشوائية مشوهة.',
      verifiedSignEntry: verifiedEntry,
    };
  }

  public getRegisteredTracksCount(): number {
    return this.verifiedMotionTracks.size;
  }
}
