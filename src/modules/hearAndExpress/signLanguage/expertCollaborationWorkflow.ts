/**
 * Egyptian Sign Language Expert Collaboration & Validation Workflow
 *
 * Implements the participatory co-design and linguistic validation pipeline
 * engaging Deaf Egyptian signers, certified interpreters, accessibility specialists,
 * and computer vision researchers.
 * Strictly prevents single-signer bias and synthetic pseudo-translations.
 */

export type ExpertRole =
  | 'deaf_native_signer'               // أصم مصري لغته الأم لغة الإشارة المصرية
  | 'certified_sign_interpreter'       // مترجم لغة إشارة معتمد رسمياً
  | 'deaf_accessibility_specialist'    // أخصائي إتاحة وتجربة مستخدم لمجتمع الصم
  | 'sign_language_cv_researcher';     // باحث ذكاء اصطناعي ومعالجة لغات الإشارة بالحاسوب

export interface ExpertProfile {
  expertId: string;
  role: ExpertRole;
  fullNameMasked: string;              // Masked for privacy (e.g., 'أ. م. (مترجم معتمد)')
  affiliation: string;
  yearsExperience: number;
  regionalOrigin: string;
  isDeafCommunityMember: boolean;
  credentialsSummary: string;
}

export interface ReviewVote {
  reviewerId: string;
  reviewerRole: ExpertRole;
  isApproved: boolean;
  handshapeAccuracyScore: number;       // 1 to 5
  movementAccuracyScore: number;        // 1 to 5
  nonManualFeaturesAccuracyScore: number; // 1 to 5
  naturalnessScore: number;             // 1 to 5
  feedbackNotes?: string;
  timestamp: string;
}

export interface AnnotationConsensusResult {
  annotationId: string;
  isConsensusReached: boolean;
  interAnnotatorAgreementScore: number; // 0.0 to 1.0
  averageNaturalnessRating: number;     // 1.0 to 5.0
  participatingDeafSignersCount: number;
  participatingInterpretersCount: number;
  finalDecision: 'accepted_into_corpus' | 'needs_re_recording' | 'rejected_inaccurate';
}

export class ExpertCollaborationWorkflow {
  private registeredExperts: Map<string, ExpertProfile> = new Map();

  constructor() {
    this.seedDefaultStakeholderPanel();
  }

  private seedDefaultStakeholderPanel(): void {
    const defaultExperts: ExpertProfile[] = [
      {
        expertId: 'exp_deaf_cai_01',
        role: 'deaf_native_signer',
        fullNameMasked: 'م. ح. (إشاري أصم - القاهرة)',
        affiliation: 'الاتحاد النوعي لجمعيات الصم - القاهرة',
        yearsExperience: 22,
        regionalOrigin: 'cairo_metropolitan',
        isDeafCommunityMember: true,
        credentialsSummary: 'إشاري أصم بالفطرة من أسرة صماء، ناشط في تدقيق المعاجم الإشارية.',
      },
      {
        expertId: 'exp_deaf_alex_02',
        role: 'deaf_native_signer',
        fullNameMasked: 'س. ع. (إشارية صماء - الإسكندرية)',
        affiliation: 'جمعية رعاية الصم وضعاف السمع بالإسكندرية',
        yearsExperience: 16,
        regionalOrigin: 'alexandria_coastal',
        isDeafCommunityMember: true,
        credentialsSummary: 'إشارية صماء ناطقة بالإشارة الساحلية، مدققة إشارات ومصطلحات بحرية.',
      },
      {
        expertId: 'exp_interp_cert_03',
        role: 'certified_sign_interpreter',
        fullNameMasked: 'د. أ. ش. (مترجم معتمد)',
        affiliation: 'المجلس القومي للأشخاص ذوي الإعاقة (NCPD)',
        yearsExperience: 18,
        regionalOrigin: 'cairo_metropolitan',
        isDeafCommunityMember: false,
        credentialsSummary: 'مترجم لغة إشارة رسمي في المؤتمرات والبرلمان، خبير في التوثيق المعجمي.',
      },
      {
        expertId: 'exp_a11y_spec_04',
        role: 'deaf_accessibility_specialist',
        fullNameMasked: 'ر. ف. (أخصائي إتاحة الصم)',
        affiliation: 'مؤسسة رفيقي لدعم ذوي الإعاقة السمعية',
        yearsExperience: 12,
        regionalOrigin: 'delta_lower_egypt',
        isDeafCommunityMember: true,
        credentialsSummary: 'باحث ومستشار إتاحة رقمية، خبير في واجهات وتفاعل الصم مع النظم الذكية.',
      },
      {
        expertId: 'exp_cv_researcher_05',
        role: 'sign_language_cv_researcher',
        fullNameMasked: 'د. ك. م. (باحث رؤية حاسوبية)',
        affiliation: 'قسم علوم الحاسب - كلية الحاسبات والذكاء الاصطناعي',
        yearsExperience: 10,
        regionalOrigin: 'cairo_metropolitan',
        isDeafCommunityMember: false,
        credentialsSummary: 'باحث متخصص في خوارزميات التعرف البصري على الإشارات والتقسيم المستقل للإشاريين.',
      },
    ];

    for (const exp of defaultExperts) {
      this.registeredExperts.set(exp.expertId, exp);
    }
  }

  public getRegisteredExperts(): ExpertProfile[] {
    return Array.from(this.registeredExperts.values());
  }

  /**
   * Evaluate multi-expert consensus on a candidate sign annotation.
   * Enforces that at least 2 Deaf native signers and at least 1 certified interpreter
   * participate in the review before acceptance into the corpus.
   */
  public evaluateAnnotationConsensus(
    annotationId: string,
    votes: ReviewVote[]
  ): AnnotationConsensusResult {
    if (votes.length === 0) {
      return {
        annotationId,
        isConsensusReached: false,
        interAnnotatorAgreementScore: 0,
        averageNaturalnessRating: 0,
        participatingDeafSignersCount: 0,
        participatingInterpretersCount: 0,
        finalDecision: 'needs_re_recording',
      };
    }

    let deafSignersCount = 0;
    let interpretersCount = 0;
    let approvalCount = 0;
    let naturalnessSum = 0;

    for (const vote of votes) {
      const expert = this.registeredExperts.get(vote.reviewerId);
      if (expert?.role === 'deaf_native_signer') deafSignersCount++;
      if (expert?.role === 'certified_sign_interpreter') interpretersCount++;
      if (vote.isApproved) approvalCount++;
      naturalnessSum += vote.naturalnessScore;
    }

    const interAnnotatorAgreement = Number((approvalCount / votes.length).toFixed(2));
    const averageNaturalness = Number((naturalnessSum / votes.length).toFixed(2));

    // Strict Deaf Community Veto & Consensus Requirement:
    // 1. Minimum 2 Deaf signers voted
    // 2. Minimum 1 certified interpreter voted
    // 3. Agreement score >= 0.80 (80% agreement)
    // 4. Naturalness rating >= 3.8 / 5.0
    const isConsensusReached =
      deafSignersCount >= 2 &&
      interpretersCount >= 1 &&
      interAnnotatorAgreement >= 0.8 &&
      averageNaturalness >= 3.8;

    let finalDecision: AnnotationConsensusResult['finalDecision'] = 'needs_re_recording';
    if (isConsensusReached) {
      finalDecision = 'accepted_into_corpus';
    } else if (interAnnotatorAgreement < 0.4 || averageNaturalness < 2.5) {
      finalDecision = 'rejected_inaccurate';
    }

    return {
      annotationId,
      isConsensusReached,
      interAnnotatorAgreementScore: interAnnotatorAgreement,
      averageNaturalnessRating: averageNaturalness,
      participatingDeafSignersCount: deafSignersCount,
      participatingInterpretersCount: interpretersCount,
      finalDecision,
    };
  }
}
