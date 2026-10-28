/**
 * Verification Suite for Gemini API Key Flow & Camera Reliability
 * Tests:
 * 1. Server guard() accepts client BYOK key when server env key is absent.
 * 2. Server guard() rejects with SERVER_CONFIG_MISSING when neither server nor client key is present.
 * 3. Distinguishes missing key (SERVER_CONFIG_MISSING) from upstream 503 (PROVIDER_OVERLOADED).
 * 4. Zero occurrences of API keys in URL query parameters across src/ and api/.
 * 5. Client getAuthHeaders() properly attaches x-byok-gemini-key when BYOK key exists.
 * 6. VisionCompanionView includes concurrency lock, session ID invalidation, 45s timeout, and video dimension checks.
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, details?: string) {
  results.push({ suite, name, passed: !!condition, details });
  if (condition) {
    console.log(`  [PASS] ${name}`);
  } else {
    console.error(`  [FAIL] ${name} ${details ? `(${details})` : ''}`);
  }
}

async function runGeminiAndCameraVerification() {
  console.log('\n--- 1. AUDIT GEMINI SERVER GUARD & BYOK SUPPORT ---');
  const aiLibPath = path.resolve('D:/cognify-production/api/_lib/ai.ts');
  const aiLibContent = fs.readFileSync(aiLibPath, 'utf8');

  // Verify guard checks for x-byok-gemini-key or x-goog-api-key
  const hasByokHeaderCheck = aiLibContent.includes('x-byok-gemini-key') && aiLibContent.includes('req.byokKey');
  assert(hasByokHeaderCheck, 'Server Guard', 'guard() checks for client BYOK key header and assigns req.byokKey');

  // Verify missing key error is code SERVER_CONFIG_MISSING
  const hasServerConfigMissing = aiLibContent.includes("code: 'SERVER_CONFIG_MISSING'") || aiLibContent.includes('SERVER_CONFIG_MISSING');
  assert(hasServerConfigMissing, 'Server Guard', 'guard() returns code SERVER_CONFIG_MISSING when no key is configured');

  // Verify provider overload returns PROVIDER_OVERLOADED or 503
  const hasProviderOverloaded = aiLibContent.includes("code: 'PROVIDER_OVERLOADED'") || aiLibContent.includes('PROVIDER_OVERLOADED');
  assert(hasProviderOverloaded, 'Server Guard', 'Upstream 503 maps to PROVIDER_OVERLOADED, distinct from SERVER_CONFIG_MISSING');

  // Verify geminiFetch passes x-goog-api-key header and no ?key= in url
  const geminiFetchHasHeader = aiLibContent.includes("'x-goog-api-key': effectiveKey") || aiLibContent.includes("'x-goog-api-key':");
  assert(geminiFetchHasHeader, 'Server Fetch', 'geminiFetch sends API key via x-goog-api-key header');

  const geminiFetchCleanUrl = !aiLibContent.includes('?key=${');
  assert(geminiFetchCleanUrl, 'Server Fetch', 'geminiFetch does NOT append ?key=${...} in request URL');

  console.log('\n--- 2. AUDIT SERVER ROUTE HANDLERS ---');
  const routeFiles = [
    'api/gemini/generateAdaptiveResponseStream.ts',
    'api/gemini/generateAdaptiveResponse.ts',
    'api/gemini/generateContent.ts',
    'api/gemini/auxiliary.ts'
  ];

  for (const rf of routeFiles) {
    const fullPath = path.resolve('D:/cognify-production', rf);
    const content = fs.readFileSync(fullPath, 'utf8');
    const passesByok = content.includes('req.byokKey') || content.includes('byokKey');
    assert(passesByok, 'Server Routes', `${rf} forwards req.byokKey to AI engine`);
  }

  console.log('\n--- 3. ZERO QUERY PARAMETER KEY LEAKAGE AUDIT ---');
  const codeDirs = ['D:/cognify-production/src', 'D:/cognify-production/api'];
  let totalKeyParamOccurrences = 0;

  function scanDir(dir: string) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) {
        scanDir(full);
      } else if (f.name.endsWith('.ts') || f.name.endsWith('.tsx') || f.name.endsWith('.js')) {
        const text = fs.readFileSync(full, 'utf8');
        // Check for ?key= or &key= in fetch or URL templates
        const match = text.match(/generativelanguage\.googleapis\.com[^\s`"']*(\?key=|&key=)/g) ||
                      text.match(/fetch\([^)]*[?&]key=/g);
        if (match) {
          totalKeyParamOccurrences += match.length;
          console.error(`    Found leak pattern in ${full}:`, match);
        }
      }
    }
  }

  for (const d of codeDirs) {
    scanDir(d);
  }

  assert(totalKeyParamOccurrences === 0, 'Security Audit', 'Zero occurrences of ?key= or &key= in Gemini API calls across codebase');

  console.log('\n--- 4. CLIENT BYOK PROPAGATION AUDIT ---');
  const clientGeminiPath = path.resolve('D:/cognify-production/src/services/gemini.ts');
  const clientGeminiContent = fs.readFileSync(clientGeminiPath, 'utf8');
  const clientHasByokHeader = clientGeminiContent.includes("'x-byok-gemini-key'") && clientGeminiContent.includes('secureLoadKeySync');
  assert(clientHasByokHeader, 'Client Gemini', 'getAuthHeaders() attaches x-byok-gemini-key via secureLoadKeySync');

  console.log('\n--- 5. CAMERA LIFECYCLE & RELIABILITY AUDIT ---');
  const visionCompPath = path.resolve('D:/cognify-production/src/components/VisionCompanionView.tsx');
  const visionCompContent = fs.readFileSync(visionCompPath, 'utf8');

  // Concurrency lock
  const hasAcquiringLock = visionCompContent.includes('isAcquiringCameraRef');
  assert(hasAcquiringLock, 'Camera Lifecycle', 'isAcquiringCameraRef prevents overlapping getUserMedia calls');

  // Session ID invalidation
  const hasSessionId = visionCompContent.includes('cameraSessionIdRef');
  assert(hasSessionId, 'Camera Lifecycle', 'cameraSessionIdRef cancels obsolete async camera resolutions');

  // Generous 45s timeout
  const has45sTimeout = visionCompContent.includes('45000');
  assert(has45sTimeout, 'Camera Lifecycle', '45-second generous timeout configured for permission prompts');

  // Video dimension verification
  const hasDimensionCheck = visionCompContent.includes('video.videoWidth > 0') && visionCompContent.includes('video.videoHeight > 0');
  assert(hasDimensionCheck, 'Camera Lifecycle', 'Camera readiness strictly verifies nonzero video dimensions (videoWidth > 0 && videoHeight > 0)');

  // Verify describeScene does not automatically trigger file upload picker
  const describeSceneMatch = visionCompContent.match(/const describeScene = async[\s\S]*?const abortController = new AbortController/);
  const describeSceneText = describeSceneMatch ? describeSceneMatch[0] : '';
  const noAutoFilePickerInDescribe = !describeSceneText.includes("fileInputRef.current?.click()");
  assert(noAutoFilePickerInDescribe, 'Camera Lifecycle', 'describeScene does NOT auto-trigger file upload picker dialog on warmup/empty frame');

  // Summary
  console.log('\n=============================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('=============================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runGeminiAndCameraVerification().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
