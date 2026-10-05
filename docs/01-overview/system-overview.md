# System Overview: Cognify 2.0

> **Status**: [VERIFIED]  
> **Source Baseline**: `Mahmoud-Hashim-pro/cognify-production` on branch `main`  
> **Repository Commit**: `81c9790`  
> **Audience**: Software Engineers, Architects, and New Contributors  

---

## 1. Executive Summary

**Cognify 2.0** is an intelligent, privacy-first, adaptive learning and assistive platform engineered by **The Cognify Development Team** as an elite graduation project. The platform combines modern edge computing, cognitive neuroscience, and real-time generative AI to deliver personalized education while breaking down physical barriers for people of determination (individuals with visual, hearing, or neurodiverse needs).

Unlike conventional ed-tech platforms that offer static content catalogs or generic chatbot wrappers, Cognify implements a **mathematically modeled closed-loop adaptive pedagogical cycle**: it continuously diagnoses student comprehension, detects cognitive strain, diagnoses missing prerequisites via a recursive knowledge graph, and dynamically forces the AI mentor into specific pedagogical styles (e.g. physical analogies, worked examples with RAM-level memory reasoning, and 1-click micro-checks).

---

## 2. The Dual Core Pillars

```mermaid
mindmap
  root((Cognify 2.0))
    Closed-Loop Adaptive Education
      Event-Sourced Student State
      Concept Knowledge Graph DFS
      SuperMemo SM-2 Spaced Retention
      Empirical Learning Strain S
      Mandatory Pedagogical Overrides
      Hake's Normalized Gain Metric
    Universal Assistive Tech
      Vision Companion OCR & Hazards
      Spatial Memory Tracking
      Neurodiversity & Autism Hub
      PECS & Sensory Regulation
      Sign Video Studio 3D Avatar
      Two-Way Hearing Bridge
```

### Pillar 1: Closed-Loop Adaptive Education [VERIFIED]
- **Empirical Learning Strain**: Evaluated dynamically based on real-time latency ($>15\text{s}$) and consecutive errors ($N \ge 2$).
- **Prerequisite Gap Diagnosis**: Recursive depth-first search (DFS) traversing unmastered ancestor concepts when a student struggles with complex topics (e.g. tracing pointer dereferencing before dynamic memory).
- **Mandatory Pedagogical Directives**: When an intervention is active, the system injects strict, non-negotiable operational directives into the AI system prompt (`buildPersona`), forcing it into structured remediation rather than generic cheerleading.
- **Formative Micro-Checkups**: Automated 1-click interactive assessment widgets (`:::micro-check`) verifying immediate concept absorption.

### Pillar 2: Universal Assistive Technology [VERIFIED]
- **Vision Companion**: 30fps camera frame ingestion, hazards-first audio triage, OCR text extraction, and persistent spatial tracking of physical objects (`SpatialObjectRecord`).
- **Neurodiversity & Autism Hub**: Spoken PECS symbol communication cards, visual routine schedules, and calming 5-level emotion tracking with server-side meltdown alert escalation to caregivers.
- **Sign Video Studio & 3D Avatar**: Real-time sign language recognition using MediaPipe Hands (21 3D points) and local WebGL TensorFlow.js models, coupled with a Three.js skeletal avatar translating spoken/written words into sign language.
- **Two-Way Hearing Bridge**: Bidirectional real-time translation allowing a deaf student and a hearing teacher/peer to converse naturally.

---

## 3. The Decoupling Invariant [VERIFIED]

A foundational architectural rule governing Cognify is the **Strict Cognitive Profile Decoupling Law**:
> **Invariant**: A student's baseline cognitive style assessment (`iqScore` / cognitive profile) is strictly decoupled from their academic grade level (`profile.level`) and curriculum track.

The cognitive preview assesses multidimensional cognitive styles (Spatial, Numerical, Verbal, Memory, Logic), while academic progression is driven strictly and dynamically through the event-sourced `StudentState` engine based on observed concept mastery, retention intervals, and empirical exercise performance. A student is never gated, categorized, or restricted from advanced materials by an immutable score.

---

## 4. Primary Personas & Access Pathways [VERIFIED]

| Persona / Role | Target User | Entrypoint & Experience | Key Architectural Features |
| :--- | :--- | :--- | :--- |
| **Student** | High school and university students | `/` (Adaptive Chat & Academic Command Center) | Concept mastery tracking, SM-2 retention warmup, GPA calculator, Academic planner. |
| **People of Determination** | Individuals with visual, hearing, or neurodiverse needs | `/disability` (Disability Hub) | Isolated camera/mic lifecycle, OCR verbatim, 3D avatar, visual routines & PECS. |
| **Faculty & Mentors** | Academic advisors & teachers | `/cohort` (Institution Cohort Hub) | Aggregated cohort metrics, Bloom distribution, struggle heatmaps (Zero access to private chat text). |
| **System Administrator** | Platform operators | `/admin` (Super Admin & Database Hub) | Frankfurt latency monitor, Firestore Spark quota guard, security audit logs, user management. |
| **Guest** | First-time visitors / evaluation reviewers | Instant temporary session | Pure in-memory / LocalStorage state, 0% cloud writes, non-persistent telemetry. |
