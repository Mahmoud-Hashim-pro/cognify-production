# Assistive Hardware & Edge AI Perception Flow

> **Status**: [VERIFIED]  
> **Source Baseline**: `src/components/VisionCompanionView.tsx`, `src/components/SignVideoStudio.tsx`, `src/components/DeafEcosystemView.tsx`  
> **Audience**: Computer Vision Engineers, Accessibility Engineers, and Embedded ML Developers  

---

## 1. Hardware Pipeline Architecture

```mermaid
sequenceDiagram
    autonumber
    participant UI as Assistive Component (Mount)
    participant Device as Browser MediaDevices (WebRTC)
    participant Worker as MediaPipe Wasm Runtime
    participant Audio as WebAudio AnalyserNode
    participant Engine as Hardware Engine
    participant UI_Teardown as Assistive Component (Unmount)

    UI->>Device: navigator.mediaDevices.getUserMedia({ video: 30fps, audio: 44.1kHz })
    Device-->>Engine: MediaStream (VideoTrack + AudioTrack)
    
    par Vision / Gaze Tracking Loop (30-60Hz)
        Engine->>Worker: send({ image: videoElement })
        Worker-->>Engine: 468 FaceMesh / 21 Hand Landmarks
        Engine->>Engine: Compute Nose-Tip Vector / Dwell Filter / Snap Target
        Engine-->>UI: onPointerMove (Capped at 33ms / 30fps render)
    and Audio Pitch Autocorrelation Loop
        Engine->>Audio: AnalyserNode.getFloatTimeDomainData()
        Audio->>Engine: Raw PCM Buffer (2048 samples)
        Engine->>Engine: Compute Normalized Square Difference (120-250Hz Humming)
        Engine-->>UI: onVocalTrigger (Sound Activated Action)
    end

    Note over UI,UI_Teardown: User Navigates Back to Hub / Swaps Module
    
    UI_Teardown->>Engine: tracker.stop() / soundEngine.stop()
    Engine->>Device: stream.getTracks().forEach(t => t.stop())
    Engine->>Engine: cancelAnimationFrame(animId)
    Engine->>Audio: audioContext.close()
    Note over Engine: 100% Resource Cleanup (Zero Ghost Cameras / Zero Leaks)
```

---

## 2. Head-Tracking & Eye-Gaze Mechanics (`facialHeadTracker.ts`) [VERIFIED]

The `FacialHeadTracker` provides hands-free mouse emulation calibrated for users with ALS, muscular dystrophy, or quadriplegia:

### A. Coordinate Mapping & Tremor Suppression
1. **Nose-Tip Vector Tracking**: Index `1` in MediaPipe FaceMesh represents the tip of the nose. Its relative $X/Y$ coordinates inside the face bounding box drive the normalized cursor:
   $$X_{\text{norm}} = \frac{x_{\text{nose}} - x_{\text{boxMin}}}{x_{\text{boxMax}} - x_{\text{boxMin}}}$$
2. **Anti-Tremor Deadband Filter**: Minor involuntary tremors below a calibrated threshold ($< 0.004$ normalized units) are filtered out, preventing jitter on small buttons.
3. **Magnetic Snapping (Snap-to-Target)**: If the cursor enters the attraction radius of an active button or keyboard key, it gently locks to the element center to make clicking effortless.
4. **Dwell Click Timer**: When the pointer remains within a target card's bounding box for **800ms to 1200ms**, the target triggers automatically without requiring a physical tap.

### B. Eye Blink & Smile Gestures
- **Eye Aspect Ratio (EAR)**: Computed from upper/lower eyelid landmarks. A drop below the calibrated threshold for $150\text{ms}$ to $400\text{ms}$ registers a deliberate blink-click while ignoring involuntary micro-blinks ($<100\text{ms}$).
- **Lip Corner Delta**: Measures the distance between landmarks 61 and 291 (lip corners). An upward elevation above the baseline registers a smile gesture, which can double as a switch input.

---

## 3. Vocal Sound Triggers & FFT Pitch Autocorrelation (`vocalSoundTrigger.ts`) [VERIFIED]

For users who cannot move their head or blink reliably, Cognify provides sound-activated switching based on **vocal humming**:

```ts
// src/lib/vocalSoundTrigger.ts:182
// Real-time pitch extraction via time-domain autocorrelation:
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
```

1. **Autocorrelation Algorithm**: Evaluates raw audio frames using normalized square difference to detect the fundamental frequency ($F_0$).
2. **Target Band (120 Hz – 250 Hz)**: Calibrated to detect steady vowel humming tones (e.g. *"Mmmmm"* or *"Aaaaa"*).
3. **Noise Immunity**: Ambient background chatter, coughs, and sharp clicks are rejected because they lack a sustained fundamental periodic waveform over the $300\text{ms}$ duration window.

---

## 4. Hardware Lifecycle Isolation Rule [VERIFIED]

> **The Hardware Isolation Invariant**:  
> No camera video track, microphone audio track, or `requestAnimationFrame` loop may remain active when navigating between Disability Hub modules or exiting to other platform views.

Every assistive component implements strict cleanup in its `useEffect` teardown:

```ts
// Verified teardown pattern across all assistive components:
useEffect(() => {
  return () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };
}, []);
```

This guarantees zero camera conflict when switching between the Vision Companion and Sign Video Studio, and eliminates battery drain and memory leaks.
