# syntax=docker/dockerfile:1

# =====================================================================
# BillEasy web — Next.js 16 frontend (production image)
#
# Build from the frontend/ directory (this file's directory):
#   docker build -t billeasy-web .
#   # with the gateway hostname docker-compose will use:
#   docker build --build-arg GATEWAY_URL=http://gateway:4000 -t billeasy-web .
#
# Run:
#   docker run -p 3200:3200 -e JWT_SECRET=<secret> billeasy-web
#
# The app itself is built with `output: 'standalone'` (next.config.ts),
# so the final stage only carries the traced server files.
# =====================================================================

ARG NODE_VERSION=22-alpine

# ---- 1. deps: install dependencies from the lockfile ----------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. dev: next dev + bind-mounted source (docker-compose.dev.yml) --
FROM deps AS dev
WORKDIR /app
COPY . .
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1 \
    WATCHPACK_POLLING=true \
    CHOKIDAR_USEPOLLING=true
EXPOSE 3200
# webpack + WATCHPACK_POLLING is used here because Turbopack does not
# reliably receive file events from Windows bind mounts.
CMD ["npm", "run", "dev", "--", "--webpack", "--hostname", "0.0.0.0"]

# ---- 3. builder: compile the standalone production server ------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next.config.ts resolves the /api/* rewrite destination while `next
# build` runs, so the gateway URL must be known at build time.
# Default matches local dev; docker-compose overrides it for its network.
ARG GATEWAY_URL=http://localhost:4000
ENV GATEWAY_URL=${GATEWAY_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 4. runner: minimal production image ----------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3200 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Standalone output omits public/ and .next/static — copy them in.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Non-root user (node) with a writable .next for image/cache writes.
USER node
EXPOSE 3200

# /login is a public route — a cheap liveness probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3200/login >/dev/null || exit 1

CMD ["node", "server.js"]
