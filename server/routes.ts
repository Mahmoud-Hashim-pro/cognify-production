import { evaluateQuizPOV, translateQuiz, generateAssessment } from "./gemini";
import { geminiService } from "./geminiService";
import express from "express";

// Chat (adaptive response) and AI endpoints go through the SAME handlers used on Vercel in
// production — this is the Phase 1 Router + Telemetry + multi-provider
// fallback chain (api/_lib/ai.ts + router.ts + telemetry.ts). There used to
// be a second, Gemini-only implementation living in ./gemini for local dev;
// that meant `npm run dev` behaved differently from the deployed app (no
// NVIDIA/Groq/xAI fallback, no router, no telemetry). Importing the actual
// Vercel handlers removes that duplication — one implementation, everywhere.
import generateAdaptiveResponseHandler from "../api/gemini/generateAdaptiveResponse";
import generateAdaptiveResponseStreamHandler from "../api/gemini/generateAdaptiveResponseStream";
import generateContentHandler from "../api/gemini/generateContent";
import {
  benchmarkComparisonHandler as generateBenchmarkComparisonHandler,
  proactiveInsightsHandler as generateProactiveInsightsHandler,
  logicResponseHandler as generateLogicResponseHandler,
} from "../api/gemini/auxiliary";
import { guard } from "../api/_lib/ai";

export const geminiRouter = express.Router();

// Enforce security guard (Bearer token verification + rate limiting) on all AI endpoints
geminiRouter.use(async (req, res, next) => {
  if (req.method === 'POST') {
    const allowed = await guard(req, res);
    if (!allowed) return;
  }
  next();
});

const wrap = (fn: (req: express.Request, res: express.Response) => Promise<any>) =>
  async (req: express.Request, res: express.Response) => {
    try {
      await fn(req, res);
    } catch (err: any) {
      console.error(`[Route Error] ${req.path}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Internal server error' });
      }
    }
  };

geminiRouter.post('/evaluateQuizPOV', wrap(async (req, res) => {
  const body = req.body || {};
  const result = await evaluateQuizPOV(body.question, body.pov);
  res.json({ result });
}));

geminiRouter.post('/translateQuiz', wrap(async (req, res) => {
  const body = req.body || {};
  const result = await translateQuiz(body.questions, body.language);
  res.json({ result });
}));

geminiRouter.post('/generateAssessment', wrap(async (req, res) => {
  const body = req.body || {};
  const result = await generateAssessment(body.field, body.language, body.level, body.count);
  res.json({ result });
}));

geminiRouter.post('/generateBenchmarkComparison', wrap(async (req, res) => {
  await generateBenchmarkComparisonHandler(req, res);
}));

geminiRouter.post('/generateProactiveInsights', wrap(async (req, res) => {
  await generateProactiveInsightsHandler(req, res);
}));

geminiRouter.post('/generateLogicResponse', wrap(async (req, res) => {
  await generateLogicResponseHandler(req, res);
}));

// Both routes below delegate straight to the Vercel serverless handlers —
// req.body is already parsed by express.json() upstream, and guard()/
// readBody() in api/_lib/ai.ts both handle an Express (req, res) pair fine.
geminiRouter.post('/generateAdaptiveResponse', wrap(async (req, res) => {
  await generateAdaptiveResponseHandler(req, res);
}));

// SSE Stream for Adaptive Response
geminiRouter.post('/generateAdaptiveResponseStream', wrap(async (req, res) => {
  await generateAdaptiveResponseStreamHandler(req, res);
}));

// Generic one-shot generation
geminiRouter.post('/generateContent', wrap(async (req, res) => {
  await generateContentHandler(req, res);
}));

// geminiService endpoints
geminiRouter.post('/translateSign', wrap(async (req, res) => {
  const body = req.body || {};
  const result = await geminiService.translateSign(body.imageData, body.language, body.level);
  res.json({ result });
}));

geminiRouter.post('/enhanceCaptions', wrap(async (req, res) => {
  const body = req.body || {};
  const result = await geminiService.enhanceCaptions(body.text, body.language);
  res.json({ result });
}));

geminiRouter.post('/transcribeAudio', wrap(async (req, res) => {
  const body = req.body || {};
  const result = await geminiService.transcribeAudio(body.audioData, body.language, body.mimeType);
  res.json({ result });
}));

geminiRouter.post('/generateSignSequence', wrap(async (req, res) => {
  const body = req.body || {};
  const result = await geminiService.generateSignSequence(body.text, body.language);
  res.json({ result });
}));

geminiRouter.post('/optimizeSignScript', wrap(async (req, res) => {
  const body = req.body || {};
  const result = await geminiService.optimizeSignScript(body.text, body.language);
  res.json({ result });
}));

geminiRouter.post('/askGeneralQuestion', wrap(async (req, res) => {
  const body = req.body || {};
  const result = await geminiService.askGeneralQuestion(body.text, body.language);
  res.json({ result });
}));

geminiRouter.post('/generateQuickReplies', wrap(async (req, res) => {
  const body = req.body || {};
  const result = await geminiService.generateQuickReplies(body.text, body.language);
  res.json({ result });
}));

