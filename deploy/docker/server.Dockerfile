# syntax=docker/dockerfile:1.7
#
# MiqorAI API image. The same image runs the HTTP API (default CMD) and the
# background worker (command override). Build from the REPOSITORY ROOT:
#
#   docker build -f deploy/docker/server.Dockerfile -t miqorai-api .
#
#   API:     default CMD             -> node dist/index.js   (listens on $PORT, default 3000)
#   Worker:  command override        -> node dist/worker.js  (no HTTP port; ignore HEALTHCHECK)
#   Migrate: command override        -> prisma migrate deploy (Kubernetes initContainer / Render preDeploy)
#
# server/ keeps its own package-lock.json (it is not an npm workspace).

ARG NODE_IMAGE=node:22-alpine

# ---------------------------------------------------------------------------
# Build stage: full install (dev deps for tsc + prisma), compile, then prune.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
RUN apk add --no-cache openssl

COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
# postinstall runs `prisma generate`, so the schema must already be present.
RUN --mount=type=cache,target=/root/.npm npm ci --include=dev --no-audit --no-fund

COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# Record the locked Prisma CLI version, then drop dev dependencies.
RUN node -p "require('./package-lock.json').packages['node_modules/prisma'].version" > /app/.prisma-version \
 && npm prune --omit=dev --no-audit --no-fund

# ---------------------------------------------------------------------------
# Runtime stage: production dependencies only, non-root.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
RUN apk add --no-cache openssl tini

ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/app/uploads

COPY --from=build /app/.prisma-version /tmp/prisma-version
# Prisma CLI (exact locked version) for `prisma migrate deploy`, installed
# globally so it stays outside the pruned production dependency tree.
RUN npm install -g --no-audit --no-fund "prisma@$(cat /tmp/prisma-version)" \
 && npm cache clean --force \
 && rm /tmp/prisma-version

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

# Generate the Prisma client for this exact runtime (musl + OpenSSL 3).
RUN prisma generate --schema prisma/schema.prisma \
 && mkdir -p /app/uploads \
 && chown -R node:node /app/uploads

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
