# Rafiqi UI Phase 3 — Global Application Shell & Premium Home Dashboard

**Status:** Completed & Verified  
**Date:** November 23, 2026  
**Test Suite:** `tests/phase3AppShellAndHomeVerification.ts` (51/51 tests passing)  
**Total Test Runner:** 4,542 / 4,542 tests passing (0 failures across all 97 suites)  
**Production Build:** Clean (`npm run build` completed in 2m 3s)

---

## 1. Executive Summary

Phase 3 establishes the unified application shell and modern dashboard experience for Rafiqi (رفيقي):
1. **Universal Application Shell:** A persistent desktop sidebar (`Sidebar.tsx`) paired with a responsive content area and dynamic top header (`GlobalHeader.tsx`), resolving the legacy dual-sidebar issue permanently.
2. **Global Header:** Dynamic breadcrumbs mapped to official product sections, global search with keyboard shortcut hints, language control (EN / AR), accessible `ThemeSelector` (Light, Dark, System), functional notification handling, and user profile management.
3. **Premium Home Dashboard (`HomeDashboard.tsx`):** Immediate orientation with time-of-day greetings in English and Arabic, a dominant primary visual action ("Launch Visual Assistant"), secondary quick actions, exact six official section cards, strictly authentic user history (Zero fabricated data), and preference-driven tool recommendations.

---

## 2. Architecture & Component Structure

### A. Desktop & Mobile Shell Integration (`src/App.tsx`)
- **Desktop Invariant:** On `lg` viewports (`>= 1024px`), `Sidebar` is static (`lg:static lg:visible lg:transform-none lg:shadow-none`), occupying the left/start column naturally.
- **Mobile Drawer:** On viewports `< 1024px`, `Sidebar` behaves as an accessible slide-over drawer with high-contrast backdrop and focus trap.
- **Single Sidebar Guarantee:** When `App.tsx` passes `onMenuClick` to child views (including `DisabilityModeView.tsx`), internal desktop sidebars are suppressed (`{!onMenuClick && <aside ...>}`), preventing duplicate sidebars and double navigation bars.

### B. Global Header (`src/components/GlobalHeader.tsx`)
- **Breadcrumbs:** Automatically computes active hierarchy (e.g. `Home > 1. See & Understand > Visual Assistant`).
- **Global Search:** Accessible input with keyboard shortcut hint (`⌘K` / `Ctrl+K`).
- **Language Switcher:** Instant locale toggle with RTL/LTR directional reflow.
- **Theme Selector:** Seamless transition between Adaptive Light (`#F5F9FD`), Adaptive Dark (`#0B131E`), and System defaults.
- **Honest Notifications:** Surfaces verified system alerts (e.g. audio captions status, security tracker notices) without fabricated mock data.
- **User Profile Menu:** Quick access to Profile & Passport, Settings, and Account Sign Out.

### C. Premium Home Dashboard (`src/components/HomeDashboard.tsx`)
- **Greeting & Orientation:** Dynamic time-of-day greeting ("Good morning / afternoon / evening, [User]" / "صباح الخير / مساء الخير، [User]") paired with the Arabic brand tagline: *"العالم أقرب إليك، خطوة بخطوة."*
- **Dominant Primary Action:** "Launch Visual Assistant" (`تشغيل المساعد البصري`) styled with maximum prominence, high contrast, and tactile depth.
- **Secondary Actions:** Live Captions and Accessibility Passport shortcuts.
- **The Six Official Sections (1 to 6):**
  1. *See & Understand* (`see_understand`)
  2. *Read & Learn* (`read_learn`)
  3. *Work & Create* (`work_create`)
  4. *Move & Explore* (`move_explore`)
  5. *Communicate* (`communicate`)
  6. *Personalize* (`personalize`)
- **Real History Data Invariant:** Zero fabricated reading items or tasks. When history is empty, renders an honest, friendly empty state with an actionable CTA button guiding the user to start reading or chatting.
- **Preference-Driven Recommendations:** Contextual shortcuts tailored to user preferences (`Visual`, `Vocal-Deaf`, `Speech`, General).

---

## 3. Verification & Compliance Matrix

| Requirement | Implementation | Verification Status |
| :--- | :--- | :--- |
| **Persistent Desktop Sidebar** | `App.tsx` (`lg:static lg:visible lg:transform-none`) | Verified (Pass) |
| **Mobile Drawer Navigation** | Off-canvas drawer with touch targets $\ge 44\text{px}/48\text{px}$ | Verified (Pass) |
| **Single Sidebar Invariant** | Internal desktop sidebar suppressed via `!onMenuClick` | Verified (Pass) |
| **Six Product Sections** | `PRODUCT_SECTIONS.map` (1 to 6 in official sequence) | Verified (Pass) |
| **Separately Placed Utilities** | Home, Visual Assistant, Progress, Settings, Admin Portal | Verified (Pass) |
| **Admin Role Protection** | Users & Database button guarded strictly by `isAdminUser(profile)` | Verified (Pass) |
| **Dynamic Breadcrumbs** | Computes section numbers and localized names in `GlobalHeader` | Verified (Pass) |
| **Global Search** | Input with search role, clear button, and shortcut badge | Verified (Pass) |
| **Language Switcher** | Arabic / English toggle with instantaneous UI realignment | Verified (Pass) |
| **Theme Control** | Embedded `ThemeSelector` supporting Light, Dark, System | Verified (Pass) |
| **Dominant Visual Action** | "Launch Visual Assistant" hero CTA button | Verified (Pass) |
| **Zero Fabricated History** | Empty state with CTA when no real history exists | Verified (Pass) |
| **Personalized Recommendations** | Filters recommended tools based on `profile.accessibilityMode` | Verified (Pass) |
| **Production Build** | Clean Vite + TypeScript bundle compilation | Verified (Pass) |

---

## 4. Test Suite Summary

- **Suite Section:** Section [97] in `tests/runAllTests.ts`.
- **Target Suite:** `tests/phase3AppShellAndHomeVerification.ts` (51 / 51 passing).
- **Master Regression Suite:** 4,542 / 4,542 passing across all 97 test suites.
- **Compilation Check:** `npx tsc --noEmit` exited with code 0.
- **Build Output:** Production bundle created with zero errors in `dist/`.
