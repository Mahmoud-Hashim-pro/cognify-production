/**
 * Phase C - Requirement 22: Cost Telemetry & Multi-Tenant Budget Enforcement
 * Rafiqi 2.0 Production Observability & Tracing Engine
 *
 * Calculates per-call estimated USD costs based on granular provider/model pricing,
 * and tracks aggregated tenant organization usage against monthly budget caps
 * with warning thresholds and automatic circuit breaking.
 */

export interface ModelPricing {
  promptCostPer1k: number;
  completionCostPer1k: number;
}

// Pricing table in USD per 1,000 tokens.
// Gemini numbers follow https://ai.google.dev/gemini-api/docs/pricing (checked Nov 2026):
// gemini-2.5-flash $0.30/1M input, $2.50/1M output (incl. thinking); flash-lite and
// 2.0-flash $0.10/1M input, $0.40/1M output; 1.5-flash legacy $0.075/1M, $0.30/1M.
// Prompt token counts include image and audio tokens as reported by usageMetadata.
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Google Gemini
  'gemini-2.5-flash': { promptCostPer1k: 0.0003, completionCostPer1k: 0.0025 },
  'gemini-2.5-flash-lite': { promptCostPer1k: 0.0001, completionCostPer1k: 0.0004 },
  'gemini-2.0-flash': { promptCostPer1k: 0.0001, completionCostPer1k: 0.0004 },
  'gemini-1.5-flash': { promptCostPer1k: 0.000075, completionCostPer1k: 0.0003 },
  'gemini-flash-latest': { promptCostPer1k: 0.0003, completionCostPer1k: 0.0025 },

  // Groq Cloud
  'llama-3.3-70b-versatile': { promptCostPer1k: 0.00059, completionCostPer1k: 0.00079 },
  'llama-3.1-8b-instant': { promptCostPer1k: 0.00005, completionCostPer1k: 0.00008 },

  // NVIDIA NIM
  'z-ai/glm-5.2': { promptCostPer1k: 0.001, completionCostPer1k: 0.002 },
  'deepseek-ai/deepseek-r1': { promptCostPer1k: 0.00055, completionCostPer1k: 0.00219 },
  'meta/llama-3.3-70b-instruct': { promptCostPer1k: 0.0007, completionCostPer1k: 0.0009 },

  // xAI / Grok
  'grok-2-latest': { promptCostPer1k: 0.002, completionCostPer1k: 0.01 },

  // Fallback default
  default: { promptCostPer1k: 0.0005, completionCostPer1k: 0.0015 },
};

export interface OrgBudgetUsage {
  orgId: string;
  monthKey: string; // e.g. "2026-09"
  monthlyCapUsd: number;
  totalSpendUsd: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  callCount: number;
  warningThresholdPercent: number; // default 80%
  lastUpdated: string;
}

export interface BudgetEvaluation {
  allowed: boolean;
  orgId: string;
  currentSpendUsd: number;
  monthlyCapUsd: number;
  remainingBudgetUsd: number;
  percentUsed: number;
  isWarning: boolean;
  isExceeded: boolean;
  reason?: string;
}

// In-memory tenant budget ledger
const orgBudgets = new Map<string, OrgBudgetUsage>();

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Resolves pricing definition for a given model identifier.
 */
export function getModelPricing(modelName: string): ModelPricing {
  const clean = (modelName || '').trim().toLowerCase();
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (key.toLowerCase() === clean) {
      return pricing;
    }
  }

  // Prefix or partial match
  if (clean.includes('flash')) return MODEL_PRICING['gemini-2.5-flash'];
  if (clean.includes('deepseek')) return MODEL_PRICING['deepseek-ai/deepseek-r1'];
  if (clean.includes('glm')) return MODEL_PRICING['z-ai/glm-5.2'];
  if (clean.includes('70b')) return MODEL_PRICING['llama-3.3-70b-versatile'];
  if (clean.includes('8b')) return MODEL_PRICING['llama-3.1-8b-instant'];
  if (clean.includes('grok')) return MODEL_PRICING['grok-2-latest'];

  return MODEL_PRICING.default;
}

/**
 * Computes estimated USD cost for a single AI invocation
 * given token counts and model pricing.
 */
export function calculateCallCostUsd(
  modelName: string,
  promptTokens: number,
  completionTokens: number,
  provider?: string
): number {
  const pricing = getModelPricing(modelName);
  const promptK = Math.max(0, promptTokens) / 1000;
  const completionK = Math.max(0, completionTokens) / 1000;

  const cost = promptK * pricing.promptCostPer1k + completionK * pricing.completionCostPer1k;
  return Number(cost.toFixed(6));
}

/**
 * Sets or updates the monthly budget cap for an organization.
 */
export function setOrgBudgetCap(
  orgId: string,
  monthlyCapUsd: number,
  warningThresholdPercent = 80
): OrgBudgetUsage {
  const monthKey = getCurrentMonthKey();
  const existing = orgBudgets.get(orgId);

  const usage: OrgBudgetUsage = existing
    ? {
        ...existing,
        monthlyCapUsd: Math.max(0, monthlyCapUsd),
        warningThresholdPercent,
        lastUpdated: new Date().toISOString(),
      }
    : {
        orgId,
        monthKey,
        monthlyCapUsd: Math.max(0, monthlyCapUsd),
        totalSpendUsd: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        callCount: 0,
        warningThresholdPercent,
        lastUpdated: new Date().toISOString(),
      };

  orgBudgets.set(orgId, usage);
  return usage;
}

/**
 * Records an AI call's spend against the organization's monthly ledger.
 */
export function recordOrgUsage(
  orgId: string,
  costUsd: number,
  tokens?: { promptTokens?: number; completionTokens?: number }
): OrgBudgetUsage {
  const monthKey = getCurrentMonthKey();
  let usage = orgBudgets.get(orgId);

  if (!usage || usage.monthKey !== monthKey) {
    usage = {
      orgId,
      monthKey,
      monthlyCapUsd: usage ? usage.monthlyCapUsd : 50.0, // Default $50 monthly cap
      totalSpendUsd: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      callCount: 0,
      warningThresholdPercent: usage ? usage.warningThresholdPercent : 80,
      lastUpdated: new Date().toISOString(),
    };
  }

  usage.totalSpendUsd = Number((usage.totalSpendUsd + Math.max(0, costUsd)).toFixed(6));
  usage.totalPromptTokens += Math.max(0, tokens?.promptTokens || 0);
  usage.totalCompletionTokens += Math.max(0, tokens?.completionTokens || 0);
  usage.callCount += 1;
  usage.lastUpdated = new Date().toISOString();

  orgBudgets.set(orgId, usage);
  return usage;
}

/**
 * Retrieves the current month's budget usage for an organization.
 */
export function getOrgBudgetUsage(orgId: string): OrgBudgetUsage {
  const monthKey = getCurrentMonthKey();
  const existing = orgBudgets.get(orgId);

  if (existing && existing.monthKey === monthKey) {
    return existing;
  }

  // Default record if none exists
  return {
    orgId,
    monthKey,
    monthlyCapUsd: existing?.monthlyCapUsd || 50.0,
    totalSpendUsd: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    callCount: 0,
    warningThresholdPercent: 80,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Evaluates whether an organization has remaining budget to perform an AI call.
 */
export function checkBudgetAllowed(orgId: string, estimatedCallCostUsd = 0): BudgetEvaluation {
  const usage = getOrgBudgetUsage(orgId);
  const projectedSpend = Number((usage.totalSpendUsd + Math.max(0, estimatedCallCostUsd)).toFixed(6));
  const remainingBudget = Number(Math.max(0, usage.monthlyCapUsd - usage.totalSpendUsd).toFixed(6));
  const percentUsed = usage.monthlyCapUsd > 0
    ? Number(((usage.totalSpendUsd / usage.monthlyCapUsd) * 100).toFixed(2))
    : 100;

  const isExceeded = projectedSpend > usage.monthlyCapUsd;
  const isWarning = percentUsed >= usage.warningThresholdPercent;

  let reason: string | undefined;
  if (isExceeded) {
    reason = `Monthly budget cap of $${usage.monthlyCapUsd.toFixed(2)} exceeded. Current spend: $${usage.totalSpendUsd.toFixed(4)}. Call cost: $${estimatedCallCostUsd.toFixed(4)}.`;
  } else if (isWarning) {
    reason = `Organization spend has reached ${percentUsed.toFixed(1)}% of monthly budget cap ($${usage.monthlyCapUsd.toFixed(2)}).`;
  }

  return {
    allowed: !isExceeded,
    orgId,
    currentSpendUsd: usage.totalSpendUsd,
    monthlyCapUsd: usage.monthlyCapUsd,
    remainingBudgetUsd: remainingBudget,
    percentUsed,
    isWarning,
    isExceeded,
    reason,
  };
}

/**
 * Retrieves all tracked organization budget usage records.
 */
export function getAllOrgUsages(): OrgBudgetUsage[] {
  return Array.from(orgBudgets.values());
}

/**
 * Resets all organization budget records (for testing & verification).
 */
export function resetOrgBudgets(): void {
  orgBudgets.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// Distributed budget ledger (Upstash Redis)
//
// The in-memory Map above resets on every serverless cold start, so in
// production it cannot enforce a real monthly cap. When
// UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN are configured, the ledger
// lives in a Redis hash (cognify:budget:{orgId}:{monthKey}) shared by every
// instance. Without Redis it falls back to the in-memory ledger (local dev),
// logging loudly in production so a missing env var never passes silently.
//
// Note on storage choice: the API has no Firebase Admin SDK and Firestore REST
// writes run under the caller's security rules, which cannot share one org-wide
// ledger document across users. Redis (already used by rateLimiter.ts) gives
// atomic cross-instance accounting with the same infra.
// ─────────────────────────────────────────────────────────────────────────────

const UPSTASH_URL = () => (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const UPSTASH_TOKEN = () => process.env.UPSTASH_REDIS_REST_TOKEN || '';

/** The single tenant this deployment bills under (Rafiqi is single-org). */
export const BUDGET_ORG_ID = () => process.env.RAFIQI_ORG_ID || 'global';

const DEFAULT_MONTHLY_CAP_USD = () => {
  const n = Number(process.env.RAFIQI_MONTHLY_BUDGET_USD || '50');
  return Number.isFinite(n) && n > 0 ? n : 50;
};

/** Seconds until the 10th of next month: outlives the monthKey, self-cleans. */
function ledgerTtlSeconds(): number {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 10, 0, 0, 0, 0));
  return Math.max(3600, Math.round((end.getTime() - now.getTime()) / 1000));
}

// Atomically initialize the hash (cap only on first write), optionally record a
// call, refresh TTL, and return all fields. Micro-dollars keep math exact.
const LEDGER_LUA = `
local key = KEYS[1]
redis.call('HSETNX', key, 'capMicro', ARGV[1])
redis.call('HSETNX', key, 'warnPct', ARGV[2])
local spend = tonumber(ARGV[3])
local pt = tonumber(ARGV[4])
local ct = tonumber(ARGV[5])
if spend > 0 then redis.call('HINCRBY', key, 'spendMicro', spend) end
if pt > 0 then redis.call('HINCRBY', key, 'promptTokens', pt) end
if ct > 0 then redis.call('HINCRBY', key, 'completionTokens', ct) end
if spend > 0 or pt > 0 or ct > 0 then redis.call('HINCRBY', key, 'callCount', 1) end
redis.call('EXPIRE', key, ARGV[6])
return redis.call('HGETALL', key)
`;

interface LedgerFields {
  capMicro: number;
  warnPct: number;
  spendMicro: number;
  promptTokens: number;
  completionTokens: number;
  callCount: number;
}

async function ledgerEval(
  orgId: string,
  record?: { costUsd: number; promptTokens: number; completionTokens: number }
): Promise<LedgerFields | null> {
  const url = UPSTASH_URL();
  const token = UPSTASH_TOKEN();
  if (!url || !token) return null;

  const key = `cognify:budget:${orgId}:${getCurrentMonthKey()}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      command: 'EVAL',
      args: [
        LEDGER_LUA,
        '1',
        key,
        String(Math.round(DEFAULT_MONTHLY_CAP_USD() * 1e6)),
        '80',
        String(Math.round(Math.max(0, record?.costUsd || 0) * 1e6)),
        String(Math.max(0, Math.round(record?.promptTokens || 0))),
        String(Math.max(0, Math.round(record?.completionTokens || 0))),
        String(ledgerTtlSeconds()),
      ],
    }),
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error(`Upstash HTTP ${response.status}`);
  const payload = await response.json();
  const arr: string[] = Array.isArray(payload?.result) ? payload.result : [];
  const map: Record<string, string> = {};
  for (let i = 0; i + 1 < arr.length; i += 2) map[arr[i]] = arr[i + 1];
  return {
    capMicro: Number(map.capMicro || DEFAULT_MONTHLY_CAP_USD() * 1e6),
    warnPct: Number(map.warnPct || 80),
    spendMicro: Number(map.spendMicro || 0),
    promptTokens: Number(map.promptTokens || 0),
    completionTokens: Number(map.completionTokens || 0),
    callCount: Number(map.callCount || 0),
  };
}

let warnedNoRedis = false;
function warnNoRedisOnce(): void {
  if (warnedNoRedis) return;
  warnedNoRedis = true;
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[costTelemetry] UPSTASH_REDIS_REST_URL/TOKEN not configured: monthly budget ledger is per-instance memory only. Set the env vars for real enforcement.'
    );
  }
}

function evaluationFromSpend(orgId: string, spendUsd: number, capUsd: number, warnPct: number, estimatedCallCostUsd: number): BudgetEvaluation {
  const projected = spendUsd + Math.max(0, estimatedCallCostUsd);
  const percentUsed = capUsd > 0 ? Number(((spendUsd / capUsd) * 100).toFixed(2)) : 100;
  const isExceeded = projected > capUsd;
  const isWarning = percentUsed >= warnPct;
  return {
    allowed: !isExceeded,
    orgId,
    currentSpendUsd: Number(spendUsd.toFixed(6)),
    monthlyCapUsd: capUsd,
    remainingBudgetUsd: Number(Math.max(0, capUsd - spendUsd).toFixed(6)),
    percentUsed,
    isWarning,
    isExceeded,
    reason: isExceeded
      ? `Monthly budget cap of $${capUsd.toFixed(2)} exceeded. Current spend: $${spendUsd.toFixed(4)}.`
      : isWarning
        ? `Organization spend has reached ${percentUsed.toFixed(1)}% of monthly budget cap ($${capUsd.toFixed(2)}).`
        : undefined,
  };
}

/**
 * Distributed budget check. Use inside the API guard before any server-key AI
 * call; returns 429-worthy evaluation when the monthly cap is spent.
 * Falls back to the in-memory ledger when Redis is not configured (dev only).
 */
export async function checkBudgetAllowedDistributed(
  orgId: string = BUDGET_ORG_ID(),
  estimatedCallCostUsd = 0
): Promise<BudgetEvaluation> {
  if (!UPSTASH_URL() || !UPSTASH_TOKEN()) {
    warnNoRedisOnce();
    return checkBudgetAllowed(orgId, estimatedCallCostUsd);
  }
  try {
    const f = await ledgerEval(orgId);
    if (!f) throw new Error('empty ledger');
    return evaluationFromSpend(orgId, f.spendMicro / 1e6, f.capMicro / 1e6, f.warnPct, estimatedCallCostUsd);
  } catch (err) {
    console.error(`[costTelemetry] Redis ledger unavailable (${err instanceof Error ? err.name : 'error'}); using in-memory fallback for this check.`);
    return checkBudgetAllowed(orgId, estimatedCallCostUsd);
  }
}

/**
 * Record one AI call's actual spend (from usageMetadata, not estimates) against
 * the distributed monthly ledger. Fire-and-forget safe: never throws.
 */
export async function recordOrgUsageDistributed(
  orgId: string = BUDGET_ORG_ID(),
  costUsd: number,
  tokens?: { promptTokens?: number; completionTokens?: number }
): Promise<void> {
  const rec = {
    costUsd: Math.max(0, costUsd),
    promptTokens: Math.max(0, tokens?.promptTokens || 0),
    completionTokens: Math.max(0, tokens?.completionTokens || 0),
  };
  if (!UPSTASH_URL() || !UPSTASH_TOKEN()) {
    warnNoRedisOnce();
    recordOrgUsage(orgId, rec.costUsd, tokens);
    return;
  }
  try {
    await ledgerEval(orgId, rec);
  } catch (err) {
    console.error(`[costTelemetry] Redis ledger write failed (${err instanceof Error ? err.name : 'error'}); recorded in memory only.`);
    recordOrgUsage(orgId, rec.costUsd, tokens);
  }
}
