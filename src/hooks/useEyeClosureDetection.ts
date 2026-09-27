import { useRef, useCallback } from 'react';
import { FacialGestureState } from '../lib/facialHeadTracker';

export interface UseEyeClosureDetectionOptions {
  /** Duration in milliseconds required to trigger emergency SOS (defaults to 4000ms) */
  thresholdMs?: number;
  /** Callback fired when eye closure duration exceeds threshold */
  onTrigger: () => void;
}

export function useEyeClosureDetection({
  thresholdMs = 4000,
  onTrigger,
}: UseEyeClosureDetectionOptions) {
  const eyesClosedStartRef = useRef<number | null>(null);
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  /**
   * Processes a facial gesture frame from FacialHeadTracker.
   * Returns true if sustained closure threshold was reached and callback was fired.
   */
  const processGesture = useCallback(
    (gesture: FacialGestureState): boolean => {
      const isClosed = Boolean(
        gesture.isBlinking || (gesture.metrics && gesture.metrics.isBlinking)
      );

      if (isClosed) {
        const now = Date.now();
        if (!eyesClosedStartRef.current) {
          eyesClosedStartRef.current = now;
        } else if (now - eyesClosedStartRef.current >= thresholdMs) {
          eyesClosedStartRef.current = null;
          onTriggerRef.current();
          return true;
        }
      } else {
        eyesClosedStartRef.current = null;
      }

      return false;
    },
    [thresholdMs]
  );

  const reset = useCallback(() => {
    eyesClosedStartRef.current = null;
  }, []);

  const getClosureElapsedMs = useCallback((): number => {
    if (!eyesClosedStartRef.current) return 0;
    return Date.now() - eyesClosedStartRef.current;
  }, []);

  return {
    processGesture,
    reset,
    getClosureElapsedMs,
  };
}
