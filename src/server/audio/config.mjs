import { join } from "node:path";

/** Stable defaults; changing them changes the storage hash. */
export const DEFAULT_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
};

function parseMaxCharacters(raw) {
  if (raw == null || raw === "") return null;
  if (!/^[0-9]+$/.test(raw)) return null;
  return Number(raw);
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

/**
 * Single async entry point for audio settings. Today this reads process.env;
 * a later task can swap the source to database-backed admin settings.
 * Never includes the API key; callers see only `hasApiKey`.
 */
export async function loadAudioConfig() {
  return fromEnv();
}

/** Internal to the ElevenLabs client. Do not log or expose on the wire. */
export function readApiKey() {
  return process.env.ELEVENLABS_API_KEY ?? "";
}
