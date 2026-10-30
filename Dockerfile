# Web panel: built here, served by Caddy (HTTPS, and the /api, /socket.io and /tarabari-api routes to the backends).
# The Caddyfile comes from transport_backend/deploy (a volume). NPM_REGISTRY: a mirror when npm is out of reach.
FROM node:20.20.2-bookworm-slim AS build
ARG NPM_REGISTRY=https://registry.npmjs.org/
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# IPv4 first (IPv6 hangs on networks without it), patient retries, and a cache that survives a failed build.
# onnxruntime-node (from @huggingface/transformers) fetches Node binaries from GitHub; the browser runs onnxruntime-web.
RUN --mount=type=cache,target=/root/.npm NODE_OPTIONS=--dns-result-order=ipv4first npm ci --registry="$NPM_REGISTRY" \
    --onnxruntime-node-install=skip --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 --fetch-timeout=600000
COPY . .
RUN npm run build

FROM caddy:2.8.4-alpine
COPY --from=build /app/dist /srv
