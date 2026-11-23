# Rafiqi — Complete Guest Access Removal Inventory & Architecture Audit

## 1. Overview

This document provides a comprehensive audit and inventory of every Guest Access entry point, UI component, state variable, session storage key, and conditional bypass across the Rafiqi platform prior to complete feature removal.

---

## 2. Identified Guest Access Inventory

### 2.1. User Interface (UI) Components & Entry Points
1. **`src/components/Login.tsx`:**
   - **`LoginProps.onDirectPreview`**: Optional prop passed by `App.tsx` allowing direct unauthenticated entry.
   - **Error Banner Quick Action (`lines 727-735`)**: Secondary button in error notification: `{t('Guest Access', 'دخول كزائر')}`.
   - **Guest Access Card (`lines 774-801`)**: Full card featuring Sparkles icon, title `{t('Guest Access (Instant Preview)', 'معاينة بدون حساب · دخول مباشر')}`, badge `{t('Local Only', 'محلي فقط')}`, and descriptive limitations disclosure text.
   - **`handleDirectPreview` (`lines 113-131`)**: Configures sessionStorage and localStorage flags (`cognify_guest_preview`, `preLoginAccountPath`, etc.) and triggers view transition.
   - **Authentication Marketing Text (`line 468`)**: Mentions instant local guest preview.
   - **Google Domain Error Helper (`line 99`)**: Mentions clicking Guest Access.

2. **`src/components/Onboarding.tsx`:**
   - **Log Out Button (`lines 789-790`)**: Clean-up call for `cognify_guest_preview` and `cognify_exit_preview` session storage keys.

3. **`src/components/GlobalHeader.tsx`:**
   - **User Menu (`line 406`)**: Displays fallback string `'guest@rafiqi.local'` when `profile.email` is absent.

---

### 2.2. Authentication & Session Routing
1. **`src/App.tsx`:**
   - **`createGuestProfile()` (`lines 105-134`)**: Synthetic profile generator assigning `uid: 'guest-explorer'`, `email: 'student@cognify.demo'`, and `name: 'عزيزي الطالب'`.
   - **`isGuestPreview` State (`lines 140-144`)**: React state tracking whether the current session is an unauthenticated guest session via `sessionStorage.getItem('cognify_guest_preview') === 'disability'`.
   - **`handleEnterGuestPreview` Callback (`lines 146-159`)**: Handler setting session storage flags, synthetic guest profile, and routing to `#disability/hub`.
   - **`handleLogout` Reset (`lines 165, 171`)**: Resets `isGuestPreview` and clears session storage.
   - **Authentication Render Gates (`lines 349, 604, 1061, 1074, 1090, 1115`)**: Conditional checks `!user && !isGuestPreview` gating `<Login />`, SEO metadata, and `<Onboarding />`.
   - **Login Render Injection (`line 1083`)**: Passes `onDirectPreview={handleEnterGuestPreview}` to `<Login />`.

---

### 2.3. Storage Keys & Synthetic Identities
- `sessionStorage.cognify_guest_preview`: Flag identifying guest preview sessions.
- `sessionStorage.cognify_exit_preview`: Flag tracking explicit exit from guest preview.
- Synthetic UID: `'guest-explorer'`.

---

### 2.4. Feature & Data Access Logic (Guest Bypasses)
1. **`src/components/DisabilityModeView.tsx`:**
   - Lines 429, 472, 500: Checks for `profile.uid === 'guest-explorer'` or `!== 'guest-explorer'` to skip Firestore cloud synchronization and substitute local toast notifications.
2. **`src/components/StudentCockpitHub.tsx`:**
   - Lines 244, 254, 278: Checks for `profile.uid === 'guest-explorer'` to bypass remote task subscriptions and remote task saving.
3. **`src/components/StudentSettingsView.tsx`:**
   - Lines 462, 669: Checks for `!== 'guest-explorer'` to skip Firestore settings document writes.
4. **`src/services/gemini.ts`:**
   - Lines 1086-1113: 401 HTTP response handler containing specific branching for `profile.uid === 'guest-explorer'` and guest-targeted error toasts.

---

### 2.5. Legitimate & Unrelated Uses (Not to be removed)
1. **Arabic Sign Language Dictionaries (`expertSignDictionary.ts`, `vocabularyCatalog.ts`)**:
   - Legitimate linguistic entries where "guest" is the translation of the Arabic word "ضيف" (visitor).
2. **Offline Unit Test Safety Guard (`lib/learningEvents.ts: isGuestUser`)**:
   - Internal helper ensuring `null`, `undefined`, or mock test UIDs (e.g. `test_...`) do not attempt live network calls during automated unit test execution.

---

## 3. Removal & Refactoring Plan

1. **Step 1: Remove UI Elements in `Login.tsx`**:
   - Remove `onDirectPreview` prop, `handleDirectPreview` method, guest error button, and guest access card.
   - Refactor marketing text and error text to remove guest access mentions.
   - Ensure clean vertical spacing and visual alignment of the remaining auth form.
2. **Step 2: Remove Authentication & Routing Logic in `App.tsx`**:
   - Eliminate `createGuestProfile()`, `isGuestPreview`, `handleEnterGuestPreview`, and all `cognify_guest_preview` references.
   - Strictly gate all protected views behind `!user`.
3. **Step 3: Clean up Feature Bypasses**:
   - In `DisabilityModeView.tsx`, `StudentCockpitHub.tsx`, and `StudentSettingsView.tsx`, remove `guest-explorer` conditions so all authenticated profiles save normally.
   - In `services/gemini.ts`, streamline 401 handling to standard session expiration.
   - In `GlobalHeader.tsx`, clean up fallback email.
4. **Step 4: Update Tests**:
   - Update `tests/phase2AuthAndOnboardingVerification.ts` and `tests/authSessionAndLogoutVerification.ts` to assert that guest access is completely removed and that authentication is strictly enforced.
5. **Step 5: Full Verification**:
   - Run `npx tsc --noEmit` and execute all 100 test suites.
