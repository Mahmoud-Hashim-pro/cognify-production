# Deployment & Infrastructure Operations Guide

> **Status**: [VERIFIED]  
> **Source Baseline**: `package.json`, `vercel.json`, `server.ts`, `.env.example`  
> **Audience**: DevOps Engineers, Site Reliability Engineers (SRE), and Developers  

---

## 1. Environment Variables Configuration [VERIFIED]

The deployment environment requires two distinct classes of configuration:

### A. Server-Side AI Secrets (Vercel Project Settings)
> [!IMPORTANT]
> These secrets MUST NOT have a `VITE_` prefix. They reside exclusively in the secure serverless runtime environment.

| Variable Name | Required? | Description & Key Format |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key(s). Supports comma-separated keys for pool rotation. |
| `NVIDIA_API_KEY` | Optional | NVIDIA NIM key(s) starting with `nvapi-`. Used for deep reasoning and code. |
| `GROQ_API_KEY` | Optional | Groq Cloud key(s) starting with `gsk_`. Used for ultra-low latency fallback. |
| `XAI_API_KEY` | Optional | xAI / Grok key(s) starting with `xai-`. Disaster resilience fallback. |

### B. Client-Side Firebase Configuration (`.env`)
> These variables are public and bundled into client JavaScript for browser Firebase initialization.

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=cognify-graduation.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cognify-graduation
VITE_FIREBASE_STORAGE_BUCKET=cognify-graduation.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
```

---

## 2. Deploying to Vercel (Serverless Edge) [VERIFIED]

### Prerequisites:
- Vercel CLI installed (`npm i -g vercel`) or GitHub repository linked to Vercel project.

### Deployment Commands:
```bash
# 1. Preview Deployment (Testing branch)
vercel

# 2. Production Deployment
vercel --prod
```

### Automatic Build Step:
Vercel executes the root `npm run build`:
```bash
npm run build
# -> vite build (Frontend assets compiled to dist/)
# -> esbuild server.ts (Compiled to dist/server.cjs)
```

---

## 3. Deploying as a Standalone Node.js Container / Server [VERIFIED]

Cognify can run completely independently of Vercel on any standard Linux/Docker server:

### Production Execution:
```bash
# 1. Install production dependencies
npm ci

# 2. Build the distribution bundle
npm run build

# 3. Launch the compiled standalone server
NODE_ENV=production PORT=8080 node dist/server.cjs
```

The compiled `dist/server.cjs` server:
- Automatically serves static frontend assets and the PWA service worker from `dist/`.
- Mounts all `/api/gemini/*` and `/api/telemetry/*` endpoints.
- Implements SPA history fallback routing to `dist/index.html`.

---

## 4. Post-Deployment Smoke Verification [VERIFIED]

Run the following quick health checks post-deployment:

```bash
# 1. Check HTTP response on root shell
curl -I https://your-cognify-domain.vercel.app/

# 2. Verify API gateway authentication barrier (Must return 401, not 500 or 404)
curl -X POST https://your-cognify-domain.vercel.app/api/gemini/generateContent \
  -H "Content-Type: application/json" \
  -d '{"parts":[{"text":"ping"}]}'
# Expected response: {"error":"Authentication required. Please sign in to access Cognify AI."}
```
