/**
 * Phase C - Requirement 25: Production Health & Uptime Check Endpoint
 * Cognify 2.0 Production Observability & Tracing Engine
 *
 * Route: GET /api/system/health
 * Returns HTTP 200 with structured JSON payload:
 * - uptime seconds
 * - memory RSS / heap statistics
 * - ISO timestamp
 * - circuit breaker status
 * - active provider health
 * - distributed x-cognify-trace-id header correlation
 */

import { applyCorsHeaders } from '../_lib/cors.js';
import { getOrGenerateTraceId, attachTraceId, X_COGNIFY_TRACE_ID } from '../_lib/tracing.js';

export interface MemoryStats {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  rssMb: number;
  heapUsedMb: number;
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unavailable';
  available: boolean;
  modelInRotation?: string;
  latencyEstimateMs?: number;
}

export interface CircuitBreakerStateSummary {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveFailures: number;
  totalTrippedCount: number;
}

export interface SystemHealthPayload {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  uptime: number; // alias
  timestamp: string;
  traceId: string;
  memory: MemoryStats;
  circuitBreakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  circuitBreakers: Record<string, CircuitBreakerStateSummary>;
  activeProviderHealth: Record<string, ProviderHealth>;
  providers: Record<string, ProviderHealth>; // alias
  environment: string;
  version: string;
}

// In-memory circuit breaker states for the API layer
const activeCircuitStates: Record<string, CircuitBreakerStateSummary> = {
  aiGateway: { state: 'CLOSED', consecutiveFailures: 0, totalTrippedCount: 0 },
  databaseHub: { state: 'CLOSED', consecutiveFailures: 0, totalTrippedCount: 0 },
  cacheLayer: { state: 'CLOSED', consecutiveFailures: 0, totalTrippedCount: 0 },
};

/**
 * Allows updating circuit state in tests or health monitoring agents.
 */
export function setCircuitBreakerHealth(service: string, summary: Partial<CircuitBreakerStateSummary>): void {
  if (activeCircuitStates[service]) {
    activeCircuitStates[service] = { ...activeCircuitStates[service], ...summary };
  } else {
    activeCircuitStates[service] = {
      state: 'CLOSED',
      consecutiveFailures: 0,
      totalTrippedCount: 0,
      ...summary,
    };
  }
}

/**
 * Resets all circuit states to CLOSED for tests.
 */
export function resetCircuitBreakerHealth(): void {
  for (const key of Object.keys(activeCircuitStates)) {
    activeCircuitStates[key] = { state: 'CLOSED', consecutiveFailures: 0, totalTrippedCount: 0 };
  }
}

/**
 * Builds the complete structured system health payload.
 */
export function getSystemHealthReport(traceId?: string): SystemHealthPayload {
  const currentTraceId = traceId || getOrGenerateTraceId();
  const uptimeSeconds = typeof process !== 'undefined' && typeof process.uptime === 'function'
    ? Math.floor(process.uptime())
    : 0;

  const rawMem = typeof process !== 'undefined' && typeof process.memoryUsage === 'function'
    ? process.memoryUsage()
    : { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 };

  const memory: MemoryStats = {
    rss: rawMem.rss,
    heapTotal: rawMem.heapTotal,
    heapUsed: rawMem.heapUsed,
    external: rawMem.external,
    rssMb: Number((rawMem.rss / (1024 * 1024)).toFixed(2)),
    heapUsedMb: Number((rawMem.heapUsed / (1024 * 1024)).toFixed(2)),
  };

  // Inspect circuit breakers: if any OPEN -> degraded/unhealthy
  let overallCircuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  for (const cb of Object.values(activeCircuitStates)) {
    if (cb.state === 'OPEN') {
      overallCircuitState = 'OPEN';
      break;
    } else if (cb.state === 'HALF_OPEN') {
      overallCircuitState = 'HALF_OPEN';
    }
  }

  // Active providers health check
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY;
  const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
  const xaiKey = process.env.XAI_API_KEY || process.env.VITE_XAI_API_KEY;

  const activeProviderHealth: Record<string, ProviderHealth> = {
    gemini: {
      status: geminiKey ? 'healthy' : 'unavailable',
      available: Boolean(geminiKey),
      modelInRotation: 'gemini-2.5-flash',
      latencyEstimateMs: 120,
    },
    nvidia: {
      status: nvidiaKey ? 'healthy' : 'unavailable',
      available: Boolean(nvidiaKey),
      modelInRotation: 'z-ai/glm-5.2',
      latencyEstimateMs: 340,
    },
    groq: {
      status: groqKey ? 'healthy' : 'unavailable',
      available: Boolean(groqKey),
      modelInRotation: 'llama-3.3-70b-versatile',
      latencyEstimateMs: 95,
    },
    xai: {
      status: xaiKey ? 'healthy' : 'unavailable',
      available: Boolean(xaiKey),
      modelInRotation: 'grok-2-latest',
      latencyEstimateMs: 280,
    },
  };

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (overallCircuitState === 'OPEN') {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    uptimeSeconds,
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    traceId: currentTraceId,
    memory,
    circuitBreakerStatus: overallCircuitState,
    circuitBreakers: { ...activeCircuitStates },
    activeProviderHealth,
    providers: activeProviderHealth,
    environment: process.env.NODE_ENV || 'production',
    version: '2.0.0',
  };
}

/**
 * Serverless HTTP Handler for /api/system/health
 */
export default async function handler(req: any, res: any) {
  // 1. CORS headers
  if (applyCorsHeaders && !applyCorsHeaders(req, res)) {
    return;
  }

  // 2. Trace correlation ID
  const traceId = getOrGenerateTraceId(req);
  attachTraceId(res, traceId);

  // 3. Response caching headers
  res.setHeader?.('Content-Type', 'application/json');
  res.setHeader?.('Cache-Control', 'no-cache, no-store, must-revalidate');

  try {
    const healthPayload = getSystemHealthReport(traceId);
    res.status ? res.status(200).json(healthPayload) : res.end(JSON.stringify(healthPayload));
  } catch (err: any) {
    const errorPayload = {
      status: 'unhealthy',
      error: err?.message || 'Internal health probe failure',
      traceId,
      timestamp: new Date().toISOString(),
    };
    res.status ? res.status(500).json(errorPayload) : res.end(JSON.stringify(errorPayload));
  }
}
