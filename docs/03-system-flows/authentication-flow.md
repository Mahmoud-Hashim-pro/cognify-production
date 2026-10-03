# Authentication & Access Control Flow

> **Status**: [VERIFIED]  
> **Source Baseline**: `src/lib/access.ts`, `src/lib/roles.ts`, `api/_lib/authGuard.ts`, `src/components/Login.tsx`  
> **Audience**: Security Engineers, Backend Developers, and Frontend Developers  

---

## 1. Authentication Lifecycle Flow

```mermaid
sequenceDiagram
    autonumber
    participant User as Student / Administrator
    participant UI as Login / App Component
    participant FAuth as Firebase Authentication
    participant Store as Encrypted LocalStorage
    participant API as Vercel Serverless Gateway
    participant Google as Google Public Key Certhub

    User->>UI: Select "Sign in with Google" / Email Login
    UI->>FAuth: signInWithPopup(auth, googleProvider)
    FAuth-->>UI: UserCredential (User object + ID Token)
    UI->>Store: Persist session & role in local cache
    
    Note over UI,API: Subsequent AI or Protected API Request
    UI->>FAuth: currentUser.getIdToken()
    FAuth-->>UI: Fresh ID Token (RS256 JWT)
    UI->>API: POST /api/gemini/* (Authorization: Bearer <ID_TOKEN>)
    
    API->>Google: Fetch Google Public Keys (Cached with max-age)
    API->>API: Verify Token Signature, Issuer, Audience & Expiry
    
    alt Invalid / Expired Token
        API-->>UI: 401 Unauthorized ("Authentication required")
        UI->>User: Prompt re-authentication
    else Valid Token
        API->>API: Set req.authenticatedUid = decodedToken.uid
        API-->>UI: 200 OK (Process protected action)
    end
```

---

## 2. Guest User Mode Virtualization [VERIFIED]

Cognify supports an instantaneous **Guest Pathway** allowing users, prospective students, and thesis evaluation committees to explore the system without signing up:

```ts
// src/lib/learningEvents.ts:18
export const isGuestUser = (uid?: string): boolean => {
  if (!uid) return true;
  return uid.startsWith('guest_') || uid === 'guest' || uid === 'anonymous';
};
```

### Invariants for Guest Sessions:
1. **Zero Remote Firestore Writes**: All state transitions (`recordAnswer`, `pedagogyFeedback`) write strictly to client memory and LocalStorage.
2. **Deterministic Fallbacks**: AI endpoints detect guest sessions and apply specialized public rate limits.
3. **Session Preservation**: If a guest subsequently decides to create an account, their in-memory student state and learning history can be exported via JSON or linked to the newly created Firebase UID.

---

## 3. Role-Based Access Control (RBAC) [VERIFIED]

Located in [`src/lib/roles.ts`](file:///C:/Users/Tie/.gemini/antigravity/scratch/AI-Powered-Adaptive-Personal-Assistant/AI-Powered-Adaptive-Personal-Assistant-main/src/lib/roles.ts) and [`src/lib/access.ts`](file:///C:/Users/Tie/.gemini/antigravity/scratch/AI-Powered-Adaptive-Personal-Assistant/AI-Powered-Adaptive-Personal-Assistant-main/src/lib/access.ts):

### Role Hierarchy & Permissions Matrix:

| Role | Default Home View | Accessible Views | Special Permissions |
| :--- | :--- | :--- | :--- |
| **Student** | `'chat'` | `chat`, `planner`, `gpa`, `goals`, `gym`, `french`, `profile`, `memory` | Standard learning & adaptive cycle. |
| **Special Needs** | `'disability'` | `disability`, `chat`, `profile`, `memory`, `french` | Direct launch into Vision/Deaf/Neurodiversity Hub. |
| **Graduation Project** | `'chat'` | All student views + `disability` | Evaluation sandbox with access to all modules. |
| **Org Manager** | `'cohort'` | `cohort`, `profile` | View aggregated analytics across student cohorts (Zero raw chat text access). |
| **Admin** | `'admin'` | `admin`, `cohort`, `profile`, `chat` | System management and quota monitoring. |
| **Super Admin** | `'admin'` | ALL views without exception | Full database backups, security audit logs, user role assignments. |

---

## 4. Founders Lockout Protection [VERIFIED]

To protect against administrative lockouts or malicious role revocation in production:
```ts
// src/lib/roles.ts:12
export const IMMUTABLE_SUPER_ADMIN_EMAILS = [
  'mahmoud.hashim.pro@gmail.com',
  // Founders / Thesis Committee Leaders
];
```
Even if a compromised administrative account attempts to modify roles in the Firestore database, client and server verification layers enforce super admin privileges for immutable founder emails regardless of database state.
