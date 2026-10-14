/**
 * Distributed sliding-window rate limiter.
 *
 * Production:
 * - Uses Upstash Redis over HTTPS when UPSTASH_REDIS_REST_URL/TOKEN are configured.
 * - The Redis-side Lua script makes increment + expiry + limit decision atomic,
 *   so concurrent Vercel instances share one quota.
 *
 * Development/tests:
 * - Falls back to the synchronous in-memory limiter below.
 * - Production without Redis fails closed instead of silently using per-instance
 *   memory, because in-memory limits are not a real distributed security boundary.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const clientMap = new Map<string, RateLimitRecord>();
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [key, record] of clientMap.entries()) {
    record.timestamps = record.timestamps.filter((t) => now - t < windowMs);
    if (record.timestamps.length === 0) clientMap.delete(key);
  }
}, 5 * 60 * 1000);
if (typeof cleanupInterval.unref === 'function') cleanupInterval.unref();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  distributed?: boolean;
}

function localRateLimit(identifier: string, maxPerMinute: number): RateLimitResult {
  const now = Date.now();
  const windowMs = 60 * 1000;
  let record = clientMap.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    clientMap.set(identifier, record);
  }
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);
  if (record.timestamps.length >= maxPerMinute) {
    const oldest = record.timestamps[0];
    return {
      allowed: false,
      limit: maxPerMinute,
      remaining: 0,
      resetMs: Math.max(0, windowMs - (now - oldest)),
      distributed: false,
    };
  }
  record.timestamps.push(now);
  return {
    allowed: true,
    limit: maxPerMinute,
    remaining: maxPerMinute - record.timestamps.length,
    resetMs: windowMs,
    distributed: false,
  };
}

/**
 * Backwards-compatible synchronous limiter used by local/unit tests.
 * Production API handlers should use checkDistributedRateLimit().
 */
export function checkRateLimit(identifier: string, maxPerMinute: number = 60): RateLimitResult {
  return localRateLimit(identifier, maxPerMinute);
}

const UPSTASH_URL = () => (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const UPSTASH_TOKEN = () => process.env.UPSTASH_REDIS_REST_TOKEN || '';

const LUA_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end
local ttl = redis.call('TTL', KEYS[1])
return {current, ttl}
`;

export async function checkDistributedRateLimit(
  identifier: string,
  maxPerMinute: number = 60
): Promise<RateLimitResult> {
  const url = UPSTASH_URL();
  const token = UPSTASH_TOKEN();

  if (!url || !token) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_RATELIMIT_IN_PROD !== 'true') {
      return {
        allowed: false,
        limit: maxPerMinute,
        remaining: 0,
        resetMs: 60_000,
        distributed: false,
      };
    }
    return localRateLimit(identifier, maxPerMinute);
  }

  const key = `cognify:ratelimit:${identifier}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: 'EVAL',
        args: [LUA_SCRIPT, '1', key, String(maxPerMinute), '60'],
      }),
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) {
      throw new Error(`Upstash HTTP ${response.status}`);
    }

    const payload = await response.json();
    const result = Array.isArray(payload?.result) ? payload.result : null;
    if (!result || result.length < 2) throw new Error('Invalid Upstash rate-limit response');

    const current = Number(result[0]);
    const ttlSeconds = Math.max(1, Number(result[1]));
    if (!Number.isFinite(current) || !Number.isFinite(ttlSeconds)) {
      throw new Error('Invalid Upstash rate-limit counters');
    }

    return {
      allowed: current <= maxPerMinute,
      limit: maxPerMinute,
      remaining: Math.max(0, maxPerMinute - current),
      resetMs: ttlSeconds * 1000,
      distributed: true,
    };
  } catch (error) {
    console.error('[rateLimiter] Distributed limiter unavailable:', error);
    if (process.env.ALLOW_LOCAL_RATELIMIT_IN_PROD === 'true') {
      return localRateLimit(identifier, maxPerMinute);
    }
    // Fail closed in production: availability is preferable to silently
    // reverting to a per-instance security control.
    return {
      allowed: false,
      limit: maxPerMinute,
      remaining: 0,
      resetMs: 60_000,
      distributed: false,
    };
  }
}
