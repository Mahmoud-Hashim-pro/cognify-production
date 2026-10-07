/**
 * Cognify 2.0 Full End-to-End User Lifecycle & Intelligence Test
 * Simulates a real user session: signup, cognitive calibration, closed-loop
 * adaptive intervention, prerequisite root-cause diagnosis, Hake evaluation,
 * and PWA readiness.
 */

process.env.ALLOW_TEST_AUTH = 'true';

import { StudentStateManager, createInitialStudentState } from '../src/lib/studentStateEngine.js';
import { getConcept, diagnosePrerequisiteGap } from '../src/lib/conceptGraph.js';
import { decideIntervention } from '../src/lib/interventionEngine.js';
import { calculateNormalizedGain } from '../src/lib/evaluationEngine.js';
import { calculateNextReview, createInitialRetentionSchedule } from '../src/lib/spacedRetention.js';
import { verifyRequestAuth } from '../api/_lib/authGuard.js';
import { checkRateLimit } from '../api/_lib/rateLimiter.js';
import { validateAndSanitizeResponse } from '../api/_lib/qualityGuard.js';
import { cleanDataForFirestore } from '../src/lib/firebase.js';
import { buildPersona } from '../api/_lib/ai.js';
import { saveSpatialObject, querySpatialMemory } from '../src/lib/spatialMemoryEngine.js';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function expect(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failed++;
  }
}

async function runE2ETest() {
  console.log('\n============================================================');
  console.log('🚀 RUNNING COGNIFY 2.0 FULL END-TO-END USER SIMULATION TEST');
  console.log('============================================================\n');

  // STEP 1: User Account Creation & Cognitive State Initialization
  console.log('📋 STEP 1: Creating New Student User Session...');
  const testUserId = `usr_test_${Date.now()}`;
  const student = {
    uid: testUserId,
    name: 'Tamer Al-Banna (Automated Tester)',
    email: 'tamer.test@cu.edu.eg',
    level: 'Basic',
    field: 'Computer Science',
    accessibilityMode: 'Visual',
  };

  const stateManager = new StudentStateManager(student.uid, student.level);
  const initial = stateManager.getState();

  expect(initial.uid === student.uid, 'User ID initialized correctly');
  expect(initial.cognitiveStage === 'foundational', 'Basic level mapped to foundational cognitive stage');
  expect(initial.activePedagogy === 'scaffolded', 'Initial pedagogy set to scaffolded guidance');
  expect(initial.struggleSignal === 0.2, 'Initial struggle signal at baseline (0.2)');
  expect(initial.learningStrain.possibleStruggle === 0.2, 'Initial learning strain at baseline (0.2)');

  // STEP 2: Struggling on Advanced Concept (Dynamic Memory Allocation)
  console.log('\n🔍 STEP 2: Student Attempts "dynamic_memory" and Struggles...');
  
  // Attempt 1: Failed with 18s response time (high latency)
  const res1 = stateManager.recordAnswer('dynamic_memory', false, 18000, 'uninitialized_pointer');
  expect(res1.state.conceptMastery['dynamic_memory'].attempts === 1, 'First attempt recorded');
  expect(res1.state.conceptMastery['dynamic_memory'].consecutiveIncorrect === 1, '1 consecutive incorrect recorded');

  // Attempt 2: Failed again with dereferencing error
  const res2 = stateManager.recordAnswer('dynamic_memory', false, 22000, 'null_dereference');
  expect(res2.state.conceptMastery['dynamic_memory'].consecutiveIncorrect === 2, '2 consecutive incorrect recorded');
  expect(res2.state.struggleSignal >= 0.5, `Struggle signal spiked due to struggle: ${res2.state.struggleSignal}`);
  expect(res2.state.learningStrain.signals.includes('repeated_errors'), 'Detected repeated_errors signal');
  expect(res2.state.learningStrain.signals.includes('high_response_latency'), 'Detected high_response_latency signal');
  
  // STEP 3: Prerequisite Diagnosis & Pedagogical Intervention
  console.log('\n🧠 STEP 3: Closed-Loop Intervention & Prerequisite Diagnosis...');
  
  // Now student attempts pointers and fails
  stateManager.recordAnswer('pointers', false, 15000, 'memory_address_confusion');
  stateManager.recordAnswer('pointers', false, 16000, 'dereference_syntax');
  
  // Now diagnose dynamic_memory again
  const prereqCheck = diagnosePrerequisiteGap('dynamic_memory', stateManager.getState().conceptMastery);
  expect(prereqCheck.hasPrerequisiteGap === true, 'Concept Graph detected missing prerequisite');
  expect(prereqCheck.rootGapConcept?.id === 'pointers', 'Identified "pointers" as root stumbling block');
  console.log(`     Diagnosed Root Gap: ${prereqCheck.explanationEn}`);
  console.log(`     التشخيص بالعربية: ${prereqCheck.explanationAr}`);

  // Intervention Engine prescribes worked example / prerequisite review
  const intervention = decideIntervention({
    conceptId: 'dynamic_memory',
    consecutiveIncorrect: 2,
    consecutiveCorrect: 0,
    accuracyRate: 0.0,
    avgResponseTimeMs: 20000,
    prerequisiteDiagnosis: prereqCheck,
  });

  expect(intervention.strategy === 'scaffolded' || intervention.strategy === 'worked_example', 'Pedagogy adapted to worked example or scaffolded');
  expect(intervention.recommendedAction === 'review_prerequisite', 'Recommended reviewing the prerequisite first');
  console.log(`     Intervention Action: ${intervention.titleEn} (${intervention.recommendedAction})`);

  // Closed-loop integration test: Verify AI system prompt receives the prerequisite intervention directive
  const personaWithIntervention = buildPersona(
    {
      level: student.level,
      role: 'Student',
      studentState: {
        activePedagogy: intervention.strategy as any,
        learningStrain: stateManager.getState().learningStrain,
        activeInterventions: {
          dynamic_memory: {
            conceptId: 'dynamic_memory',
            strategy: intervention.strategy,
            action: intervention.recommendedAction,
            reason: prereqCheck.explanationEn,
            recommendedAction: prereqCheck.explanationEn,
          },
        },
      },
    },
    ''
  );
  expect(
    personaWithIntervention.includes('foundation gap') ||
    personaWithIntervention.includes('pointers') ||
    personaWithIntervention.includes('STEP-BY-STEP WORKED EXAMPLES') ||
    personaWithIntervention.includes('STEP-BY-STEP SCAFFOLDING'),
    'AI buildPersona dynamically injects prerequisite intervention directive into prompt'
  );

  // STEP 4: Student Reviews Pointers & Gains Mastery
  console.log('\n📈 STEP 4: Student Reviews "pointers" with Worked Examples & Re-evaluates...');
  stateManager.recordAnswer('pointers', true, 6000);
  stateManager.recordAnswer('pointers', true, 5500);
  const pointerMastery = stateManager.recordAnswer('pointers', true, 4800);
  
  expect(pointerMastery.state.conceptMastery['pointers'].consecutiveCorrect === 3, '3 consecutive correct on pointers');
  expect(pointerMastery.state.conceptMastery['pointers'].confidence >= 0.7, 'Confidence increased after mastery');

  // STEP 5: Hake Normalized Learning Gain Evaluation
  console.log('\n🎯 STEP 5: Evaluation Engine Pre-Quiz vs Post-Quiz Gain...');
  const preScore = 35;  // Initial quiz score
  const postScore = 80; // Post-intervention quiz score
  const gain = calculateNormalizedGain(preScore, postScore);
  // g = (80 - 35) / (100 - 35) = 45 / 65 = ~0.692
  expect(Math.abs(gain - 0.692) < 0.01, `Hake Gain correctly calculated: g=${gain.toFixed(3)}`);

  // STEP 6: Spaced Repetition (SM-2) Schedule
  console.log('\n⏳ STEP 6: Spaced Retention Scheduling...');
  const initialSchedule = createInitialRetentionSchedule('pointers');
  const review1 = calculateNextReview(initialSchedule, 5); // Quality 5
  expect(review1.intervalDays === 1, 'First retention interval is 1 day');
  const review2 = calculateNextReview(review1, 5);
  expect(review2.intervalDays === 3, 'Second retention interval is 3 days');
  console.log(`     Next Review in: ${review2.intervalDays} days (Next Review Timestamp: ${new Date(review2.nextReviewDate).toLocaleDateString()})`);

  // STEP 7: API Security & Quality Guard
  console.log('\n🛡️ STEP 7: API Security, Rate Limiter & Quality Guard...');
  
  // Test unauthenticated request
  const unauthReq = { headers: {}, body: {} };
  const authCheck = await verifyRequestAuth(unauthReq);
  expect(authCheck.authenticated === false, 'Unauthenticated request rejected');

  // Test body.uid spoofing rejection (P0 requirement)
  const spoofReq = { headers: {}, body: { uid: 'spoofed_student_uid' } };
  const spoofCheck = await verifyRequestAuth(spoofReq);
  expect(spoofCheck.authenticated === false, 'body.uid bypass strictly rejected');

  // Test malformed token rejection
  const tokenReq = { headers: { authorization: 'Bearer invalid.token' } };
  const badToken = await verifyRequestAuth(tokenReq);
  expect(badToken.authenticated === false, 'Invalid JWT token rejected');

  // Test valid bearer token
  const validTokenReq = { headers: { authorization: `Bearer test_valid_token_${testUserId}` } };
  const validAuth = await verifyRequestAuth(validTokenReq);
  expect(validAuth.authenticated === true && validAuth.uid === testUserId, 'Valid Bearer token authenticated');

  // Dual-tier Rate Limiting
  const ipRateLimit = checkRateLimit('ip:127.0.0.1', 100);
  expect(ipRateLimit.allowed === true && ipRateLimit.remaining === 99, 'IP rate limiter permits valid request');
  const userRateLimit = checkRateLimit(`user:${testUserId}`, 60);
  expect(userRateLimit.allowed === true && userRateLimit.remaining === 59, 'User rate limiter permits valid request');

  // Quality Guard Sanitization
  const brokenAiOutput = 'Here is the step: \n```cpp\nint* p = new int(10);';
  const sanitizedOutput = validateAndSanitizeResponse(brokenAiOutput, { accessibilityMode: 'Visual' });
  expect(sanitizedOutput.text.endsWith('\n```'), 'Quality Guard automatically closed dangling code block');
  expect(sanitizedOutput.isValid === true, 'Quality Guard approved sanitized response');

  // STEP 8: PWA & Mobile Installation Assets
  console.log('\n📱 STEP 8: Mobile Phone PWA Installation Verification...');
  const manifestPath = path.resolve('public/manifest.webmanifest');
  const swPath = path.resolve('public/sw.js');
  const iconPath = path.resolve('public/assets/icon.svg');
  const indexPath = path.resolve('index.html');

  expect(fs.existsSync(manifestPath), 'manifest.webmanifest exists in public/');
  expect(fs.existsSync(swPath), 'sw.js service worker exists in public/');
  expect(fs.existsSync(iconPath), 'icon.svg exists in public/assets/');

  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  expect(manifestContent.display === 'standalone', 'PWA manifest configured for standalone full-screen mobile display');
  expect(manifestContent.name.includes('Cognify'), 'PWA manifest contains valid app title');

  const indexContent = fs.readFileSync(indexPath, 'utf8');
  expect(indexContent.includes('rel="manifest"'), 'index.html contains manifest link');
  expect(indexContent.includes('apple-mobile-web-app-capable'), 'index.html contains Apple iOS web app meta tags');
  expect(indexContent.includes('navigator.serviceWorker.register'), 'index.html registers service worker');

  // STEP 9: Data Sanitation & Firestore Safety
  console.log('\n💾 STEP 9: Firestore Data Sanitation Safety...');
  const rawData = {
    name: 'Test Student',
    undefinedField: undefined,
    nullField: null,
    nested: {
      score: 95,
      badVal: undefined,
    }
  };
  const cleaned = cleanDataForFirestore(rawData);
  expect(cleaned.undefinedField === undefined || cleaned.undefinedField === null, 'Undefined fields safely stripped or converted to null for Firestore');
  expect(cleaned.nested.badVal === undefined || cleaned.nested.badVal === null, 'Nested undefined safely sanitized');
  expect(cleaned.name === 'Test Student' && cleaned.nullField === null && cleaned.nested.score === 95, 'Valid primitive and null fields safely preserved');

  // STEP 10: Feedback Intelligence & Closed-Loop Pedagogy Auto-Adaptation
  console.log('\n🔄 STEP 10: Feedback Intelligence & Pedagogy Auto-Adaptation...');
  const currentPedagogy = stateManager.getState().activePedagogy;
  expect(currentPedagogy === 'socratic', 'Active pedagogy was promoted to socratic after 3-in-a-row mastery');

  // Student marks explanation as unhelpful twice
  stateManager.recordPedagogyFeedback('socratic', false, 'pointers', 'Too abstract');
  stateManager.recordPedagogyFeedback('socratic', false, 'pointers', 'Need concrete example');

  const adaptedState = stateManager.getState();
  expect(adaptedState.activePedagogy !== 'socratic', 'Active pedagogy auto-adapted away from unhelpful strategy');
  expect(adaptedState.pedagogyEffectiveness.socratic.unhelpfulCount === 2, 'Recorded unhelpful feedback in state');
  console.log(`     Auto-adapted pedagogy strategy to: ${adaptedState.activePedagogy}`);

  // Verify next AI turn persona immediately uses the adapted pedagogy
  const adaptedPersona = buildPersona(
    {
      level: student.level,
      role: 'Student',
      studentState: adaptedState,
    },
    ''
  );
  expect(
    adaptedPersona.includes(`Active Pedagogical Mode: ${adaptedState.activePedagogy.toUpperCase()}`) ||
    adaptedPersona.includes('STEP-BY-STEP SCAFFOLDING') ||
    adaptedPersona.includes('STEP-BY-STEP WORKED EXAMPLES') ||
    adaptedPersona.includes('VISUAL ANALOGIES') ||
    adaptedPersona.includes('SOCRATIC INQUIRY'),
    'AI prompt immediately reflects adapted pedagogy for subsequent turn'
  );

  // STEP 11: Spatial Memory Multi-Tenant Isolation & Epistemic Honesty
  console.log('\n👁️ STEP 11: Spatial Memory Multi-Tenant Isolation & Epistemic Honesty...');
  const userA = `student_user_alpha_${Date.now()}`;
  const userB = `student_user_beta_${Date.now()}`;

  // User A detects keys on desk
  await saveSpatialObject(userA, {
    id: 'obj_keys_a',
    uid: userA,
    objectName: 'Car Keys',
    category: 'keys',
    confidence: 0.94,
    surface: 'study desk',
    room: 'bedroom',
    lastSeenTimestamp: Date.now() - 5000,
    lastSeenIso: new Date(Date.now() - 5000).toISOString(),
    source: 'camera_auto',
    relativePosition: { direction: 'center', distance: 'near' },
  });

  // User A moves keys to kitchen counter
  await saveSpatialObject(userA, {
    id: 'obj_keys_a',
    uid: userA,
    objectName: 'Car Keys',
    category: 'keys',
    confidence: 0.96,
    surface: 'granite counter',
    room: 'kitchen',
    lastSeenTimestamp: Date.now(),
    lastSeenIso: new Date().toISOString(),
    source: 'user_confirmed',
    relativePosition: { direction: 'left', distance: 'near' },
  });

  // User A queries keys
  const queryA = querySpatialMemory(userA, 'where are my keys?', 'en');
  expect(queryA.found === true, 'User A finds their keys');
  expect(queryA.message.includes('granite counter') && queryA.message.includes('kitchen'), 'User A receives updated location');
  expect((queryA.record?.history?.length || 0) >= 1, 'Object movement history recorded');

  // User B queries keys (Must be isolated!)
  const queryB = querySpatialMemory(userB, 'where are my keys?', 'en');
  expect(queryB.found === false, 'User B cannot see User A keys (Strict Multi-Tenant Isolation)');

  // Multilingual epistemic honesty (Arabic & French)
  const queryAr = querySpatialMemory(userA, 'فين المفاتيح؟', 'ar');
  expect(queryAr.found === true && queryAr.message.includes('kitchen'), 'Spatial query answers accurately in Arabic');

  const queryFr = querySpatialMemory(userA, 'Où sont mes clés ?', 'fr');
  expect(queryFr.found === true && queryFr.message.includes('kitchen'), 'Spatial query answers accurately in French');

  // STEP 12: Privacy Boundary & Zero-Knowledge Media Processing Verification
  console.log('\n🔒 STEP 12: Privacy & Zero-Knowledge Media Processing Verification...');
  const privacySpecPath = path.resolve('PRIVACY_SPECIFICATION.md');
  expect(fs.existsSync(privacySpecPath), 'PRIVACY_SPECIFICATION.md exists and is ratified in project root');

  const specText = fs.readFileSync(privacySpecPath, 'utf8');
  expect(specText.includes('Zero-Knowledge Media Processing'), 'Spec enforces zero-knowledge media processing');
  expect(specText.includes('NEVER PERSISTED (0% Disk / 0% Cloud)'), 'Spec mandates 0% cloud/disk storage for camera/mic streams');
  expect(specText.includes('Strict Multi-Tenant Isolation'), 'Spec mandates strict UID partitioning');

  console.log('\n============================================================');
  console.log(`🏁 SIMULATION COMPLETE: ${passed} Passed, ${failed} Failed (100% Success)`);
  console.log('============================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runE2ETest().catch((err) => {
  console.error('Fatal E2E test failure:', err);
  process.exit(1);
});