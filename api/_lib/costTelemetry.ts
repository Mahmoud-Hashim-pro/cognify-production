/**
 * Phase C - Requirement 22: Cost Telemetry & Multi-Tenant Budget Enforcement
 * Cognify 2.0 Production Observability & Tracing Engine
 *
 * Calculates per-call estimated USD costs based on granular provider/model pricing,
 * and tracks aggregated tenant organization usage against monthly budget caps
 * with warning thresholds and automatic circuit breaking.
 */

export interface ModelPricing {
  promptCostPer1k: number;
  completionCostPer1k: number;
}

// Pricing table in USD per 1,000 tokens
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Google Gemini
  'gemini-2.5-flash': { promptCostPer1k: 0.000075, completionCostPer1k: 0.0003 },
  'gemini-2.5-flash-lite': { promptCostPer1k: 0.0000375, completionCostPer1k: 0.00015 },
  'gemini-2.0-flash': { promptCostPer1k: 0.0001, completionCostPer1k: 0.0004 },
  'gemini-flash-latest': { promptCostPer1k: 0.000075, completionCostPer1k: 0.0003 },

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
