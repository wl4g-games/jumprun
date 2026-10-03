# syntax=docker/dockerfile:1

FROM docker.io/library/node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts/sync-wasm.mjs ./scripts/sync-wasm.mjs
RUN npm ci

COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public

ARG APP_BASE=/
RUN npm run build -- --base="${APP_BASE}"

FROM docker.io/nginxinc/nginx-unprivileged:1.28-alpine

LABEL org.opencontainers.image.source="https://github.com/wl4g-games/jumprun"

COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
