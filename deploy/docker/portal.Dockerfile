# syntax=docker/dockerfile:1.7
#
# One image recipe for all five web portals. Build from the REPOSITORY ROOT:
#
#   docker build -f deploy/docker/portal.Dockerfile \
#     --build-arg PORTAL=hospital-portal \
#     --build-arg VITE_API_URL=https://api.miqorai.com \
#     -t miqorai-hospital-portal .
#
# PORTAL is the npm workspace folder: patient-portal-desktop | hospital-portal |
# insurance-portal | pharmacy-portal | admin-portal.
# VITE_API_URL is compiled into the bundle (Vite inlines import.meta.env at build
# time), so every environment needs its own portal image. VITE_BASE is only read by
# the patient portal (sub-path hosting); keep "/" for containers.

ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.27-alpine

# ---------------------------------------------------------------------------
# Build stage: install only the selected portal + shared packages, then build.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
ARG PORTAL
ARG VITE_API_URL
ARG VITE_BASE=/
WORKDIR /repo

RUN case "${PORTAL}" in \
      patient-portal-desktop|hospital-portal|insurance-portal|pharmacy-portal|admin-portal) ;; \
      *) echo "ERROR: build arg PORTAL must be one of patient-portal-desktop, hospital-portal, insurance-portal, pharmacy-portal, admin-portal (got '${PORTAL}')" >&2; exit 1 ;; \
    esac \
 && if [ -z "${VITE_API_URL}" ]; then echo "ERROR: build arg VITE_API_URL is required (public API origin, e.g. https://api.miqorai.com)" >&2; exit 1; fi

# Workspace manifests first so the dependency layer is cached across source edits.
# npm ci validates the single root lockfile against every workspace manifest.
COPY package.json package-lock.json ./
COPY packages/ui/package.json packages/ui/
COPY packages/api-client/package.json packages/api-client/
COPY admin-portal/package.json admin-portal/
COPY hospital-portal/package.json hospital-portal/
COPY insurance-portal/package.json insurance-portal/
COPY pharmacy-portal/package.json pharmacy-portal/
COPY patient-portal-desktop/package.json patient-portal-desktop/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund \
      -w "${PORTAL}" -w @miqorai/ui -w @miqorai/api-client

COPY packages ./packages
COPY ${PORTAL} ./${PORTAL}

ENV NODE_ENV=production
RUN VITE_API_URL="${VITE_API_URL}" VITE_BASE="${VITE_BASE}" npm run build -w "${PORTAL}"

# Normalise the static output into /out:
# - Vite SPAs emit <portal>/dist/index.html
# - TanStack Start (admin) in SPA mode emits dist/client/ with a prerendered
#   _shell.html; it is published as index.html so the shared nginx fallback works.
RUN set -eu; \
    out="${PORTAL}/dist"; \
    if [ -d "${out}/client" ]; then out="${out}/client"; fi; \
    if [ ! -f "${out}/index.html" ] && [ -f "${out}/_shell.html" ]; then cp "${out}/_shell.html" "${out}/index.html"; fi; \
    if [ ! -f "${out}/index.html" ]; then \
      echo "ERROR: ${PORTAL} produced no index.html in ${out}. admin-portal must be built in TanStack Start SPA mode (spa.enabled in vite.config.ts)." >&2; \
      exit 1; \
    fi; \
    mkdir -p /out && cp -R "${out}/." /out/

# ---------------------------------------------------------------------------
# Runtime stage: unprivileged nginx (uid 101, listens on 8080).
# Files in /etc/nginx/templates are rendered with envsubst at container start,
# so API_ORIGIN (CSP connect-src) is set per environment without a rebuild.
# ---------------------------------------------------------------------------
FROM ${NGINX_IMAGE} AS runtime
ARG PORTAL
LABEL org.opencontainers.image.title="miqorai-${PORTAL}" \
      org.opencontainers.image.licenses="LicenseRef-Proprietary"

# API origin allowed in CSP connect-src (e.g. https://api.miqorai.com). Empty = same origin only.
ENV API_ORIGIN="" \
    CSP_SCRIPT_EXTRA=""

COPY --chown=101:101 deploy/docker/nginx/portal.conf /etc/nginx/templates/default.conf.template
COPY --chown=101:101 deploy/docker/nginx/security-headers.inc /etc/nginx/templates/security-headers.inc.template
COPY --from=build --chown=101:101 /out /usr/share/nginx/html

USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
