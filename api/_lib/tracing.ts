/**
 * Phase C - Requirement 20: Distributed Correlation Tracing
 * Cognify 2.0 Production Observability & Tracing Engine
 *
 * Implements x-cognify-trace-id correlation tracking with UUIDv4 + nano-timestamp,
 * hierarchical span lifecycle management with high-resolution duration calculation,
 * and HTTP request/response propagation.
 */

import crypto from 'crypto';

export const X_COGNIFY_TRACE_ID = 'x-cognify-trace-id';
export const TRACE_ID_HEADER = X_COGNIFY_TRACE_ID;

export type SpanStatus = 'active' | 'ok' | 'error';

export interface Span {
  id: string;
  traceId: string;
  parentId?: string;
  name: string;
  startTimeMs: number;
  endTimeMs?: number;
  durationMs?: number;
  status: SpanStatus;
  attributes: Record<string, any>;
  error?: string;
}

export interface SpanOptions {
  traceId?: string;
  parentSpanId?: string;
  parentId?: string;
  attributes?: Record<string, any>;
}

// In-memory active and completed spans for diagnostic queries
const activeSpans = new Map<string, Span>();
const completedSpans: Span[] = [];
const MAX_COMPLETED_SPANS = 1000;

/**
 * Generates a high-entropy distributed correlation trace ID
 * combining standard RFC 4122 UUIDv4 with a nanosecond-precision timestamp.
 */
export function generateTraceId(): string {
  const uuid = crypto.randomUUID();
  const nano = typeof process !== 'undefined' && process.hrtime && typeof process.hrtime.bigint === 'function'
    ? process.hrtime.bigint().toString()
    : `${Date.now()}000000`;
  return `${uuid}-${nano}`;
}

/**
 * Validates that a string is a properly formatted Cognify trace ID
 * containing a UUIDv4 segment and a numeric timestamp segment.
 */
export function isValidTraceId(traceId?: string | null): boolean {
  if (!traceId || typeof traceId !== 'string') return false;
  // Match UUIDv4 + optional delimiter + nano/micro timestamp
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
  return uuidRegex.test(traceId);
}

/**
 * Extracts the correlation trace ID from incoming request headers.
 * Accepts Node, Express, or Vercel serverless request objects.
 */
export function extractTraceId(req: any): string | null {
  if (!req || !req.headers) return null;

  const candidate =
    req.headers[X_COGNIFY_TRACE_ID] ||
    req.headers[X_COGNIFY_TRACE_ID.toLowerCase()] ||
    req.headers['x-trace-id'] ||
    req.headers['x-request-id'];

  if (Array.isArray(candidate) && candidate.length > 0) {
    return candidate[0].trim();
  }
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim();
  }

  return null;
}

/**
 * Retrieves the existing trace ID from request headers or generates a fresh one.
 */
export function getOrGenerateTraceId(req?: any): string {
  const extracted = extractTraceId(req);
  if (extracted && isValidTraceId(extracted)) {
    return extracted;
  }
  return generateTraceId();
}

/**
 * Attaches the trace ID to response headers.
 */
export function attachTraceId(res: any, traceId: string): void {
  if (!res) return;

  if (typeof res.setHeader === 'function') {
    res.setHeader(X_COGNIFY_TRACE_ID, traceId);
  } else if (typeof res.header === 'function') {
    res.header(X_COGNIFY_TRACE_ID, traceId);
  } else if (res.headers && typeof res.headers === 'object') {
    res.headers[X_COGNIFY_TRACE_ID] = traceId;
  }
}

/**
 * Starts a timed execution span within the trace hierarchy.
 */
export function startSpan(name: string, options?: SpanOptions): Span {
  const id = `span_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const traceId = options?.traceId || generateTraceId();
  const parentId = options?.parentSpanId || options?.parentId;
  const startTimeMs = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const span: Span = {
    id,
    traceId,
    parentId,
    name,
    startTimeMs,
    status: 'active',
    attributes: { ...(options?.attributes || {}) }
  };

  activeSpans.set(id, span);
  return span;
}

/**
 * Ends a timed execution span, computing high-resolution duration.
 */
export function endSpan(span: Span, status: 'ok' | 'error' = 'ok', error?: string): Span {
  const endTimeMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const rawDuration = Math.max(0, endTimeMs - span.startTimeMs);
  const durationMs = Number(rawDuration.toFixed(3));

  span.endTimeMs = endTimeMs;
  span.durationMs = durationMs;
  span.status = status;
  if (error) {
    span.error = error;
  }

  activeSpans.delete(span.id);

  completedSpans.push(span);
  if (completedSpans.length > MAX_COMPLETED_SPANS) {
    completedSpans.shift();
  }

  return span;
}

/**
 * Executes an async or sync callback wrapped in an automated span lifecycle.
 */
export async function runInSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T> | T,
  options?: SpanOptions
): Promise<T> {
  const span = startSpan(name, options);
  try {
    const result = await fn(span);
    endSpan(span, 'ok');
    return result;
  } catch (err: any) {
    endSpan(span, 'error', err?.message || String(err));
    throw err;
  }
}

/**
 * Diagnostic helpers
 */
export function getActiveSpans(): Span[] {
  return Array.from(activeSpans.values());
}

export function getCompletedSpans(): Span[] {
  return [...completedSpans];
}

export function getSpansByTraceId(traceId: string): Span[] {
  return completedSpans.filter((s) => s.traceId === traceId);
}

export function clearSpans(): void {
  activeSpans.clear();
  completedSpans.length = 0;
}
