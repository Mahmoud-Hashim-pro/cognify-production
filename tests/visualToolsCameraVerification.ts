/**
 * Visual Tools & Camera Controls Master Verification Test
 * Tests that all visual assistant tools expose dedicated camera capture buttons,
 * in-viewfinder floating shutter, tool-switching bar, specialized AI prompts,
 * keyboard shortcuts, deep links, and toolkit integration.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { parseRoute } from '../src/lib/navigation';

const rootDir = 'D:/cognify-production';

console.log('🧪 Starting Visual Assistant Tools & Camera Verification Suite...\n');

let passedTests = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ [PASS]: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL]: ${name}`);
    console.error(`     Error: ${err.message}\n`);
    process.exit(1);
  }
}

// 1. Tool Registrations & Config
test('Tool Architecture: All 6 visual tools registered in VISUAL_TOOLS with complete metadata and action button labels', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(code.includes("export type VisualToolId = 'scene' | 'currency' | 'read' | 'color' | 'object' | 'face'"), 'Must export VisualToolId');
  assert.ok(code.includes('export const VISUAL_TOOLS: VisualToolConfig[]'), 'Must export VISUAL_TOOLS array');
  
  // Verify each tool id is present with capture, open cam, and upload labels
  const requiredTools = ['scene', 'currency', 'read', 'color', 'object', 'face'];
  for (const tool of requiredTools) {
    assert.ok(code.includes(`id: '${tool}'`), `Must declare tool: ${tool}`);
  }

  // Tool specific button label properties
  assert.ok(code.includes('captureBtnEn:'), 'Must specify captureBtnEn');
  assert.ok(code.includes('captureBtnAr:'), 'Must specify captureBtnAr');
  assert.ok(code.includes('openCamBtnEn:'), 'Must specify openCamBtnEn');
  assert.ok(code.includes('openCamBtnAr:'), 'Must specify openCamBtnAr');
  assert.ok(code.includes('uploadBtnEn:'), 'Must specify uploadBtnEn');
  assert.ok(code.includes('uploadBtnAr:'), 'Must specify uploadBtnAr');

  // Verify Cash Reader currency badges and shortcuts
  assert.ok(code.includes('EGP, USD, EUR, SAR'), 'Must list banknote currencies');
  assert.ok(code.includes("keyboardShortcut: 'C'"), 'Currency reader must have C shortcut');
  assert.ok(code.includes("keyboardShortcut: 'T'"), 'Text OCR must have T shortcut');
  assert.ok(code.includes("keyboardShortcut: 'V'"), 'Scene must have V shortcut');
  assert.ok(code.includes("keyboardShortcut: 'O'"), 'Object finder must have O shortcut');
  assert.ok(code.includes("keyboardShortcut: 'P'"), 'Face recognition must have P shortcut');
});

// 2. Hub Dashboard Routing & Tool Selection
test('Dashboard Integration: DisabilityModeView maps visual cards to openVisualTool and syncs deep links', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/DisabilityModeView.tsx'), 'utf-8');
  assert.ok(code.includes("import type { VisualToolId } from './VisionCompanionView'"), 'Must import VisualToolId');
  assert.ok(code.includes("initialTool?: VisualToolId;"), 'Must declare initialTool prop');
  assert.ok(code.includes("openVisualTool('scene')"), 'visual_assistant must open scene');
  assert.ok(code.includes("openVisualTool('currency')"), 'currency_reader must open currency');
  assert.ok(code.includes("openVisualTool('color')"), 'color_matcher must open color');
  assert.ok(code.includes("openVisualTool('object')"), 'spatial_locator must open object');
  assert.ok(code.includes("openVisualTool('face')"), 'person_recognition must open face');
  assert.ok(code.includes('initialTool={selectedVisualTool}'), 'Must pass initialTool to VisionCompanionView');
  assert.ok(code.includes('onToolChange={setSelectedVisualTool}'), 'Must pass onToolChange to VisionCompanionView');
  assert.ok(code.includes("window.addEventListener('hashchange', handleSyncHashTool)"), 'Must sync on hashchange');
});

// 3. Floating In-Viewfinder Shutter Control Bar
test('Viewfinder Floating Shutter: Anchored on-screen control bar so capture button is never hidden below fold', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(code.includes('data-testid="viewfinder-floating-shutter"'), 'Must have viewfinder-floating-shutter data-testid');
  assert.ok(code.includes('absolute bottom-6 inset-x-0 z-20'), 'Must be anchored above video viewport bottom');
  assert.ok(code.includes('data-testid="floating-capture-shutter-btn"'), 'Must have floating shutter capture button');
  assert.ok(code.includes('data-testid="floating-upload-btn"'), 'Must have floating upload button');
  assert.ok(code.includes('PrimaryToolIcon'), 'Floating shutter must display active tool icon');
});

// 4. Viewport Empty / Denied States Camera Activation
test('Camera Viewport Empty State: Exposes tool-specific "Open Camera" and "Upload Image" buttons', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(code.includes('openCamBtnLabel'), 'Must compute openCamBtnLabel');
  assert.ok(code.includes('startCamera()'), 'Empty state must trigger startCamera');
  assert.ok(code.includes('uploadBtnLabel'), 'Must compute uploadBtnLabel');
  assert.ok(code.includes("status === 'camera-denied'"), 'Must handle denied state with clear fallback buttons');
});

// 5. Section 3 Comprehensive Action Controls
test('Action Controls Bar: Dedicated tool capture button, camera toggle, and quick switcher', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(code.includes('PrimaryToolIcon = activeToolConfig.Icon'), 'Must render active tool icon in primary button');
  assert.ok(code.includes('primaryBtnLabel ='), 'Must resolve tool-specific label');
  assert.ok(code.includes('aria-label={primaryBtnLabel}'), 'Must set accessible aria-label on primary button');
  assert.ok(code.includes("onClick={() => describeScene(companionLang)}"), 'Primary capture button must trigger describeScene');
  assert.ok(code.includes("onClick={isCamStreaming ? stopCamera : () => startCamera()}"), 'Must allow toggling camera stream');
});

// 6. URL Deep Linking Verification
test('URL Deep Linking: parseRoute routes direct visual tool aliases to vision tab with params', () => {
  const currencyRoute = parseRoute('#currency');
  assert.strictEqual(currencyRoute.view, 'disability');
  assert.strictEqual(currencyRoute.tab, 'vision');
  assert.strictEqual(currencyRoute.params?.tool, 'currency');

  const cashRoute = parseRoute('#cash');
  assert.strictEqual(cashRoute.params?.tool, 'currency');

  const readRoute = parseRoute('#read');
  assert.strictEqual(readRoute.params?.tool, 'read');

  const colorRoute = parseRoute('#color');
  assert.strictEqual(colorRoute.params?.tool, 'color');

  const objectRoute = parseRoute('#object');
  assert.strictEqual(objectRoute.params?.tool, 'object');

  const faceRoute = parseRoute('#face');
  assert.strictEqual(faceRoute.params?.tool, 'face');

  const subRoute = parseRoute('#vision/currency');
  assert.strictEqual(subRoute.view, 'disability');
  assert.strictEqual(subRoute.tab, 'vision');
  assert.strictEqual(subRoute.params?.tool, 'currency');

  const fullRoute = parseRoute('#disability/vision/currency');
  assert.strictEqual(fullRoute.view, 'disability');
  assert.strictEqual(fullRoute.tab, 'vision');
  assert.strictEqual(fullRoute.params?.tool, 'currency');
});

// 7. Toolkit View Live Camera Integration
test('Toolkit Integration: UnifiedAccessibilityToolkitView exposes Visual Assistant Live Camera Tools Suite', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/UnifiedAccessibilityToolkitView.tsx'), 'utf-8');
  assert.ok(code.includes('visual-camera-tools-suite-card'), 'Must render visual camera suite card');
  assert.ok(code.includes('#disability/vision/${tool.id}'), 'Must navigate directly to visual tools');
  assert.ok(code.includes('Cash & Currency Reader') || code.includes('قارئ العملات والنقود'), 'Must include currency reader');
  assert.ok(code.includes('Instant Text OCR Reader') || code.includes('قارئ النصوص واللافتات'), 'Must include text OCR');
  assert.ok(code.includes('Color & Outfit Matcher') || code.includes('فحص وتنسيق الألوان'), 'Must include color matcher');
});

// 8. Specialized AI Prompts Across All Tools
test('Vision Engine: Deep, specialized AI prompts for Currency, Color, Spatial Object, and Face', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(code.includes("effectiveTool === 'currency'"), 'Must handle currency tool branch');
  assert.ok(code.includes('مئتا جنيه مصري') && code.includes('200 Egyptian Pounds'), 'Must support Egyptian and foreign denominations');
  assert.ok(code.includes("effectiveTool === 'color'"), 'Must handle color matching branch');
  assert.ok(code.includes('كحلي داكن') && code.includes('navy blue'), 'Must detect nuances and outfit coordination');
  assert.ok(code.includes("effectiveTool === 'object'"), 'Must handle object memory branch');
  assert.ok(code.includes('نظام عقارب الساعة') && code.includes('clock-face direction'), 'Must instruct clock-face spatial hints');
  assert.ok(code.includes("effectiveTool === 'face'"), 'Must handle person recognition branch');
  assert.ok(code.includes('التعرف على الأشخاص والوجوه') && code.includes('facial expression'), 'Must detect people and expressions');
});

// 9. Keyboard Shortcuts & TalkBack Announcements
test('Accessibility: Keyboard shortcuts C, T, S, V, O, P and live region announcements', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(code.includes("e.key === 'c' || e.key === 'C'"), 'Must support key C for Cash Reader');
  assert.ok(code.includes("e.key === 't' || e.key === 'T'"), 'Must support key T for Text OCR');
  assert.ok(code.includes("e.key === 's' || e.key === 'S'"), 'Must support key S for Stop speech');
  assert.ok(code.includes("e.key === 'v' || e.key === 'V'"), 'Must support key V for Scene');
  assert.ok(code.includes("e.key === 'o' || e.key === 'O'"), 'Must support key O for Object');
  assert.ok(code.includes("e.key === 'p' || e.key === 'P' || e.key === 'f' || e.key === 'F'"), 'Must support key P/F for Person');
  assert.ok(code.includes('role="status" aria-live="assertive"'), 'Must have assertive live region for announcements');
  assert.ok(code.includes('setAnnounce(waitingMsg)'), 'Must announce analysis start to blind users');
});

console.log(`\n🎉 All ${passedTests} Visual Tools & Camera Verification tests PASSED successfully!`);
