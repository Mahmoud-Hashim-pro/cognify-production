import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Phase 11: Visual Polish & Micro-Interactions Verification Suite...\n');

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

const rootDir = process.cwd();

// ============================================================================
// 1. Button Consistency & Touch Ergonomics
// ============================================================================
test('Button: Standardizes variants, touch ergonomics, and WCAG focus visible rings', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/ui/Button.tsx'), 'utf-8');
  assert.ok(code.includes('min-h-[44px]'), 'Small buttons must have at least 44px min-height');
  assert.ok(code.includes('min-h-[48px]'), 'Medium buttons must have at least 48px min-height');
  assert.ok(code.includes('min-h-[56px]'), 'Large buttons must have at least 56px min-height');
  assert.ok(code.includes('#F59E0B'), 'Buttons must use high-contrast focus indicator');
  assert.ok(code.includes('data-[disabled]:opacity-50'), 'Disabled buttons must have distinct visual feedback');
  assert.ok(code.includes('aria-busy={isLoading}'), 'Loading state must expose aria-busy to assistive tech');
});

test('AriaButton & IconButton: Enforce accessible names and reduced-motion states', () => {
  const iconBtnCode = fs.readFileSync(path.join(rootDir, 'src/components/ui/IconButton.tsx'), 'utf-8');
  assert.ok(iconBtnCode.includes("'aria-label': string"), 'Accessible name must be mandatory on IconButton');
  assert.ok(iconBtnCode.includes('w-[44px] h-[44px]'), 'Small icon buttons must meet 44px touch target');
  assert.ok(iconBtnCode.includes('motion-reduce:transition-none'), 'Must respect prefers-reduced-motion');

  const ariaBtnCode = fs.readFileSync(path.join(rootDir, 'src/components/ui/AriaButton.tsx'), 'utf-8');
  assert.ok(ariaBtnCode.includes('motion-reduce:transition-none'), 'AriaButton must disable motion transitions on request');
});

// ============================================================================
// 2. Card Consistency & Surface Treatments
// ============================================================================
test('Card: Enforces consistent surface variants, borders, and tactile feedback', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/ui/Card.tsx'), 'utf-8');
  assert.ok(code.includes('variant === \'interactive\''), 'Interactive cards must be distinctly typed');
  assert.ok(code.includes('variant === \'elevated\''), 'Elevated cards must provide depth');
  assert.ok(code.includes('focus-visible:ring-2 focus-visible:ring-[#F59E0B]'), 'Interactive cards must have focus indicator');
  assert.ok(code.includes('motion-reduce:active:scale-100'), 'Must suppress scale micro-animations when motion is reduced');
});

// ============================================================================
// 3. Loading & Progress Indicators
// ============================================================================
test('LoadingSpinner: Provides screen reader announcements and reduced-motion suppression', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/ui/LoadingSpinner.tsx'), 'utf-8');
  assert.ok(code.includes('role="status"'), 'Loading spinner must have status role');
  assert.ok(code.includes('aria-live="polite"'), 'Loading spinner must expose live region');
  assert.ok(code.includes('motion-reduce:animate-none'), 'Spin animation must halt when user prefers reduced motion');
  assert.ok(code.includes('<span className="sr-only">'), 'Accessible label must be present for blind users');
});

// ============================================================================
// 4. Status Indicators: Never Rely on Color Alone
// ============================================================================
test('StatusIndicator: Enforces non-color indicators with semantic icons across all states', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/ui/StatusIndicator.tsx'), 'utf-8');
  assert.ok(code.includes('active:'), 'Active status must be defined');
  assert.ok(code.includes('processing:'), 'Processing status must be defined');
  assert.ok(code.includes('warning:'), 'Warning status must be defined');
  assert.ok(code.includes('error:'), 'Error status must be defined');
  assert.ok(code.includes('idle:'), 'Idle status must be defined');
  assert.ok(code.includes('motion-reduce:animate-none'), 'Processing icon spin must halt on reduced motion');
  assert.ok(code.includes('CheckCircle2'), 'Active state must pair with Check icon');
  assert.ok(code.includes('AlertTriangle'), 'Warning state must pair with Triangle icon');
  assert.ok(code.includes('AlertCircle'), 'Error state must pair with Alert circle icon');
});

// ============================================================================
// 5. Alert & Notification Consistency
// ============================================================================
test('Alert: Differentiates urgent alerts from status messages with WCAG roles', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/ui/Alert.tsx'), 'utf-8');
  assert.ok(code.includes("role: 'alert'"), 'Error and warning alerts must use role="alert"');
  assert.ok(code.includes("role: 'status'"), 'Info and success alerts must use role="status"');
  assert.ok(code.includes('rounded-2xl border'), 'Alerts must have consistent border and radii');
});

// ============================================================================
// 6. Empty States
// ============================================================================
test('EmptyState: Provides dignified, action-oriented empty feedback', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/ui/EmptyState.tsx'), 'utf-8');
  assert.ok(code.includes('role="region"'), 'Empty states must be semantically identified');
  assert.ok(code.includes('aria-label={title}'), 'Empty state must declare its title as landmark name');
  assert.ok(code.includes('action.label'), 'Empty states must support primary call-to-action');
});

// ============================================================================
// 7. Icon Standardization
// ============================================================================
test('FeatureIcon: Enforces geometric proportions and hides decorative icons from assistive tech', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/ui/FeatureIcon.tsx'), 'utf-8');
  assert.ok(code.includes("sm: { container: 'w-8 h-8', icon: 'w-4 h-4' }"), 'Small icon container must be 32px with 16px glyph');
  assert.ok(code.includes("md: { container: 'w-10 h-10', icon: 'w-5 h-5' }"), 'Medium icon container must be 40px with 20px glyph');
  assert.ok(code.includes("lg: { container: 'w-12 h-12', icon: 'w-6 h-6' }"), 'Large icon container must be 48px with 24px glyph');
  assert.ok(code.includes('aria-hidden="true"'), 'Decorative icons must be hidden from screen readers');
});

// ============================================================================
// 8. Form Inputs: Error, Helper & Accessibility Linking
// ============================================================================
test('Input: Binds helper and error messages via aria-describedby and role="alert"', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/ui/Input.tsx'), 'utf-8');
  assert.ok(code.includes('aria-invalid={isInvalid}'), 'Invalid state must be exposed to screen readers');
  assert.ok(code.includes('aria-describedby'), 'Input must associate with error or helper message');
  assert.ok(code.includes('role="alert"'), 'Error message must be announced immediately via role="alert"');
  assert.ok(code.includes('min-h-[44px]'), 'Input fields must satisfy touch ergonomics');
});

// ============================================================================
// 9. Reduced Motion Global Stylesheet Verification
// ============================================================================
test('Global CSS: Halts transitions and animations when prefers-reduced-motion is active', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Must include media query for reduced motion');
  assert.ok(css.includes('animation-duration: 0.01ms !important'), 'Animations must be virtually eliminated');
  assert.ok(css.includes('transition-duration: 0.01ms !important'), 'Transitions must be virtually eliminated');
  assert.ok(css.includes('scroll-behavior: auto !important'), 'Smooth scrolling must be disabled');
});

console.log(`\n🎉 All ${passedTests} Phase 11 Visual Polish verification tests PASSED successfully!`);
