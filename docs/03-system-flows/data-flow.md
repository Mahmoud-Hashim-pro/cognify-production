# Data Flow & Persistence Lifecycle

> **Status**: [VERIFIED]  
> **Source Baseline**: `src/lib/studentStateEngine.ts`, `src/lib/cryptoShield.ts`, `src/components/PrivacySecurityCenter.tsx`  
> **Audience**: Full-Stack Developers, Database Engineers, and Privacy Officers  

---

## 1. End-to-End State Propagation Flow

```mermaid
flowchart TD
    UserAction["User Completes Action<br>(Answers Question / Rates Explanation)"] --> EventBus["Event Bus (learningEvents.ts)"]
    
    EventBus --> StateMgr["StudentStateManager<br>(In-Memory RAM State)"]
    
    StateMgr --> InstantCache["Local Cache Sync (0ms delay)<br>Encrypted LocalStorage via AES-GCM"]
    InstantCache --> UIUpdate["React UI Re-renders Immediately<br>(Zero Flicker / 60fps Paint)"]
    
    StateMgr --> DirtyTracker["Mark Concept Dirty<br>pendingConcepts.add(conceptId)"]
    DirtyTracker --> DebounceTimer{"Debounce Timer<br>(5000ms)"}
    
    DebounceTimer -->|Timeout Fires or Page Unload| FlushBatch["Flush Pending Writes"]
    FlushBatch --> FirestoreSanitize["cleanDataForFirestore()<br>(Strip undefined / convert NaN)"]
    FirestoreSanitize --> RemoteFirestore[("Cloud Firestore<br>users/{uid}/studentState/current<br>(Dot-path updateDoc)")]
```

---

## 2. Conversational Message Pipeline [VERIFIED]

1. **Optimistic Dispatch**: When a student enters a query in [`ChatInterface.tsx`](../../src/components/ChatInterface.tsx), an optimistic user message is immediately injected into the local chat thread array with a temporary ID.
2. **Context Compilation**:
   - Compiles the last 12 historical messages (`safeHistory.slice(-12)`).
   - Encodes any image/PDF attachments as clean base64 data.
   - Summarizes past chat threads (`threadsSummary`).
   - Generates the current pedagogical system instructions via `buildPersona()`.
3. **SSE Streaming Ingestion**: The client connects to `/api/gemini/generateAdaptiveResponseStream` via fetch and consumes the stream using `TextDecoder`:
   - Incoming SSE frames (`data: {"text": "...", "done": false}`) update the assistant's placeholder message progressively.
   - Custom `:::micro-check` blocks are detected and rendered as interactive buttons.
4. **Thread Persistence**: When the stream completes (`done: true`), the finalized conversation turn is written to the user's active thread in `users/{uid}/chatThreads/{threadId}`.

---

## 3. Spatial Memory Pipeline [VERIFIED]

Used by the Vision Companion to help blind students locate physical objects in their living space:

```mermaid
sequenceDiagram
    autonumber
    participant Camera as Video Camera Stream
    participant Vision as VisionCompanionView.tsx
    participant Gateway as /api/gemini/generateContent
    participant Store as Spatial Object Registry

    Camera->>Vision: Live frame captured
    Vision->>Gateway: Send frame with prompt: "Identify physical belongings and spatial locations"
    Gateway-->>Vision: JSON: { objectName: "keys", surface: "desk", room: "bedroom", direction: "right" }
    Vision->>Store: Create/Update SpatialObjectRecord with ISO Timestamp
    Store->>Store: Deduplicate by objectName (Keep latest observed coordinates)
    
    Note over Vision,Store: User Later Asks: "Where did I put my keys?"
    Vision->>Gateway: Query includes formatSpatialMemoriesBlock(memories)
    Gateway-->>Vision: "Your keys were seen on the desk in the bedroom at 2:15 PM."
```

---

## 4. GDPR & FERPA Right to Forget & Data Export [VERIFIED]

In [`src/components/PrivacySecurityCenter.tsx`](../../src/components/PrivacySecurityCenter.tsx):

### A. Full Data Export (`exportUserDataAsJson`)
Compiles a complete, portable JSON archive including:
- User profile and authentication metadata.
- Complete event-sourced student state and concept mastery history.
- Spaced retention intervals and Hake normalized gain scores.
- All historical chat threads and summaries.
- Spatial object tracking memory.

### B. Cascade Account Deletion (`handleExecuteErasure`)
When a student requests account termination:
1. Deletes all documents across all 11 subcollections (`threads`, `goals`, `learningEvents`, `learningProfile`, `exerciseHistory`, `loginHistory`, `neurodiversity`, `sensoryLogs`, `studentState`, `spatialMemories`, `caregiverLinks`) in parallel.
2. Deletes the root user document in `users/{uid}`.
3. Clears all browser `LocalStorage`, `SessionStorage`, and IndexedDB encryption keys and persistent caches.
4. Terminates the Firebase Auth session and logs out permanently.
