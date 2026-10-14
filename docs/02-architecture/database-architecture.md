# Database Architecture & Persistence Strategy

> **Status**: [VERIFIED]  
> **Source Baseline**: `src/lib/firebase.ts`, `src/lib/studentStateEngine.ts`, `src/lib/databaseHub.ts`, `firestore.rules`  
> **Audience**: Database Administrators, Backend Engineers, and Security Architects  

---

## 1. Cloud Firestore Topology [VERIFIED]

Cognify utilizes Google Cloud Firestore provisioned in the **Frankfurt, Germany (`europe-west1`)** datacenter (`src/lib/databaseHub.ts:31`). This region ensures compliance with European GDPR privacy standards and offers minimal latency across Europe and the Middle East.

```mermaid
erDiagram
    USERS ||--|| STUDENT_STATE : "owns (1:1)"
    USERS ||--o{ CHAT_THREADS : "contains (1:N)"
    USERS ||--o{ SPATIAL_MEMORIES : "tracks (1:N)"
    USERS ||--o{ GOALS : "tracks (1:N)"
    USERS ||--o{ COURSES : "enrolls (1:N)"
    SECURITY_AUDITS }o--|| USERS : "audits (N:1)"

    USERS {
        string uid PK
        string email
        string displayName
        string role
        string level
        string field
        string accessibilityMode
        number iqScore
        timestamp createdAt
    }

    STUDENT_STATE {
        string cognitiveStage
        string activePedagogy
        json pedagogyEffectiveness
        json learningStrain
        json conceptMastery
        json retentionSchedules
        json activeInterventions
        number totalExercisesCompleted
        timestamp lastActiveTimestamp
    }

    SECURITY_AUDITS {
        string auditId PK
        string uid
        string ip
        string location
        string type
        timestamp timestamp
        json details
    }
```

---

## 2. Document Hierarchy & Subcollections [VERIFIED]

Firestore uses nested subcollections under each user document to enforce **Strict Multi-Tenant Isolation**:

```
firestore-root/
â”œâ”€â”€ users/
â”‚   â””â”€â”€ {uid}/                                    [User Profile Document]
â”‚       â”œâ”€â”€ studentState/
â”‚       â”‚   â””â”€â”€ current                           [Canonical Student State Document]
â”‚       â”œâ”€â”€ chatThreads/
â”‚       â”‚   â””â”€â”€ {threadId}                        [Individual Conversation Threads]
â”‚       â”œâ”€â”€ spatialMemories/
â”‚       â”‚   â””â”€â”€ {memoryId}                        [Physical Object Locations]
â”‚       â”œâ”€â”€ courses/
â”‚       â”‚   â””â”€â”€ {courseId}                        [Academic Transcript & Grades]
â”‚       â””â”€â”€ goals/
â”‚           â””â”€â”€ {goalId}                          [Personal Academic Goals]
â””â”€â”€ securityAudits/
    â””â”€â”€ {auditId}                                 [Global Security Telemetry Collection]
```

---

## 3. Quota Optimization: 5000ms Debounced Dot-Path Writes [VERIFIED]

To operate sustainably within the **Firebase Spark Free Tier** (50,000 reads/day, 20,000 writes/day), Cognify eliminates naive write-on-click patterns.

### The Debounced Update Mechanism:
In [`src/lib/studentStateEngine.ts`](../../src/lib/studentStateEngine.ts), when an exercise is answered or a concept is tested:

1. **Local Cache Save (0ms)**: The state is immediately committed to synchronous in-memory state and persisted to `LocalStorage` (encrypted via Web Crypto AES-GCM 256-bit). The UI renders immediately without waiting for a cloud roundtrip.
2. **Concept Dirty Tracking**: The concept ID is appended to `pendingConcepts: Set<string>`.
3. **Debounce Timer**: A 5000ms timer is reset.
4. **Targeted Dot-Path Flush**: When the timer fires, instead of rewriting the entire monolithic document, `updateDoc` issues granular dot-path updates:
   ```ts
   // src/lib/studentStateEngine.ts:634
   const updates: Record<string, any> = {
     activePedagogy: this.state.activePedagogy,
     learningStrain: this.state.learningStrain,
     totalExercisesCompleted: this.state.totalExercisesCompleted,
     lastActiveTimestamp: this.state.lastActiveTimestamp,
   };

   for (const conceptId of this.pendingConcepts) {
     if (this.state.conceptMastery[conceptId]) {
       updates[`conceptMastery.${conceptId}`] = this.state.conceptMastery[conceptId];
     }
     if (this.state.retentionSchedules[conceptId]) {
       updates[`retentionSchedules.${conceptId}`] = this.state.retentionSchedules[conceptId];
     }
   }
   await updateDoc(studentStateDoc(this.state.uid), cleanDataForFirestore(updates));
   ```
5. **Page Unload Safety**: A `beforeunload` window event listener guarantees that any pending dirty state is flushed synchronously before the browser tab terminates.

---

## 4. Guest Session Virtualization [VERIFIED]

Guest users (`uid.startsWith('guest_')`) do not create Firestore documents. The `isGuestUser(uid)` utility short-circuits remote network calls, running 100% in-memory and in encrypted local storage. This guarantees zero quota consumption from unauthenticated visitors or external evaluation bots.
