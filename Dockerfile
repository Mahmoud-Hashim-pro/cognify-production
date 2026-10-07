# ==============================================================================
# Cognify Production Multi-Stage Containerfile
# Hardened, Non-Root, Minimal Attack Surface Image
# ==============================================================================

# Stage 1: Build & Bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with exact lockfile integrity
COPY package.json package-lock.json ./
RUN npm ci

# Copy full application source
COPY . .

# Build Vite SPA assets and bundle server.ts via esbuild into dist/server.cjs
RUN npm run build

# Stage 2: Production Minimal Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy pre-built production artifacts from builder
COPY --from=builder --chown=node:node /app/dist ./dist

# Security Hardening: Run as unprivileged node user
USER node

EXPOSE 3000

# Container Healthcheck targeting the production observability endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/system/health || exit 1

# Launch production server
CMD ["node", "dist/server.cjs"]
