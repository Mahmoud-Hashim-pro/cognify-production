/**
 * Egyptian Sign Language (ESL / EgySL) Dataset Schema & Quality Specifications
 *
 * Defines the structural, phonological, and ethical metadata contracts for genuine
 * Egyptian Sign Language corpus collection, annotation, and model benchmarking.
 * Strictly adheres to Deaf community ownership and prevents ASL/synthetic substitution.
 */

export type EslRegionalDialect =
  | 'cairo_metropolitan'      // القاهرة الكبرى (القاهرة، الجيزة، القليوبية) - المركز الإداري والإعلامي
  | 'alexandria_coastal'      // الإسكندرية والساحل الشمالي
  | 'delta_lower_egypt'       // محافظات الدلتا (الغربية، الدقهلية، الشرقية، المنوفية)
  | 'upper_egypt_north'       // شمال الصعيد (بني سويف، المنيا، الفيوم)
  | 'upper_egypt_south'       // جنوب الصعيد (أسيوط، سوهاج، قنا، الأقصر، أسوان)
  | 'canal_and_sinai'         // القناة وسيناء (الإسماعيلية، السويس، بورسعيد)
  | 'oases_and_bedouin';      // الواحات والمجتمعات البدوية (سيوة، الداخلة، الخارجة)

export type SignType =
  | 'isolated_lexical'        // كلمة إشارية مفردة معزولة
  | 'continuous_sentence'     // جملة إشارية مستمرة
  | 'fingerspelling'          // تهجئة أبجدية إشارية للأعلام والمصطلحات الدخيلة
  | 'classifier_predicate'    // تراكيب تصنيفية وحركية معقدة (Classifiers)
  | 'discourse_narrative';    // سرد قصصي حر

export type NonManualFacialExpression =
  | 'neutral'
  | 'eyebrow_raised'          // رفع الحاجبين (للاستفهام الكلي نعم/لا أو الشك)
  | 'eyebrow_lowered'         // تقطيب الحاجبين (لأدوات الاستفهام الجزئي WH-Questions: أين، متى، كيف)
  | 'eyes_widened'            // اتساع العينين (للتعجب أو التأكيد)
  | 'eyes_squinted'           // تضييق العينين (للتركيز أو التخصيص)
  | 'head_nod'                // إيماءة الرأس للأمام (للإيجاب والتأكيد)
  | 'head_shake'              // هز الرأس جانباً (للنفي Grammatical Negation)
  | 'head_tilt'               // إمالة الرأس (للشرط أو التفضيل)
  | 'mouth_morpheme'          // حركات الفم الإشارية اللغوية (Mouthing / Mouth gestures)
  | 'torso_shift';            // إزاحة الجذع (للمقارنة أو تقمص الأدوار Role-Shift)

export interface EslHandshapePhonology {
  handshapeClassification: string;     // e.g., 'fist_A', 'flat_B', 'pointing_1', 'claw_5', 'curved_C'
  palmOrientation: string;              // 'toward_signer', 'away_from_signer', 'upward', 'downward', 'contralateral', 'ipsilateral'
  primaryLocation: string;              // 'neutral_space', 'forehead', 'chin', 'chest', 'contralateral_shoulder', 'non_dominant_hand'
  movementTrajectory: string;           // 'straight_linear', 'circular', 'zigzag', 'wrist_rotation', 'repetitive_oscillating'
  twoHandedSymmetry: 'one_handed' | 'two_handed_symmetric' | 'two_handed_dominant_active';
  hamnosysCode?: string;                // Hamburg Notation System representation
}

export interface EslSignAnnotation {
  annotationId: string;
  videoUniqueId: string;
  startFrameIndex: number;
  endFrameIndex: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  arabicGloss: string;                  // المقابل اللفظي الدقيق (مثال: "مدرسة", "مستشفى", "سلام عليكم")
  arabicMeaningDefinition: string;     // المعنى المفاهيمي وسياق الاستخدام
  signType: SignType;
  primaryDialect: EslRegionalDialect;
  isAlternativeVariant: boolean;
  variantNotes?: string;                // توثيق الفروق الدلالية الإقليمية
  phonology: EslHandshapePhonology;
  nonManualFeatures: NonManualFacialExpression[];
  mouthingArabicSpokenWord?: string;    // الكلمة المنطوقة المصاحبة بحركة الشفاه إن وجدت
  contextSentenceGloss?: string;        // سياق الجملة الكامل في الإشارات المستمرة
  confidenceRating: number;             // 1 to 5 scale by expert annotator
  annotatorPseudonymId: string;         // معرّف مشفّر للمدقّق اللغوي
  reviewStatus: 'draft' | 'peer_reviewed' | 'deaf_verified' | 'rejected';
}

export interface EslSignerProfile {
  signerPseudonymId: string;            // SHA-256 hashed anonymous token (e.g. 'signer_eg_cai_014')
  ageCohort: '18_25' | '26_35' | '36_50' | '51_plus';
  gender: 'female' | 'male' | 'undisclosed';
  deafStatus: 'prelingually_deaf' | 'postlingually_deaf' | 'hard_of_hearing' | 'coda_native_signer';
  acquisitionAge: 'native_from_birth' | 'early_childhood_under_6' | 'school_age' | 'late_acquisition';
  primaryRegionalOrigins: EslRegionalDialect[];
  yearsSigningExperience: number;
  consentGranted: boolean;
  consentTier: 'open_research_educational' | 'non_commercial_academic' | 'internal_validation_only';
  consentDate: string;                  // ISO 8601 string
  revocationAllowed: true;             // Strict GDPR / Ethical Invariant
}

export interface EslVideoRecord {
  videoId: string;
  videoFilename: string;
  storageUri: string;
  durationSeconds: number;
  resolution: {
    width: number;
    height: number;
    fps: number;                        // Minimum 30 fps, recommended 60 fps for fast finger movements
  };
  lightingQuality: 'controlled_studio' | 'natural_indoor' | 'varying_ambient';
  backgroundType: 'uniform_chroma_dark' | 'uniform_chroma_light' | 'natural_room';
  handVisibilityScore: number;          // 0.0 to 1.0 (checks occlusion)
  faceVisibilityScore: number;          // 0.0 to 1.0
  upperBodyVisibilityScore: number;     // 0.0 to 1.0 (verifies signing space framing)
  signerPseudonymId: string;
  datasetSplitAssignment: 'train' | 'validation' | 'test'; // Must adhere strictly to Signer-Independent Protocol
  license: string;                      // e.g. 'CC-BY-NC-SA-4.0-DeafCommunityConsortium'
  sourceInstitution: string;            // e.g. 'Rafiqi Egyptian Sign Language Research Consortium'
  annotations: EslSignAnnotation[];
}

export interface EslDatasetCorpus {
  datasetName: string;
  version: string;
  lastUpdated: string;
  descriptionAr: string;
  descriptionEn: string;
  signersCount: number;
  videosCount: number;
  totalAnnotationsCount: number;
  vocabularyLexiconSize: number;
  dialectDistribution: Record<EslRegionalDialect, number>;
  splits: {
    trainSignerIds: string[];
    validationSignerIds: string[];
    testSignerIds: string[];
  };
  ethicalComplianceCertification: {
    irbApprovalReference: string;
    deafAdvisoryBoardEndorsement: boolean;
    dataRevocationMechanismActive: boolean;
  };
}

/**
 * Validate that an annotation object fulfills all required ESL metadata standards.
 */
export function validateEslAnnotation(annotation: EslSignAnnotation): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!annotation.annotationId) errors.push('Missing annotationId');
  if (!annotation.videoUniqueId) errors.push('Missing videoUniqueId');
  if (annotation.startFrameIndex < 0 || annotation.endFrameIndex <= annotation.startFrameIndex) {
    errors.push('Invalid frame range: endFrameIndex must exceed startFrameIndex and be >= 0');
  }
  if (!annotation.arabicGloss || annotation.arabicGloss.trim().length === 0) {
    errors.push('Missing required arabicGloss annotation');
  }
  if (!annotation.arabicMeaningDefinition || annotation.arabicMeaningDefinition.trim().length === 0) {
    errors.push('Missing required arabicMeaningDefinition');
  }
  if (!annotation.phonology || !annotation.phonology.handshapeClassification) {
    errors.push('Missing phonological handshape specification');
  }
  if (!annotation.annotatorPseudonymId) {
    errors.push('Missing annotatorPseudonymId for accountability');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * STRICT SAFETY INVARIANT: Signer-Independent Split Validator.
 *
 * Verifies that no single signer's data appears across both train and test/validation sets.
 * Machine learning models in sign language often overfit to clothing, skin tone, background,
 * and personal morphological quirks. Signer-independent splitting is mathematically mandatory.
 */
export function validateSignerIndependentSplit(splits: {
  trainSignerIds: string[];
  validationSignerIds: string[];
  testSignerIds: string[];
}): { isCompliant: boolean; leakedSignerIds: string[] } {
  const trainSet = new Set(splits.trainSignerIds);
  const valSet = new Set(splits.validationSignerIds);
  const testSet = new Set(splits.testSignerIds);

  const leakedSignerIds: string[] = [];

  for (const signer of valSet) {
    if (trainSet.has(signer)) {
      leakedSignerIds.push(signer);
    }
  }

  for (const signer of testSet) {
    if (trainSet.has(signer) || valSet.has(signer)) {
      leakedSignerIds.push(signer);
    }
  }

  return {
    isCompliant: leakedSignerIds.length === 0,
    leakedSignerIds: Array.from(new Set(leakedSignerIds)),
  };
}
