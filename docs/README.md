# Cognify 2.0 — Complete Documentation Suite

Welcome to the official, evidence-based technical documentation suite for **Cognify 2.0**. This documentation was compiled and verified directly against production source code, configuration manifests, test suites, and database schemas under the **System Intelligence** framework.

---

## 📚 Documentation Directory

```
docs/
├── PROOF_PACK_EXECUTIVE_DOSSIER.md # Executive proof pack & go-to-market dossier
├── CLINICAL_SIGN_LANGUAGE_VALIDATION.md # Clinical validation protocol for Egyptian Sign Language (ArSL)
├── GO_TO_MARKET_ROADMAP.md         # Commercial & institutional adoption roadmap
│
├── 01-overview/
│   ├── system-overview.md          # Platform vision, dual core pillars, user personas
│   ├── system-context.md           # External integrations, third-party services, trust boundaries
│   └── key-features.md             # Complete functional breakdown of all modules
│
├── 02-architecture/
│   ├── architecture-overview.md    # High-level clean architecture, layered topology
│   ├── frontend-architecture.md    # React 19, TypeScript strict mode, Vite chunking, Obsidian styles
│   ├── backend-architecture.md     # Serverless gateway, deterministic router, security envelopes
│   ├── database-architecture.md    # Cloud Firestore topology (Frankfurt), debounced dot-path writes
│   └── infrastructure.md           # Vercel edge deployment, PWA offline service worker
│
├── 03-system-flows/
│   ├── authentication-flow.md      # Firebase Auth, JWT verification, guest mode, RBAC
│   ├── adaptive-learning-flow.md   # Event-sourced loop, mathematical strain, prompt mandates
│   ├── assistive-hardware-flow.md  # WebRTC, MediaPipe Hands, WebAudio FFT, hardware isolation
│   └── data-flow.md                # End-to-end data lifecycle, spatial memory, GDPR erasure
│
├── 04-api/
│   ├── api-overview.md             # Gateway design, security standards, rate limit headers
│   └── endpoints.md                # Endpoint-by-endpoint payload, SSE streaming, error codes
│
├── 05-database/
│   ├── schema.md                   # Document schemas (StudentState, UserProfile, Audits, Subcollections)
│   └── relationships.md            # 11 Subcollections, multi-tenant boundaries, cascade deletion
│
├── 06-security/
│   ├── security-analysis.md        # Threat model, DevTools interception, security rules, RBAC
│   └── privacy-specification.md    # Zero-Knowledge media, Minor Consent gate, Non-Diagnostic guard
│
├── 07-performance/
│   ├── performance-analysis.md     # Bundle splitting, 33ms frame throttle, memory GC audit
│
├── 08-deployment/
│   ├── deployment.md               # Environment variables, Vercel & Node server deployment
│
├── 09-decisions/
│   ├── architecture-decisions.md   # Architectural Decision Records (ADR-001 to ADR-008)
│
├── 10-maintenance/
│   ├── troubleshooting.md          # Diagnostics for benign errors, hardware, quotas, failover
│   └── developer-guide.md          # Quickstart commands, automated test suites, 5 core laws
│
└── 11-technical-articles/
    ├── system-deep-dive.md         # Full engineering whitepaper on Cognify 2.0
    └── closed-loop-adaptive-pedagogy.md # Mathematical modeling and proof of closed-loop pedagogy
```

---

## 🧭 How to Navigate this Documentation

- **For New Developers**: Start with [`01-overview/system-overview.md`](./01-overview/system-overview.md) and [`10-maintenance/developer-guide.md`](./10-maintenance/developer-guide.md).
- **For Architects & Tech Leads**: Read [`02-architecture/architecture-overview.md`](./02-architecture/architecture-overview.md) and [`09-decisions/architecture-decisions.md`](./09-decisions/architecture-decisions.md).
- **For AI & Pedagogical Researchers**: Inspect [`03-system-flows/adaptive-learning-flow.md`](./03-system-flows/adaptive-learning-flow.md) and [`11-technical-articles/closed-loop-adaptive-pedagogy.md`](./11-technical-articles/closed-loop-adaptive-pedagogy.md).
- **For Accessibility Engineers**: Review [`03-system-flows/assistive-hardware-flow.md`](./03-system-flows/assistive-hardware-flow.md) and [`06-security/privacy-specification.md`](./06-security/privacy-specification.md).
- **For DevOps & Security Teams**: Consult [`04-api/endpoints.md`](./04-api/endpoints.md), [`06-security/security-analysis.md`](./06-security/security-analysis.md), and [`08-deployment/deployment.md`](./08-deployment/deployment.md).
