# Cognify 2.0 (كوجنيفاي)
*An Adaptive AI Mentor, Pedagogical Diagnostic Engine & Assistive Platform*

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel&logoColor=white)](https://my-cognify-app.vercel.app)
[![Tests Passing](https://img.shields.io/badge/Tests-3546%20Passed%2C%200%20Failed-10B981?logo=vitest&logoColor=white)](test-report.json)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict%20Pass-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![Security Standard](https://img.shields.io/badge/Security-OWASP%20Top%2010%20Hardened-8B5CF6?logo=googlecloud&logoColor=white)](ARCHITECTURE.md)

Cognify is an **Adaptive AI Mentor, Pedagogical Diagnostic Engine & Assistive Platform** developed by the **Cognify Development Team** to empower students, self-learners, and people of determination (individuals with visual, hearing, or motor disabilities).

Unlike conventional LLM wrappers that treat every query as a stateless prompt, Cognify maintains a **continuous, evidence-based pedagogical state**. It detects learning strain in real time, diagnoses root-cause prerequisite gaps, optimizes instructional strategies dynamically across 5 modalities, and guards against memory decay using active spaced micro-retrieval.

---

## 📌 The Problem
Most AI educational tools and chatbots suffer from four fundamental flaws:
1. **Stateless Instruction**: The model does not learn *how* the student learns; every session restarts from scratch.
2. **Cognitive & Jargon Mismatch**: Beginners are overwhelmed by abstract jargon, while advanced students receive superficial answers.
3. **Fragile Accessibility**: Standard interfaces exclude students with visual, hearing, motor, or speech impairments.
4. **Longitudinal Forgetting**: Students learn a concept today but experience memory decay over weeks without structured micro-retrieval.

---

## 🚀 The Cognify Solution
Cognify bridges these gaps with a closed-loop, evidence-based learning cycle:
- **Trilingual Core**: Native fluency in **Arabic** (Egyptian & Modern Standard), **English**, and **French**.
- **Pedagogical Decoupling**: Academic levels and cognitive scaffolding are driven strictly by **observed concept mastery and empirical evidence**, completely decoupled from static IQ metrics.
- **Server-Side AI Gateway**: Master provider API keys remain strictly on the server (`api/` serverless functions); client browsers **never** touch master AI keys.
- **Privacy Sovereignty**: Zero-knowledge edge vision processing, owner-only conversation isolation, full GDPR/FERPA data export, and self-erasure.

---

## 🧠 Core Intelligence Architecture (Plan 3)

```text
Student Interaction (Chat / Formative Check / Video / Speech)
       │
       ▼
1. Persistent Learning Event Store (src/lib/learningEvents.ts)
   - Emits events on in-memory Event Bus
   - Persists append-only logs to Firestore (users/{uid}/learningEvents/{eventId})
       │
       ▼
2. Unified Student State Engine (src/lib/studentStateEngine.ts)
   - Evaluates response latency, error streaks, and learning strain
   - Updates concept mastery & SM-2 retention schedules
   - Hydrates deterministically from event history
       │
       ▼
3. Concept Graph & Remedial Diagnosis (src/lib/conceptGraph.ts)
   - Traverses knowledge nodes & directed prerequisite edges
   - Diagnoses foundational blockers (e.g., struggling with "dynamic_memory" stems from "pointers")
       │
       ▼
4. Server-Side AI Gateway & Dynamic Persona (api/_lib/)
   - Authenticates Firebase JWT Bearer tokens (authGuard.ts)
   - Deterministic, zero-token router classifies task category (router.ts)
   - Injects real-time student state, cognitive stage, and pedagogy directives (ai.ts)
   - Quality Guard sanitizes output and validates code blocks (qualityGuard.ts)
       │
       ▼
5. True Adaptive Tutor Loop (Active Feedback & Spaced Retrieval)
   - Real-time Conversational Strain Detection & Pedagogy Auto-Pivot
   - Formative 1-Click Micro-Checkups with prerequisite interleaving
   - Active Spaced Micro-Retrieval (SuperMemo SM-2)
   - Pedagogical Strategy Efficacy Matrix (Empirical Win-Rate Scoring)
       ↺ (Closed Loop)
```

---

## ✨ Key Feature Modules

### 1. Adaptive Learning & Mentorship
- **Live Conversational Strain Engine**: Detects confusion, hesitation, or simplification requests in real time and automatically pivots instructional strategies (e.g., from *Socratic* to *Step-by-Step Scaffolding* or *Visual Analogies*).
- **Formative 1-Click Micro-Checkups**: Interactive comprehension checks embedded seamlessly in chat, measuring response latency in milliseconds and linking misconceptions to prerequisite reviews.
- **Active Spaced Micro-Retrieval (SM-2)**: Proactively prompts 30-second refresher checks when concepts reach their forgetting curve interval ($1d \to 3d \to 7d \to 14d+$).
- **Pedagogical Strategy Efficacy Matrix**: Empirically scores which of the 5 instructional modalities (Scaffolded, Analogies, Worked Examples, Socratic, Deep Rigor) produces the highest comprehension for each learner.
- **Normalized Gain Evaluation**: Uses Hake's normalized gain equation ($g = \frac{Post - Pre}{100 - Pre}$) to measure actual knowledge transfer between pre- and post-assessments.

### 2. Multi-Modal Accessibility Suite
- **Vision Companion (Blind & Low-Vision)**: Real-time scene, text, and hazard narration. Camera frames are sent to Google Gemini for AI inference, then immediately discarded — **never persisted to disk, database, or any Cognify server (0% Disk / 0% Database Storage)**. Ephemeral cloud inference is required for multimodal AI; see [PRIVACY_SPECIFICATION.md](PRIVACY_SPECIFICATION.md) for the full data-flow audit.
- **Spatial Memory Engine**: Localizes and tracks physical objects (keys, eyeglasses, canes) across rooms with chronological surface history (last 10 surfaces) and epistemic honesty (never hallucinates an unobserved item).
- **Sign Avatar 3D (Deaf & Hard of Hearing)**: Real-time 3D signing avatar powered by Three.js. **Note:** Current gesture poses are ASL-based approximations pending review by a certified Arabic Sign Language (ArSL) linguist. A disclaimer is displayed in-app. Certified ArSL integration is on the roadmap (see [CONTRIBUTING.md](CONTRIBUTING.md)).
- **Two-Way Hearing Bridge**: Live bilingual speech-to-text transcription with adjustable font sizes and high-contrast styling.
- **Motor Euphonia & Switch Access**: Minimal-motor single-switch interface, dwell clickers, emergency SOS dispatch (server-side via Telegram/SMS), and high-contrast navigation for motor-impaired learners.
- **Speech Sanitizer**: Natural voice filtering in TTS engine (`cleanForSpeech`), removing markdown noise, asterisks, and robotic labels before audio synthesis.

### 3. Academic Command Center & Analytics
- **Academic Planner**: Interactive semester schedule, assignments, and exam calendars.
- **GPA Calculator**: Multi-scale (4.0 and 5.0) cumulative GPA simulator with isolated "What-If" scenario planning.
- **Cognitive Gym**: Daily logic exercises, pattern recognition challenges, and streak tracking.
- **Student Privacy Center**: Full data sovereignty with one-click GDPR/FERPA JSON export (v2.0.0) and cascading account erasure.

---

## 🛠 Tech Stack

| Domain | Technologies |
|---|---|
| **Frontend UI** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Motion, Lucide Icons, Recharts, react-markdown |
| **Serverless Backend** | Node.js (Vercel Serverless `/api`), Express (`server.ts` for local development & self-hosting) |
| **Authentication & Database** | Firebase Authentication, Cloud Firestore (multi-database isolation), Firebase Storage |
| **AI Foundation Engine** | Server-side multi-provider router: Google Gemini (`gemini-2.5-flash`), Groq, NVIDIA NIM, xAI |
| **Client-Side Edge ML** | WebGL, MediaPipe Hands, TensorFlow.js (isolated in-browser gesture classification) |
| **Cryptography** | Web Crypto API AES-GCM (256-bit) for client-side BYOK token encryption at rest |

---

## 🔐 Environment Variables & Security Configuration

Server-side API keys are read by `/api/` serverless functions at request time and are **NEVER sent to the client browser**.

Create a `.env` file in the root directory (see `.env.example`):

```bash
# ── Server-Side Keys (Private - Never Exposed to Browser) ───────────────────────
# Google Gemini API key(s) (supports rotation with comma-separated keys)
GEMINI_API_KEY=AIzaSy_your_gemini_api_key_here

# Optional Fallback Providers
GROQ_API_KEY=gsk_your_groq_key_here
NVIDIA_API_KEY=nvapi-your_nvidia_key_here
XAI_API_KEY=xai-your_xai_key_here

# ── Client-Side Variables (Publicly Inlined by Vite) ───────────────────────────
# Optional error monitoring
VITE_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

> [!IMPORTANT]
> **No `VITE_GEMINI_API_KEY` in Production**: In Cognify 2.0, production AI requests are handled exclusively through serverless endpoints (`/api/gemini/chat`, `/api/gemini/generate`). Client-side BYOK keys entered by users are encrypted via Web Crypto API AES-GCM before storage.

---

## 💻 Local Development & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Mahmoud-Hashim-pro/cognify-production.git
cd cognify-production

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY

# 4. Start local development server
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 🧪 Automated Testing & Verification Suite

Cognify features a comprehensive test suite covering mathematical formulas, pedagogical state transitions, rate limiters, security guards, CORS policies, state integrity checks, and full end-to-end user lifecycles.

```bash
# Run the complete test suite
npm test

# Generate verified single-source-of-truth JSON report (test-report.json)
npm run report

# Type-check TypeScript codebase (Zero errors)
npm run lint

# Build production bundle
npm run build
```

### Current Verification Status:
- **Total Assertions Tested**: **3,537 Passed, 0 Failed (100.0% Success Rate)**
- **Audit Findings Evidence**: Exactly 51/51 audit paths verified to exist on disk via automated `fs.existsSync` assertion.
- **Automated Test Report**: Maintained as a single source of truth in `test-report.json`.
- **Suites & Benchmarks Covered**:
  - `[Core Hardened Suite]` Evaluation math, Hake gain, concept graphs, rate limiters, token ciphers, TTS sanitizers, unified student state engine, event bus persistence, feedback loops, multi-tenant spatial isolation, Web Crypto AES-GCM cipher integrity, GDPR export/delete cascade, conversational strain detection (Ar/En/Fr), SM-2 retention curves, Golden Scenario, and Personal Learning Model (PLM) verification.
  - `[Phase A — Security Hardening Suite]` Strict CORS origin allowlist (`api/_lib/cors.ts`), distributed-ready rate limit interface, client mastery state spoofing prevention, Fail-Closed production auth guard, and payload size bounds (`tests/apiCorsAuthHardeningVerification.ts`).
  - `[Phase B — Real Evaluation & Benchmarks]` (968 assertions):
    - **Adaptive Learning**: 4 domains, 3 languages, prerequisite chain traversal & Bloom scaffolding (`tests/benchmarks/adaptiveLearningBenchmark.ts`).
    - **Pedagogical Effectiveness**: 500-trial simulation, longitudinal Hake $g$, Welch $t$-test ($p < 0.05$), Cohen's $d$, 30-day retention decay mitigation (`tests/benchmarks/interventionEffectivenessBenchmark.ts`).
    - **AI Providers & Costs**: 4-tier cascade, circuit breaker fast-bypass, formatting preservation, token and monthly cost modeling (< $0.06/student/mo), 80%/100% quota alerts (`tests/benchmarks/aiProviderBenchmark.ts`, `tests/benchmarks/costBenchmark.ts`).
    - **French & Multilingual**: Zero English/robotic leak, France travel rules, emergency dispatch (15, 17, 18, 112, 114), spatial queries in French (`tests/benchmarks/frenchLanguageBenchmark.ts`).
    - **Accessibility Suite**: Vision 0% storage volatile invariant, 3D sign avatar 24 letters & word gestures, hearing bridge live captions & phoneme alternatives, motor switch 350ms debounce & dwell thresholds (`tests/benchmarks/accessibilityBenchmark.ts`).
    - **AI Safety & Adversarial**: 42 adversarial attacks across OWASP LLM Top 10 (DAN, system leak, exfiltration, fake keys) with 100% defense rate (`tests/benchmarks/promptInjectionBenchmark.ts`).
  - `[Phase C — Production Observability & Tracing]` (102 assertions): `x-cognify-trace-id` correlation, AI token telemetry, real-time cost estimation, PII-safe log redaction, security telemetry anomaly alerts, edge health check (`tests/productionObservabilityVerification.ts`).
  - `[Phase D — Real-World Persona Simulation & Pilot Testbed]` (281 assertions): 30-day fast/struggling/inconsistent student simulation, blind/deaf/motor accessibility personas, native French immersion, Teacher cohort heatmap, Parent weekly digest with psychological safety privacy shield, institutional multi-tenant seat caps & Merkle-linked cryptographic audit ledger (`tests/validation/`).
  - `[E2E Full Cycle Suite]` Full 12-step student lifecycle simulation from onboarding through prerequisite remediation to retention consolidation (`tests/e2eFullUserCycle.ts`).

---

## 🚢 Deployment

Cognify is optimized for deployment on **Vercel** with zero configuration:
1. Connect your repository to Vercel.
2. In **Project Settings → Environment Variables**, add your `GEMINI_API_KEY` (and optional `GROQ_API_KEY` / `NVIDIA_API_KEY`).
3. Deploy! Vercel automatically deploys the frontend static assets and provisions the serverless endpoints under `/api`.

---

## 🔍 Technical Invariants & Known System Constraints

Cognify is engineered with strict technical honesty. The following requirements and runtime characteristics apply:

1. **Emergency SOS Notification Pipeline**:
   - Dispatches via server-side endpoints (`/api/emergency/dispatch`) to Webhook, Telegram Bot API, or Twilio SMS when environment variables (`TELEGRAM_BOT_TOKEN`, `TWILIO_ACCOUNT_SID`, etc.) are configured.
   - If notification channels fail or credentials are not supplied, the server explicitly returns `success: false` and triggers a client direct phone-call fallback (`tel:`) rather than generating false delivery confirmations.

2. **Acoustic Hazard Sentinel (Deaf & Hard of Hearing)**:
   - Utilizes Web Audio API Digital Signal Processing (FFT spectral energy, RMS decibels, and transient attack analysis) to identify sound signatures (fire alarms, horns, doorbells, knocks, baby crying, dog barking).
   - Standard mono device microphones detect frequency signatures and volume intensity omnidirectionally, not 3D spatial Direction-of-Arrival (DoA). An in-app technical note makes this transparent to users.

3. **Facial & Gaze Tracking**:
   - Integrates MediaPipe FaceMesh (478 landmarks, iris displacement vectors, adaptive EAR blink baselines).
   - Bundles an automatic CDN fallback (`@mediapipe/face_mesh@0.4.1633559619`) to guarantee execution even in environments without pre-downloaded local binary models.

4. **Speech-to-Text & Live Captions**:
   - Real-time bilingual speech recognition utilizes the browser Web Speech API with Gemini-assisted transcript correction.
   - Supported on Chrome, Edge, and Safari with an active internet connection (Firefox does not provide native Web Speech API support).

5. **Sign Language Avatar (3D)**:
   - Procedural dual-arm Three.js signing avatar. Poses currently use ASL-based fingerspelling approximations pending full certified Arabic Sign Language (ArSL) dictionary review; a persistent notice is displayed in-app.

---

## 📄 License & Attribution
Engineered and maintained by the **Cognify Development Team** as an assistive educational innovation for students and people of determination.
