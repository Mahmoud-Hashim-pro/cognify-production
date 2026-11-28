/**
 * Switch Scanning Accessibility Controller for AAC
 *
 * Provides motor-accessible 1-switch and 2-switch navigation for users with
 * physical disabilities, tremors, or limited motor control.
 *
 * Strict Disclosure:
 * Provides standard software switch scanning via browser HID keystrokes
 * (Space, Enter, NumPad 0/1, or commercial adaptive switch boxes configured as HID).
 * Proprietary serial hardware switch boxes require physical device verification.
 */

import type { SwitchScanningState, SwitchScanListener } from './types';

export class SwitchScanningEngine {
  private state: SwitchScanningState;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<SwitchScanListener> = new Set();
  private onSelectCallback: ((group: string, index: number) => void) | null = null;

  constructor(scanSpeedMs: number = 1500) {
    this.state = {
      isActive: false,
      currentElementIndex: 0,
      totalElements: 0,
      activeGroup: 'categories',
      scanSpeedMs: Math.max(500, Math.min(5000, scanSpeedMs)),
      isPaused: false,
    };
  }

  public setOnSelectCallback(callback: (group: string, index: number) => void): void {
    this.onSelectCallback = callback;
  }

  public setTargetCount(totalElements: number, group: 'categories' | 'symbols' | 'sentence_bar'): void {
    this.state.totalElements = Math.max(0, totalElements);
    this.state.activeGroup = group;
    if (this.state.currentElementIndex >= totalElements) {
      this.state.currentElementIndex = 0;
    }
    this.notify();
  }

  public startAutoScan(): void {
    this.stopAutoScan();
    this.state.isActive = true;
    this.state.isPaused = false;
    this.notify();

    this.timerId = setInterval(() => {
      if (!this.state.isPaused && this.state.totalElements > 0) {
        this.advanceScan();
      }
    }, this.state.scanSpeedMs);
  }

  public stopAutoScan(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.state.isActive = false;
    this.notify();
  }

  public pauseScan(): void {
    this.state.isPaused = true;
    this.notify();
  }

  public resumeScan(): void {
    this.state.isPaused = false;
    this.notify();
  }

  public setScanSpeed(speedMs: number): void {
    this.state.scanSpeedMs = Math.max(500, Math.min(5000, speedMs));
    if (this.state.isActive) {
      this.startAutoScan(); // Restart with new interval
    } else {
      this.notify();
    }
  }

  /**
   * Switch 1 Action: Step forward to the next element.
   */
  public triggerSwitchStep(): void {
    if (this.state.totalElements <= 0) return;
    this.advanceScan();
  }

  /**
   * Switch 2 Action (or single-switch select): Activate the focused element.
   */
  public triggerSwitchSelect(): void {
    if (this.state.totalElements <= 0) return;
    if (this.onSelectCallback) {
      this.onSelectCallback(this.state.activeGroup, this.state.currentElementIndex);
    }
  }

  private advanceScan(): void {
    if (this.state.totalElements <= 0) return;
    this.state.currentElementIndex = (this.state.currentElementIndex + 1) % this.state.totalElements;
    this.notify();
  }

  public getState(): SwitchScanningState {
    return { ...this.state };
  }

  public subscribe(listener: SwitchScanListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }
}
