import type { AcousticAnalysisFrame } from './types';

export class AcousticAnalyzer {
  private noiseFloorDb = 35.0; // Initial baseline ambient room noise estimate (~35 dB)
  private noiseFloorAlpha = 0.05; // Smoothing factor for noise floor adaptation
  private minNoiseFloor = 25.0; // Minimum plausible quiet room noise floor
  private maxNoiseFloor = 75.0; // Maximum room noise floor before flagging severe noise

  /**
   * Process time-domain and frequency-domain buffers to extract calibrated acoustic metrics.
   * Can be driven directly by Web Audio AnalyserNode buffers or synthetic arrays in unit tests.
   *
   * @param timeData Time-domain PCM buffer (Float32Array [-1, 1] or Uint8Array [0, 255])
   * @param freqData Frequency magnitude buffer (Uint8Array [0, 255])
   * @param sampleRate Sampling rate in Hz (default 44100)
   */
  public analyzeFrame(
    timeData: Float32Array | Uint8Array,
    freqData: Uint8Array,
    sampleRate = 44100
  ): AcousticAnalysisFrame {
    const len = timeData.length;
    let sumSquares = 0;
    let peak = 0;

    if (timeData instanceof Float32Array) {
      for (let i = 0; i < len; i++) {
        const val = Math.abs(timeData[i]);
        if (val > peak) peak = val;
        sumSquares += val * val;
      }
    } else {
      // Centered at 128
      for (let i = 0; i < len; i++) {
        const val = Math.abs((timeData[i] - 128) / 128);
        if (val > peak) peak = val;
        sumSquares += val * val;
      }
    }

    const rms = Math.sqrt(sumSquares / (len || 1));

    // Calibrated dB SPL approximation (0.00001 RMS -> 0 dB; 1.0 RMS -> ~100-110 dB SPL)
    const dbfs = rms > 0.00001 ? 20 * Math.log10(rms) : -100;
    const decibels = Math.max(0, Math.min(120, Math.round(dbfs + 100)));

    // Frequency band decomposition
    const binCount = freqData.length;
    const nyquist = sampleRate / 2;
    const hzPerBin = nyquist / (binCount || 1);

    let lowSum = 0;
    let lowCount = 0;
    let midSum = 0;
    let midCount = 0;
    let highSum = 0;
    let highCount = 0;

    let dominantBin = 0;
    let maxMagnitude = 0;

    for (let i = 0; i < binCount; i++) {
      const hz = i * hzPerBin;
      const mag = freqData[i] / 255; // 0.0 to 1.0

      if (mag > maxMagnitude) {
        maxMagnitude = mag;
        dominantBin = i;
      }

      if (hz < 300) {
        lowSum += mag;
        lowCount++;
      } else if (hz <= 2500) {
        midSum += mag;
        midCount++;
      } else {
        highSum += mag;
        highCount++;
      }
    }

    const low = lowCount > 0 ? Number((lowSum / lowCount).toFixed(3)) : 0;
    const mid = midCount > 0 ? Number((midSum / midCount).toFixed(3)) : 0;
    const high = highCount > 0 ? Number((highSum / highCount).toFixed(3)) : 0;

    const dominantFrequencyHz = Math.round(dominantBin * hzPerBin);

    // Adaptive noise floor tracking:
    // Only adapt noise floor upwards during relatively quiet periods to prevent loud events from raising the baseline
    if (decibels < this.noiseFloorDb + 10) {
      this.noiseFloorDb =
        this.noiseFloorDb * (1 - this.noiseFloorAlpha) + decibels * this.noiseFloorAlpha;
      this.noiseFloorDb = Math.max(this.minNoiseFloor, Math.min(this.maxNoiseFloor, this.noiseFloorDb));
    } else if (decibels < this.noiseFloorDb) {
      // Fast downward adaptation if environment gets quieter
      this.noiseFloorDb = decibels;
    }

    const roundedNoiseFloor = Number(this.noiseFloorDb.toFixed(1));
    const snrDb = Number(Math.max(0, decibels - roundedNoiseFloor).toFixed(1));

    return {
      timestamp: Date.now(),
      rms: Number(rms.toFixed(3)),
      peak: Number(peak.toFixed(3)),
      decibels,
      frequencyBand: { low, mid, high },
      dominantFrequencyHz,
      noiseFloorDb: roundedNoiseFloor,
      snrDb,
    };
  }

  public getNoiseFloorDb(): number {
    return Number(this.noiseFloorDb.toFixed(1));
  }

  public resetNoiseFloor(initialDb = 35.0): void {
    this.noiseFloorDb = initialDb;
  }
}
