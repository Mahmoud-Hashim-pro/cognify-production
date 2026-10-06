# Developer Guide & Contribution Rules

> **Status**: [VERIFIED]  
> **Source Baseline**: `package.json`, `tests/runAllTests.ts`, `tests/goldenAdaptiveScenario.ts`, `tests/e2eFullUserCycle.ts`  
> **Audience**: All Software Engineers and Team Contributors  

---

## 1. Quickstart Commands [VERIFIED]

```bash
# 1. Clone repository & install dependencies
git clone https://github.com/Mahmoud-Hashim-pro/cognify-production.git
cd cognify-production
npm install

# 2. Run local development environment (Frontend + Backend on localhost:3000)
npm run dev

# 3. Type-check entire codebase in strict mode
npm run lint    # Or npx tsc --noEmit

# 4. Execute the comprehensive automated test suite (666 assertions)
npm test

# 5. Execute individual verification suites
npm run test:golden         # Golden Adaptive Scenario
npm run test:api-adaptive   # Real Serverless Adaptive API & Outcome Tracking
npm run test:e2e            # Full End-to-End User Lifecycle

# 6. Verify production build compilation
npm run build
```

---

## 2. Automated Test Suite Architecture [VERIFIED]

Cognify enforces a mandatory quality gate consisting of **762 automated assertions across 5 suites with 100% pass rate requirement**:

```mermaid
graph TD
    TestRunner["npm test"] --> S1["1. Core System Suites [1-36]<br>(tests/runAllTests.ts)<br>525 Assertions"]
    TestRunner --> S2["2. Golden Adaptive Scenario<br>(tests/goldenAdaptiveScenario.ts)<br>62 Assertions"]
    TestRunner --> S3["3. Real Adaptive API Suite<br>(tests/realAdaptiveApiVerification.ts)<br>73 Assertions"]
    TestRunner --> S4["4. Personal Learning Model (PLM)<br>(tests/personalLearningModelVerification.ts)<br>48 Assertions"]
    TestRunner --> S5["5. End-to-End User Lifecycle<br>(tests/e2eFullUserCycle.ts)<br>54 Assertions"]

    S1 --> S1A["Math: GPA, Hake Gain, SM-2 Retention"]
    S1 --> S1B["State: Event Sourcing, Dirty Tracking, Dot-Path"]
    S1 --> S1C["A11y: Hardware Teardown, EAR, FFT Humming"]

    S2 --> S2A["Pointers Crisis & Intervention Trigger"]
    S2 --> S2B["AI Prompt Mandates & Conformance"]
    S2 --> S2C["Micro-Check Recovery & Socratic Promotion"]

    S3 --> S3A["Serverless Handler & Auth Guard"]
    S3 --> S3B["Deterministic Router (Strain >= 0.8)"]
    S3 --> S3C["Outcome Tracking & Strategy Win-Rate"]

    S4 --> S4A["PLM Consolidation & Strategy Ranking"]
    S4 --> S4B["Latency & Retention Risk Profiles"]
    S4 --> S4C["Proactive Directives & Topic Isolation"]

    S5 --> S5A["New Student Onboarding & Session Auth"]
    S5 --> S5B["Rate Limiter & QualityGuard Repair"]
    S5 --> S5C["PWA Manifest & Zero-Knowledge Spec"]
```

### Passing Summary:
- **Suite 1 to 36 (`runAllTests.ts`)**: 525 passed, 0 failed.
- **Golden Adaptive Scenario (`goldenAdaptiveScenario.ts`)**: 62 passed, 0 failed.
- **Real Adaptive API Suite (`realAdaptiveApiVerification.ts`)**: 73 passed, 0 failed.
- **Personal Learning Model Suite (`personalLearningModelVerification.ts`)**: 48 passed, 0 failed.
- **End-to-End Full User Cycle (`e2eFullUserCycle.ts`)**: 54 passed, 0 failed.
- **Total Assertions**: **762 passing / 0 failing (100% Success Rate)**.

---

## 3. Six Non-Negotiable Engineering Laws [VERIFIED]

Every pull request submitted to the repository must adhere to the following rules:

### Law 1: Maintain the Cognitive Profile Decoupling Invariant
Never link a student's classroom grade level (`profile.level`) to their baseline cognitive style index (`iqScore`). Academic scaffolding is determined exclusively by dynamic concept mastery in `StudentState`.

### Law 2: Hardware Isolation is Mandatory
Every React component that interacts with WebRTC cameras or microphones must cleanly release all tracks upon unmount:
```typescript
stream.getTracks().forEach((track) => track.stop());
cancelAnimationFrame(animFrameId);
```
Never leave a background camera loop running when navigating back to the hub.

### Law 3: Zero API Keys in Frontend Bundle
Never introduce `VITE_` prefixed environment variables for external AI providers. All generative AI calls must route through the secure serverless gateway at `/api/gemini/*`.

### Law 4: Respect Database Free-Tier Quotas
Never write directly to Firestore inside high-frequency button clicks. Always utilize the debounced 5000ms dot-path mechanism in `StudentStateManager` and keep UI renders backed by the synchronous local cache.

### Law 5: Zero Tolerance for Broken Tests
Never merge code that breaks any assertion in the **520-test suite**. Always execute `npm run lint && npm test` prior to pushing commits.

### Law 6: Atomic Documentation Synchronization (Zero Stale Docs)
Whenever a feature, module, or user journey is deleted, deprecated, or refactored in the codebase, you must atomically update all documentation. A PR is incomplete until:
1. A global search across `docs/` and `README.md` is executed for the feature name, components, and related keywords.
2. Any obsolete dedicated protocol, guide, or validation documents are permanently removed (`git rm`).
3. Executive dossiers, roadmaps, architectural diagrams, schemas, and PR templates are updated to reflect the exact current code state.
Code without synchronized documentation is considered broken code.
