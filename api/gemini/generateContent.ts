/**
 * Generic one-shot generation used by the accessibility/vision service
 * (sign translation, audio transcription, sticker explanations, OCR, quick replies…).
 *
 * Body: { parts: [{ text }, { inlineData: { mimeType, data } }, ...] }
 * Returns: { result: string, cached?: boolean }
 *
 * Features (Phase 8 Backend Reliability):
 * 1. Payload sizes capped at 3MB binary (Vercel serverless body ceiling ~4.5MB).
 * 2. Assistive category quota accounting & accessible error explanations.
 * 3. In-flight request deduplication to prevent duplicate provider charges.
 * 4. User-isolated idempotent response caching (zero cross-user leakage).
 * 5. Multi-provider text fallback (Gemini -> NVIDIA -> Groq -> xAI).
 */
import { guard, readBody, geminiFetch, fallbackChat, validateAttachmentMimeAndName, type AssistiveQuotaCategory } from '../_lib/ai.js';
import { applyCorsHeaders } from '../_lib/cors.js';
import {
  deduplicateInflight,
  generateUserContentHash,
  getCachedResult,
  setCachedResult,
} from '../_lib/usageQuotaEngine.js';

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  try {
    const { parts } = await readBody(req);
    if (!Array.isArray(parts) || parts.length === 0) {
      res.status(400).json({ error: 'parts[] is required' });
      return;
    }

    const hasMedia = parts.some((p: any) => p?.inlineData);
    const promptText = parts.map((p: any) => p?.text || '').join(' ').toLowerCase();
    const isAudio = parts.some((p: any) => (p?.inlineData?.mimeType || '').startsWith('audio/'));

    let category: AssistiveQuotaCategory = 'general_chat';
    if (isAudio || promptText.includes('transcribe')) {
      category = 'audio_transcription';
    } else if (promptText.includes('sticker') || promptText.includes('whatsapp') || promptText.includes('meme')) {
      category = 'stickers_images';
    } else if (promptText.includes('sign') || promptText.includes('camera') || promptText.includes('scene') || promptText.includes('obstacle') || promptText.includes('board')) {
      category = 'camera_vision';
    } else if (promptText.includes('ocr') || promptText.includes('read') || promptText.includes('text') || promptText.includes('caption')) {
      category = 'ocr_reading';
    } else if (promptText.includes('document') || promptText.includes('exam') || promptText.includes('worksheet') || promptText.includes('book')) {
      category = 'document_studio';
    }

    // Verify authentication, rate limits, and category-specific allowances
    if (!(await guard(req, res, category))) return;

    // Phase 10: Validate MIME types of any inline media against allowlist
    for (const p of parts) {
      if (p?.inlineData) {
        const mime = p.inlineData.mimeType;
        const validation = validateAttachmentMimeAndName({ type: mime });
        if (!validation.valid) {
          res.status(415).json({ error: validation.reason || 'Unsupported media type' });
          return;
        }
      }
    }

    // Media size limits reflect the real platform ceiling: Vercel serverless
    // truncates request bodies at ~4.5MB, so anything above 3MB of binary
    // (about 4MB base64) would 413 at the platform before this code runs.
    // Longer recordings/files should go through the Gemini Files API or
    // Vercel Blob instead of inline base64.
    const inlineBytes = parts.reduce(
      (n: number, p: any) => n + (typeof p?.inlineData?.data === 'string' ? p.inlineData.data.length : 0),
      0
    );
    const maxAllowedBytes = 4 * 1024 * 1024; // base64 chars, ~3MB of binary
    if (inlineBytes > maxAllowedBytes) {
      res.status(413).json({
        error: 'Attached media exceeds the 3MB limit. Please provide a shorter recording or compressed file.',
        code: 'PAYLOAD_TOO_LARGE',
        maxBytes: 3 * 1024 * 1024,
      });
      return;
    }

    const uid = req.authenticatedUid || 'guest';
    const payloadFingerprint = JSON.stringify(parts);
    const cacheKey = generateUserContentHash(uid, category, payloadFingerprint);

    // 1. Check user-scoped cache for identical static media / query (e.g. repeated sticker / document query)
    const cached = getCachedResult(cacheKey, uid);
    if (cached) {
      res.status(200).json({ result: cached, cached: true });
      return;
    }

    // 2. Execute with in-flight deduplication to avoid double-spend on rapid triggers
    const finalResult = await deduplicateInflight(cacheKey, async () => {
      const body = JSON.stringify({ contents: [{ role: 'user', parts }] });
      const timeoutMs = isAudio ? 60000 : 25000;
      const { res: gres } = await geminiFetch('generateContent', body, { category, timeoutMs, byokKey: req.byokKey });
      if (gres) {
        const j: any = await gres.json().catch(() => null);
        const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (txt) {
          setCachedResult(cacheKey, uid, category, txt);
          return txt;
        }
      }

      if (!hasMedia) {
        const prompt = parts.map((p: any) => p?.text || '').join('\n').trim();
        if (prompt) {
          const txt = await fallbackChat([{ role: 'user', content: prompt }]);
          if (txt) {
            setCachedResult(cacheKey, uid, category, txt);
            return txt;
          }
        }
      }

      return '';
    });

    res.status(200).json({ result: finalResult });
  } catch (err: any) {
    console.error('[api] generateContent:', err);
    res.status(200).json({ result: '' });
  }
}
