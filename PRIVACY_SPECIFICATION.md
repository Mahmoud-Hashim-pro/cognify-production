# Cognify 2.0: Official Privacy & Data Boundary Specification

**Status**: Privacy Architecture Specification (v2.0) — Enforced at Architecture Layer; Full Data-Rights Coverage Being Completed  
**Version**: 2.0.0  
**Compliance Standard**: GDPR Principles, Egyptian Personal Data Protection Law (Law No. 151 of 2020), Firebase Least-Privilege Security Model.

---

## 1. Core Privacy Architecture Principles

1. **Zero-Knowledge Media Processing & Edge-First Privacy**:
   - **Microphone Audio Streams & MediaPipe Models**: Audio streams and real-time hand/face landmarks are processed **purely on the client device** in volatile browser memory (Web Audio API, MediaPipe). **NO raw audio samples or landmark data are ever written to disk, sent across the network, or saved to any database — NEVER PERSISTED (0% Disk / 0% Cloud).**
   - **Vision Companion (Ephemeral Cloud Multimodal Inference)**: Camera snapshots captured for scene understanding and obstacle recognition are transmitted securely over TLS as transient in-memory base64 payloads directly to the official inference endpoint (`/api/gemini/generateAdaptiveResponse`).
   - **Zero-Persistence Invariant for Visual Data**: **0% Disk / 0% Database Persistence**. Vision frames are never saved to cloud storage buckets, never written to server disks, never logged in audit trails, and never stored in any database. The visual payload exists purely in volatile server memory during the inference turn (~500ms) and is immediately garbage-collected upon response completion.

2. **Strict Multi-Tenant Isolation**:
   - Every piece of personal learning data is strictly partitioned by the user's authenticated UID (`users/{uid}`).
   - Cross-account access is strictly prevented at both the application layer (memory cache partitioning) and the database security layer (`firestore.rules`).

3. **User Sovereignty & Right to Erasure**:
   - Students have complete control to inspect, export (full JSON archive), or permanently erase their entire account data at any time through the **Student Privacy Center** (`src/components/StudentPrivacyCenter.tsx`).

---

## 2. Data Taxonomy: Persisted vs. Ephemeral

| Data Category | Purpose | Persistence Medium | Path / Location | Retention & Deletion Policy |
|---|---|---|---|---|
| **User Profile & Onboarding** | Account identity, academic level, points, accessibility settings. | Firestore + Local Device Cache | `/users/{uid}` | Retained while account active. Permanently deleted upon account erasure. |
| **Student State Engine** | Concept masteries, learning strain, active interventions, SM-2 retention. | Firestore + Local Device Cache | `/users/{uid}/studentState/current` | Retained to maintain adaptive continuity. Can be reset or erased anytime. |
| **Learning Event Stream** | Audit trail of practice answers, time-stamped learning milestones, feedback. | Firestore (5s debounce) + Local Cache | `/users/{uid}/learningEvents/{eventId}` | Persisted for longitudinal learning analytics. Purged completely upon account erasure. |
| **Conversational Threads** | Chat history with AI assistant, explanations, and practice transcripts. | Firestore (AES-256-GCM Encrypted) | `/users/{uid}/threads/{threadId}` | Encrypted at rest. Deletable per thread or full wipe via Privacy Center. |
| **Spatial Object Locations** | Observed physical item names, rooms, surfaces, and 10-item movement history. | Firestore (AES-256-GCM Encrypted) | `/users/{uid}/spatialObjects/{id}` | Encrypted at rest. Strictly isolated per UID. Can be cleared directly in Vision Companion or Privacy Center. |
| **Camera Video Frames** | Real-time object and hazard detection for visually impaired students. | **Ephemeral Cloud Multimodal Inference (0% Disk / 0% Database Persistence)** | In-Memory WebGL Canvas -> Transient TLS API Payload | **Ephemeral**: Discarded immediately after inference. Zero disk, database, or bucket persistence. |
| **Microphone Audio Streams** | Voice input and Speech-to-Text translation. | **NEVER PERSISTED (0% Disk / 0% Cloud)** | In-Memory AudioBuffer Only | **Ephemeral**: Audio stream tracks are closed immediately upon speech termination. |
| **DevTools Security Probes** | Detection of DOM tampering and unauthorized console inspection. | Firestore (Founder Only) | `/securityAudits/{auditId}` | Retained for system security integrity. Read-only strictly by primary founder. |

---

## 3. Multi-Tenant Boundary Enforcement

### A. Database Security Rule Guarantees (`firestore.rules`)
```text
match /users/{userId} {
  // Only the owner of the UID (or validated super admin) can read or write
  allow read: if isOwner(userId) || isAdmin() || isOrgManagerOfTarget();
  allow update: if isOwner(userId) && isValidUser(request.resource.data);
  allow delete: if (isOwner(userId) && !isProtectedTarget()) || (isSuperAdmin() && !isProtectedTarget());
  
  // Student chat threads are strictly private to the student owner (admins cannot snoop)
  match /threads/{threadId} {
    allow read, write: if isOwner(userId);
  }

  // Educational subcollections inherit strict ownership with academic review safeguards
  match /{sub}/{document=**} {
    allow read: if isOwner(userId) || isAdmin();
    allow write: if isOwner(userId);
  }
}
```

### B. In-Memory Cache Isolation
In the client-side single-page app, memory stores (`userSpatialCache`, `managerCache`) partition state by UID. Even if multiple users log in sequentially on a shared device:
- `getSpatialObjects(uid)` strictly verifies `record.uid === uid`.
- Switching accounts purges and re-hydrates the cache strictly from the active session.

---

## 4. User Data Controls in Cognify 2.0

1. **Self-Service Comprehensive Data Export (Export Full Learning Archive)**:
   - Students can download a complete, unencrypted JSON archive containing their profile, concept masteries, learning event history, conversation threads, and spatial memory records.
2. **Pedagogical & Memory Reset**:
   - Students can reset their cognitive memory, inferred preferences, and concept mastery history without deleting their account.
3. **Permanent Account Deletion (Cascade Account Deletion)**:
   - Cascades deletion through Firebase Auth (`deleteUser`), Firestore `/users/{uid}` and all nested subcollections (`learningEvents`, `threads`, `studentState`, `goals`, `courses`), and purges all local storage keys (`cognify_*`).

---

## 5. Client-Side Cryptographic Shield (BYOK Protection)

1. **Server-Side Isolation by Default**:
   - Cognify production AI queries execute through secure `/api/gemini/*` endpoints using server environment variables. API tokens are never sent to the browser.
2. **Web Crypto API AES-GCM for Client Secrets**:
   - For user-supplied Bring-Your-Own-Key (BYOK) configurations, Cognify uses the standard browser **Web Crypto API AES-GCM** (256-bit key derived with PBKDF2) for async encryption and integrity protection in local storage.
   - Synchronous reads utilize a client-side stream obfuscation cipher with randomized per-device salt to prevent plain-text memory inspection and shoulder-surfing.
