/**
 * Multimodal Intelligence Pipeline Comprehensive Verification Suite
 *
 * Verifies:
 * 1. Cross-modal semantic fusion (speech + camera vision -> coherent intent)
 * 2. Cross-modal fusion with accessibility switch / eye-gaze target
 * 3. Trilingual summary synthesis (English, Arabic, French)
 * 4. Modality-aware response generation (text, speech narration, visual cards, sensory cues)
 * 5. Speech narration natural voice sanitization via cleanForSpeech
 * 6. Visual cards synthesis (diagrams, code blocks, step flows)
 * 7. Graceful degradation when camera or mic is offline / blocked
 * 8. Sensor resilience and cognitive stage / pedagogy adaptation
 */

import {
  fuseMultimodalInput,
  synthesizeModalityAwareResponse,
  handleGracefulDegradation,
} from '../src/lib/multimodalIntelligenceEngine.js';

import type {
  MultimodalInput,
  FusedMultimodalIntent,
} from '../src/types/multimodal.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  }
}

async function runSuite() {
  console.log('\n============================================================');
  console.log('🌐 RUNNING MULTIMODAL INTELLIGENCE PIPELINE VERIFICATION');
  console.log('============================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Cross-modal fusion (Speech "what is this?" + Camera vision)
  // -------------------------------------------------------------------------
  console.log('--- Test 1: Cross-Modal Fusion (Speech + Vision) ---');
  const input1: MultimodalInput = {
    uid: 'student_101',
    speechTranscript: 'what is this?',
    visionFrame: {
      description: 'Binary Search Tree node insertion',
      detectedObjects: ['binary_tree', 'node', 'pointer'],
    },
    context: {
      currentView: 'sandbox',
      activeConceptId: 'bst_insert',
      language: 'en',
    },
  };

  const fused1 = fuseMultimodalInput(input1);
  assert(
    fused1.primaryIntent.toLowerCase().includes('binary search tree node insertion'),
    `Primary intent captures vision subject: "${fused1.primaryIntent}"`
  );
  assert(
    fused1.primaryIntent.startsWith('Explain'),
    `Deictic "what is this?" resolved to explanatory intent: "${fused1.primaryIntent}"`
  );
  assert(
    fused1.inputModalities.includes('speech') && fused1.inputModalities.includes('vision'),
    'Input modalities correctly identify speech and vision'
  );
  assert(
    fused1.requiresVisualAid === true,
    'Visual aid is flagged as required when camera vision frame is present'
  );
  assert(
    fused1.requiresAudioNarration === true,
    'Audio narration is flagged as required when input contains speech'
  );
  assert(
    fused1.confidence >= 0.85,
    `Confidence is high for corroborated multi-sensor input: ${fused1.confidence}`
  );

  // -------------------------------------------------------------------------
  // TEST 2: Cross-modal fusion with Accessibility Switch / Eye Gaze Target
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Fusion with Accessibility Eye-Gaze Focus ---');
  const input2: MultimodalInput = {
    uid: 'student_a11y',
    speechTranscript: 'Explain how this works',
    visionFrame: {
      description: 'Binary Search Tree node insertion',
    },
    a11yInput: {
      modality: 'eye_gaze',
      targetElement: 'root node',
      dwellTimeMs: 1200,
    },
    context: {
      currentView: 'learning',
      language: 'en',
      cognitiveStage: 'Concrete',
    },
  };

  const fused2 = fuseMultimodalInput(input2);
  assert(
    fused2.primaryIntent === 'Explain Binary Search Tree root node insertion',
    `Gaze target successfully qualifies node: "${fused2.primaryIntent}"`
  );
  assert(
    fused2.inputModalities.includes('speech') &&
    fused2.inputModalities.includes('vision') &&
    fused2.inputModalities.includes('a11y'),
    'Fused input modalities contain speech, vision, and a11y'
  );
  assert(
    fused2.requiresVisualAid === true,
    'Requires visual aid is true for gaze target & vision frame'
  );
  assert(
    fused2.requiresAudioNarration === true,
    'Requires audio narration is true for spoken request'
  );
  assert(
    fused2.suggestedPedagogy === 'worked_example',
    `Concrete stage / visual requirement suggests worked_example pedagogy: ${fused2.suggestedPedagogy}`
  );

  // -------------------------------------------------------------------------
  // TEST 3: Trilingual Summaries (EN, AR, FR)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Trilingual Summaries (EN, AR, FR) ---');
  assert(
    fused2.fusedDescriptionEn.includes('Binary Search Tree root node insertion') &&
    fused2.fusedDescriptionEn.includes('root node'),
    `English summary includes qualified subject and target: "${fused2.fusedDescriptionEn}"`
  );
  assert(
    fused2.fusedDescriptionAr.includes('شجرة البحث الثنائية') &&
    fused2.fusedDescriptionAr.includes('عقدة الجذر'),
    `Arabic summary contains accurate technical translation: "${fused2.fusedDescriptionAr}"`
  );
  assert(
    fused2.fusedDescriptionFr.includes('arbre binaire de recherche') &&
    fused2.fusedDescriptionFr.includes('nœud racine'),
    `French summary contains accurate technical translation: "${fused2.fusedDescriptionFr}"`
  );

  // -------------------------------------------------------------------------
  // TEST 4: Modality-Aware Response Generation
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Modality-Aware Response Generation ---');
  const rawLlmResponse = [
    '**Scene Description:** Binary Search Tree structure.',
    '**Hazards:** None detected.',
    'To insert a value into the BST starting at the root node, we perform comparison traversal:',
    '',
    '```typescript',
    'function insertRoot(root: TreeNode | null, val: number): TreeNode {',
    '  if (!root) return new TreeNode(val);',
    '  if (val < root.val) root.left = insertRoot(root.left, val);',
    '  else root.right = insertRoot(root.right, val);',
    '  return root;',
    '}',
    '```',
    '',
    '```mermaid',
    'graph TD',
    '  A[50 Root] --> B[30 Left]',
    '  A --> C[70 Right]',
    '```',
  ].join('\n');

  const response = synthesizeModalityAwareResponse(
    rawLlmResponse,
    fused2,
    { activePedagogy: 'worked_example' },
    { accessibilityMode: 'Speech' }
  );

  assert(
    response.textResponse.includes('To insert a value into the BST'),
    'Text response retains primary pedagogical explanation'
  );
  assert(
    response.speechNarration !== undefined,
    'Speech narration is generated when audio narration is required'
  );
  assert(
    !response.speechNarration?.includes('**Scene Description:**') &&
    !response.speechNarration?.includes('**Hazards:** None detected.'),
    'Speech narration is cleaned of robotic boilerplate headers via cleanForSpeech'
  );
  assert(
    response.visualCards !== undefined && response.visualCards.length >= 2,
    `Visual cards extracted from response: count=${response.visualCards?.length}`
  );

  const codeCard = response.visualCards?.find((c) => c.type === 'code');
  assert(
    codeCard !== undefined && codeCard.content.includes('insertRoot'),
    'Code visual card extracted with TypeScript snippet'
  );

  const diagramCard = response.visualCards?.find((c) => c.type === 'diagram');
  assert(
    diagramCard !== undefined && diagramCard.content.includes('graph TD'),
    'Diagram visual card extracted with Mermaid graph'
  );

  assert(
    response.sensoryCues?.hapticPattern === 'confirm',
    'Haptic pattern confirm emitted for accessibility user'
  );
  assert(
    response.sensoryCues?.highContrastBadge !== undefined,
    `High contrast badge emitted for accessibility target: "${response.sensoryCues?.highContrastBadge}"`
  );

  // -------------------------------------------------------------------------
  // TEST 5: Domain Fallback Visual Cards (BST & State Machine)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: Domain Fallback Visual Cards Synthesis ---');
  const plainTextResponse = 'Binary Search Tree insertion recursively traverses left or right based on key comparison.';
  const responseWithSyntheticCards = synthesizeModalityAwareResponse(
    plainTextResponse,
    fused2
  );

  assert(
    responseWithSyntheticCards.visualCards !== undefined &&
    responseWithSyntheticCards.visualCards.length >= 3,
    'Synthetic visual cards generated (diagram, code, and step_flow) when rawText lacks markdown blocks'
  );
  const syntheticDiagram = responseWithSyntheticCards.visualCards?.find((c) => c.type === 'diagram');
  const syntheticCode = responseWithSyntheticCards.visualCards?.find((c) => c.type === 'code');
  const syntheticSteps = responseWithSyntheticCards.visualCards?.find((c) => c.type === 'step_flow');
  assert(syntheticDiagram !== undefined, 'Synthetic ASCII / structural diagram card generated');
  assert(syntheticCode !== undefined, 'Synthetic implementation code card generated');
  assert(syntheticSteps !== undefined, 'Synthetic step flow sequence card generated');

  // -------------------------------------------------------------------------
  // TEST 6: Graceful Sensor Degradation
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: Graceful Sensor Degradation ---');

  // Case 6a: Both sensors online
  const degBothOnline = handleGracefulDegradation({ camera: true, mic: true });
  assert(
    degBothOnline.degraded === false && degBothOnline.fallbackModality === 'full_multimodal',
    'Full multimodal modality reported when both camera and microphone are online'
  );

  // Case 6b: Camera offline, mic online
  const degCameraOffline = handleGracefulDegradation({ camera: false, mic: true });
  assert(
    degCameraOffline.degraded === true &&
    degCameraOffline.fallbackModality === 'voice_and_text' &&
    degCameraOffline.message.includes('voice and text'),
    'Degrades cleanly to voice and text when camera is offline'
  );

  // Case 6c: Camera online, mic offline
  const degMicOffline = handleGracefulDegradation({ camera: true, mic: false });
  assert(
    degMicOffline.degraded === true &&
    degMicOffline.fallbackModality === 'vision_and_text' &&
    degMicOffline.message.includes('camera vision'),
    'Degrades cleanly to camera vision and text when mic is offline'
  );

  // Case 6d: Both offline
  const degBothOffline = handleGracefulDegradation({ camera: false, mic: false });
  assert(
    degBothOffline.degraded === true &&
    degBothOffline.fallbackModality === 'text_and_keyboard' &&
    degBothOffline.message.includes('keyboard'),
    'Degrades cleanly to keyboard and text interface when all sensors are offline'
  );

  // Case 6e: Undefined / null sensor resilience (zero exceptions)
  const degNullResilience = handleGracefulDegradation(undefined as any);
  assert(
    degNullResilience.degraded === true &&
    degNullResilience.fallbackModality === 'text_and_keyboard',
    'Handles undefined availableSensors safely without throwing runtime errors'
  );

  // -------------------------------------------------------------------------
  // TEST 7: Pedagogy & Cognitive Stage Adaptation
  // -------------------------------------------------------------------------
  console.log('\n--- Test 7: Pedagogy & Cognitive Stage Adaptation ---');
  const inputSensorimotor: MultimodalInput = {
    uid: 'child_1',
    text: 'Show me trees',
    context: {
      currentView: 'discovery',
      language: 'en',
      cognitiveStage: 'Sensorimotor',
    },
  };
  const fusedSensori = fuseMultimodalInput(inputSensorimotor);
  assert(
    fusedSensori.suggestedPedagogy === 'analogies',
    `Sensorimotor stage suggests analogies pedagogy: "${fusedSensori.suggestedPedagogy}"`
  );

  const inputFormal: MultimodalInput = {
    uid: 'college_1',
    text: 'Analyze BST asymptotic complexity',
    context: {
      currentView: 'theory',
      language: 'en',
      cognitiveStage: 'Formal',
    },
  };
  const fusedFormal = fuseMultimodalInput(inputFormal);
  assert(
    fusedFormal.suggestedPedagogy === 'advanced_rigor',
    `Formal stage suggests advanced_rigor pedagogy: "${fusedFormal.suggestedPedagogy}"`
  );

  // -------------------------------------------------------------------------
  // TEST 8: Accessibility Switch with Dwell Time
  // -------------------------------------------------------------------------
  console.log('\n--- Test 8: Single-Switch Modality Input ---');
  const inputSwitch: MultimodalInput = {
    uid: 'switch_user',
    a11yInput: {
      modality: 'switch',
      targetElement: 'execute_button',
      dwellTimeMs: 800,
    },
    context: {
      currentView: 'assessment',
      language: 'fr',
    },
  };
  const fusedSwitch = fuseMultimodalInput(inputSwitch);
  assert(
    fusedSwitch.inputModalities.includes('a11y'),
    'Switch input is recognized as a11y modality'
  );
  assert(
    fusedSwitch.requiresAudioNarration === true,
    'Switch assistive interaction prompts audio narration confirmation'
  );
  assert(
    fusedSwitch.fusedDescriptionFr.includes('ciblant "execute_button"'),
    `French summary includes switch target: "${fusedSwitch.fusedDescriptionFr}"`
  );

  // -------------------------------------------------------------------------
  // TEST 9: Text-Only Minimal Interaction
  // -------------------------------------------------------------------------
  console.log('\n--- Test 9: Text-Only Baseline Interaction ---');
  const inputTextOnly: MultimodalInput = {
    uid: 'text_user',
    text: 'What is memoization?',
    context: {
      currentView: 'chat',
      language: 'en',
    },
  };
  const fusedTextOnly = fuseMultimodalInput(inputTextOnly);
  assert(
    fusedTextOnly.inputModalities.length === 1 && fusedTextOnly.inputModalities[0] === 'text',
    'Only text modality detected for text-only input'
  );
  assert(
    fusedTextOnly.requiresAudioNarration === false,
    'Audio narration is false for plain text query'
  );
  assert(
    fusedTextOnly.requiresVisualAid === false,
    'Visual aid is false for plain conceptual question'
  );

  const textOnlyResponse = synthesizeModalityAwareResponse(
    'Memoization is an optimization technique that caches results.',
    fusedTextOnly
  );
  assert(
    textOnlyResponse.speechNarration === undefined,
    'Speech narration is omitted when not required'
  );
  assert(
    textOnlyResponse.visualCards === undefined,
    'Visual cards omitted when visual aid is not needed'
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`📊 RESULTS: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    console.error(`❌ Suite failed with ${failedTests} failures.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passedTests} MULTIMODAL INTELLIGENCE PIPELINE TESTS PASSED (100%)!`);
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error('Unhandled exception in verification suite:', err);
  process.exit(1);
});
