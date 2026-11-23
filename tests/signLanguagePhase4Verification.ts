/**
 * Rafiqi — Phase 4: Egyptian Sign Language Research & Dataset Foundation Verification Suite
 *
 * Verifies:
 * 1. Genuine peer-reviewed academic literature catalog (Abdel-Fattah, Hartzell, Elhagry, Nile Univ).
 * 2. Official national dictionaries & institutional curriculum references (MCIT, NCPD, Amal Schools).
 * 3. Regional and dialectal variation documentation across Egyptian governorates.
 * 4. Comprehensive dataset schema & annotation validation contracts.
 * 5. Participatory expert collaboration workflow with Deaf native signer veto and consensus rules.
 * 6. Video quality auditing and Cohen's Kappa inter-annotator agreement calculation.
 * 7. Strict signer-independent dataset splitting invariant (zero data leakage between signers).
 * 8. Ethical consent checklists and GDPR cascade deletion on consent revocation.
 * 9. Honest Model Readiness Assessment (TRL 2, doesRecognitionModelExist === false).
 */

import {
  EslResearchCatalog,
  type AcademicResearchEntry,
} from '../src/modules/hearAndExpress/signLanguage/researchCatalog';
import {
  validateEslAnnotation,
  validateSignerIndependentSplit,
  type EslSignAnnotation,
  type EslVideoRecord,
  type EslSignerProfile,
} from '../src/modules/hearAndExpress/signLanguage/datasetSchema';
import {
  ExpertCollaborationWorkflow,
  type ReviewVote,
} from '../src/modules/hearAndExpress/signLanguage/expertCollaborationWorkflow';
import { DataQualityAndEthicsEngine } from '../src/modules/hearAndExpress/signLanguage/dataQualityAndEthics';
import { ModelReadinessAssessment } from '../src/modules/hearAndExpress/signLanguage/modelReadinessAssessment';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

export async function runSignLanguagePhase4Verification(): Promise<{ passed: number; failed: number }> {
  console.log('\n[Phase 4] Egyptian Sign Language Research & Dataset Foundation Verification Suite\n');

  // =========================================================================
  // Section 1: Academic Research Catalog & Grounding
  // =========================================================================
  console.log('Section 1: Academic Research Catalog & Reference Verification');
  const publications = EslResearchCatalog.ACADEMIC_PUBLICATIONS;
  assert(publications.length >= 4, 'Catalog contains multiple peer-reviewed academic publications on ESL');

  // Check Abdel-Fattah (2005)
  const abdelFattah = publications.find((p) => p.id === 'abdel_fattah_2005');
  assert(Boolean(abdelFattah), 'Foundational paper by Mahmoud A. Abdel-Fattah (2005) is cataloged');
  assert(abdelFattah!.publicationVenue.includes('Oxford University Press'), 'Abdel-Fattah published in Oxford Journal of Deaf Studies');
  assert(abdelFattah!.keyLinguisticOrTechnicalFindings.some((f) => f.includes('distinct national languages')), 'Affirms ESL is a distinct national language, rejecting ASL substitution');

  // Check Hartzell (2021)
  const hartzell = publications.find((p) => p.id === 'hartzell_variation_2021');
  assert(Boolean(hartzell), 'Ethan Hartzell (UT Austin 2021) dissertation on ESL variation is cataloged');
  assert(hartzell!.doiOrUrl.includes('repositories.lib.utexas.edu'), 'Contains authentic UT Austin repository URI');
  assert(hartzell!.keyLinguisticOrTechnicalFindings.some((f) => f.includes('numeral systems')), 'Documents multiple numeral systems in Egyptian Sign Language');

  // Check Commercial Licensing Disclosure
  const licensingDisclosure = EslResearchCatalog.getCommercialLicensingDisclosure();
  assert(licensingDisclosure.isCommercialDatasetAvailable === false, 'Strict disclosure: No commercial ESL video dataset currently available globally');
  assert(licensingDisclosure.currentMarketRealityEn.includes('CC-BY-NC'), 'Discloses that academic datasets are restricted to non-commercial use');
  assert(licensingDisclosure.currentMarketRealityAr.includes('لغة الإشارة الأمريكية'), 'Arabic disclosure explicitly rejects ASL substitution as fraudulent');

  // =========================================================================
  // Section 2: Official National Dictionaries & Standards
  // =========================================================================
  console.log('\nSection 2: Official National Dictionaries & Curriculum References');
  const dictionaries = EslResearchCatalog.OFFICIAL_DICTIONARIES;
  assert(dictionaries.length >= 3, 'Catalog contains 3 official sign language reference standards');

  const mcitDict = dictionaries.find((d) => d.id === 'egyptian_unified_dictionary_mcit');
  assert(Boolean(mcitDict), 'Unified Egyptian Sign Language Dictionary (MCIT / MOE / NCPD) is cataloged');
  assert(mcitDict!.lexiconSize >= 10000, 'MCIT Egyptian dictionary catalogs over 10,000 signs');
  assert(mcitDict!.publishingBodies.some((b) => b.includes('المجلس القومي للأشخاص ذوي الإعاقة')), 'Endorsed by National Council for Persons with Disabilities');

  const amalCurriculum = dictionaries.find((d) => d.id === 'amal_schools_curriculum_egypt');
  assert(Boolean(amalCurriculum), 'Amal Schools for the Deaf curriculum standard is cataloged');
  assert(amalCurriculum!.lexiconSize >= 4000, 'Amal Schools lexicon catalogs academic signs');

  // =========================================================================
  // Section 3: Regional & Dialectal Variations
  // =========================================================================
  console.log('\nSection 3: Regional & Dialectal Variations in Egypt');
  const regionalDocs = EslResearchCatalog.DOCUMENTED_REGIONAL_VARIATIONS;
  assert(regionalDocs.length >= 4, 'Catalogs documented lexical variations across Egyptian regions');

  const num5 = regionalDocs.find((d) => d.conceptAr.includes('خمسة'));
  assert(Boolean(num5), 'Documents numeral 5 divergence between Cairo (open palm) and Alexandria/Upper Egypt');
  assert(num5!.linguisticFactor === 'numeral_system', 'Categorized under numeral_system linguistic factor');

  const hospital = regionalDocs.find((d) => d.conceptAr === 'مستشفى');
  assert(Boolean(hospital), 'Documents "Hospital" sign divergence across Cairo, Alexandria, and Upper Egypt');

  const whereParticle = regionalDocs.find((d) => d.conceptAr.includes('أين'));
  assert(Boolean(whereParticle), 'Documents question particle "Where?" variation and grammatical facial markers');

  // =========================================================================
  // Section 4: Dataset Schema & Annotation Contracts
  // =========================================================================
  console.log('\nSection 4: Dataset Schema & Annotation Contracts');

  const validAnnotation: EslSignAnnotation = {
    annotationId: 'ann_cai_001',
    videoUniqueId: 'vid_esl_cai_001',
    startFrameIndex: 15,
    endFrameIndex: 75,
    startTimeSeconds: 0.5,
    endTimeSeconds: 2.5,
    arabicGloss: 'مدرسة',
    arabicMeaningDefinition: 'مؤسسة تعليمية يتعلم فيها الطلاب',
    signType: 'isolated_lexical',
    primaryDialect: 'cairo_metropolitan',
    isAlternativeVariant: false,
    phonology: {
      handshapeClassification: 'flat_B',
      palmOrientation: 'toward_signer',
      primaryLocation: 'chest',
      movementTrajectory: 'repetitive_oscillating',
      twoHandedSymmetry: 'two_handed_symmetric',
      hamnosysCode: '',
    },
    nonManualFeatures: ['neutral', 'mouth_morpheme'],
    mouthingArabicSpokenWord: 'مدرسة',
    confidenceRating: 5,
    annotatorPseudonymId: 'ann_expert_03',
    reviewStatus: 'deaf_verified',
  };

  const validationResult = validateEslAnnotation(validAnnotation);
  assert(validationResult.isValid === true, 'Valid ESL annotation passes schema validation');
  assert(validationResult.errors.length === 0, 'Zero errors reported for valid annotation');

  // Test invalid annotation (end frame before start frame)
  const invalidAnnotation: EslSignAnnotation = {
    ...validAnnotation,
    startFrameIndex: 100,
    endFrameIndex: 50,
  };
  const invalidResult = validateEslAnnotation(invalidAnnotation);
  assert(invalidResult.isValid === false, 'Detects invalid frame range where endFrameIndex < startFrameIndex');
  assert(invalidResult.errors.some((e) => e.includes('Invalid frame range')), 'Reports explicit frame range error');

  // =========================================================================
  // Section 5: Expert Collaboration & Deaf Veto Workflow
  // =========================================================================
  console.log('\nSection 5: Expert Collaboration & Deaf Veto Workflow');
  const workflow = new ExpertCollaborationWorkflow();
  const experts = workflow.getRegisteredExperts();

  assert(experts.length >= 5, 'Workflow panel contains all 4 required stakeholder roles');
  assert(experts.some((e) => e.role === 'deaf_native_signer'), 'Includes Deaf native signers');
  assert(experts.some((e) => e.role === 'certified_sign_interpreter'), 'Includes certified Egyptian sign language interpreters');
  assert(experts.some((e) => e.role === 'deaf_accessibility_specialist'), 'Includes Deaf accessibility specialists');
  assert(experts.some((e) => e.role === 'sign_language_cv_researcher'), 'Includes computer vision researchers');

  // Test consensus evaluation with Deaf approval (2 Deaf signers, 1 Interpreter, 1 CV researcher)
  const approvedVotes: ReviewVote[] = [
    {
      reviewerId: 'exp_deaf_cai_01',
      reviewerRole: 'deaf_native_signer',
      isApproved: true,
      handshapeAccuracyScore: 5,
      movementAccuracyScore: 5,
      nonManualFeaturesAccuracyScore: 4,
      naturalnessScore: 5,
      timestamp: new Date().toISOString(),
    },
    {
      reviewerId: 'exp_deaf_alex_02',
      reviewerRole: 'deaf_native_signer',
      isApproved: true,
      handshapeAccuracyScore: 4,
      movementAccuracyScore: 4,
      nonManualFeaturesAccuracyScore: 4,
      naturalnessScore: 4,
      timestamp: new Date().toISOString(),
    },
    {
      reviewerId: 'exp_interp_cert_03',
      reviewerRole: 'certified_sign_interpreter',
      isApproved: true,
      handshapeAccuracyScore: 5,
      movementAccuracyScore: 5,
      nonManualFeaturesAccuracyScore: 5,
      naturalnessScore: 5,
      timestamp: new Date().toISOString(),
    },
    {
      reviewerId: 'exp_cv_researcher_05',
      reviewerRole: 'sign_language_cv_researcher',
      isApproved: true,
      handshapeAccuracyScore: 4,
      movementAccuracyScore: 4,
      nonManualFeaturesAccuracyScore: 4,
      naturalnessScore: 4,
      timestamp: new Date().toISOString(),
    },
  ];

  const consensusApproved = workflow.evaluateAnnotationConsensus('ann_cai_001', approvedVotes);
  assert(consensusApproved.isConsensusReached === true, 'Consensus successfully reached with Deaf and Interpreter approval');
  assert(consensusApproved.finalDecision === 'accepted_into_corpus', 'Annotation accepted into corpus');
  assert(consensusApproved.participatingDeafSignersCount === 2, 'Verified participation of at least 2 Deaf native signers');

  // Test consensus rejection when Deaf native signers are absent (e.g. only engineers voted)
  const rejectedNonDeafVotes: ReviewVote[] = [
    {
      reviewerId: 'exp_interp_cert_03',
      reviewerRole: 'certified_sign_interpreter',
      isApproved: true,
      handshapeAccuracyScore: 5,
      movementAccuracyScore: 5,
      nonManualFeaturesAccuracyScore: 4,
      naturalnessScore: 4,
      timestamp: new Date().toISOString(),
    },
    {
      reviewerId: 'exp_cv_researcher_05',
      reviewerRole: 'sign_language_cv_researcher',
      isApproved: true,
      handshapeAccuracyScore: 5,
      movementAccuracyScore: 5,
      nonManualFeaturesAccuracyScore: 4,
      naturalnessScore: 4,
      timestamp: new Date().toISOString(),
    },
  ];

  const consensusRejected = workflow.evaluateAnnotationConsensus('ann_cai_002', rejectedNonDeafVotes);
  assert(consensusRejected.isConsensusReached === false, 'Strict Deaf Veto: Rejects consensus when fewer than 2 Deaf signers participated');
  assert(consensusRejected.finalDecision === 'needs_re_recording', 'Flags for re-review or re-recording');

  // =========================================================================
  // Section 6: Video Quality Audit & Cohen's Kappa
  // =========================================================================
  console.log('\nSection 6: Video Quality Audit & Cohen\'s Kappa Calculation');
  const qualityEngine = new DataQualityAndEthicsEngine();

  const highQualityVideo: EslVideoRecord = {
    videoId: 'vid_001',
    videoFilename: 'signer_01_gloss_01.mp4',
    storageUri: 'esl_corpus/signer_01/vid_001.mp4',
    durationSeconds: 3.2,
    resolution: { width: 1920, height: 1080, fps: 60 },
    lightingQuality: 'controlled_studio',
    backgroundType: 'uniform_chroma_dark',
    handVisibilityScore: 0.95,
    faceVisibilityScore: 0.92,
    upperBodyVisibilityScore: 0.90,
    signerPseudonymId: 'signer_01',
    datasetSplitAssignment: 'train',
    license: 'CC-BY-NC-4.0',
    sourceInstitution: 'Rafiqi ESL Research Consortium',
    annotations: [validAnnotation],
  };

  const highQualityAudit = qualityEngine.auditVideoQuality(highQualityVideo);
  assert(highQualityAudit.isAcceptable === true, 'High-quality 1080p 60fps studio video passes quality audit');
  assert(highQualityAudit.qualityIssues.length === 0, 'Zero quality issues found');

  const lowQualityVideo: EslVideoRecord = {
    ...highQualityVideo,
    resolution: { width: 640, height: 480, fps: 15 },
    handVisibilityScore: 0.60,
  };
  const lowQualityAudit = qualityEngine.auditVideoQuality(lowQualityVideo);
  assert(lowQualityAudit.isAcceptable === false, 'Rejects low-resolution, low-framerate video with occluded hands');
  assert(lowQualityAudit.qualityIssues.length >= 3, 'Accurately diagnoses resolution, fps, and hand occlusion issues');

  // Test Cohen's Kappa calculation
  const annotatorA = ['مدرسة', 'مستشفى', 'مدرسة', 'شارع', 'سلام'];
  const annotatorB = ['مدرسة', 'مستشفى', 'مدرسة', 'شارع', 'سلام'];
  const perfectKappa = qualityEngine.calculateCohensKappa(annotatorA, annotatorB);
  assert(perfectKappa === 1.0, 'Cohen\'s Kappa returns 1.0 for perfect inter-annotator agreement');

  const annotatorBDivergent = ['مدرسة', 'مستشفى', 'شارع', 'شارع', 'مرحبا'];
  const divergentKappa = qualityEngine.calculateCohensKappa(annotatorA, annotatorBDivergent);
  assert(divergentKappa > 0 && divergentKappa < 1.0, `Calculates realistic fractional Kappa (${divergentKappa}) for divergent labels`);

  // =========================================================================
  // Section 7: Signer-Independent Split & Zero Leakage Invariant
  // =========================================================================
  console.log('\nSection 7: Signer-Independent Partitioning & Zero Leakage Invariant');

  const sampleSigners: EslSignerProfile[] = [
    { signerPseudonymId: 'signer_cai_01', ageCohort: '26_35', gender: 'female', deafStatus: 'prelingually_deaf', acquisitionAge: 'native_from_birth', primaryRegionalOrigins: ['cairo_metropolitan'], yearsSigningExperience: 25, consentGranted: true, consentTier: 'open_research_educational', consentDate: '2026-01-15', revocationAllowed: true },
    { signerPseudonymId: 'signer_cai_02', ageCohort: '36_50', gender: 'male', deafStatus: 'prelingually_deaf', acquisitionAge: 'native_from_birth', primaryRegionalOrigins: ['cairo_metropolitan'], yearsSigningExperience: 30, consentGranted: true, consentTier: 'open_research_educational', consentDate: '2026-01-16', revocationAllowed: true },
    { signerPseudonymId: 'signer_alex_03', ageCohort: '18_25', gender: 'female', deafStatus: 'prelingually_deaf', acquisitionAge: 'early_childhood_under_6', primaryRegionalOrigins: ['alexandria_coastal'], yearsSigningExperience: 18, consentGranted: true, consentTier: 'open_research_educational', consentDate: '2026-01-17', revocationAllowed: true },
    { signerPseudonymId: 'signer_alex_04', ageCohort: '26_35', gender: 'male', deafStatus: 'postlingually_deaf', acquisitionAge: 'school_age', primaryRegionalOrigins: ['alexandria_coastal'], yearsSigningExperience: 14, consentGranted: true, consentTier: 'open_research_educational', consentDate: '2026-01-18', revocationAllowed: true },
    { signerPseudonymId: 'signer_asyut_05', ageCohort: '36_50', gender: 'male', deafStatus: 'prelingually_deaf', acquisitionAge: 'native_from_birth', primaryRegionalOrigins: ['upper_egypt_south'], yearsSigningExperience: 32, consentGranted: true, consentTier: 'open_research_educational', consentDate: '2026-01-19', revocationAllowed: true },
  ];

  const sampleVideos: EslVideoRecord[] = sampleSigners.map((s, idx) => ({
    ...highQualityVideo,
    videoId: `vid_${idx + 1}`,
    signerPseudonymId: s.signerPseudonymId,
  }));

  const splitResult = qualityEngine.generateSignerIndependentSplit(sampleVideos, sampleSigners);
  assert(splitResult.isSignerDisjoint === true, 'Generated partition is strictly signer-disjoint');
  assert(splitResult.trainSigners.length > 0, 'Train partition contains signers');
  assert(splitResult.testSigners.length > 0, 'Test partition contains distinct signers');

  // Verify with invariant validator
  const splitCheck = validateSignerIndependentSplit({
    trainSignerIds: splitResult.trainSigners,
    validationSignerIds: splitResult.valSigners,
    testSignerIds: splitResult.testSigners,
  });
  assert(splitCheck.isCompliant === true, 'Signer-Independent split validator confirms zero data leakage');
  assert(splitCheck.leakedSignerIds.length === 0, 'Zero leaked signers identified');

  // Test detection of contaminated split (data leakage)
  const contaminatedSplitCheck = validateSignerIndependentSplit({
    trainSignerIds: ['signer_cai_01', 'signer_cai_02'],
    validationSignerIds: ['signer_alex_03'],
    testSignerIds: ['signer_cai_01', 'signer_asyut_05'], // LEAK: signer_cai_01 is in both Train and Test!
  });
  assert(contaminatedSplitCheck.isCompliant === false, 'Strictly flags data leakage when a signer appears in Train and Test sets');
  assert(contaminatedSplitCheck.leakedSignerIds.includes('signer_cai_01'), 'Accurately identifies the leaked signer ID');

  // =========================================================================
  // Section 8: Ethical Consent & Cascade Deletion on Revocation
  // =========================================================================
  console.log('\nSection 8: Ethical Consent & Cascade Deletion on Revocation');

  const corpusState = {
    signers: [...sampleSigners],
    videos: [...sampleVideos],
  };

  const initialVideosCount = corpusState.videos.length;
  const initialSignersCount = corpusState.signers.length;

  const targetDeletionSignerId = 'signer_alex_03';
  const deletionResult = qualityEngine.executeConsentRevocationDeletion(targetDeletionSignerId, corpusState);

  assert(deletionResult.success === true, 'Cascade deletion executed successfully upon consent revocation');
  assert(deletionResult.purgedVideosCount === 1, 'Purged exactly 1 video belonging to the revoked signer');
  assert(corpusState.signers.length === initialSignersCount - 1, 'Signer profile permanently removed from active registry');
  assert(corpusState.videos.every((v) => v.signerPseudonymId !== targetDeletionSignerId), 'Zero lingering videos from revoked signer in active corpus');

  // =========================================================================
  // Section 9: Model Readiness Assessment (TRL & Strict Truthfulness)
  // =========================================================================
  console.log('\nSection 9: Model Readiness Assessment & Scientific Truthfulness');
  const auditReport = ModelReadinessAssessment.assessCurrentReadiness();

  assert(auditReport.overallTrl === 'TRL_2_Technology_Concept_Formulated', 'Assigned accurate Technology Readiness Level: TRL 2');
  assert(auditReport.doesRecognitionModelExist === false, 'Strict invariant: doesRecognitionModelExist is FALSE at Phase 4');
  assert(auditReport.isDeployableToProduction === false, 'Strict invariant: isDeployableToProduction is FALSE');
  assert(auditReport.foundationStatusStatementEn.includes('No recognition model exists at this stage'), 'English statement explicitly confirms no recognition model exists');
  assert(auditReport.foundationStatusStatementAr.includes('لا يوجد أي نموذج ذكاء اصطناعي للتعرف على الإشارات في هذه المرحلة'), 'Arabic statement explicitly confirms no model exists at this stage');
  assert(auditReport.prerequisitesForModelTraining.length >= 4, 'Specifies clear empirical prerequisites required before model training');

  console.log(`\nSign Language Phase 4 Verification: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

// Direct execution support
if (process.argv[1]?.includes('signLanguagePhase4Verification')) {
  runSignLanguagePhase4Verification().then(({ passed, failed }) => {
    if (failed > 0) process.exit(1);
  });
}
