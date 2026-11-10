# syntax=docker/dockerfile:1
# =====================================================================
# BillEasy staff-service (port 4005)
#
# Build from this directory:
#   docker build -t billeasy-staff .
#
# Runtime configuration comes from environment variables
# (see .env.example): PORT, MYSQL_*, JWT_SECRET, AUTH_SERVICE_URL.
# =====================================================================

ARG NODE_VERSION=22-alpine

# ---- 1. deps: production dependencies from the lockfile -------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- 2. dev: nodemon + bind-mounted source (docker-compose.dev.yml) --
FROM node:${NODE_VERSION} AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
COPY . .
ENV NODE_ENV=development \
    CHOKIDAR_USEPOLLING=true
EXPOSE 4005
CMD ["npm", "run", "dev", "--", "--legacy-watch"]

# ---- 3. runner: minimal runtime image -------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json server.js ./
COPY --chown=node:node src ./src

USER node
EXPOSE 4005

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4005/health >/dev/null || exit 1

CMD ["node", "server.js"]
