/** Non-streaming chat. Returns { result }. Keys stay server-side. */
import { guard, readBody, buildPersona, threadsSummary, buildContents, buildOpenAIMessages, geminiFetch, fallbackChat } from '../_lib/ai.js';
import { classifyRequest } from '../_lib/router.js';
import { validateAndSanitizeResponse } from '../_lib/qualityGuard.js';
import { ensureImageInResponse } from '../_lib/imageSynthesis.js';

export default async function handler(req: any, res: any) {
  if (!(await guard(req, res))) return;

  try {
    const { message, profile = {}, history = [], attachments = [], studentState } = await readBody(req);
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const safeHistory = Array.isArray(history) ? history : [];
    const safeAttachments = Array.isArray(attachments) ? attachments : [];

    // Phase 1.1 — deterministic router with student state awareness.
    const effectiveState = studentState || profile?.studentState;
    const category = classifyRequest(message, safeAttachments, effectiveState);
    const system = buildPersona(profile, threadsSummary(profile), effectiveState, message);

    let rawOutput = '';

    // "reasoning" requests (complex code / debugging) go to the NVIDIA
    // reasoning models FIRST — Gemini Flash is a fast model, not a deep
    // reasoning one, so trying it first here would be the wrong default.
    if (category === 'reasoning') {
      const txt = await fallbackChat(buildOpenAIMessages(message, system, safeHistory), category);
      if (txt) rawOutput = txt;
      // fall through to Gemini below if NVIDIA/Groq/xAI all failed
    }

    if (!rawOutput) {
      const body = JSON.stringify({
        contents: buildContents(message, safeHistory, safeAttachments),
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { temperature: 0.7, topP: 0.95 },
      });
      const { res: gres } = await geminiFetch('generateContent', body, { category });
      if (gres) {
        const j: any = await gres.json().catch(() => null);
        const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (txt) rawOutput = txt;
      }
    }

    if (!rawOutput && category !== 'reasoning') {
      rawOutput = await fallbackChat(buildOpenAIMessages(message, system, safeHistory), category);
    }

    const isAr = profile?.language === 'Arabic' || profile?.language === 'Egyptian Ammiya';
    const fallbackMessage = isAr ? '⚠️ الذكاء الاصطناعي مشغول دلوقتي. جرّب تاني 🙏' : '⚠️ The AI is busy right now. Please try again 🙏';
    const validated = validateAndSanitizeResponse(rawOutput || fallbackMessage, {
      accessibilityMode: profile?.accessibilityMode,
      language: profile?.language,
      cognitiveStage: profile?.level,
    });

    const plm = effectiveState?.personalLearningModel;
    const plmSummary = plm ? {
      primaryPreferredStrategy: plm.primaryPreferredStrategy,
      secondaryPreferredStrategy: plm.secondaryPreferredStrategy,
      trackedConceptsCount: Object.keys(plm.conceptProfiles || {}).length,
      proactiveDirectivesCount: (plm.proactiveRemediationDirectives || []).length,
    } : undefined;

    const imageResult = ensureImageInResponse(message, validated.text, safeHistory);

    res.status(200).json({
      result: imageResult.text,
      attachments: imageResult.attachment ? [imageResult.attachment] : undefined,
      warnings: validated.warnings,
      category,
      activePedagogy: effectiveState?.activePedagogy || 'scaffolded',
      plmSummary,
    });
  } catch (err) {
    console.error('[api] generateAdaptiveResponse:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI request failed' });
    }
  }
}
