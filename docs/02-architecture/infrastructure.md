# Infrastructure & Deployment Architecture

> **Status**: [VERIFIED]  
> **Source Baseline**: `vercel.json`, `public/manifest.webmanifest`, `public/sw.js`, `package.json`  
> **Audience**: DevOps, Cloud Engineers, and System Administrators  

---

## 1. Hosting & Serverless Infrastructure [VERIFIED]

Cognify 2.0 is designed for hybrid deployment:
1. **Primary Production Environment**: Vercel Serverless Platform with Edge CDN distribution.
2. **On-Premise / Standalone Environment**: Self-contained Node.js Express server running on port `3000` (or `PORT` env var).

```mermaid
flowchart LR
    subgraph Edge_Tier ["Global Edge / CDN"]
        DNS["DNS / Domain"]
        Edge["Vercel Edge Network<br>(Anycast CDN)"]
    end

    subgraph Compute_Tier ["Serverless Compute"]
        API_Gemini["/api/gemini/*<br>(Node.js 20 Serverless)"]
        API_Telemetry["/api/telemetry/*<br>(Node.js 20 Serverless)"]
    end

    subgraph Client_Cache ["Client-Side Caching (PWA)"]
        SW["Service Worker (sw.js)"]
        CacheStorage[("CacheStorage API<br>(Assets & Shell)")]
    end

    DNS --> Edge
    Edge -->|Static Assets (*.js, *.css, *.svg)| SW
    SW --> CacheStorage
    Edge -->|Dynamic AI Requests| API_Gemini
    Edge -->|Audit Logging| API_Telemetry
```

---

## 2. Serverless Routing Configuration (`vercel.json`) [VERIFIED]

[`vercel.json`](../../vercel.json) orchestrates routing between static frontend assets and serverless functions:

```json
{
  "rewrites": [
    { "source": "/api/gemini/(.*)", "destination": "/api/gemini/$1" },
    { "source": "/api/telemetry/(.*)", "destination": "/api/telemetry/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- **Single Page Application (SPA) Fallback**: Any client route (e.g. `/disability`, `/planner`, `/cohort`) rewrites to `/index.html`, allowing React's internal client-side router to handle rendering.
- **Serverless API Protection**: `/api/*` routes are isolated from the client bundle and dispatched to individual function runtimes.

---

## 3. Progressive Web App (PWA) Infrastructure [VERIFIED]

Cognify conforms to modern PWA specifications, supporting standalone installation on Android, iOS, Windows, and macOS:

### A. Web App Manifest (`public/manifest.webmanifest`)
- **Display**: `standalone` (removes browser URL bars and navigation chrome).
- **Theme Color**: `#0A0C14` (matches Obsidian Dark canvas).
- **Background Color**: `#0A0C14`.
- **Orientation**: `any` (supports portrait on phones and landscape on desktop/tablets).
- **Icons**: Scalable vector `assets/icon.svg` with maskable icon support.

### B. Service Worker (`public/sw.js`)
- **Strategy**: Cache-First for static assets, Network-First with offline fallback for navigational HTML.
- **Cache Invalidation**: Versioned cache tags (`cognify-static-v2`) purged automatically during the `activate` event.
- **Offline Resilience**: Offline students can still run the GPA calculator, review previously cached study guides, and access local emergency phrasebooks.

---

## 4. Build Pipeline Architecture [VERIFIED]

The production build runs via `npm run build`:
```bash
vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --minify --outfile=dist/server.cjs
```

1. **Vite 6 Step**:
   - Compiles TypeScript to optimized ECMAScript chunks.
   - Extracts and minifies Tailwind CSS v4 into `dist/assets/index-*.css`.
   - Generates production source maps and bundles assets into `dist/`.
2. **esbuild Step**:
   - Bundles the Node.js backend server (`server.ts`) into a single standalone CommonJS file: `dist/server.cjs` (~63.7 kB).
   - Flags all external npm dependencies (`--packages=external`) so Node.js runtime resolution handles native modules efficiently.
