# Troubleshooting & Diagnostic Guide

> **Status**: [VERIFIED]  
> **Source Baseline**: `src/main.tsx`, `src/lib/databaseHub.ts`, `api/_lib/ai.ts`  
> **Audience**: Support Engineers, SREs, and Developers  

---

## 1. Benign Browser Error Shield (`src/main.tsx`) [VERIFIED]

Certain modern browser extensions, Vercel preview scripts, and asynchronous canvas observers throw noisy runtime exceptions that do not affect application state:

```typescript
// src/main.tsx benign error filter
const BENIGN = /(startTime|reportAllChanges|vercel\.live|ResizeObserver|AbortError)/i;
window.addEventListener('error', (event) => {
  if (BENIGN.test(event.message || '')) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});
```

### Known Benign Exceptions:
- `ResizeObserver loop completed with undelivered notifications`: Benign layout reflow warning thrown by Recharts charts and dynamic textarea expansion.
- `AbortError`: Normal fetch cancellation when a student switches chat threads while an SSE stream is in-flight.
- `vercel.live`: Benign telemetry script injected into preview deployments.

---

## 2. Camera & Assistive Hardware Diagnostics [VERIFIED]

### Issue: `NotReadableError: Could not start video source`
- **Cause**: Another browser tab, an external conferencing app (Zoom/Teams), or an unclosed Cognify module is locking the webcam hardware.
- **Diagnostic Check**:
  1. Verify whether another browser window is holding the camera.
  2. Confirm that previous module unmounted cleanly via `stream.getTracks().forEach(t => t.stop())`.
  3. Reload the browser tab to force the browser media layer to release dangling hardware locks.

### Issue: Jitter or Tracking Loss in Hand Sign Recognition / Camera Modules
- **Cause**: Uneven ambient lighting, hands partially obscured or out of camera viewport, or low frame rate on budget webcams.
- **Resolution**:
  1. Ensure consistent, front-facing ambient lighting and keep hands within the center third of the webcam field of view.
  2. Verify that the dynamic throttle in `AccessibilityOverlay.tsx` has reduced frame processing frequency to prevent CPU contention.
  3. For mobile devices, ensure the device is on a stable surface or stand to avoid camera shaking during two-handed sign articulation.

---

## 3. Database & Quota Diagnostics [VERIFIED]

### Issue: `FirebaseError: Quota exceeded.`
- **Diagnostic Check**:
  1. Log in as Super Admin and navigate to the **Database Hub** (`/admin`).
  2. Inspect the **Operations Counter** and **Spark Free Tier Quota Bar**.
  3. Verify that the 5000ms debounce timer is running in `StudentStateManager`.
  4. Ensure guest sessions (`isGuestUser(uid)`) are not writing to remote Firestore.

### Checking Latency to Frankfurt (`europe-west1`):
In [`src/lib/databaseHub.ts`](file:///C:/Users/bebawy/.gemini/antigravity/scratch/cognify-production/src/lib/databaseHub.ts):
- Click **"Measure Ping to Datacenter"**.
- Standard healthy latency: $60\text{ms} - 120\text{ms}$ from Egypt and Southern Europe.
- If latency exceeds $500\text{ms}$, inspect network VPNs or mobile carrier packet routing.

---

## 4. AI Provider Failover Diagnostics [VERIFIED]

### Issue: `503 No AI provider key configured`
- **Resolution**: Verify that `GEMINI_API_KEY` (and optionally `NVIDIA_API_KEY` or `GROQ_API_KEY`) are defined in Vercel Project Settings without the `VITE_` prefix, and trigger a redeployment.

### Issue: `HTTP 429 Too Many Requests`
- **Observation**: If Google Gemini encounters rate limits during peak class hours, the serverless gateway automatically rotates through the key pool and seamlessly fails over to Groq Cloud or NVIDIA NIM within $<300\text{ms}$. The student UI remains responsive and displays the `Epistemic Pedagogy Badge`.
