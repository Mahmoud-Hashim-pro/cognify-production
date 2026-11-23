/**
 * Egyptian Sign Language Runtime Performance & Hardware Benchmark Harness
 *
 * Evaluates inference latency, memory footprint, browser acceleration capabilities,
 * camera permission workflows, and degraded visual conditions (low light, hand occlusion).
 */

export interface HardwareAccelerationProfile {
  hasWebGl2: boolean;
  hasWebGpu: boolean;
  hasWasmSimd: boolean;
  preferredInferenceBackend: 'webgpu' | 'webgl' | 'wasm' | 'cpu';
  estimatedMaxFps: number;
}

export interface VisualDegradationMetrics {
  lightingLevel: number;                // 0.0 to 1.0 (mean luma)
  isLowLighting: boolean;               // < 0.35
  handVisibilityFraction: number;       // 0.0 to 1.0
  isHandOccluded: boolean;              // < 0.80
  cameraStreamActive: boolean;
  frameDropCount: number;
}

export interface LatencyBenchmarkStats {
  sampleCount: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  isInteractiveRealtime: boolean;       // Average < 65ms (>= 15 fps)
}

export class EslPerformanceBenchmark {
  private latencySamples: number[] = [];

  /**
   * Probe browser environment for hardware acceleration capabilities (WebGL 2, WebGPU, WASM).
   */
  public static probeHardwareCapabilities(): HardwareAccelerationProfile {
    let hasWebGl2 = false;
    let hasWebGpu = false;
    const hasWasmSimd = typeof WebAssembly !== 'undefined';

    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        hasWebGl2 = Boolean(canvas.getContext('webgl2'));
      } catch {
        hasWebGl2 = false;
      }
    }

    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      hasWebGpu = true;
    }

    let preferredInferenceBackend: HardwareAccelerationProfile['preferredInferenceBackend'] = 'cpu';
    let estimatedMaxFps = 10;

    if (hasWebGpu) {
      preferredInferenceBackend = 'webgpu';
      estimatedMaxFps = 60;
    } else if (hasWebGl2) {
      preferredInferenceBackend = 'webgl';
      estimatedMaxFps = 30;
    } else if (hasWasmSimd) {
      preferredInferenceBackend = 'wasm';
      estimatedMaxFps = 20;
    }

    return {
      hasWebGl2,
      hasWebGpu,
      hasWasmSimd,
      preferredInferenceBackend,
      estimatedMaxFps,
    };
  }

  /**
   * Analyze raw frame luma and landmark visibility for environmental degradation.
   */
  public static evaluateEnvironmentalQuality(
    lumaValue: number, // 0.0 (dark) to 1.0 (bright)
    handVisibleLandmarksCount: number, // 0 to 21
    cameraActive: boolean
  ): VisualDegradationMetrics {
    const isLowLighting = lumaValue < 0.35;
    const handVisibilityFraction = Number((Math.min(21, Math.max(0, handVisibleLandmarksCount)) / 21).toFixed(2));
    const isHandOccluded = handVisibilityFraction < 0.80;

    return {
      lightingLevel: Number(lumaValue.toFixed(2)),
      isLowLighting,
      handVisibilityFraction,
      isHandOccluded,
      cameraStreamActive: cameraActive,
      frameDropCount: 0,
    };
  }

  /**
   * Record pipeline latency sample in milliseconds.
   */
  public recordLatencySample(latencyMs: number): void {
    if (latencyMs >= 0) {
      this.latencySamples.push(latencyMs);
      if (this.latencySamples.length > 200) {
        this.latencySamples.shift();
      }
    }
  }

  /**
   * Compute comprehensive latency statistics.
   */
  public getLatencyStats(): LatencyBenchmarkStats {
    if (this.latencySamples.length === 0) {
      return {
        sampleCount: 0,
        averageLatencyMs: 0,
        minLatencyMs: 0,
        maxLatencyMs: 0,
        p95LatencyMs: 0,
        isInteractiveRealtime: false,
      };
    }

    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const count = sorted.length;
    const avg = Number((sum / count).toFixed(1));
    const min = sorted[0];
    const max = sorted[count - 1];
    const p95Index = Math.min(count - 1, Math.floor(count * 0.95));
    const p95 = sorted[p95Index];

    return {
      sampleCount: count,
      averageLatencyMs: avg,
      minLatencyMs: min,
      maxLatencyMs: max,
      p95LatencyMs: p95,
      isInteractiveRealtime: avg <= 65, // < 65ms = >= 15.3 fps
    };
  }

  /**
   * Query estimated memory consumption.
   */
  public static getMemoryUsageEstimate(): {
    heapUsedMb: number | null;
    heapTotalMb: number | null;
    isSupported: boolean;
  } {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      return {
        heapUsedMb: Number((mem.usedJSHeapSize / (1024 * 1024)).toFixed(1)),
        heapTotalMb: Number((mem.totalJSHeapSize / (1024 * 1024)).toFixed(1)),
        isSupported: true,
      };
    }
    return {
      heapUsedMb: null,
      heapTotalMb: null,
      isSupported: false,
    };
  }
}
