# Madarek production image (Next.js standalone + SQLite on a persistent volume).
# Node 24 is required: the app uses the built-in node:sqlite module.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/app/.data/learning.sqlite \
    AUDIO_LIBRARY_PATH=/app/.data/audio \
    NARRATION_DIR=/app/src/server/narration

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Narration scripts are read from disk at runtime, and the admin/audio CLIs
# (scripts/*.mjs) import src/server/*.mjs; both use only Node built-ins.
COPY --from=build --chown=node:node /app/src/server ./src/server
COPY --from=build --chown=node:node /app/scripts ./scripts

# All state (SQLite database + generated audio) lives here. Mount a persistent
# volume at /app/.data or every redeploy starts with an empty database.
RUN mkdir -p /app/.data/audio && chown -R node:node /app/.data

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/session').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
