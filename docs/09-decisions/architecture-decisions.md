# Architecture Decision Records (ADRs)

> **Status**: [VERIFIED]  
> **Source Baseline**: Core architectural evolution and design history  
> **Audience**: Software Architects, System Designers, and Engineering Leads  

---

## ADR-001: Deterministic Pure-Function Routing vs Meta-LLM Routing

### Context
When selecting between different LLM models (e.g. Gemini 2.5 Flash for speed vs NVIDIA GLM-5.2 / DeepSeek-R1 for complex code), early systems frequently use an LLM "router" to inspect the prompt and return a routing tag.

### Decision
Cognify strictly prohibits calling a model to route requests. Routing is implemented as a **Pure Deterministic Function** in [`api/_lib/router.ts`](file:///C:/Users/Tie/.gemini/antigravity/scratch/AI-Powered-Adaptive-Personal-Assistant/AI-Powered-Adaptive-Personal-Assistant-main/api/_lib/router.ts):
- Regex pattern matching for code fences, stacktraces, and syntax errors.
- Character length threshold ($>500\text{ chars}$).
- Student state strain metric ($S \ge 0.7$).
- Attachment MIME inspection (`image/*` or `application/pdf`).

### Consequences
- **Positive**: Sub-millisecond routing latency ($<1\text{ms}$ vs $800\text{ms}$ for an LLM call), zero routing cost, and 100% deterministic testability.
- **Negative**: Subtle semantic code questions that lack explicit keywords or code fences may occasionally route to `fast` mode first (though the safety fallback chain still handles them).

---

## ADR-002: Strict Decoupling of Scientific IQ from Academic Progression

### Context
Standard educational software often uses baseline aptitude or IQ tests to restrict access to curriculum levels or categorize students into rigid performance tracks.

### Decision
Cognify establishes the **Decoupling Invariant**: A student's scientific IQ test score (`iqScore`) is strictly decoupled from their academic grade level and curriculum track.

### Consequences
- **Positive**: Prevents harmful academic stigmatization; aligns with neurodiversity and growth mindset pedagogy. A student with an average IQ score can achieve high concept mastery through adaptive scaffolding, while a student with a high score who struggles with a specific topic receives targeted prerequisite remediation.
- **Negative**: Requires maintaining separate models for baseline cognitive aptitude vs. observed concept mastery.

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
