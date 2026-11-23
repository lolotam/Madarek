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

FROM node:24-bookworm-slim AS transcription
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates cmake curl g++ make && rm -rf /var/lib/apt/lists/*
RUN curl --fail --silent --show-error --location --retry 3 https://codeload.github.com/ggml-org/whisper.cpp/tar.gz/refs/tags/v1.8.3 -o source.tar.gz \
    && echo '870ba21409cdf66697dc4db15ebdb13bc67037d76c7cc63756c81471d8f1731a  source.tar.gz' | sha256sum -c - \\n    && tar -xzf source.tar.gz --strip-components=1 \
    && cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DGGML_NATIVE=OFF -DGGML_OPENMP=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF \
    && cmake --build build --target whisper-cli --parallel 2
RUN curl --fail --silent --show-error --location --retry 3 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin?download=true' -o model.bin \
    && echo '4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f  model.bin' | sha256sum -c -

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/app/.data/learning.sqlite \
    AUDIO_LIBRARY_PATH=/app/.data/audio \
    NARRATION_DIR=/app/src/server/narration \
    ENGLISH_WHISPER_MODEL=/opt/madarek/whisper-base.en.bin

COPY --from=transcription /build/build/bin/whisper-cli /usr/local/bin/whisper-cli
COPY --from=transcription /build/model.bin /opt/madarek/whisper-base.en.bin
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Narration scripts are read from disk at runtime, and the admin/audio CLIs
# (scripts/*.mjs) import src/server/*.mjs; both use only Node built-ins.
COPY --from=build --chown=node:node /app/src/server ./src/server
COPY --from=build --chown=node:node /app/src/content/english-mascots.mjs ./src/content/english-mascots.mjs
COPY --from=build --chown=node:node /app/scripts ./scripts

# All state (SQLite database + generated audio) lives here. Mount a persistent
# volume at /app/.data or every redeploy starts with an empty database.
RUN mkdir -p /app/.data/audio && chown -R node:node /app/.data

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

RUN npm install --global @openai/codex@0.171.0 --no-audit --no-fund

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/session').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
