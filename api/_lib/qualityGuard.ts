/**
 * AI Output Quality Guard (Point 10)
 * Validates, repairs, and sanitizes model output before delivery to the student.
 * Ensures accessibility compliance, repairs broken markdown/LaTeX, and guards against empty/refusal loops.
 */

export interface QualityValidationResult {
  text: string;
  isValid: boolean;
  warnings: string[];
}

export interface QualityCheckOptions {
  accessibilityMode?: string;
  language?: string;
  cognitiveStage?: string;
}

export function validateAndSanitizeResponse(
  rawText: string,
  options: QualityCheckOptions = {}
): QualityValidationResult {
  const warnings: string[] = [];

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    const isAr = options.language === 'Arabic' || options.language === 'Egyptian Ammiya';
    return {
      text: isAr
        ? 'مقدرتش أكمل الإجابة، جرب تاني.'
        : 'Apologies, I was unable to generate a complete answer. Please rephrase or try again.',
      isValid: false,
      warnings: ['EMPTY_RESPONSE'],
    };
  }

  let sanitized = rawText.trim();

  // 1. Repair unclosed code blocks (```)
  const codeBlockMatches = sanitized.match(/```/g);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    sanitized += '\n```';
    warnings.push('REPAIRED_UNCLOSED_CODE_BLOCK');
  }

  // 2. Repair unclosed LaTeX display math ($$)
  const mathMatches = sanitized.match(/\$\$/g);
  if (mathMatches && mathMatches.length % 2 !== 0) {
    sanitized += '$$';
    warnings.push('REPAIRED_UNCLOSED_LATEX_BLOCK');
  }

  // 3. Accessibility Modality Sanitation
  const a11y = options.accessibilityMode;
  if (a11y === 'Visual') {
    // For blind students using screen readers / TTS:
    // Strip complex ASCII art or repetitive markdown divider lines
    sanitized = sanitized
      .replace(/\|[-:\s|]+\|/g, '') // remove markdown table header dividers
      .replace(/_{3,}/g, '')
      .replace(/={3,}/g, '');
  } else if (a11y === 'Vocal-Deaf' || a11y === 'Sign-Only') {
    // For deaf students: remove any legacy fake sign emojis in brackets
    sanitized = sanitized.replace(/\[\s*(?:sign|hand|gesture|emoji)[\w\s-]*\]/gi, '');
  }

  // 4. Refusal Loop Detection
  const refusalSignatures = [
    /as an ai language model/i,
    /as an ai model/i,
    /i cannot assist with this request/i,
  ];
  for (const sig of refusalSignatures) {
    if (sig.test(sanitized)) {
      warnings.push('REFUSAL_SIGNATURE_DETECTED');
      break;
    }
  }

  // 5. Sensitive Secret / Key Leakage Redaction (OWASP LLM02: Sensitive Information Disclosure)
  const secretPatterns = [
    { regex: /AIza[0-9A-Za-z-_]{30,}/g, name: 'GOOGLE_API_KEY_LEAK' },
    { regex: /gsk_[0-9A-Za-z]{30,}/g, name: 'GROQ_API_KEY_LEAK' },
    { regex: /nvapi-[0-9A-Za-z-_]{30,}/g, name: 'NVIDIA_API_KEY_LEAK' },
    { regex: /xai-[0-9A-Za-z-_]{30,}/g, name: 'XAI_API_KEY_LEAK' },
    { regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, name: 'PRIVATE_KEY_LEAK' },
  ];

  for (const sp of secretPatterns) {
    sp.regex.lastIndex = 0;
    if (sp.regex.test(sanitized)) {
      warnings.push(`LEAKED_SECRET_REDACTED:${sp.name}`);
      sp.regex.lastIndex = 0;
      sanitized = sanitized.replace(sp.regex, '[REDACTED_SECRET]');
    }
  }

  // 6. Uncertain visual reading guard: numbers + hedging language in a Visual
  // mode answer (currency denominations, medicine strengths, expiry dates)
  // means the user could act on a wrong number. Mark it uncertain, advise
  // double-checking with a sighted person, and log a warning.
  if (a11y === 'Visual') {
    const hasDigits = /[0-9٠-٩]/.test(sanitized);
    const hedgedAr = /غالبًا|غالباً|ممكن|مش واضح|مش متأكد|على الأرجح/.test(sanitized);
    const hedgedEn = /probably|maybe|might be|not sure|unclear|i can't confirm|i cannot confirm/i.test(sanitized);
    const hedgedFr = /probablement|peut-être|pas sûr|pas clair|je ne peux pas confirmer/i.test(sanitized);
    if (hasDigits && (hedgedAr || hedgedEn || hedgedFr)) {
      warnings.push('UNCERTAIN_NUMERIC_READING');
      console.warn('[qualityGuard] Uncertain numeric visual reading flagged for sighted verification.');
      const isAr = options.language === 'Arabic' || options.language === 'Egyptian Ammiya';
      const alreadyAdvises = /راجع مع حد|double-check with someone|vérifiez avec quelqu/i.test(sanitized);
      if (!alreadyAdvises) {
        sanitized += isAr
          ? '\nراجع مع حد يشوف قبل ما تعتمد على الرقم ده.'
          : options.language === 'French'
            ? "\nVérifiez avec quelqu'un qui voit avant de vous fier à ce chiffre."
            : '\nPlease double-check with someone who can see before relying on this number.';
      }
    }
  }

  return {
    text: sanitized,
    isValid: true,
    warnings,
  };
}

/**
 * Sanitize a cumulative streaming prefix before it is emitted to the client.
 * Structural repairs are intentionally skipped while streaming because the
 * prefix is incomplete by design. Security-sensitive redaction and accessibility
 * sanitation still run on every emitted prefix. The complete response MUST still
 * pass validateAndSanitizeResponse() at the end.
 */
export function sanitizeStreamingResponse(
  rawText: string,
  options: QualityCheckOptions = {},
): QualityValidationResult {
  if (!rawText || typeof rawText !== 'string') {
    return { text: '', isValid: false, warnings: [] };
  }

  const warnings: string[] = [];
  let sanitized = rawText;
  const a11y = options.accessibilityMode;
  if (a11y === 'Visual') {
    sanitized = sanitized
      .replace(/\|[-:\s|]+\|/g, '')
      .replace(/_{3,}/g, '')
      .replace(/={3,}/g, '');
  } else if (a11y === 'Vocal-Deaf' || a11y === 'Sign-Only') {
    sanitized = sanitized.replace(/\[\s*(?:sign|hand|gesture|emoji)[\w\s-]*\]/gi, '');
  }

  const secretPatterns = [
    { regex: /AIza[0-9A-Za-z-_]{30,}/g, name: 'GOOGLE_API_KEY_LEAK' },
    { regex: /gsk_[0-9A-Za-z]{30,}/g, name: 'GROQ_API_KEY_LEAK' },
    { regex: /nvapi-[0-9A-Za-z-_]{30,}/g, name: 'NVIDIA_API_KEY_LEAK' },
    { regex: /xai-[0-9A-Za-z-_]{30,}/g, name: 'XAI_API_KEY_LEAK' },
    { regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, name: 'PRIVATE_KEY_LEAK' },
  ];

  for (const sp of secretPatterns) {
    sp.regex.lastIndex = 0;
    if (sp.regex.test(sanitized)) {
      warnings.push('LEAKED_SECRET_REDACTED:' + sp.name);
      sp.regex.lastIndex = 0;
      sanitized = sanitized.replace(sp.regex, '[REDACTED_SECRET]');
    }
  }

  return { text: sanitized, isValid: true, warnings };
}