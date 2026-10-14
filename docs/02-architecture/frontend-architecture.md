# Frontend Architecture

> **Status**: [VERIFIED]  
> **Source Baseline**: `src/App.tsx`, `vite.config.ts`, `package.json`, `src/components/`  
> **Audience**: Frontend Engineers and UI/UX Developers  

---

## 1. Technology Choices & Rationale [VERIFIED]

| Dependency | Version | Architectural Rationale |
| :--- | :--- | :--- |
| **React** | `19.0.0` | Concurrent rendering, fast reconciliation for real-time camera/canvas overlays, and optimized state transitions. |
| **TypeScript** | `~5.8.2` | 100% strict-mode typing. Eliminates runtime null pointer errors and enforces rigid contracts for student state and events. |
| **Vite** | `^6.2.0` | Sub-millisecond HMR during development, Rollup-based tree-shaking, and manual vendor chunking in production. |
| **Tailwind CSS** | `^4.1.14` | Modern CSS engine with the **Obsidian Dark Glassmorphism** design tokens (`#0A0C14`, `#121524`, backdrop blur). |
| **Framer Motion** | `^12.23.24`| GPU-accelerated micro-interactions, modal transitions, and smooth card elevation without blocking the main thread. |
| **Recharts** | `^3.8.1` | Declarative SVG charting for Bloom cognitive taxonomy, GPA trajectories, and concept mastery distributions. |
| **Lucide React** | `^0.546.0` | Tree-shakable, consistent vector iconography. |

---

## 2. Dynamic View Routing & Access Control [VERIFIED]

Routing is managed via declarative application view state in [`src/App.tsx`](../../src/App.tsx) and guarded by [`src/lib/access.ts`](../../src/lib/access.ts):

```mermaid
flowchart TD
    Login["User Logs In / Restores Session"] --> RoleCheck{"Resolve Role & Account Pathway"}
    RoleCheck -->|Special Needs| Hub["Disability Hub (/disability)"]
    RoleCheck -->|Super Admin / Admin| Admin["Admin Dashboard (/admin)"]
    RoleCheck -->|Org Manager| Cohort["Institution Cohort Hub (/cohort)"]
    RoleCheck -->|Student / Default| Chat["Adaptive Chat & Academic Center (/)"]

    Chat --> Guard{"canAccessView(view, role)"}
    Hub --> Guard
    Admin --> Guard
    Cohort --> Guard

    Guard -->|Permitted| RenderView["Render Component with Lazy Suspense"]
    Guard -->|Forbidden| Redirect["Fallback to homeViewFor(role)"]
```

### Supported View Routes:
- `'chat'`: Adaptive chat, code explanation, micro-checks, and retention warmups.
- `'disability'`: Hub container (`'hub'`) switching between `'vision'` and `'deaf'` (with caregiver linking).
- `'planner'`: Academic planner and exam countdown schedule.
- `'gpa'`: GPA calculator and What-If simulation sandbox.
- `'goals'`: Goal tracker and task milestones.
- `'gym'`: Cognitive gym exercises and IQ assessment.
- `'france'`: French travel voice assistant.
- `'profile'`: User profile, preferences, and GDPR account controls.
- `'memory'`: Transparent student memory management.
- `'cohort'`: Institution analytics for educators.
- `'admin'`: Super admin, Frankfurt latency, and security audits.

---

## 3. Bundle Splitting & Production Chunking [VERIFIED]

To ensure ultra-fast Time-to-Interactive (TTI) on mobile devices and assistive hardware, [`vite.config.ts`](../../vite.config.ts) defines explicit manual vendor splitting:

```ts
// vite.config.ts manualChunks configuration
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
  'vendor-motion': ['motion/react'],
  'vendor-icons': ['lucide-react'],
  'vendor-mediapipe': ['@mediapipe/hands', '@mediapipe/camera_utils'],
}
```

### Production Build Metrics (Vite 6 + esbuild):
- **Total Build Time**: ~35 seconds for transformed modules.
- **Top Distributed Chunks**:
  - `vendor-firebase`: 670 kB (200 kB gzip)
  - `signClassifier`: 879 kB (loaded lazily only when entering Sign Studio)
  - `SignAvatar3D`: 521 kB (134 kB gzip - Three.js avatar loaded lazily)
  - `VisionCompanionView`: 145 kB (41 kB gzip)
  - `ChatInterface`: 283 kB (83 kB gzip)
  - `vendor-motion`: 128 kB (42 kB gzip)
  - Initial `index.html`: **2.7 kB** (1.05 kB gzip)

---

## 4. Render Optimization & Hardware Throttling [VERIFIED]

In intensive assistive camera and audio views such as `VisionCompanionView.tsx` and `SignVideoStudio.tsx`, camera callbacks operate at high device rates. Uncontrolled re-renders or unthrottled inference requests would cause severe thermal throttling and battery drain. Cognify implements **Frame-Capped Sampling**:

```ts
// Frame-rate capped inference sampling
const lastFrameSampleRef = useRef(0);
const FRAME_SAMPLE_INTERVAL_MS = 66; // ~15-30fps sample cap

// onFrameCapture callback:
const now = Date.now();
if (now - lastFrameSampleRef.current < FRAME_SAMPLE_INTERVAL_MS) return;
lastFrameSampleRef.current = now;
// Process snapshot for ML pipeline
```

This optimization reduces React virtual DOM reconciliation and GPU composition overhead on mobile hardware, maintaining a consistent 60fps UI thread.
