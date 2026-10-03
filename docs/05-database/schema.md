# Firestore Database Schema Specification

> **Status**: [VERIFIED]  
> **Source Baseline**: `src/types/`, `src/lib/studentStateEngine.ts`, `src/lib/spatialMemoryEngine.ts`  
> **Audience**: Database Administrators, Backend Engineers, and Full-Stack Developers  

---

## 1. User Profile Document

### Path: `users/{uid}`

Stores student identity, academic specialization, and accessibility settings:

```typescript
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'Student' | 'Special Needs' | 'Graduation Project' | 'Org Manager' | 'Admin' | 'Super Admin';
  level: 'Basic' | 'Intermediate' | 'Advanced';
  field: string;               // e.g. "Computer Science", "Medicine", "Engineering"
  language: string;            // e.g. "English", "Arabic", "Egyptian Ammiya", "French"
  accessibilityMode: 'None' | 'Visual' | 'Vocal-Deaf' | 'Sign-Only' | 'Speech' | 'Neurodiversity';
  iqScore?: number;            // Scientifically evaluated IQ score (Decoupled from level)
  preferredPedagogyStyle?: string;
  createdAt: number;           // Millisecond epoch
  lastLogin: number;
}
```

---

## 2. Canonical Student State Document

### Path: `users/{uid}/studentState/current`

The single source of truth for the closed-loop adaptive pedagogical engine:

```typescript
export interface StudentState {
  uid: string;
  cognitiveStage: 'foundational' | 'intermediate' | 'advanced' | 'research';
  activePedagogy: 'analogies' | 'scaffolded' | 'worked_example' | 'socratic' | 'advanced_rigor';
  
  // Strategy effectiveness scores derived from thumbs up/down student feedback
  pedagogyEffectiveness: Record<
    'analogies' | 'scaffolded' | 'worked_example' | 'socratic' | 'advanced_rigor',
    {
      helpfulCount: number;
      unhelpfulCount: number;
      score: number; // 0.1 to 1.0 dynamic weighting
    }
  >;

  // Empirical learning strain indicators
  learningStrain: {
    possibleStruggle: number; // 0.0 (fluent) to 1.0 (severe strain)
    confidence: number;       // 0.0 to 1.0 (statistical confidence in struggle detection)
    signals: ('high_response_latency' | 'repeated_errors' | 'prerequisite_gap' | 'frequent_hints')[];
  };

  // Detailed concept mastery tracking
  conceptMastery: Record<string, ConceptMasteryRecord>;

  // SuperMemo SM-2 retention schedules
  retentionSchedules: Record<string, RetentionSchedule>;

  // Active pedagogical interventions
  activeInterventions: Record<string, InterventionDirective>;

  totalExercisesCompleted: number;
  lastActiveTimestamp: number;
}
```

### Concept Mastery Record (`conceptMastery.{conceptId}`):
```typescript
export interface ConceptMasteryRecord {
  conceptId: string;
  attempts: number;
  correct: number;
  accuracy: number;             // correct / attempts (0.0 to 1.0)
  confidence: number;           // Mathematical confidence (0.1 to 1.0)
  consecutiveCorrect: number;   // Consecutive correct answers streak
  consecutiveIncorrect: number; // Consecutive mistakes count
  lastTested: number;           // Timestamp
  mistakeTypes: string[];       // e.g. ["syntax_confusion", "null_dereference"]
}
```

### Retention Schedule Record (`retentionSchedules.{conceptId}`):
```typescript
export interface RetentionSchedule {
  conceptId: string;
  repetitionNumber: number;     // Number of successful reviews
  easeFactor: number;           // SM-2 Ease Factor (min 1.3, default 2.5)
  intervalDays: number;         // Days until next review
  nextReviewDate: string;       // ISO YYYY-MM-DD format
  lastReviewedDate: string;     // ISO YYYY-MM-DD format
  status: 'new' | 'learning' | 'review' | 'mastered';
}
```

### Intervention Directive Record (`activeInterventions.{conceptId}`):
```typescript
export interface InterventionDirective {
  conceptId: string;
  strategy: 'analogies' | 'scaffolded' | 'worked_example' | 'socratic' | 'advanced_rigor';
  recommendedAction: 'show_worked_example' | 'review_prerequisite' | 'break_down_step' | 'advance_difficulty';
  reason: string;
  promptDirective: string;
  titleEn: string;
  explanationEn: string;
}
```

---

## 3. Spatial Object Record

### Path: `users/{uid}/spatialMemories/{memoryId}`

Tracks physical belongings recognized by the Vision Companion:

```typescript
export interface SpatialObjectRecord {
  id: string;
  objectName: string;          // e.g. "keys", "glasses", "prescription bottle"
  surface: string;             // e.g. "dining table", "bedside stand", "couch"
  room: string;                // e.g. "living room", "kitchen", "bedroom"
  relativePosition?: {
    direction: string;         // e.g. "at 2 o'clock", "far left", "next to lamp"
    distanceEstimate?: string; // e.g. "within reach", "2 meters"
  };
  lastSeenIso: string;         // ISO timestamp of latest frame observation
  confidence: number;
}
```

---

## 4. Security Audit Log Document

### Path: `securityAudits/{auditId}`

Stores intrusion attempts and DevTools detections:

```typescript
export interface SecurityAudit {
  auditId: string;
  uid: string;                 // User UID or 'guest'
  type: 'DEVTOOLS_OPENED' | 'CONSOLE_PROBE' | 'CONTEXT_MENU' | 'SUSPICIOUS_SCRIPT';
  timestamp: number;
  ip: string;
  location?: string;           // Country code / city
  details: Record<string, any>;
}
```
