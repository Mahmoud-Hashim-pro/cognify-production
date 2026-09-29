import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import { geminiRouter } from "./server/routes";
import securityAuditHandler from "./api/telemetry/securityAudit";
import countryHandler from "./api/geo/country";
import emergencyDispatchHandler from "./api/emergency/dispatch";
import learningProfileHandler from "./api/student/learningProfile";
import proxyImageHandler from "./api/proxy-image";
import healthHandler from "./api/system/health";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '2mb' }));

  // Set COOP header to permit Firebase Auth Google popup communication
  app.use((_req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    next();
  });

  // Production Observability: System Health & Uptime probe
  app.all(["/api/system/health", "/api/health"], (req, res) => {
    return healthHandler(req, res);
  });

  // Telemetry: Security Audit IP extraction
  app.all("/api/telemetry/securityAudit", (req, res) => {
    return securityAuditHandler(req, res);
  });

  // Geo: visitor country (Vercel headers in prod, "Unknown" locally)
  app.all("/api/geo/country", (req, res) => {
    return countryHandler(req, res);
  });

  // Emergency SOS automated server-side dispatch
  app.all("/api/emergency/dispatch", (req, res) => {
    return emergencyDispatchHandler(req, res);
  });

  // Personal Learning Profile (PLM state & recommendations)
  app.all("/api/student/learningProfile", (req, res) => {
    return learningProfileHandler(req, res);
  });

  // Resilient SSRF-protected Image Proxy
  app.all("/api/proxy-image", (req, res) => {
    return proxyImageHandler(req, res);
  });

  app.use("/api/gemini", geminiRouter);

  // Centralized Error Middleware for JSON parse failures or unhandled route errors
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error Handler]:', err);
    if (res.headersSent) return;
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
