/**
 * Auxiliary Gemini Endpoints: Benchmark Comparison, Logic Response, and Proactive Insights.
 * Consolidated into a single Serverless Function to stay strictly within Vercel's 12-function limit.
 */
import {
  guard,
  readBody,
  generateText,
  buildPersona,
  buildOpenAIMessages,
  buildContents,
  geminiFetch,
  fallbackChat,
} from '../_lib/ai.js';
import { applyCorsHeaders } from '../_lib/cors.js';

export async function benchmarkComparisonHandler(req: any, res: any) {
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
    res.status(200).json({
      result: txt || (isAr ? 'تعذّر توليد المراجعة. جرّب تاني.' : 'Could not generate the review. Please try again.'),
    });
  } catch (err) {
    console.error('[api] generateBenchmarkComparison:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI request failed' });
    }
  }
}

export async function logicResponseHandler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;
  if (!(await guard(req, res))) return;

  try {
    const { message, profile = {}, moduleName = '', history = [] } = await readBody(req);
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    if (message.length > 32000) {
      res.status(400).json({ error: 'Payload too large: message exceeds 32,000 characters limit' });
      return;
    }

    const safeHistory = Array.isArray(history) ? history : [];
    const system = `${buildPersona(profile)}\n\n## CONTEXT\nYou are answering inside the "${moduleName || 'general'}" module of the app. Keep the answer scoped to that context.`;

    const body = JSON.stringify({
      contents: buildContents(message, safeHistory),
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { temperature: 0.7, topP: 0.95 },
    });
    const { res: gres } = await geminiFetch('generateContent', body);
    if (gres) {
      const j: any = await gres.json().catch(() => null);
      const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (txt) { res.status(200).json({ result: txt }); return; }
    }
    const txt = await fallbackChat(buildOpenAIMessages(message, system, safeHistory));
    const isAr = profile?.language === 'Arabic' || profile?.language === 'Egyptian Ammiya';
    res.status(200).json({
      result: txt || (isAr ? '⚠️ الذكاء مشغول دلوقتي. جرّب تاني 🙏' : '⚠️ The AI is busy right now. Please try again 🙏'),
    });
  } catch (err) {
    console.error('[api] generateLogicResponse:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI request failed' });
    }
  }
}

export async function proactiveInsightsHandler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;
  if (!(await guard(req, res))) return;

  try {
    const { profile = {}, recentMessages = [] } = await readBody(req);
    if (Array.isArray(recentMessages) && recentMessages.length > 50) {
      res.status(400).json({ error: 'Payload too large: recentMessages exceeds 50 items limit' });
      return;
    }
    const isAr = profile?.language === 'Arabic' || profile?.language === 'Egyptian Ammiya';

    const convo = (Array.isArray(recentMessages) ? recentMessages : [])
      .map((m: any) => `${m?.role === 'user' ? 'Student' : 'Tutor'}: ${m?.content || ''}`)
      .join('\n')
      .slice(-4000);

    const prompt = `Based on this student's recent study conversation, give 2-3 short, specific, actionable insights about what to focus on next.
Student: Level ${profile.level || 'Basic'}, Field ${profile.field || 'General'}.
Write in ${isAr ? 'Arabic' : 'English'}. Be concrete — no generic advice, no preamble.

Conversation:
${convo || '(no recent messages)'}`;

    const txt = await generateText(prompt);
    res.status(200).json({
      result: txt || (isAr ? 'واصل الاستذكار وحل التمارين لجمع المزيد من الرؤى الدراسية! 🚀' : 'Keep studying and solving exercises to unlock more personalized insights! 🚀'),
    });
  } catch (err) {
    console.error('[api] generateProactiveInsights:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI request failed' });
    }
  }
}

export default async function handler(req: any, res: any) {
  const url = (req.url || '').toLowerCase();
  if (url.includes('generatebenchmarkcomparison') || req.query?.action === 'benchmark') {
    return benchmarkComparisonHandler(req, res);
  }
  if (url.includes('generateproactiveinsights') || req.query?.action === 'insights') {
    return proactiveInsightsHandler(req, res);
  }
  if (url.includes('generatelogicresponse') || req.query?.action === 'logic') {
    return logicResponseHandler(req, res);
  }

  // Fallback inspect body
  try {
    const body = await readBody(req);
    req.body = body; // preserve for downstream handler
    if (body.originalMessage !== undefined || body.userMessage !== undefined) {
      return benchmarkComparisonHandler(req, res);
    }
    if (body.recentMessages !== undefined) {
      return proactiveInsightsHandler(req, res);
    }
    if (body.moduleName !== undefined || body.message !== undefined) {
      return logicResponseHandler(req, res);
    }
  } catch (err) {
    console.error('[api] auxiliary route error:', err);
  }

  res.status(404).json({ error: 'Auxiliary action not found' });
}
