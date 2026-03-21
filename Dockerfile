# =============================================================================
# Sonic Website — Multi-Stage Docker Build
# =============================================================================
# Stage 1: Install dependencies (all — needed for prisma generate + build)
# Stage 2: Build the Next.js application (standalone output)
# Stage 3: Lean production runtime image (~200MB vs ~1GB)
# =============================================================================

# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

# libc6-compat needed for native node modules; openssl needed by Prisma engine
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package manifest and prisma schema first (layer-cache friendly)
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install all dependencies (including dev, needed for prisma generate)
RUN npm ci

# ─── Stage 2: builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Reuse installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full source
COPY . .

# Generate Prisma client for Linux (important: must run in Linux container)
RUN npx prisma generate

# Build Next.js in standalone mode (outputs .next/standalone/)
RUN npm run build

# ─── Stage 3: runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# openssl required by Prisma migrate deploy at container startup
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a dedicated non-root system user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid  1001 nextjs

# Copy static assets (public/ directory)
COPY --from=builder /app/public ./public

# Copy the standalone build output (server.js + minimal traced node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy compiled static assets into the right place for standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma runtime artifacts (generated client + CLI for migrate deploy)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma   ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma   ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma    ./node_modules/prisma

# Copy migration files (needed by prisma migrate deploy at startup)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy and configure the entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Create upload directories (Docker volumes shadow these in production — ownership must be set here first)
RUN mkdir -p ./public/uploads ./public/images/uploads \
    && chown -R nextjs:nodejs ./public/uploads ./public/images/uploads

# Copy runtime config defaults into image so the named volume is pre-populated on first deploy.
# On subsequent deploys, the volume's client-configured files take precedence over the image.
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/bin/sh", "./docker-entrypoint.sh"]
