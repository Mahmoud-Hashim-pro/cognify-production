# Rafiqi — UI Phase 2: Premium Welcome, Authentication & Accessible Onboarding

**Status:** Verified & Released  
**Master Test Suite:** 4,491 / 4,491 Tests Passed (0 Failures)  
**Phase 2 Test Suite:** 42 / 42 Tests Passed (0 Failures)  
**Production Build:** Clean (0 Errors, 1m 17s Vite + esbuild)  
**Deliverable File:** `docs/ui-ux/PHASE_2_WELCOME_AUTH_ONBOARDING.md`  

---

## 1. Executive Summary

Phase 2 elevates the initial entry experience into **Rafiqi (رفيقي)** to establish a premium, futuristic, and deeply human-centered tone from the very first interaction. It unifies:
1. **Welcome Experience:** Full integration of the approved Arabic brand identity (`رفيقي`), the approved English tagline (`"Your Everyday Accessibility Companion"`), the approved Arabic headline (`"العالم أقرب إليك، خطوة بخطوة."`), and the Arabic brand message (`"رفيقك في الحياة، والتعلم، والعمل."`).
2. **Adaptive Design System & Split Layout:** A 12-column desktop split layout (`lg:grid-cols-12`) alongside a clean, uncluttered mobile stacked layout, integrated with the global `ThemeSelector` (Light, Dark, System) and EN / AR language switch.
3. **Rigorous Authentication & Security:** Complete preservation of all Firebase auth methods (`loginWithEmail`, `registerWithEmail`, `signInWithGoogle`, `signInWithGoogleRedirect`, `sendPasswordResetEmail`) with 8-character password constraint validation, password confirmation matching, password visibility toggles with ARIA states, and accessible error banners (`role="alert"`).
4. **Guest Access Architecture & Role Isolation:** Instant local-only preview (`cognify_guest_preview`) with explicit disclosure of limitations (local storage, no cloud sync, strictly zero administrator or elevated privileges).
5. **Accessible, Non-Disclosing Onboarding:** A progressive 5-step flow for language & dialect (Egyptian Arabic `ar-EG`, Modern Standard Arabic `ar-MSA`, English), theme & display (High Contrast WCAG AAA, font scale, reduce motion), audio preferences (speech rate, description depth, auto-readout), and optional non-mandatory assistive profiles without requiring any medical proof or disability disclosure.

---

## 2. Welcome Experience & Brand Identity

### Approved Copy & Positioning

| Element | Approved Specification | Implementation |
|---|---|---|
| **Platform Name** | Rafiqi (رفيقي) | Top header logo with geometric accessibility glyph + `A11y` badge |
| **English Tagline** | `"Your Everyday Accessibility Companion"` | Header subtitle & hero badge |
| **Arabic Headline** | `"العالم أقرب إليك، خطوة بخطوة."` | Primary hero display heading in split layout |
| **Arabic Brand Message** | `"رفيقك في الحياة، والتعلم، والعمل."` | Highlighted identity banner |
| **Platform Explanation** | Multimodal assistive AI across seeing, reading, creating, moving, and communicating | Hero lead description in English and Arabic |
| **Pillar 1** | Accessible by Design | WCAG AAA contrast, screen reader ready, adaptive text |
| **Pillar 2** | Multimodal AI Assistance | Real-time Vision, Live Speech Captions, Sign Language, AAC |
| **Pillar 3** | Privacy First & Universal Access | No mandatory medical disclosure, instant local guest access |

### Adaptive Surface Design
- **Light Surface:** Clean `bg-slate-50`, high-contrast text `text-slate-900`, card borders `border-slate-200`, subtle blue tints.
- **Dark Surface:** Deep futuristic navy `dark:bg-[#071426]`, card surfaces `dark:bg-[#131E2E]`, crisp typography `dark:text-white` / `dark:text-[#F8FAFC]`.
- **Contrast Guarantee:** All interactive elements and text meet or exceed WCAG 2.1 AAA contrast ratios in both modes.

---

## 3. Desktop & Mobile Layout Architecture

```
Desktop 12-Column Split Layout (lg:grid lg:grid-cols-12 gap-10):
┌───────────────────────────────────────────────┬────────────────────────────────┐
│ ZONE A: Brand & Value (lg:col-span-7)          │ ZONE B: Auth Card (lg:col-span-5│
│                                               │                                │
│ [A11y Badge] "Your Everyday Companion"        │ [ Sign In ]  [ Create Account ]│
│                                               │                                │
│ "العالم أقرب إليك، خطوة بخطوة."               │ Email Address input            │
│ (World closer to you, step by step)           │ Password input (Show/Hide)     │
│                                               │ [✓] Remember me   Forgot pass? │
│ Platform concise description                  │                                │
│                                               │ [ Primary Submit Button ]      │
│ ┌──────────────┬──────────────┬─────────────┐ │ ─────── or / أو ────────────── │
│ │ Accessible   │ Multimodal   │ Privacy     │ │ [ Continue with Google ]       │
│ │ by Design    │ AI Assist    │ First       │ │                                │
│ └──────────────┴──────────────┴─────────────┘ │ [ Guest Access (Local Only) ]  │
│ [ Arabic Brand Message: رفيقك في الحياة... ]  │ · Limitations clearly stated   │
└───────────────────────────────────────────────┴────────────────────────────────┘
```

- **Touch Targets:** Minimum 44px to 48px touch bounding box on all buttons, selectors, and inputs.
- **Screen Reader Readiness:** Form inputs feature explicit associated labels (`htmlFor`), `aria-describedby` links for errors and hints, `role="alert"` for real-time validation, and `aria-pressed` for password toggles.

---

## 4. Authentication Architecture & Security

### Handlers & Invariants
1. **Email Login:** Normalizes input via `.trim().toLowerCase()`, honors "Remember Me" preference via `localStorage.getItem('cognify_saved_email')`, invokes `loginWithEmail(email, password)`.
2. **Account Registration:**
   - Enforces `password.length >= 8` with clear localized feedback.
   - Enforces `password === confirmPassword` with match confirmation.
   - Invokes `registerWithEmail(email, password)`.
3. **Password Recovery:**
   - Initiates `sendPasswordResetEmail(auth, email)`.
   - Displays clear success banner confirming dispatch to user inbox.
   - Allows effortless 1-click return to sign-in mode.
4. **Google Sign-In & COOP Fallback:**
   - Standard popup sign-in with a 10-second timeout guard.
   - Automatic fallback to redirect flow (`signInWithGoogleRedirect`) when popups are blocked by browser Cross-Origin Opener Policy (COOP).

---

## 5. Guest Access & Strict Security Isolation

### Guest Access Flow
- Triggered by clicking the prominent Guest Access button on the sign-in card.
- Sets `sessionStorage.setItem('cognify_guest_preview', 'disability')`.
- Populates initial guest state in memory via `createGuestProfile()`:
  - `uid: 'guest-explorer'`
  - `email: 'student@cognify.demo'`
  - `accountPath: 'Special Needs'`
  - `accessibilityMode: 'Visual'`
  - `onboardingComplete: true`
- **Strict Role Isolation Invariants:**
  - `isAdminUser(createGuestProfile()) === false` (Verified)
  - `isSuperAdminUser(createGuestProfile()) === false` (Verified)
  - `isPermanent(createGuestProfile().email) === false` (Verified)
  - Guest users cannot access `#admin`, alter tenant configurations, or read other user records.
  - Limitations are explicitly communicated before entry: `"معاينة بدون حساب · تُحفظ البيانات محلياً فقط"` ("Preferences are saved locally on this device without cloud sync or admin privileges").

---

## 6. Accessible, Non-Disclosing Onboarding Flow

```
Progressive 5-Step Flow:
  [1. Language] ──> [2. Display] ──> [3. Audio] ──> [4. Mode (Optional)] ──> [5. Ready]
```

### Step 1: Language & Dialect
- Primary Language: Arabic (`LanguagePreference: 'Arabic'`) or English.
- Arabic Varieties:
  - Egyptian Arabic (`'ar-EG'`): Dialectal, conversational explanations and local idioms.
  - Modern Standard Arabic (`'ar-MSA'`): Formal academic terminology and structured syntax.
- Audio Preview: Live speech synthesis test via `speak()` to verify browser audio output.

### Step 2: Display & Appearance
- Theme Mode: Light, Dark, or System mode via `ThemeSelector`.
- High Contrast Mode: WCAG AAA enhanced contrast toggle with instant DOM reflection.
- Font Scaling: `normal`, `medium`, `large`, and `extra-large` scaling.
- Reduce Motion: Disables high-velocity transition animations for vestibular comfort.

### Step 3: Audio & Speech
- Speech Rate: Calibrated options `0.75x`, `1.0x`, `1.25x`, and `1.5x`.
- Description Detail: `concise` (quick summary), `balanced` (standard), or `detailed` (comprehensive scene and text breakdown).
- Auto-Read: Automatically vocalizes visual companion summaries upon photo capture.

### Step 4: Optional Assistive Mode (Strictly Non-Mandatory)
- Non-medical, non-disclosing selection.
- Modes: Visual Companion, Captions & Sign, Speech & AAC, or Comprehensive / All.
- Prominent privacy banner: `"لست ملزماً بالإفصاح عن أي حالة صحية. جميع أقسام رفيقي الستة متاحة بالكامل وتستطيع تغيير اختياراتك متى شئت."`

### Step 5: Review & Confirmation
- Summary card presenting selected settings.
- Explicit notification that all settings can be adjusted at any time in **Section 6 (Personalize)**.
- "Skip for now" and "Back" navigation accessible from every step.
- Persists to `accessibilityPassport` in user profile and `localStorage`.

---

## 7. Automated Test Verification Results

All tests executed via `tests/runAllTests.ts` and `tests/phase2AuthAndOnboardingVerification.ts`.

```
================================================================
--- Rafiqi Redesign Phase 2: Welcome, Auth & Onboarding Audit ---
================================================================
  ✓ PASS: src/components/Login.tsx must exist
  ✓ PASS: src/components/Onboarding.tsx must exist
  ✓ PASS: src/App.tsx must exist

--- [Section 1] Welcome Experience & Approved Brand Identity ---
  ✓ PASS: Login.tsx must display approved Arabic headline: "العالم أقرب إليك، خطوة بخطوة."
  ✓ PASS: Login.tsx must display approved English tagline: "Your Everyday Accessibility Companion"
  ✓ PASS: Login.tsx must display approved Arabic brand message: "رفيقك في الحياة، والتعلم، والعمل."
  ✓ PASS: Login.tsx must display Rafiqi brand identity with A11y accessibility badge
  ✓ PASS: Login.tsx must include concise explanation of assistive AI platform
  ✓ PASS: Login.tsx must present Accessible by Design capability pillar
  ✓ PASS: Login.tsx must present Multimodal AI capability pillar
  ✓ PASS: Login.tsx must present Privacy First capability pillar

--- [Section 2] Adaptive Design System & Layout ---
  ✓ PASS: Login.tsx must implement premium split layout on desktop (12-column grid: 7 cols brand, 5 cols card)
  ✓ PASS: Login.tsx must embed ThemeSelector in header supporting Light, Dark, and System modes
  ✓ PASS: Login.tsx must provide accessible EN / AR language switch in header
  ✓ PASS: Login.tsx must use adaptive background and text tokens supporting both Light and Dark themes
  ✓ PASS: Login.tsx must ensure interactive buttons satisfy minimum 44px/48px touch targets

--- [Section 3] Authentication Logic & Security Policies ---
  ✓ PASS: Login.tsx must preserve all official Firebase authentication handlers without inventing methods
  ✓ PASS: Login.tsx must enforce minimum 8-character password constraint
  ✓ PASS: Login.tsx must enforce password match validation in registration mode
  ✓ PASS: Login.tsx must normalize email addresses (trim whitespace and lowercase)
  ✓ PASS: Login.tsx must include password show/hide toggle with aria-pressed and aria-label attributes
  ✓ PASS: Login.tsx must render authentication errors with role="alert" for assistive technologies
  ✓ PASS: Login.tsx must provide loading spinners and disable buttons during authentication requests

--- [Section 4] Guest Experience & Strict Security Invariants ---
  ✓ PASS: Login.tsx must feature prominent Guest Access with clear local-only badge
  ✓ PASS: Login.tsx must explicitly disclose guest access limitations (local storage, no admin privileges)
  ✓ PASS: Guest profile must NOT satisfy isAdminUser check
  ✓ PASS: Guest profile must NOT satisfy isSuperAdminUser check
  ✓ PASS: Guest email must NOT be recognized as a permanent admin
  ✓ PASS: App.tsx must support isolated guest preview sessions via sessionStorage

--- [Section 5] Accessible Onboarding ---
  ✓ PASS: Onboarding.tsx must guarantee universal access without requiring medical proof or disability disclosure
  ✓ PASS: Onboarding.tsx must offer Egyptian Arabic (ar-EG) and Modern Standard Arabic (ar-MSA) dialect options
  ✓ PASS: Onboarding.tsx must provide a voice testing feature during language selection
  ✓ PASS: Onboarding.tsx must offer Theme, High Contrast, Font Scaling, and Reduce Motion display controls
  ✓ PASS: Onboarding.tsx must offer Speech Rate, Description Depth, and Auto-Read audio preferences
  ✓ PASS: Onboarding.tsx must offer optional Visual Companion mode
  ✓ PASS: Onboarding.tsx must offer optional Captions & Sign mode
  ✓ PASS: Onboarding.tsx must offer optional Speech & AAC mode
  ✓ PASS: Onboarding.tsx must offer Comprehensive / General Learner mode
  ✓ PASS: Onboarding.tsx must provide an accessible skip action allowing immediate dashboard entry
  ✓ PASS: Onboarding.tsx must provide a back button allowing users to revisit earlier steps
  ✓ PASS: Onboarding.tsx must persist configured preferences through the official accessibilityPassport structure
  ✓ PASS: Onboarding.tsx must inform users that preferences can be adjusted anytime in Section 6 (Personalize)

================================================================
Phase 2 Verification Complete: 42 Passed, 0 Failed
================================================================
Master Test Suite Total: 4,491 Passed, 0 Failed (Across all 96 Sections)
```

---

## 8. Summary of Modified & Created Files

| File | Modification Purpose |
|---|---|
| `src/components/Login.tsx` | Redesigned with approved Arabic headline, English tagline, Arabic brand message, split desktop layout, ThemeSelector integration, enhanced guest access limitations, and accessible authentication forms. |
| `src/components/Onboarding.tsx` | Redesigned with progressive 5-step flow for language & dialect, display & high contrast, audio & speech rate, optional non-disclosing assistive mode, and review. |
| `src/components/ui/Tooltip.tsx` | Fixed TypeScript children typing and cloned element props. |
| `src/modules/hearAndExpress/privacyAndPersonalization/types.ts` | Re-exported `CaptionTheme` from `../liveConversation` to eliminate ambiguous duplicate exports. |
| `src/modules/hearAndExpress/personalAac/types.ts` | Re-exported `AacSymbol` from `../types`. |
| `src/modules/hearAndExpress/soundAwareness/types.ts` | Added `confidenceScore` optional alias to `SoundAlert`. |
| `tests/uiPhase0NavigationAndAuditVerification.ts` | Fixed TypeScript types in user role and mock objects. |
| `tests/unifiedCommunicationPhase8Verification.ts` | Normalized `confidence` in mock sound alerts. |
| `tests/hearAndExpressPhase10Verification.ts` | Normalized `confidence` in mock sound alerts. |
| `tests/phase2AuthAndOnboardingVerification.ts` | New test suite verifying all 42 Phase 2 specifications. |
| `tests/runAllTests.ts` | Integrated Section [96] for Phase 2 verification (4,491 total tests). |
| `docs/ui-ux/PHASE_2_WELCOME_AUTH_ONBOARDING.md` | Complete architecture and verification documentation. |
