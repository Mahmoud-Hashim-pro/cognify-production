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
import deleteUserHandler from "./api/admin/deleteUser";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '2mb' }));

  // Comprehensive Security Headers Middleware
  app.use((_req, res, next) => {
    // Permit Firebase Auth Google popup communication
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), interest-cohort=()");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "img-src 'self' data: blob: https:; " +
      "media-src 'self' blob: data: https:; " +
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://api.telegram.org https://api.twilio.com; " +
      "worker-src 'self' blob:; " +
      "frame-src 'self' https://*.firebaseapp.com; " +
      "object-src 'none'; " +
      "base-uri 'self';"
    );
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

  // Super Admin: Permanent Server-Side User & Data Purge
  app.all("/api/admin/deleteUser", (req, res) => {
    return deleteUserHandler(req, res);
  });

  app.use("/api/gemini", geminiRouter);

  // Centralized Error Middleware for JSON parse failures or unhandled route errors
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error Handler]:', err);
    if (res.headersSent) return;
    const isProd = process.env.NODE_ENV === 'production';
    const status = typeof err.status === 'number' ? err.status : 500;
    const message = isProd && status >= 500 ? 'Internal Server Error' : (err.message || 'Internal Server Error');
    res.status(status).json({ error: message });
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
