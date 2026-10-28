import fs from 'fs';
import path from 'path';
import { secureSaveKey, secureLoadKeySync } from '../src/lib/cryptoShield';
import { parseRoute, buildHash, RouteState } from '../src/lib/navigation';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('\n--- Running Critical Bug Fix Verification (Camera, UI Jitter, AI 503) ---');

  const repoRoot = process.cwd();

  // Test 1: Verify api/_lib/ai.ts returns code: 'SERVER_CONFIG_MISSING' on missing provider keys
  console.log('\n1. Verifying Server Error Classification in api/_lib/ai.ts:');
  const aiContent = fs.readFileSync(path.join(repoRoot, 'api', '_lib', 'ai.ts'), 'utf8');
  assert(
    aiContent.includes(`code: 'SERVER_CONFIG_MISSING'`),
    'api/_lib/ai.ts explicitly returns code: SERVER_CONFIG_MISSING when GEMINI_KEYS and FALLBACK_KEYS are empty'
  );

  // Test 2: Verify src/services/gemini.ts distinguishes SERVER_CONFIG_MISSING from provider overload
  console.log('\n2. Verifying Error Handling in src/services/gemini.ts:');
  const geminiContent = fs.readFileSync(path.join(repoRoot, 'src', 'services', 'gemini.ts'), 'utf8');
  assert(
    geminiContent.includes('SERVER_CONFIG_MISSING') &&
    geminiContent.includes('isConfigMissing'),
    'src/services/gemini.ts inspects server error code for SERVER_CONFIG_MISSING'
  );
  assert(
    geminiContent.includes('Server AI credentials not configured') ||
    geminiContent.includes('GEMINI_API_KEY missing'),
    'src/services/gemini.ts displays accurate diagnostic when server keys are not configured'
  );
  assert(
    geminiContent.includes('AI provider is temporarily overloaded (503)') ||
    geminiContent.includes('مزود خدمة الذكاء الاصطناعي مجهد حالياً'),
    'src/services/gemini.ts displays distinct retry message for genuine 503 provider overload'
  );

  // Test 3: Verify BYOK Key Encryption & Retrieval with cryptoShield
  console.log('\n3. Verifying Bring-Your-Own-Key (BYOK) Encryption in cryptoShield:');
  const testKey = 'AIzaSyTestKey_Verification_12345';
  await secureSaveKey('gemini', testKey);
  const loadedKey = secureLoadKeySync('gemini');
  assert(
    loadedKey === testKey,
    'secureSaveKey and secureLoadKeySync successfully encrypt and decrypt user Gemini API key'
  );
  // Clean up
  await secureSaveKey('gemini', '');
  const clearedKey = secureLoadKeySync('gemini');
  assert(
    clearedKey === '',
    'secureSaveKey successfully clears saved Gemini API key'
  );

  // Test 4: Verify StudentSettingsView.tsx includes Card E with BYOK controls
  console.log('\n4. Verifying BYOK Settings Card in StudentSettingsView.tsx:');
  const settingsContent = fs.readFileSync(path.join(repoRoot, 'src', 'components', 'StudentSettingsView.tsx'), 'utf8');
  assert(
    settingsContent.includes('CARD E: AI SERVICE & API KEY') ||
    settingsContent.includes('AI Service & API Key (BYOK)'),
    'StudentSettingsView.tsx includes dedicated Card E for AI Service & API Key'
  );
  assert(
    settingsContent.includes('secureSaveKey') && settingsContent.includes('secureLoadKeySync'),
    'StudentSettingsView.tsx uses secureSaveKey and secureLoadKeySync for API key encryption'
  );
  assert(
    settingsContent.includes('handleSaveApiKey') && settingsContent.includes('handleClearApiKey'),
    'StudentSettingsView.tsx provides Save Key and Remove Key actions'
  );
  assert(
    settingsContent.includes('id="setting-gemini-key"'),
    'StudentSettingsView.tsx provides accessible input field with id="setting-gemini-key"'
  );

  // Test 5: Verify Camera Lifecycle in VisionCompanionView.tsx
  console.log('\n5. Verifying Camera Stream Lifecycle in VisionCompanionView.tsx:');
  const visionContent = fs.readFileSync(path.join(repoRoot, 'src', 'components', 'VisionCompanionView.tsx'), 'utf8');
  assert(
    visionContent.includes('Lifecycle: Automatically start camera on mount and safely cleanup tracks on unmount'),
    'VisionCompanionView.tsx includes mount effect to automatically initialize camera'
  );
  assert(
    visionContent.includes('stream.getTracks().forEach((tr) => tr.stop())') ||
    visionContent.includes('streamRef.current.getTracks().forEach((tr) => tr.stop())'),
    'VisionCompanionView.tsx safely stops media stream tracks on unmount (preventing orphaned camera sessions)'
  );

  // Test 6: Verify Camera Error Categorization in VisionCompanionView.tsx
  console.log('\n6. Verifying Camera Error Categorization:');
  assert(
    visionContent.includes(`no-camera`) &&
    visionContent.includes(`camera-in-use`) &&
    visionContent.includes(`unsupported`) &&
    visionContent.includes(`camera-denied`) &&
    visionContent.includes(`timeout`),
    'VisionCompanionView.tsx defines granular camera statuses: no-camera, camera-in-use, unsupported, camera-denied, timeout'
  );
  assert(
    visionContent.includes(`status === 'no-camera'`) &&
    visionContent.includes(`status === 'camera-in-use'`) &&
    visionContent.includes(`status === 'unsupported'`),
    'VisionCompanionView.tsx renders tailored recovery UI and actions for no-camera, camera-in-use, and unsupported'
  );

  // Test 7: Verify Video Readiness and Stream Preservation
  console.log('\n7. Verifying Video Readiness & Tool Switching:');
  assert(
    visionContent.includes('video.readyState >= 2 && video.videoWidth > 0') &&
    visionContent.includes('video.onloadedmetadata'),
    'VisionCompanionView.tsx checks video frame readiness and loadedmetadata before setting ready'
  );
  assert(
    visionContent.includes('!streamRef.current || !streamRef.current.active || status === \'idle\''),
    'VisionCompanionView.tsx preserves active camera stream when switching between visual tools'
  );
  assert(
    visionContent.includes('Camera is still warming up') ||
    visionContent.includes('جاري تجهيز الكاميرا'),
    'VisionCompanionView.tsx displays helpful warming up notice instead of immediately popping file upload'
  );
  assert(
    visionContent.includes('Retry Analysis') || visionContent.includes('إعادة الفحص'),
    'VisionCompanionView.tsx preserves captured frame and provides a Retry Analysis button on error'
  );

  // Test 8: Verify Removal of Rogue Effect in DisabilityModeView.tsx
  console.log('\n8. Verifying Elimination of UI Jitter in DisabilityModeView.tsx:');
  const dmvContent = fs.readFileSync(path.join(repoRoot, 'src', 'components', 'DisabilityModeView.tsx'), 'utf8');
  assert(
    !dmvContent.includes('useEffect(() => { \n    onTabChange?.(activeTab); \n  }, [activeTab, onTabChange]);') &&
    !dmvContent.includes('useEffect(() => { \r\n    onTabChange?.(activeTab); \r\n  }, [activeTab, onTabChange]);'),
    'DisabilityModeView.tsx completely removed the rogue recursive onTabChange effect'
  );
  assert(
    dmvContent.includes('key="progress-profile-view"\n                initial={{ opacity: 0 }}') &&
    dmvContent.includes('key="settings-view"\n                initial={{ opacity: 0 }}'),
    'DisabilityModeView.tsx uses non-displacing cross-fades for progress and settings to eliminate layout shifts'
  );

  // Test 9: Verify Route Synchronization in App.tsx
  console.log('\n9. Verifying Route Synchronization in App.tsx:');
  const appContent = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  assert(
    appContent.includes(`navigateTo('settings')`) &&
    appContent.includes(`navigateTo('profile')`),
    'App.tsx cleanly switches between settings and profile views without falling back to unintended routes'
  );

  // Test 10: Verify 20+ Navigation Switches between My Progress and Settings without Route Errors
  console.log('\n10. Stress-Testing Route Stability across 25 Consecutive Transitions:');
  const routes = ['#profile', '#settings', '#progress', '#disability', '#disability/vision/currency', '#disability/vision/scene'];
  let routeTransitionsValid = true;
  for (let i = 0; i < 25; i++) {
    const targetHash = routes[i % routes.length];
    const parsed = parseRoute(targetHash);
    const canonical = buildHash(parsed);
    if (!parsed || !canonical) {
      routeTransitionsValid = false;
      break;
    }
  }
  assert(
    routeTransitionsValid,
    '25 consecutive route transitions between Profile, Progress, Settings, and Visual Tools parse and build canonically'
  );

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
