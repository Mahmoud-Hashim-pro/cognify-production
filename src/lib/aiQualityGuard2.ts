/**
 * Milestone 18: AI Output Quality & Hallucination Guard 2.0 Engine
 * Self-healing Markdown & LaTeX syntax repairs, Adversarial Prompt Injection Defense,
 * Readability & Cognitive Load Stage Alignment, and Epistemic Grounding Verification.
 */

import type { CognitiveStage } from '../types/studentState';
import type {
  QualityGuardResult,
  RepairDetail,
  AdversarialThreatAssessment,
  ReadabilityMetric,
  GroundingAssessment
} from '../types/aiQuality';

// ============================================================================
// 1. Self-Healing Code & Markdown Block Repairs
// ============================================================================

export function repairMarkdownCodeBlocks(text: string): { repaired: string; repairs: RepairDetail[] } {
  const repairs: RepairDetail[] = [];
  let repaired = text;

  // 1. Balance triple backtick fences (```)
  const fenceMatches = repaired.match(/```/g);
  const fenceCount = fenceMatches ? fenceMatches.length : 0;

  if (fenceCount % 2 !== 0) {
    const originalTail = repaired.slice(-30);
    repaired = repaired + '\n```\n';
    repairs.push({
      type: 'code_block',
      description: 'Closed unclosed markdown code fence (```)',
      originalSnippet: originalTail,
      repairedSnippet: originalTail + '\n```\n'
    });
  }

  // 2. Balance stray single backticks (excluding inside triple fences)
  const nonBlockLines = repaired.split('```').filter((_, idx) => idx % 2 === 0);
  let strayCount = 0;
  for (const segment of nonBlockLines) {
    const singles = segment.match(/`/g);
    if (singles) strayCount += singles.length;
  }
  if (strayCount % 2 !== 0) {
    repaired = repaired + '`';
    repairs.push({
      type: 'code_block',
      description: 'Closed unclosed inline code backtick (`)',
      originalSnippet: repaired.slice(-15),
      repairedSnippet: repaired.slice(-15) + '`'
    });
  }

  return { repaired, repairs };
}

// ============================================================================
// 2. Self-Healing LaTeX Formula Repairs
// ============================================================================

export function repairLatexFormulas(text: string): { repaired: string; repairs: RepairDetail[] } {
  const repairs: RepairDetail[] = [];
  let repaired = text;

  // 1. Balance double dollar math delimiters ($$)
  const doubleMatches = repaired.match(/\$\$/g);
  const doubleCount = doubleMatches ? doubleMatches.length : 0;
  if (doubleCount % 2 !== 0) {
    repaired = repaired + '$$';
    repairs.push({
      type: 'latex',
      description: 'Closed unclosed display LaTeX delimiter ($$)',
      originalSnippet: repaired.slice(-25),
      repairedSnippet: repaired.slice(-25) + '$$'
    });
  }

  // 2. Balance single dollar inline math delimiters ($) outside of $$
  // Temporarily mask $$
  const masked = repaired.replace(/\$\$[\s\S]*?\$\$/g, match => '__DD_' + match.length + '__');
  const singleMatches = masked.match(/\$/g);
  const singleCount = singleMatches ? singleMatches.length : 0;
  if (singleCount % 2 !== 0) {
    repaired = repaired + '$';
    repairs.push({
      type: 'latex',
      description: 'Closed unclosed inline LaTeX delimiter ($)',
      originalSnippet: repaired.slice(-20),
      repairedSnippet: repaired.slice(-20) + '$'
    });
  }

  // 3. Balance unclosed braces in \frac or \sqrt
  // Example: \frac{a}{b -> \frac{a}{b}
  const fracPattern = /(\\frac\{[^{}]+)(\}(?!\{)|$)/g;
  if (/\\frac\{[^{}]+\}\s*\{[^{}]+$/.test(repaired)) {
    repaired = repaired + '}';
    repairs.push({
      type: 'latex',
      description: 'Closed missing right brace in LaTeX \\frac{}{}',
      originalSnippet: '\\frac{...}{...',
      repairedSnippet: '\\frac{...}{...}'
    });
  }

  return { repaired, repairs };
}

// ============================================================================
// 3. Adversarial Prompt Injection & Jailbreak Defense
// ============================================================================

const INJECTION_PATTERNS = [
  { regex: /ignore\s+(all\s+)?(previous\s+|your\s+)?instructions/i, name: 'instruction_override' },
  { regex: /disregard\s+(the\s+)?system\s+prompt/i, name: 'system_prompt_disregard' },
  { regex: /reveal\s+(the\s+)?(hidden\s+)?system\s+prompt/i, name: 'system_prompt_extraction' },
  { regex: /bypass\s+(all\s+)?(safety|security)\s+filters/i, name: 'safety_bypass' },
  { regex: /act\s+as\s+(dan|an\s+unrestricted\s+ai|developer\s+mode)/i, name: 'dan_jailbreak' },
  { regex: /hypothetical\s+unrestricted\s+scenario/i, name: 'hypothetical_jailbreak' },
  { regex: /execute\s+as\s+root\s+user/i, name: 'privilege_escalation' },
  { regex: /reveal\s+(all\s+)?(the\s+)?(api[_-]?keys?|secrets?|firebase(\s+credentials)?|gemini_key|service[_-]?account|credentials)/i, name: 'secret_extraction' },
  { regex: /(print|reveal|output)\s+(the\s+)?(raw\s+)?(student[_-]?state|internal[_-]?state|memory[_-]?store)/i, name: 'student_state_exfiltration' },
  { regex: /(access|reveal|fetch|show|give)\s+(me\s+)?(another\s+|other\s+|the\s+user['’]?s\s+)?(users?['’]?s?|students?['’]?s?|private)?\s*(data|memory|memories|profile|credentials)/i, name: 'cross_user_exfiltration' }
];

export function detectAndNeutralizeAdversarialInjection(text: string): AdversarialThreatAssessment {
  const matchedSignatures: string[] = [];
  let sanitizedText = text;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.regex.test(text)) {
      matchedSignatures.push(pattern.name);
      sanitizedText = sanitizedText.replace(pattern.regex, '[MALICIOUS_PROMPT_INJECTION_NEUTRALIZED]');
    }
  }

  let threatLevel: AdversarialThreatAssessment['threatLevel'] = 'none';
  if (
    matchedSignatures.length >= 2 ||
    matchedSignatures.includes('system_prompt_extraction') ||
    matchedSignatures.includes('safety_bypass') ||
    matchedSignatures.includes('secret_extraction') ||
    matchedSignatures.includes('student_state_exfiltration') ||
    matchedSignatures.includes('cross_user_exfiltration')
  ) {
    threatLevel = 'critical';
  } else if (matchedSignatures.length === 1) {
    threatLevel = 'medium';
  }

  return {
    threatLevel,
    attackSignaturesMatched: matchedSignatures,
    sanitized: matchedSignatures.length > 0,
    neutralizedText: sanitizedText
  };
}

// ============================================================================
// 4. Cognitive Readability & Stage Alignment
// ============================================================================

export const STAGE_READABILITY_LIMITS: Record<CognitiveStage, { maxAvgWordsPerSentence: number; maxIndex: number }> = {
  foundational: { maxAvgWordsPerSentence: 14, maxIndex: 40 },
  developing: { maxAvgWordsPerSentence: 20, maxIndex: 60 },
  proficient: { maxAvgWordsPerSentence: 28, maxIndex: 80 },
  advanced: { maxAvgWordsPerSentence: 40, maxIndex: 100 }
};

export function calculateCognitiveComplexity(
  text: string,
  stage: CognitiveStage = 'proficient'
): ReadabilityMetric {
  // Strip code blocks and LaTeX for linguistic readability
  const cleanedText = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^\$]+\$/g, ' ')
    .trim();

  const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  const charCount = words.reduce((acc, w) => acc + w.length, 0);
  const avgWordsPerSentence = parseFloat((wordCount / sentenceCount).toFixed(1));

  // Automated Readability Index (ARI) approximation scaled to 0-100
  const rawAri = 4.71 * (charCount / Math.max(1, wordCount)) + 0.5 * (wordCount / sentenceCount) - 21.43;
  const scaledIndex = Math.max(0, Math.min(100, Math.round(rawAri * 5)));

  const limit = STAGE_READABILITY_LIMITS[stage] || STAGE_READABILITY_LIMITS.proficient;
  const exceedsStageThreshold = avgWordsPerSentence > limit.maxAvgWordsPerSentence || scaledIndex > limit.maxIndex;

  return {
    wordCount,
    sentenceCount,
    charCount,
    avgWordsPerSentence,
    readabilityIndex: scaledIndex,
    exceedsStageThreshold,
    recommendedMaxWordsPerSentence: limit.maxAvgWordsPerSentence
  };
}

// ============================================================================
// 5. Epistemic Grounding & Hallucination Assessment
// ============================================================================

const HALLUCINATION_CUES = [
  /i\s+(might\s+be|am\s+probably)\s+making\s+this\s+up/i,
  /unverified\s+fact/i,
  /fabricated\s+citation/i,
  /not\s+a\s+real\s+function\s+in\s+standard\s+c/i
];

export function evaluateEpistemicGrounding(
  text: string,
  knownCurriculumConcepts: string[] = []
): GroundingAssessment {
  const flaggedUncertainties: string[] = [];

  for (const cue of HALLUCINATION_CUES) {
    if (cue.test(text)) {
      flaggedUncertainties.push(`Suspicious epistemic cue matched: ${cue.source}`);
    }
  }

  // Calculate curriculum grounding ratio if concepts provided
  let groundingRatio = 1.0;
  if (knownCurriculumConcepts.length > 0) {
    let conceptHits = 0;
    const lower = text.toLowerCase();
    for (const c of knownCurriculumConcepts) {
      if (lower.includes(c.toLowerCase().replace(/_/g, ' '))) {
        conceptHits++;
      }
    }
    // If concepts exist in curriculum, check relevance
    groundingRatio = conceptHits > 0 ? Math.min(1.0, 0.5 + (conceptHits * 0.15)) : 0.6;
  }

  const hallucinationRisk = flaggedUncertainties.length > 0
    ? Math.min(1.0, 0.4 + flaggedUncertainties.length * 0.3)
    : Math.max(0.05, 1.0 - groundingRatio);

  return {
    groundingScore: parseFloat(groundingRatio.toFixed(2)),
    hallucinationRisk: parseFloat(hallucinationRisk.toFixed(2)),
    flaggedUncertainties,
    isEpistemicallySafe: hallucinationRisk < 0.4 && flaggedUncertainties.length === 0
  };
}

// ============================================================================
// 6. Master Quality Guard Pipeline
// ============================================================================

export function runQualityGuardPipeline(
  rawText: string,
  studentStage: CognitiveStage = 'proficient',
  knownConcepts: string[] = []
): QualityGuardResult {
  const allRepairs: RepairDetail[] = [];

  // Step 1: Adversarial Prompt Injection Check
  const threatAssessment = detectAndNeutralizeAdversarialInjection(rawText);
  let currentText = threatAssessment.neutralizedText;

  if (threatAssessment.sanitized) {
    allRepairs.push({
      type: 'injection_scrub',
      description: `Neutralized adversarial injection signatures: ${threatAssessment.attackSignaturesMatched.join(', ')}`,
      originalSnippet: rawText.slice(0, 50),
      repairedSnippet: currentText.slice(0, 50)
    });
  }

  // Step 2: Self-Healing Code Blocks
  const codeRepair = repairMarkdownCodeBlocks(currentText);
  currentText = codeRepair.repaired;
  allRepairs.push(...codeRepair.repairs);

  // Step 3: Self-Healing LaTeX Delimiters
  const latexRepair = repairLatexFormulas(currentText);
  currentText = latexRepair.repaired;
  allRepairs.push(...latexRepair.repairs);

  // Step 4: Cognitive Readability & Stage Alignment
  const readability = calculateCognitiveComplexity(currentText, studentStage);

  // Step 5: Epistemic Grounding & Hallucination Assessment
  const grounding = evaluateEpistemicGrounding(currentText, knownConcepts);

  // Determine if automatic retry with simplified prompt is warranted
  const requiresSimplificationRetry = readability.exceedsStageThreshold;

  let pedagogicalRecommendation: string | undefined;
  if (requiresSimplificationRetry) {
    pedagogicalRecommendation = `Text complexity (avg ${readability.avgWordsPerSentence} words/sentence) exceeds ${studentStage} threshold (max ${readability.recommendedMaxWordsPerSentence}). Triggering pedagogical auto-simplification retry.`;
  }

  const isClean = allRepairs.length === 0 && threatAssessment.threatLevel === 'none' && !requiresSimplificationRetry && grounding.isEpistemicallySafe;

  return {
    isClean,
    originalText: rawText,
    repairedText: currentText,
    repairs: allRepairs,
    threatAssessment,
    readability,
    grounding,
    requiresSimplificationRetry,
    pedagogicalRecommendation
  };
}
