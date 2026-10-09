/**
 * Phase 3: Adaptive Learning Engine
 * 
 * Provides:
 * 1. Multi-modal pedagogical style instructions (Analogies, Technical, Scaffolded, Socratic)
 * 2. Cautious learning signals & confidence scoring across multi-session interactions
 * 3. Quick-switch style transforms
 */

import { PedagogyStyle } from '../types';

export interface PedagogyStyleMeta {
  id: PedagogyStyle;
  labelEn: string;
  labelAr: string;
  icon: string;
  descriptionEn: string;
  descriptionAr: string;
}

export const PEDAGOGY_STYLES: PedagogyStyleMeta[] = [
  {
    id: 'simplified',
    labelEn: 'Simplified',
    labelAr: 'شرح مبسط',
    icon: 'Sparkles',
    descriptionEn: 'Clear, gentle, and straightforward explanation without cognitive friction.',
    descriptionAr: 'شرح ميسر ومباشر خالٍ من التعقيد والمصطلحات الصعبة.',
  },
  {
    id: 'scaffolded',
    labelEn: 'Step-by-Step',
    labelAr: 'خطوات متتابعة',
    icon: 'Layers',
    descriptionEn: 'Deconstructed sequential micro-steps with active comprehension checks.',
    descriptionAr: 'تفكيك المسألة لخطوات متدرجة ومترابطة مع نقاط تحقق.',
  },
  {
    id: 'practical',
    labelEn: 'Worked Example',
    labelAr: 'مثال عملي',
    icon: 'Code',
    descriptionEn: 'Applied end-to-end case study with concrete inputs, steps, and output.',
    descriptionAr: 'تطبيق عملي خطوة بخطوة مع مسألة محلولة ومدخلات ونتائج واضحة.',
  },
  {
    id: 'analogies',
    labelEn: 'Visual Analogy',
    labelAr: 'تشبيه بصري',
    icon: 'Lightbulb',
    descriptionEn: 'Concrete mental models and real-world everyday analogies.',
    descriptionAr: 'أمثلة حياتية وتشبيهات بصرية ملموسة لتقريب المفهوم المجرد.',
  },
  {
    id: 'socratic',
    labelEn: 'Interactive Inquiry',
    labelAr: 'أسئلة تفاعلية',
    icon: 'HelpCircle',
    descriptionEn: 'Guided reflective questions prompting you to derive the solution.',
    descriptionAr: 'حوار تفاعلي بأسئلة استكشافية تدفعك لاستنتاج الحل بنفسك.',
  },
  {
    id: 'technical',
    labelEn: 'Deep Technical',
    labelAr: 'تقني عميق',
    icon: 'Cpu',
    descriptionEn: 'Formal specifications, algorithmic complexity, and academic rigor.',
    descriptionAr: 'شرح أكاديمي دقيق ومباشر ومواصفات تقنية دون مقدمات.',
  },
];

/**
 * Returns prompt directives tailored to the selected pedagogy style.
 */
export function getPedagogyPromptDirective(style?: PedagogyStyle): string {
  switch (style) {
    case 'simplified':
      return `
## PEDAGOGICAL STYLE: SIMPLIFIED (PLAIN LANGUAGE & ELI5)
- Explain the core concept in warm, plain, accessible language with zero unnecessary jargon.
- Use short sentences, clear bullet points, and welcoming examples.
- Ensure the cognitive load is calm, confidence-building, and immediately digestible.`;

    case 'scaffolded':
      return `
## PEDAGOGICAL STYLE: STEP-BY-STEP SCAFFOLDING
- Break down the explanation into numbered, sequential micro-steps.
- Do not overwhelm with all information at once; define prerequisites first.
- Include a quick checkpoint question at the end to verify the foundational step before proceeding.`;

    case 'practical':
      return `
## PEDAGOGICAL STYLE: WORKED EXAMPLE & APPLIED CASE STUDY
- Anchor the explanation in a realistic, concrete case study or worked problem from start to finish.
- Detail the exact inputs, step-by-step logic, code/calculations, and the final observable outcome.
- Explicitly point out common practical pitfalls and how to verify the solution.`;

    case 'analogies':
      return `
## PEDAGOGICAL STYLE: VISUAL ANALOGIES & METAPHORS
- Connect every abstract concept to a concrete, physical real-world object (e.g., mailboxes for pointers, water pipes for electrical current, recipe steps for algorithms).
- Provide a simple ASCII or mental diagram when it clarifies structure.
- Focus on intuition before formal syntax.`;

    case 'socratic':
      return `
## PEDAGOGICAL STYLE: INTERACTIVE SOCRATIC INQUIRY
- Do not just provide the final answer immediately.
- Guide the student by asking 1-2 targeted reflective questions that lead them to discover the answer themselves.
- Acknowledge their effort, validate what is correct in their approach, and probe the missing piece.`;

    case 'technical':
      return `
## PEDAGOGICAL STYLE: DEEP TECHNICAL & ACADEMIC RIGOR
- Be concise, dense, and technically precise.
- Reference formal time/space complexity (Big-O), memory layout, type systems, and edge cases.
- Skip conversational pleasantries; deliver high-density technical analysis directly.`;

    default:
      return '';
  }
}

/**
 * Cautious Learning Signals:
 * Calculates a confidence metric (0-100%) for concept mastery based on multiple observations.
 * A single error does NOT mark a student as struggling; requires evidenceCount >= 3 for high confidence.
 */
export function calculateConceptConfidence(
  consecutiveSuccesses: number,
  totalAttempts: number
): { confidenceScore: number; level: 'exploring' | 'developing' | 'mastered' } {
  if (totalAttempts <= 0) {
    return { confidenceScore: 0, level: 'exploring' };
  }

  const successRate = Math.min(1, Math.max(0, consecutiveSuccesses / totalAttempts));
  const sampleWeight = Math.min(1, totalAttempts / 4);
  const confidenceScore = Math.round(successRate * 100 * (0.6 + 0.4 * sampleWeight));

  if (confidenceScore >= 80 && totalAttempts >= 3) {
    return { confidenceScore, level: 'mastered' };
  }
  if (confidenceScore >= 45 || totalAttempts < 3) {
    return { confidenceScore, level: 'developing' };
  }
  return { confidenceScore, level: 'exploring' };
}
