/**
 * Second-opinion review of an answer. Returns { result }.
 *
 * NOTE: this deliberately does NOT claim to be ChatGPT. No OpenAI model is used
 * anywhere in this project — the review comes from the same provider chain that
 * wrote the original answer, so it is presented honestly as a self-review.
 */
import { guard, readBody, generateText } from '../_lib/ai.js';
import { applyCorsHeaders } from '../_lib/cors.js';

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;
  if (!(await guard(req, res))) return;

  try {
    const { originalMessage = '', userMessage = '', profile = {} } = await readBody(req);
    if (!originalMessage && !userMessage) {
      res.status(400).json({ error: 'originalMessage or userMessage is required' });
      return;
    }

    if (
      (typeof originalMessage === 'string' && originalMessage.length > 32000) ||
      (typeof userMessage === 'string' && userMessage.length > 32000)
    ) {
      res.status(400).json({ error: 'Payload too large: input exceeds 32,000 characters limit' });
      return;
    }
    const isAr = profile?.language === 'Arabic' || profile?.language === 'Egyptian Ammiya';

    const prompt = `You are a strict reviewer performing a SECOND-PASS review of an AI tutor's answer.
The user asked: "${userMessage}"
The assistant (Cognify) replied: "${originalMessage}"

Write an independent, higher-quality answer for this learner (Level: ${profile.level || 'Basic'}, Field: ${profile.field || 'General'}).

Respond in this EXACT format, in ${isAr ? 'Arabic' : 'English'}:
## Improved Answer
[Your own stronger answer — structured, clear, accurate.]

## Critique
[Briefly: what the original did well, and what yours does better or differently.]`;

    const txt = await generateText(prompt);
    res.status(200).json({ result: txt || (isAr ? 'تعذّر توليد المراجعة. جرّب تاني.' : 'Could not generate the review. Please try again.') });
  } catch (err) {
    console.error('[api] generateBenchmarkComparison:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI request failed' });
    }
  }
}
