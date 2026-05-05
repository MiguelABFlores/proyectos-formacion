# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY app/package*.json ./
RUN npm ci

COPY app/ .
COPY contenidos/ ../contenidos
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only production deps
COPY app/package*.json ./
RUN npm ci --omit=dev

# Built artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/next.config.js ./next.config.js

# JSON de contenidos: el server lee de /contenidos en runtime
# (process.cwd() es /app y el código resuelve ../contenidos).
COPY contenidos/ /contenidos

EXPOSE 3000

CMD ["node", "dist-server/server/index.js"]
