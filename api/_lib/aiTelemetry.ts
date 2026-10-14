/**
 * Phase C - Requirement 21: Structured AI Telemetry Capture
 * Cognify 2.0 Production Observability & Tracing Engine
 *
 * Captures granular runtime metrics for every LLM inference call:
 * prompt tokens, completion tokens, total tokens, model name, provider,
 * latency (ms), fallback count, cache status, and distributed trace ID.
 */

import { generateTraceId } from './tracing.js';

export type AIProvider = 'gemini' | 'nvidia' | 'groq' | 'xai' | 'openai' | 'anthropic' | 'local' | 'none';

export interface StructuredAITelemetry {
  id: string;
  traceId: string;
  timestamp: string;
  provider: AIProvider | string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  fallbackCount: number;
  cachedStatus: boolean;
  success: boolean;
  costUsd?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TelemetryFilter {
  provider?: string;
  modelName?: string;
  traceId?: string;
  cachedStatus?: boolean;
  since?: string | number;
}

export interface AggregateTelemetry {
  totalCalls: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  cacheHitRate: number;
  totalFallbacks: number;
  successRate: number;
  byProvider: Record<string, { calls: number; tokens: number; avgLatencyMs: number }>;
}

const telemetryStore: StructuredAITelemetry[] = [];
const MAX_TELEMETRY_RECORDS = 5000;

/**
 * Records a structured AI telemetry event.
 * Ensures default values, token summation, and trace linkage.
 */
export function recordAITelemetry(
  event: Partial<StructuredAITelemetry> & { provider: AIProvider | string; modelName: string }
): StructuredAITelemetry {
  const promptTokens = Math.max(0, Math.round(Number(event.promptTokens) || 0));
  const completionTokens = Math.max(0, Math.round(Number(event.completionTokens) || 0));
  const totalTokens = promptTokens + completionTokens;

  const record: StructuredAITelemetry = {
    id: event.id || `telemetry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    traceId: event.traceId || generateTraceId(),
    timestamp: event.timestamp || new Date().toISOString(),
    provider: event.provider,
    modelName: event.modelName,
    promptTokens,
    completionTokens,
    totalTokens,
    latencyMs: Math.max(0, Number(event.latencyMs) || 0),
    fallbackCount: Math.max(0, Number(event.fallbackCount) || 0),
    cachedStatus: Boolean(event.cachedStatus),
    success: event.success !== undefined ? Boolean(event.success) : true,
    costUsd: event.costUsd !== undefined ? Number(event.costUsd) : undefined,
    error: event.error,
    metadata: event.metadata ? { ...event.metadata } : undefined,
  };

  telemetryStore.push(record);
  if (telemetryStore.length > MAX_TELEMETRY_RECORDS) {
    telemetryStore.shift();
  }

  return record;
}

/**
 * Retrieves recorded telemetry events with optional filtering.
 */
export function getTelemetryEvents(filter?: TelemetryFilter): StructuredAITelemetry[] {
  if (!filter) return [...telemetryStore];

  return telemetryStore.filter((entry) => {
    if (filter.provider && entry.provider !== filter.provider) return false;
    if (filter.modelName && entry.modelName !== filter.modelName) return false;
    if (filter.traceId && entry.traceId !== filter.traceId) return false;
    if (filter.cachedStatus !== undefined && entry.cachedStatus !== filter.cachedStatus) return false;
    if (filter.since !== undefined) {
      const sinceTime = typeof filter.since === 'number' ? filter.since : new Date(filter.since).getTime();
      const entryTime = new Date(entry.timestamp).getTime();
      if (entryTime < sinceTime) return false;
    }
    return true;
  });
}

/**
 * Computes aggregated telemetry statistics across recorded events.
 */
export function getAggregateTelemetry(filter?: TelemetryFilter): AggregateTelemetry {
  const events = getTelemetryEvents(filter);

  if (events.length === 0) {
    return {
      totalCalls: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      averageLatencyMs: 0,
      p95LatencyMs: 0,
      cacheHitRate: 0,
      totalFallbacks: 0,
      successRate: 0,
      byProvider: {},
    };
  }

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalLatency = 0;
  let cacheHits = 0;
  let fallbacks = 0;
  let successes = 0;
  const latencies: number[] = [];
  const byProvider: Record<string, { calls: number; tokens: number; totalLatency: number; avgLatencyMs: number }> = {};

  for (const ev of events) {
    totalPromptTokens += ev.promptTokens;
    totalCompletionTokens += ev.completionTokens;
    totalLatency += ev.latencyMs;
    latencies.push(ev.latencyMs);

    if (ev.cachedStatus) cacheHits++;
    fallbacks += ev.fallbackCount;
    if (ev.success) successes++;

    const p = String(ev.provider);
    if (!byProvider[p]) {
      byProvider[p] = { calls: 0, tokens: 0, totalLatency: 0, avgLatencyMs: 0 };
    }
    byProvider[p].calls++;
    byProvider[p].tokens += ev.totalTokens;
    byProvider[p].totalLatency += ev.latencyMs;
  }

  latencies.sort((a, b) => a - b);
  const p95Idx = Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95));
  const p95LatencyMs = latencies[p95Idx] || 0;

  const summaryByProvider: Record<string, { calls: number; tokens: number; avgLatencyMs: number }> = {};
  for (const [k, v] of Object.entries(byProvider)) {
    summaryByProvider[k] = {
      calls: v.calls,
      tokens: v.tokens,
      avgLatencyMs: v.calls > 0 ? Number((v.totalLatency / v.calls).toFixed(2)) : 0,
    };
  }

  return {
    totalCalls: events.length,
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens: totalPromptTokens + totalCompletionTokens,
    averageLatencyMs: Number((totalLatency / events.length).toFixed(2)),
    p95LatencyMs,
    cacheHitRate: Number((cacheHits / events.length).toFixed(4)),
    totalFallbacks: fallbacks,
    successRate: Number((successes / events.length).toFixed(4)),
    byProvider: summaryByProvider,
  };
}

/**
 * Resets the in-memory telemetry buffer.
 */
export function clearTelemetry(): void {
  telemetryStore.length = 0;
}
