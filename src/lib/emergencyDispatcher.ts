/**
 * Emergency SOS Dispatcher Client Service
 *
 * Provides a reliable, non-interactive emergency dispatch pathway for quadriplegic
 * and ALS patients. Unlike window.open('wa.me'), this dispatches a server-side
 * background event without requiring user manual clicks or being blocked by popup guards.
 */

import { auth } from './firebase';

export interface EmergencyDispatchResult {
  success: boolean;
  incidentId?: string;
  dispatchedAt?: string;
  channels?: string[];
  message: string;
  fallbackDirectCall?: boolean;
  queuedOffline?: boolean;
}

// ── Offline SOS outbox ──────────────────────────────────────────────────────
// When the network is down the SOS cannot reach the server. Queue it locally
// and flush automatically as soon as connectivity returns, so no cry for help
// is silently lost.
const SOS_OUTBOX_KEY = 'rafiqi_sos_outbox_v1';

type QueuedSOS = Parameters<typeof dispatchServerEmergencySOS>[0];

function loadOutbox(): QueuedSOS[] {
  try {
    const raw = localStorage.getItem(SOS_OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOutbox(items: QueuedSOS[]): void {
  try {
    localStorage.setItem(SOS_OUTBOX_KEY, JSON.stringify(items));
  } catch { /* storage unavailable */ }
}

export function queueOfflineSOS(params: QueuedSOS): void {
  const outbox = loadOutbox();
  outbox.push(params);
  saveOutbox(outbox);
}

export async function flushOfflineSOSOutbox(): Promise<number> {
  const outbox = loadOutbox();
  if (outbox.length === 0) return 0;
  const remaining: QueuedSOS[] = [];
  let sent = 0;
  for (const item of outbox) {
    const res = await dispatchServerEmergencySOS(item);
    if (res.success) sent += 1;
    else remaining.push(item);
  }
  saveOutbox(remaining);
  return sent;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushOfflineSOSOutbox();
  });
}

export async function dispatchServerEmergencySOS(params: {
  uid?: string;
  studentName?: string;
  caregiverPhone?: string;
  caregiverName?: string;
  location?: { lat: number; lng: number };
  source?: 'eye_closure' | 'button' | 'vocal' | 'sensory_meltdown' | 'fall_detected';
  severity?: 'critical' | 'moderate' | 'warning';
  incidentType?: 'emergency_sos' | 'sensory_meltdown' | 'fall_detected';
  trigger?: string;
  text?: string;
}): Promise<EmergencyDispatchResult> {
  const timestamp = new Date().toISOString();

  try {
    const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:3000';
    const endpoint = typeof window !== 'undefined' ? '/api/emergency/dispatch' : `${baseUrl}/api/emergency/dispatch`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...params,
        timestamp,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        incidentId: data.incidentId,
        dispatchedAt: data.dispatchedAt || timestamp,
        channels: data.channels || ['server_event_bus'],
        message: data.message || 'Emergency signal confirmed by server.',
      };
    }

    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      message: errData.error || `Server responded with status ${res.status}`,
      fallbackDirectCall: true,
    };
  } catch (err: any) {
    console.error('[Emergency Dispatch Failed]:', err);
    // Offline or unreachable: queue the SOS so it is retried automatically when
    // connectivity returns (see flushOfflineSOSOutbox on the 'online' event).
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueOfflineSOS(params);
      return {
        success: false,
        message: 'No network right now. The SOS was saved on this device and will be sent automatically the moment the connection returns.',
        fallbackDirectCall: true,
        queuedOffline: true,
      };
    }
    return {
      success: false,
      message: err.message || 'Network error while contacting emergency dispatch.',
      fallbackDirectCall: true,
    };
  }
}
