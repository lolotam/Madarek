import { existsSync } from "node:fs";
import { join } from "node:path";
import { createStore } from "../store.mjs";

/** Stable defaults; changing them changes the storage hash. */
export const DEFAULT_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
};

export function defaultDatabasePath() {
  return (
    process.env.DATABASE_PATH || join(process.cwd(), ".data", "learning.sqlite")
  );
}

function parseMaxCharacters(raw) {
  if (raw == null || raw === "") return null;
  if (!/^[0-9]+$/.test(String(raw).trim())) return null;
  return Number(String(raw).trim());
}

function fromEnv() {
  return {
    hasApiKey: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
    voiceId: process.env.ELEVENLABS_VOICE_ID?.trim() || "",
    modelId:
      process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2",
    outputFormat:
      process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || "mp3_44100_128",
    maxCharacters: parseMaxCharacters(process.env.ELEVENLABS_MAX_CHARACTERS),
    libraryPath:
      process.env.AUDIO_LIBRARY_PATH?.trim() ||
      join(process.cwd(), ".data", "audio"),
    narrationDir:
      process.env.NARRATION_DIR?.trim() ||
      join(process.cwd(), "src", "server", "narration"),
    voiceSettings: DEFAULT_VOICE_SETTINGS,
  };
}

function withSettingsStore(reader) {
  // Inside the Next server, reuse the shared store from src/server/db.ts
  // instead of reopening and migrating SQLite on every audio request.
  const shared = globalThis.learningStore;
  if (shared) return reader(shared);
  const filename = defaultDatabasePath();
  if (
    process.env.NEXT_RUNTIME &&
    existsSync(/*turbopackIgnore: true*/ filename)
  ) {
    return reader((globalThis.learningStore = createStore(filename)));
  }
  if (
    filename !== ":memory:" &&
    !existsSync(/*turbopackIgnore: true*/ filename)
  )
    return reader(null);
  const store = createStore(filename);
  try {
    return reader(store);
  } finally {
    store.close();
  }
}

function fromDatabase(store) {
  if (!store) {
    return { hasApiKey: false, voiceId: "", modelId: "", maxCharacters: null };
  }
  const apiKey = store.getApiSetting("elevenlabs_api_key");
  const modelId = store.getApiSetting("elevenlabs_model_id");
  return {
    hasApiKey: Boolean(String(apiKey || "").trim()),
    voiceId: store.getApiSetting("elevenlabs_voice_id") || "",
    modelId: modelId || "",
    maxCharacters: store.getApiSetting("elevenlabs_max_characters"),
  };
}

/**
 * Single async entry point for audio settings. Database admin settings win,
 * then process.env, then built-in defaults. Never includes the API key;
 * callers see only `hasApiKey`.
 */
export async function loadAudioConfig() {
  const env = fromEnv();
  const db = withSettingsStore(fromDatabase);
  return {
    hasApiKey: db.hasApiKey || env.hasApiKey,
    voiceId: db.voiceId || env.voiceId,
    modelId: db.modelId || env.modelId,
    outputFormat: env.outputFormat,
    maxCharacters:
      db.maxCharacters != null ? db.maxCharacters : env.maxCharacters,
    libraryPath: env.libraryPath,
    narrationDir: env.narrationDir,
    voiceSettings: DEFAULT_VOICE_SETTINGS,
  };
}

/** Internal to the ElevenLabs client. Do not log or expose on the wire. */
export function readApiKey() {
  return withSettingsStore((store) => {
    if (!store) return process.env.ELEVENLABS_API_KEY ?? "";
    return store.getApiSetting("elevenlabs_api_key") || "";
  });
}
