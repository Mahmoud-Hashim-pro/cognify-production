/**
 * Rafiqi UI Redesign — Phase 2 Welcome, Authentication & Accessible Onboarding Verification
 * 
 * Verifies:
 * 1. Welcome Experience: Approved Arabic headline, English tagline, Arabic brand message,
 *    platform explanation, and A11y brand identity.
 * 2. Adaptive Design & Theme Integration: ThemeSelector (Light/Dark/System) in header,
 *    EN/AR language switch, desktop split layout (lg:grid-cols-12), and mobile stacked layout.
 * 3. Authentication Forms & Validation: 8-character password constraint, password match confirmation,
 *    password visibility toggle with ARIA states, reset password recovery, and error alerts.
 * 4. Complete Guest Access Removal & Authentication Gate: Verification that all guest entry points,
 *    buttons, and state bypasses are removed, and protected routes require full authentication.
 * 5. Accessible Onboarding: Non-mandatory disability disclosure, progressive 5-step flow,
 *    language & dialect preferences (Egyptian Arabic, MSA, English), theme & high contrast,
 *    speech rate, description detail, skip-to-dashboard, and back navigation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { isAdminUser, isSuperAdminUser, isPermanent } from '../src/lib/roles';
import { UserProfile, AccessibilityPassport } from '../src/types';

export async function runPhase2AuthAndOnboardingVerification(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ PASS: ${message}`);
    } else {
      failed++;
      errors.push(message);
      console.error(`  ❌ FAILED: ${message}`);
    }
  }

  console.log('\n================================================================');
  console.log('--- Rafiqi Redesign Phase 2: Welcome, Auth & Onboarding Audit ---');
  console.log('================================================================');

  const projectRoot = process.cwd();
  const loginPath = path.resolve(projectRoot, 'src/components/Login.tsx');
  const onboardingPath = path.resolve(projectRoot, 'src/components/Onboarding.tsx');
  const appPath = path.resolve(projectRoot, 'src/App.tsx');

  assert(fs.existsSync(loginPath), 'src/components/Login.tsx must exist');
  assert(fs.existsSync(onboardingPath), 'src/components/Onboarding.tsx must exist');
  assert(fs.existsSync(appPath), 'src/App.tsx must exist');

  const loginCode = fs.readFileSync(loginPath, 'utf8');
  const onboardingCode = fs.readFileSync(onboardingPath, 'utf8');
  const appCode = fs.readFileSync(appPath, 'utf8');

  // ── [Section 1] Welcome Experience & Approved Brand Identity ──
  console.log('\n--- [Section 1] Welcome Experience & Approved Brand Identity ---');

  // Approved Arabic headline
  assert(
    loginCode.includes('العالم أقرب إليك') && loginCode.includes('خطوة بخطوة'),
    'Login.tsx must display approved Arabic headline: "العالم أقرب إليك، خطوة بخطوة."'
  );

  // Approved English tagline
  assert(
    loginCode.includes('Your Everyday Accessibility Companion'),
    'Login.tsx must display approved English tagline: "Your Everyday Accessibility Companion"'
  );

  // Approved Arabic brand message
  assert(
    loginCode.includes('رفيقك في الحياة، والتعلم، والعمل'),
    'Login.tsx must display approved Arabic brand message: "رفيقك في الحياة، والتعلم، والعمل."'
  );

  // Brand glyph and A11y badge
  assert(
    loginCode.includes('A11y') && (loginCode.includes('رفيقي') || loginCode.includes('Rafiqi')),
    'Login.tsx must display Rafiqi brand identity with A11y accessibility badge'
  );

  // Platform concise explanation
  assert(
    loginCode.includes('multimodal') || loginCode.includes('seeing, reading, creating, moving, and communicating') ||
    loginCode.includes('الرؤية، القراءة، العمل، التنقل، والتواصل'),
    'Login.tsx must include concise explanation of assistive AI platform'
  );

  // 3 Capability pillars
  assert(
    loginCode.includes('Accessible by Design') || loginCode.includes('تصميم ميسر للجميع'),
    'Login.tsx must present Accessible by Design capability pillar'
  );
  assert(
    loginCode.includes('Multimodal AI') || loginCode.includes('ذكاء اصطناعي متعدد الوسائط'),
    'Login.tsx must present Multimodal AI capability pillar'
  );
  assert(
    loginCode.includes('Privacy First') || loginCode.includes('الخصوصية أولاً'),
    'Login.tsx must present Privacy First capability pillar'
  );

  // ── [Section 2] Adaptive Design System & Layout ──
  console.log('\n--- [Section 2] Adaptive Design System & Layout ---');

  // Split layout on desktop
  assert(
    loginCode.includes('lg:grid-cols-12') && loginCode.includes('lg:col-span-7') && loginCode.includes('lg:col-span-5'),
    'Login.tsx must implement premium split layout on desktop (12-column grid: 7 cols brand, 5 cols card)'
  );

  // ThemeSelector integrated in header
  assert(
    loginCode.includes('<ThemeSelector') && loginCode.includes("variant=\"compact\""),
    'Login.tsx must embed ThemeSelector in header supporting Light, Dark, and System modes'
  );

  // Language switcher in header
  assert(
    loginCode.includes("setLang('ar')") && loginCode.includes("setLang('en')"),
    'Login.tsx must provide accessible EN / AR language switch in header'
  );

  // Adaptive background and text tokens for Light and Dark
  assert(
    loginCode.includes('bg-slate-50 dark:bg-[#071426]') && loginCode.includes('text-slate-900 dark:text-[#F8FAFC]'),
    'Login.tsx must use adaptive background and text tokens supporting both Light and Dark themes'
  );

  // Accessible touch target sizing
  assert(
    loginCode.includes('min-h-[48px]') || loginCode.includes('min-h-[44px]'),
    'Login.tsx must ensure interactive buttons satisfy minimum 44px/48px touch targets'
  );

  // ── [Section 3] Authentication Logic & Security Policies ──
  console.log('\n--- [Section 3] Authentication Logic & Security Policies ---');

  // Firebase auth methods preserved
  assert(
    loginCode.includes('loginWithEmail(') &&
    loginCode.includes('registerWithEmail(') &&
    loginCode.includes('signInWithGoogle(') &&
    loginCode.includes('sendPasswordResetEmail('),
    'Login.tsx must preserve all official Firebase authentication handlers without inventing methods'
  );

  // Password validation: minimum 8 characters
  assert(
    loginCode.includes('password.length < 8') &&
    (loginCode.includes('Password must be at least 8 characters') || loginCode.includes('8 خانات على الأقل')),
    'Login.tsx must enforce minimum 8-character password constraint'
  );

  // Password confirmation match validation
  assert(
    loginCode.includes('password !== confirmPassword') &&
    (loginCode.includes("Passwords don't match") || loginCode.includes('غير متطابقتين')),
    'Login.tsx must enforce password match validation in registration mode'
  );

  // Email normalization
  assert(
    loginCode.includes('.trim().toLowerCase()'),
    'Login.tsx must normalize email addresses (trim whitespace and lowercase)'
  );

  // Password visibility toggle with ARIA states
  assert(
    loginCode.includes('setShowPassword(!showPassword)') &&
    loginCode.includes('aria-pressed={showPassword}') &&
    loginCode.includes('aria-label='),
    'Login.tsx must include password show/hide toggle with aria-pressed and aria-label attributes'
  );

  // Accessible error alerts
  assert(
    loginCode.includes('role="alert"') && loginCode.includes('AlertCircle'),
    'Login.tsx must render authentication errors with role="alert" for assistive technologies'
  );

  // Loading states
  assert(
    loginCode.includes('Loader2') && loginCode.includes('animate-spin') && loginCode.includes('disabled={loading}'),
    'Login.tsx must provide loading spinners and disable buttons during authentication requests'
  );

  // ── [Section 4] Complete Guest Access Removal & Strict Authentication Gating ──
  console.log('\n--- [Section 4] Complete Guest Access Removal & Strict Authentication Gating ---');

  // Complete removal of Guest Access UI elements from Login.tsx
  assert(
    !loginCode.includes('Guest Access') &&
    !loginCode.includes('معاينة بدون حساب') &&
    !loginCode.includes('onDirectPreview'),
    'Login.tsx must completely remove all Guest Access entry points, buttons, and direct preview props'
  );

  // Strict unauthenticated access gating in App.tsx
  assert(
    !appCode.includes('handleEnterGuestPreview') &&
    !appCode.includes('cognify_guest_preview') &&
    !appCode.includes('isGuestPreview'),
    'App.tsx must completely remove guest preview handlers and guest session state'
  );

  assert(
    appCode.includes('if (!user) {') && appCode.includes('<Login />'),
    'App.tsx must strictly enforce authenticated access for all protected views'
  );

  // Security test: Unauthenticated or empty profiles must NEVER satisfy admin checks
  assert(!isAdminUser(null as any), 'Unauthenticated null profile must NOT satisfy isAdminUser check');
  assert(!isSuperAdminUser(null as any), 'Unauthenticated null profile must NOT satisfy isSuperAdminUser check');

  // ── [Section 5] Accessible Onboarding (Progressive, Optional, Non-Disclosing) ──
  console.log('\n--- [Section 5] Accessible Onboarding ---');

  // Non-mandatory disability disclosure
  assert(
    onboardingCode.includes('لا يلزم أي إثبات طبي') ||
    onboardingCode.includes('No medical proof required') ||
    onboardingCode.includes('Universal Access & Privacy Guarantee'),
    'Onboarding.tsx must guarantee universal access without requiring medical proof or disability disclosure'
  );

  // Step 1: Language & Dialect preferences
  assert(
    onboardingCode.includes('ar-EG') && onboardingCode.includes('ar-MSA'),
    'Onboarding.tsx must offer Egyptian Arabic (ar-EG) and Modern Standard Arabic (ar-MSA) dialect options'
  );

  // Audio test voice feature
  assert(
    onboardingCode.includes('Test Voice') || onboardingCode.includes('تجربة الصوت'),
    'Onboarding.tsx must provide a voice testing feature during language selection'
  );

  // Step 2: Display & Appearance (Theme, High Contrast, Font Scaling, Reduce Motion)
  assert(
    onboardingCode.includes('<ThemeSelector') &&
    onboardingCode.includes('highContrast') &&
    onboardingCode.includes('fontSizeScale') &&
    onboardingCode.includes('reduceMotion'),
    'Onboarding.tsx must offer Theme, High Contrast, Font Scaling, and Reduce Motion display controls'
  );

  // Step 3: Audio & Speech preferences (Speech Rate, Description Depth, Auto-Read)
  assert(
    onboardingCode.includes('speechRate') &&
    onboardingCode.includes('descriptionDetail') &&
    onboardingCode.includes('autoSpeak'),
    'Onboarding.tsx must offer Speech Rate, Description Depth, and Auto-Read audio preferences'
  );

  // Step 4: Optional Assistive Modes
  assert(
    onboardingCode.includes('Visual Companion') || onboardingCode.includes('المساعد البصري'),
    'Onboarding.tsx must offer optional Visual Companion mode'
  );
  assert(
    onboardingCode.includes('Captions & Sign') || onboardingCode.includes('التفريغ ولغة الإشارة'),
    'Onboarding.tsx must offer optional Captions & Sign mode'
  );
  assert(
    onboardingCode.includes('Speech & AAC') || onboardingCode.includes('التواصل والـ AAC'),
    'Onboarding.tsx must offer optional Speech & AAC mode'
  );
  assert(
    onboardingCode.includes('Comprehensive') || onboardingCode.includes('الوصول الشامل'),
    'Onboarding.tsx must offer Comprehensive / General Learner mode'
  );

  // Global: Skip setup button on every step
  assert(
    onboardingCode.includes('Skip for now') || onboardingCode.includes('تخطي الآن') || onboardingCode.includes('Skip to Dashboard'),
    'Onboarding.tsx must provide an accessible skip action allowing immediate dashboard entry'
  );

  // Global: Back button on every step
  assert(
    onboardingCode.includes('handlePrevStep') && (onboardingCode.includes('Back') || onboardingCode.includes('السابق')),
    'Onboarding.tsx must provide a back button allowing users to revisit earlier steps'
  );

  // Setting persistence into accessibilityPassport
  assert(
    onboardingCode.includes('accessibilityPassport') &&
    onboardingCode.includes('onComplete('),
    'Onboarding.tsx must persist configured preferences through the official accessibilityPassport structure'
  );

  // Review step informs user of future edits in Section 6 (Personalize)
  assert(
    onboardingCode.includes('Personalize') || onboardingCode.includes('التخصيص'),
    'Onboarding.tsx must inform users that preferences can be adjusted anytime in Section 6 (Personalize)'
  );

  console.log('\n================================================================');
  console.log(`Phase 2 Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  return { passed, failed, errors };
}
