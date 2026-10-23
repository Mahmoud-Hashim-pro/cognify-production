import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { 
  isRTL, 
  isArabicLocale, 
  getTranslation, 
  localize, 
  translations 
} from '../src/lib/translations';

console.log('🧪 Starting Phase 7 Multilingual & RTL Audit Verification Suite...\n');

let passedTests = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exit(1);
  }
}

// 1. Language Detection & Direction
test('isRTL detects Arabic and Egyptian Ammiya as RTL', () => {
  assert.strictEqual(isRTL('Arabic'), true);
  assert.strictEqual(isRTL('Egyptian Ammiya'), true);
  assert.strictEqual(isRTL('English'), false);
  assert.strictEqual(isRTL('French'), false);
  assert.strictEqual(isRTL('Spanish'), false);
  assert.strictEqual(isRTL(undefined), false);
});

test('isArabicLocale identifies Arabic variants correctly', () => {
  assert.strictEqual(isArabicLocale('Arabic'), true);
  assert.strictEqual(isArabicLocale('Egyptian Ammiya'), true);
  assert.strictEqual(isArabicLocale('English'), false);
  assert.strictEqual(isArabicLocale('German'), false);
});

// 2. Localization Functions (getTranslation & localize)
test('getTranslation returns correct localized strings for core keys', () => {
  assert.strictEqual(getTranslation('English', 'appName'), 'Cognify AI');
  assert.strictEqual(getTranslation('Arabic', 'appName'), 'كوجنيفي AI');
  assert.strictEqual(getTranslation('English', 'continue'), 'Continue');
  assert.strictEqual(getTranslation('Arabic', 'continue'), 'استمرار');
  assert.strictEqual(getTranslation('Egyptian Ammiya', 'continue'), 'كمل');
  assert.strictEqual(getTranslation('Arabic', 'dashboard'), 'لوحة القيادة');
});

test('localize returns appropriate Arabic string in RTL and English in LTR', () => {
  const en = 'Back to Dashboard';
  const ar = 'العودة للوحة القيادة';
  assert.strictEqual(localize('Arabic', en, ar), ar);
  assert.strictEqual(localize('Egyptian Ammiya', en, ar), ar);
  assert.strictEqual(localize('English', en, ar), en);
});

const rootDir = process.cwd();

// 3. CSS Typography, RTL Rules, and Bidi Isolation Verification
test('src/index.css includes Arabic typography and font declarations', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
  assert.ok(css.includes('html[dir="rtl"]'), 'Missing html[dir="rtl"] block');
  assert.ok(css.includes('--font-arabic'), 'Missing --font-arabic reference');
  assert.ok(css.includes('letter-spacing: normal !important;'), 'Missing Arabic cursive ligature letter-spacing protection');
  assert.ok(css.includes('line-height: 1.65;'), 'Missing relaxed Arabic line-height for body readability');
  assert.ok(css.includes('.bidi-isolate'), 'Missing .bidi-isolate utility');
  assert.ok(css.includes('.ltr-isolate'), 'Missing .ltr-isolate utility');
  assert.ok(css.includes('.rtl-flip'), 'Missing .rtl-flip directional flip utility');
});

// 4. Component RTL Flipping Verification
test('Onboarding.tsx uses rtl:rotate-180 and logical properties', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/Onboarding.tsx'), 'utf-8');
  assert.ok(content.includes('rtl:rotate-180'), 'Onboarding.tsx missing rtl:rotate-180 on navigation arrows');
  assert.ok(content.includes('ms-auto'), 'Onboarding.tsx should use logical ms-auto instead of ml-auto');
});

test('LiveCaptions.tsx error states and buttons are localized', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/LiveCaptions.tsx'), 'utf-8');
  assert.ok(content.includes("isAr ? 'ميزة إخراج الصوت غير مدعومة"), 'Missing localized speech synthesis error');
  assert.ok(content.includes("isAr ? 'تتطلب التسميات التوضيحية المباشرة"), 'Missing localized browser support error');
  assert.ok(content.includes("ms-auto"), 'LiveCaptions error dismiss button must use logical ms-auto');
});

test('Dialog.tsx has localized dismiss label fallback for RTL', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/ui/Dialog.tsx'), 'utf-8');
  assert.ok(content.includes('effectiveDismissLabel'), 'Dialog.tsx should compute effectiveDismissLabel');
  assert.ok(content.includes('إغلاق النافذة المنبثقة'), 'Dialog.tsx should support Arabic fallback for dismissLabel');
});

test('ProfilePage.tsx language selection reflects user locale', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/ProfilePage.tsx'), 'utf-8');
  assert.ok(content.includes('isAr ? opt.nameAr : opt.nameEn'), 'ProfilePage select options should respect current language');
});

test('MockExamSimulator.tsx navigates with direction-aware chevrons', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/academic/MockExamSimulator.tsx'), 'utf-8');
  assert.ok(content.includes('ChevronLeft className="w-4 h-4 rtl:rotate-180"'), 'MockExamSimulator Previous button missing rtl:rotate-180');
  assert.ok(content.includes('ChevronRight className="w-4 h-4 rtl:rotate-180"'), 'MockExamSimulator Next button missing rtl:rotate-180');
});

test('ChatContextPanel.tsx and ChatWorkspacePanel.tsx use rtl:rotate-180 on collapsible handles', () => {
  const contextPanel = fs.readFileSync(path.join(rootDir, 'src/components/chat/ChatContextPanel.tsx'), 'utf-8');
  const workspacePanel = fs.readFileSync(path.join(rootDir, 'src/components/chat/ChatWorkspacePanel.tsx'), 'utf-8');
  assert.ok(contextPanel.includes('ChevronRight className="w-4 h-4 rtl:rotate-180'), 'ChatContextPanel missing rtl:rotate-180');
  assert.ok(workspacePanel.includes('ChevronLeft className="w-4 h-4 rtl:rotate-180'), 'ChatWorkspacePanel missing rtl:rotate-180');
});

console.log(`\n🎉 All ${passedTests} Multilingual & RTL Audit Verification tests PASSED successfully!`);
