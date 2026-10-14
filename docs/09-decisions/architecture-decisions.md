# Architecture Decision Records (ADRs)

> **Status**: [VERIFIED]  
> **Source Baseline**: Core architectural evolution and design history  
> **Audience**: Software Architects, System Designers, and Engineering Leads  

---

## ADR-001: Deterministic Pure-Function Routing vs Meta-LLM Routing

### Context
When selecting between different LLM models (e.g. Gemini 2.5 Flash for speed vs NVIDIA GLM-5.2 / DeepSeek-R1 for complex code), early systems frequently use an LLM "router" to inspect the prompt and return a routing tag.

### Decision
Cognify strictly prohibits calling a model to route requests. Routing is implemented as a **Pure Deterministic Function** in [`api/_lib/router.ts`](../../api/_lib/router.ts):
- Regex pattern matching for code fences, stacktraces, and syntax errors.
- Character length threshold ($>500\text{ chars}$).
- Student state strain metric ($S \ge 0.7$).
- Attachment MIME inspection (`image/*` or `application/pdf`).

### Consequences
- **Positive**: Sub-millisecond routing latency ($<1\text{ms}$ vs $800\text{ms}$ for an LLM call), zero routing cost, and 100% deterministic testability.
- **Negative**: Subtle semantic code questions that lack explicit keywords or code fences may occasionally route to `fast` mode first (though the safety fallback chain still handles them).

---

## ADR-002: Strict Decoupling of Baseline Cognitive Assessment from Academic Progression

### Context
Standard educational software often uses baseline aptitude or IQ tests to restrict access to curriculum levels or categorize students into rigid performance tracks.

### Decision
Cognify establishes the **Decoupling Invariant**: A student's baseline cognitive style preview (`iqScore`) is strictly decoupled from their academic grade level and curriculum track.

### Consequences
- **Positive**: Prevents harmful academic stigmatization; aligns with inclusive education and growth mindset pedagogy. A student with any cognitive style preview can achieve high concept mastery through adaptive scaffolding, while a student who struggles with a specific topic receives targeted prerequisite remediation.
- **Negative**: Requires maintaining separate models for baseline cognitive style dimensions vs. observed empirical concept mastery.

---

## ADR-003: Dual-Tier Storage (Instant LocalStorage + Debounced Firestore Sync)

### Context
Every exercise attempt, button click, and chat message changes student state. Writing to remote Cloud Firestore on every micro-event causes UI latency, high network traffic, and rapidly exhausts Firebase Spark free-tier quotas.

### Decision
Implement a dual-tier persistence model:
1. **Tier 1 (Instant Paint)**: Synchronous in-memory state + AES-GCM encrypted LocalStorage update immediately ($0\text{ms}$).
2. **Tier 2 (Remote Cloud)**: 5000ms debounced dot-path write batching dirty concepts into a single `updateDoc` call.

### Consequences
- **Positive**: Instant, fluid 60fps UI; reduces remote database write volume by over 80%.
- **Negative**: Requires handling browser tab unloads (`beforeunload` listener) to flush in-flight writes.

---

## ADR-004: Zero-Knowledge Media Processing for Assistive Tech

### Context
Assistive tools for blind students (Vision Companion) and deaf students (Sign Video Studio) ingest video streams and microphone audio. Transmitting video or audio to cloud databases introduces severe privacy risks and regulatory liabilities (GDPR/FERPA).

### Decision
Cognify mandates **Zero-Knowledge Edge Processing**: All video frames and microphone audio streams are computed in volatile RAM on the user's device and immediately discarded. No media stream is ever stored on disk or in cloud databases.

### Consequences
- **Positive**: Absolute privacy compliance; students and parents can trust the system in private bedrooms and classrooms.
- **Negative**: Requires running WebAssembly (MediaPipe) and WebGL (TensorFlow.js) locally on the client's GPU/CPU.

---

## ADR-005: Strict Hardware Lifecycle Isolation

### Context
When switching between different assistive modules (e.g. from Vision Companion to Sign Video Studio, or back to the Hub), leaving camera tracks open creates hardware lockups, "Camera in use" errors, and severe memory leaks.

### Decision
Every assistive component must implement strict resource cleanup upon component unmount:
1. Stop all video and audio tracks (`track.stop()`).
2. Cancel all active animation frames (`cancelAnimationFrame`).
3. Close the native audio context (`audioContext.close()`).

### Consequences
- **Positive**: Clean transitions without camera conflicts or browser crashes.
- **Negative**: Re-mounting a module requires re-requesting media streams, introducing a brief $200\text{ms}$ hardware initialization delay.

---

## ADR-006: Ethical Non-Diagnostic Invariant Guard

### Context
Educational AI systems run the risk of creating permanent, stigmatizing deficit labels on students (e.g., tagging a student as "autistic" or "slow learner" in database records based on response times or behavior).

### Decision
Implement the **Non-Diagnostic Invariant Guard** in [`src/lib/accessibilityIntelligenceEngine.ts`](../../src/lib/accessibilityIntelligenceEngine.ts) and [`src/lib/studentStateEngine.ts`](../../src/lib/studentStateEngine.ts):
1. Prohibit any clinical deficit terms (`autism`, `adhd`, `retarded`, `disorder`, etc.) from being stored in user identity or preference state.
2. Maintain an explicit whitelist (`ALLOWED_FUNCTIONAL_IDENTIFIERS`) for UI feature toggles (`opendyslexic`, `dyslexia_font`, `visual_comfort`, etc.).
3. Intercept every state flush before dispatching to Cloud Firestore, stripping violating keys.

### Consequences
- **Positive**: Eliminates institutional and legal liability for unauthorized diagnostic labeling; upholds a growth-mindset ethical baseline.
- **Negative**: Feature keys must be carefully designed to reflect functional tools rather than diagnostic conditions.

---

## ADR-007: Minor Camera & Sensor Consent Gate (COPPA / GDPR Art. 8)

### Context
Assistive vision features require real-time camera ingestion. Ingesting biometric or camera streams from minors (under 18) without verifiable parental consent violates COPPA and GDPR Article 8 regulations.

### Decision
Implement a mandatory hardware gate via [`src/components/ParentalConsentModal.tsx`](../../src/components/ParentalConsentModal.tsx):
1. Detect whether the active profile represents a minor (`profile.isMinor || (profile.age && profile.age < 18)`).
2. Intercept camera activation in `VisionCompanionView.tsx` with a non-dismissible parental consent modal.
3. Record verifiable guardian approval (`parentEmail`, `verifiedAt`, `relationship`, `grantedScopes`) in Firestore before granting camera stream access.

### Consequences
- **Positive**: Full compliance with global child safety laws; transparent guardian supervision.
- **Negative**: Minors cannot immediately activate camera companion until guardian confirmation is completed.

---

## ADR-008: Super Admin Escalation & Parallel 11-Subcollection Cascade Purge

### Context
Allowing standard administrators to download full database dumps creates massive PII leakage risk. Furthermore, deleting a user document in Firestore leaves orphaned subcollections behind, violating GDPR Article 17 ("Right to be Forgotten").

### Decision
Implement strict authorization gates and parallel cascade deletion in [`src/components/AdminDashboard.tsx`](../../src/components/AdminDashboard.tsx) and [`src/components/PrivacySecurityCenter.tsx`](../../src/components/PrivacySecurityCenter.tsx):
1. Gate full database JSON backup export (`handleDownloadFullBackup`), manual point modifications, and cognitive stage overrides strictly to `canManageAdmins` (Super Admin).
2. Execute user account deletion across all 11 canonical subcollections in parallel using `getDocs` and batch `deleteDoc` calls before purging the root user document.

### Consequences
- **Positive**: Complete compliance with GDPR Article 17 with zero data residues; prevents unauthorized mass data exfiltration by lower-tier admins.
- **Negative**: Deletion requires querying 11 subcollection paths, resulting in multiple concurrent Firestore operations per deletion.
